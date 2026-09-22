import { formatUtils } from '@/utils/format';

describe('formatUtils', () => {
  it('숫자를 천 단위로 끊는다', () => {
    expect(formatUtils.number(185000)).toBe('185,000');
    expect(formatUtils.number(undefined, 'P')).toBe('0P');
    expect(formatUtils.signedNumber(-3000, 'P')).toBe('-3,000P');
    expect(formatUtils.signedNumber(3000, 'P')).toBe('+3,000P');
    expect(formatUtils.parseNumber('1,234')).toBe(1234);
    expect(formatUtils.parseNumber('')).toBeNull();
    expect(formatUtils.parseNumber('abc')).toBeNull();
  });

  it('빈 값은 대시, 빈 조각은 건너뛴다', () => {
    expect(formatUtils.optional(undefined)).toBe('-');
    expect(formatUtils.optional(0)).toBe('-');
    expect(formatUtils.compactJoin(['a', null, '', 'b'], ' ')).toBe('a b');
  });

  it('날짜는 호출부 형식으로, 요일은 기본 로케일로 쓴다', () => {
    expect(formatUtils.date('2025-07-17T13:47:00', 'YYYY.MM.DD (dd) HH:mm')).toBe(
      '2025.07.17 (목) 13:47'
    );
    expect(formatUtils.date(null, 'YYYY')).toBe('');
  });
});
