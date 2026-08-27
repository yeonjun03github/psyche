import { GeminiProvider } from './gemini.provider';

const generateContentMock = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: generateContentMock },
  })),
}));

function highDemandError(): Error {
  const error = new Error('This model is currently experiencing high demand. Please try again later.');
  (error as unknown as { status: number }).status = 503;
  return error;
}

function timeoutError(): Error {
  const error = new Error('The operation was aborted due to timeout');
  error.name = 'TimeoutError';
  return error;
}

/** 실제로 겪은 형태 — 클라이언트 타임아웃이 아니라 Google 서버 쪽이 504로 포기하고 응답한다. */
function deadlineExceededError(): Error {
  const error = new Error('{"error":{"code":504,"message":"Deadline expired before operation could complete.","status":"DEADLINE_EXCEEDED"}}');
  (error as unknown as { status: number }).status = 504;
  return error;
}

describe('GeminiProvider', () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it('주 모델이 성공하면 대체 모델을 호출하지 않는다', async () => {
    generateContentMock.mockResolvedValueOnce({ text: '{"ok":true}' });
    const provider = new GeminiProvider('key', 'primary-model', 'fallback-model');

    const result = await provider.generateJson({
      systemPrompt: 's',
      userPrompt: 'u',
      jsonSchema: {},
      schemaName: 'test',
    });

    expect(result).toEqual({ ok: true });
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock).toHaveBeenCalledWith(expect.objectContaining({ model: 'primary-model' }));
  });

  it('주 모델이 high demand(503)로 실패하면 대체 모델로 즉시 재시도한다', async () => {
    generateContentMock.mockRejectedValueOnce(highDemandError());
    generateContentMock.mockResolvedValueOnce({ text: '{"ok":true}' });
    const provider = new GeminiProvider('key', 'primary-model', 'fallback-model');

    const result = await provider.generateJson({
      systemPrompt: 's',
      userPrompt: 'u',
      jsonSchema: {},
      schemaName: 'test',
    });

    expect(result).toEqual({ ok: true });
    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(generateContentMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ model: 'primary-model' }));
    expect(generateContentMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: 'fallback-model' }));
  });

  it('high demand가 아닌 오류는 대체 모델 없이 그대로 던진다', async () => {
    generateContentMock.mockRejectedValueOnce(new Error('INVALID_ARGUMENT: bad request'));
    const provider = new GeminiProvider('key', 'primary-model', 'fallback-model');

    await expect(
      provider.generateJson({ systemPrompt: 's', userPrompt: 'u', jsonSchema: {}, schemaName: 'test' }),
    ).rejects.toThrow('INVALID_ARGUMENT');
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it('대체 모델이 설정되지 않았으면 high demand 오류를 그대로 던진다', async () => {
    generateContentMock.mockRejectedValueOnce(highDemandError());
    const provider = new GeminiProvider('key', 'primary-model');

    await expect(
      provider.generateJson({ systemPrompt: 's', userPrompt: 'u', jsonSchema: {}, schemaName: 'test' }),
    ).rejects.toThrow('high demand');
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it('타임아웃도 high demand와 동일하게 대체 모델로 재시도한다', async () => {
    generateContentMock.mockRejectedValueOnce(timeoutError());
    generateContentMock.mockResolvedValueOnce({ text: '정상' });
    const provider = new GeminiProvider('key', 'primary-model', 'fallback-model');

    const result = await provider.generateText({ systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }] });

    expect(result).toBe('정상');
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it('504 DEADLINE_EXCEEDED(실제 관측된 형태)도 대체 모델로 재시도한다', async () => {
    generateContentMock.mockRejectedValueOnce(deadlineExceededError());
    generateContentMock.mockResolvedValueOnce({ text: '정상' });
    const provider = new GeminiProvider('key', 'primary-model', 'fallback-model');

    const result = await provider.generateText({ systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }] });

    expect(result).toBe('정상');
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it('generateJson은 리포트용 긴 타임아웃을, generateText는 채팅용 짧은 타임아웃을 요청에 싣는다', async () => {
    generateContentMock.mockResolvedValue({ text: '{"ok":true}' });
    const provider = new GeminiProvider('key', 'primary-model');

    await provider.generateJson({ systemPrompt: 's', userPrompt: 'u', jsonSchema: {}, schemaName: 'test' });
    expect(generateContentMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ config: expect.objectContaining({ httpOptions: { timeout: 120_000 } }) }),
    );

    generateContentMock.mockResolvedValue({ text: '정상' });
    await provider.generateText({ systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }] });
    expect(generateContentMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ config: expect.objectContaining({ httpOptions: { timeout: 25_000 } }) }),
    );
  });

  it('preferFast면 처음부터 대체(경량) 모델로 호출한다', async () => {
    generateContentMock.mockResolvedValueOnce({ text: '빠른 응답' });
    const provider = new GeminiProvider('key', 'primary-model', 'fallback-model');

    const result = await provider.generateText({
      systemPrompt: 's',
      messages: [{ role: 'user', content: 'hi' }],
      preferFast: true,
    });

    expect(result).toBe('빠른 응답');
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock).toHaveBeenCalledWith(expect.objectContaining({ model: 'fallback-model' }));
  });

  it('preferFast인데 대체 모델이 실패하면 더 물러설 곳이 없어 그대로 던진다', async () => {
    generateContentMock.mockRejectedValueOnce(highDemandError());
    const provider = new GeminiProvider('key', 'primary-model', 'fallback-model');

    await expect(
      provider.generateText({ systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }], preferFast: true }),
    ).rejects.toThrow('high demand');
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it('preferFast이지만 대체 모델이 설정되지 않았으면 기존 주 모델을 그대로 쓴다', async () => {
    generateContentMock.mockResolvedValueOnce({ text: '응답' });
    const provider = new GeminiProvider('key', 'primary-model');

    await provider.generateText({ systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }], preferFast: true });

    expect(generateContentMock).toHaveBeenCalledWith(expect.objectContaining({ model: 'primary-model' }));
  });

  it('generateText도 동일하게 대체 모델로 재시도한다', async () => {
    generateContentMock.mockRejectedValueOnce(highDemandError());
    generateContentMock.mockResolvedValueOnce({ text: '정상' });
    const provider = new GeminiProvider('key', 'primary-model', 'fallback-model');

    const result = await provider.generateText({ systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }] });

    expect(result).toBe('정상');
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });
});
