export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: any;
  public readonly isTimeout: boolean;

  constructor(
    message: string,
    statusCode = 500,
    errorCode = 'API_ERROR',
    details?: any,
    isTimeout = false
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isTimeout = isTimeout;
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 35000;

export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    // Remove trailing slash if present
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
};

export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers = {}, signal, ...restOptions } = options;
  const baseUrl = getApiBaseUrl();

  // Normalize endpoint path
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = baseUrl ? `${baseUrl}${normalizedEndpoint}` : normalizedEndpoint;

  // Setup abort controller for timeout handling
  const timeoutController = new AbortController();
  let isTimedOut = false;

  const timeoutId = setTimeout(() => {
    isTimedOut = true;
    timeoutController.abort();
  }, timeoutMs);

  // Link external signal if provided
  if (signal) {
    signal.addEventListener('abort', () => {
      timeoutController.abort();
    });
  }

  try {
    const response = await fetch(fullUrl, {
      ...restOptions,
      signal: timeoutController.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
    });

    clearTimeout(timeoutId);

    // Parse JSON response
    let responseData: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      responseData = { message: text };
    }

    if (!response.ok) {
      const errorMessage =
        responseData?.error?.message ||
        responseData?.message ||
        `HTTP Request failed with status ${response.status}: ${response.statusText}`;
      const errorCode = responseData?.error?.code || `HTTP_${response.status}`;
      const errorDetails = responseData?.error?.details || responseData;

      throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
    }

    return responseData as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (isTimedOut || error.name === 'AbortError') {
      if (isTimedOut) {
        throw new ApiError(
          `Request to backend timed out after ${timeoutMs / 1000}s. Please verify server connectivity.`,
          408,
          'REQUEST_TIMEOUT',
          null,
          true
        );
      }
      throw new ApiError('Request was canceled.', 499, 'REQUEST_ABORTED');
    }

    // Network / connection refused errors
    throw new ApiError(
      error.message || 'Network error: Failed to reach backend API.',
      0,
      'NETWORK_ERROR',
      error
    );
  }
};
