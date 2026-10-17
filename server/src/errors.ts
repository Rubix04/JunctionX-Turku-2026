/**
 * Errors the API returns on purpose. They are sent as
 * `{ "error": { "code": "PET_NOT_FOUND", "message": "..." } }` with the given status.
 * `code` is stable for the client to branch on; `message` is for developers, not end users.
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (code: string, message: string) => new ApiError(404, code, message);
export const unauthorized = (code: string, message: string) => new ApiError(401, code, message);
export const forbidden = (code: string, message: string) => new ApiError(403, code, message);
export const badRequest = (code: string, message: string) => new ApiError(400, code, message);
