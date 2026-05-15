export class TiendanubeApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly endpoint: string;

  constructor(
    status: number,
    code: string | undefined,
    message: string,
    endpoint: string,
  ) {
    super(message);
    this.name = "TiendanubeApiError";
    this.status = status;
    this.code = code;
    this.endpoint = endpoint;
  }
}

export class TiendanubeRateLimitError extends TiendanubeApiError {
  constructor(endpoint: string, message = "rate limit exhausted") {
    super(429, "rate_limited", message, endpoint);
    this.name = "TiendanubeRateLimitError";
  }
}

export class TiendanubeNotFoundError extends TiendanubeApiError {
  constructor(endpoint: string, message = "not found") {
    super(404, "not_found", message, endpoint);
    this.name = "TiendanubeNotFoundError";
  }
}

export class TiendanubeNetworkError extends Error {
  readonly endpoint: string;
  constructor(cause: unknown, endpoint: string) {
    super(`network error en ${endpoint}`);
    this.name = "TiendanubeNetworkError";
    this.endpoint = endpoint;
    this.cause = cause;
  }
}
