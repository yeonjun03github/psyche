import { normalizeToPercent, possibleRawScoreRange } from './score-normalizer';

describe('score-normalizer', () => {
  it('PHQ-9(9문항, 0-3, 단순합산)의 이론적 범위를 계산한다', () => {
    expect(possibleRawScoreRange(9, 0, 3, 1, 1)).toEqual({ min: 0, max: 27 });
  });

  it('WHO-5(5문항, 0-5, ×4)의 이론적 범위를 계산한다', () => {
    expect(possibleRawScoreRange(5, 0, 5, 4, 1)).toEqual({ min: 0, max: 100 });
  });

  it('BRS(6문항, 1-5, 평균)의 이론적 범위를 계산한다', () => {
    expect(possibleRawScoreRange(6, 1, 5, 1, 6)).toEqual({ min: 1, max: 5 });
  });

  it('구간 내 값을 0-100으로 선형 정규화한다', () => {
    expect(normalizeToPercent(0, 0, 27)).toBe(0);
    expect(normalizeToPercent(27, 0, 27)).toBe(100);
    expect(normalizeToPercent(14, 0, 27)).toBe(52);
  });

  it('범위를 벗어나는 값은 0-100으로 clamp한다', () => {
    expect(normalizeToPercent(-5, 0, 27)).toBe(0);
    expect(normalizeToPercent(30, 0, 27)).toBe(100);
  });
});
