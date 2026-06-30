import { AxiosError, isAxiosError, isCancel } from 'axios';

const CLIENT_ERROR_MIN_STATUS = 400;
const SERVER_ERROR_MIN_STATUS = 500;

export const API_ERROR_CODES = {
  canceled: 'CANCELED',
  http: 'HTTP_ERROR',
  network: 'NETWORK_ERROR',
  timeout: 'TIMEOUT_ERROR',
  unknown: 'UNKNOWN_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES] | string;

type ApiErrorInit = {
  readonly status?: number;
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly isNetworkError: boolean;
  readonly raw: unknown;
};

export class ApiError extends Error {
  readonly name = 'ApiError';
  readonly status?: number;
  readonly code: ApiErrorCode;
  readonly isNetworkError: boolean;
  readonly raw: unknown;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.status = init.status;
    this.code = init.code;
    this.isNetworkError = init.isNetworkError;
    this.raw = init.raw;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringField(value: unknown, keys: readonly string[]): string | undefined {
  if (!isRecord(value)) return undefined;

  for (const key of keys) {
    const field = value[key];
    if (typeof field === 'string' && field.length > 0) return field;
  }

  return undefined;
}

function toHttpError(error: AxiosError): ApiError {
  const response = error.response;
  if (!response) {
    return new ApiError({
      code: API_ERROR_CODES.network,
      message: 'Network request failed.',
      isNetworkError: true,
      raw: error,
    });
  }

  const status = response.status;
  const code = readStringField(response.data, ['code', 'errorCode']) ?? API_ERROR_CODES.http;
  const message =
    readStringField(response.data, ['message', 'error', 'detail']) ??
    response.statusText ??
    error.message;

  return new ApiError({
    status,
    code,
    message,
    isNetworkError: false,
    raw: error,
  });
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    if (isCancel(error) || error.code === AxiosError.ERR_CANCELED) {
      return new ApiError({
        code: API_ERROR_CODES.canceled,
        message: 'Request was canceled.',
        isNetworkError: false,
        raw: error,
      });
    }

    if (error.code === AxiosError.ECONNABORTED) {
      return new ApiError({
        code: API_ERROR_CODES.timeout,
        message: 'Request timed out.',
        isNetworkError: true,
        raw: error,
      });
    }

    return toHttpError(error);
  }

  if (error instanceof Error) {
    return new ApiError({
      code: API_ERROR_CODES.unknown,
      message: error.message,
      isNetworkError: false,
      raw: error,
    });
  }

  return new ApiError({
    code: API_ERROR_CODES.unknown,
    message: 'Unknown API error.',
    isNetworkError: false,
    raw: error,
  });
}

export function isRetryableApiError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.code === API_ERROR_CODES.canceled) return false;
  if (error.isNetworkError) return true;
  if (error.status === undefined) return false;
  if (error.status >= CLIENT_ERROR_MIN_STATUS && error.status < SERVER_ERROR_MIN_STATUS) return false;
  return error.status >= SERVER_ERROR_MIN_STATUS;
}
