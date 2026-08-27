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

  it('generateText도 동일하게 대체 모델로 재시도한다', async () => {
    generateContentMock.mockRejectedValueOnce(highDemandError());
    generateContentMock.mockResolvedValueOnce({ text: '정상' });
    const provider = new GeminiProvider('key', 'primary-model', 'fallback-model');

    const result = await provider.generateText({ systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }] });

    expect(result).toBe('정상');
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });
});
