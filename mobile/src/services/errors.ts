export class ApiClientError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = 'ApiClientError';
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

export class ApiAuthError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = 'ApiAuthError';
    Object.setPrototypeOf(this, ApiAuthError.prototype);
  }
}

export class ApiServerError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = 'ApiServerError';
    Object.setPrototypeOf(this, ApiServerError.prototype);
  }
}
