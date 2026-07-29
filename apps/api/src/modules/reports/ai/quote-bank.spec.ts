import { QUOTE_BANK, QUOTE_IDS, findQuoteById } from './quote-bank';

describe('quote-bank', () => {
  it('id가 서로 중복되지 않는다', () => {
    expect(new Set(QUOTE_IDS).size).toBe(QUOTE_IDS.length);
  });

  it('모든 항목은 인용문·저자·주제 태그를 갖는다', () => {
    for (const entry of QUOTE_BANK) {
      expect(entry.quote.length).toBeGreaterThan(0);
      expect(entry.author.length).toBeGreaterThan(0);
      expect(entry.themes.length).toBeGreaterThan(0);
    }
  });

  it('findQuoteById는 존재하는 id에 대해서만 항목을 반환한다', () => {
    expect(findQuoteById(QUOTE_BANK[0].id)).toEqual(QUOTE_BANK[0]);
    expect(findQuoteById('no-such-id')).toBeUndefined();
  });
});
