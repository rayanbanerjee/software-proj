import type { ApiErrorResponse } from "@repo/shared-types";

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toApiErrorResponse(error: AppError): ApiErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode
    }
  };
}

