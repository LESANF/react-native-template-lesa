import { dayjs } from '@/lib/dayjs';

const COMMA_REGEX = /,/g;

// 로케일 중립인 표기만. 통화 단위·전화번호·주소 형식은 앱이 자기 규칙으로 추가한다.
export const formatUtils = {
  optional: (value: string | number | undefined): string => {
    if (!value) return '-';
    return String(value);
  },

  number: (value: number | undefined, suffix?: string): string => {
    if (!value) return `0${suffix ?? ''}`;
    return `${value.toLocaleString()}${suffix ?? ''}`;
  },

  signedNumber: (value: number, suffix?: string): string => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toLocaleString()}${suffix ?? ''}`;
  },

  parseNumber: (text: string): number | null => {
    const cleaned = text.replace(COMMA_REGEX, '');
    if (cleaned === '') return null;
    const num = Number(cleaned);
    return Number.isNaN(num) ? null : num;
  },

  /** 형식은 호출부가 정한다 — dayjs 토큰. 로케일은 lib/dayjs 가 건다. */
  date: (dateStr: string | null | undefined, format: string): string => {
    if (!dateStr) return '';
    return dayjs(dateStr).format(format);
  },

  compactJoin: (parts: (string | null | undefined)[], separator = ''): string => {
    return parts.filter(Boolean).join(separator);
  },
};
