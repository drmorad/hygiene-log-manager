// Lightweight HTTP error used across routes so the global error handler can
// return a proper status code instead of a 500.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

export function assert(condition: unknown, status: number, message: string): asserts condition {
  if (!condition) throw new HttpError(status, message);
}
