import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/http-errors";
import { RepositoryError } from "@/lib/repositories/base";
import { ValidationError } from "@/lib/validation";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function failure(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json<ApiFailure>(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

export function badRequest(message: string, details?: unknown) {
  return failure(400, "bad_request", message, details);
}

export function unauthorized(message = "Authentication is required.") {
  return failure(401, "unauthorized", message);
}

export function forbidden(message = "You do not have permission to access this resource.") {
  return failure(403, "forbidden", message);
}

export function notFound(message = "The requested resource was not found.") {
  return failure(404, "not_found", message);
}

export function notImplemented(message = "This endpoint is scaffolded but not implemented yet.") {
  return failure(501, "not_implemented", message);
}

export function internalServerError(message = "An unexpected server error occurred.", details?: unknown) {
  return failure(500, "internal_server_error", message, details);
}

export function handleApiError(error: unknown) {
  if (error instanceof ValidationError) {
    return badRequest(error.message, error.zodError.flatten());
  }

  if (error instanceof ZodError) {
    return badRequest("Validation failed.", error.flatten());
  }

  if (error instanceof UnauthorizedError) {
    return unauthorized(error.message);
  }

  if (error instanceof ForbiddenError) {
    return forbidden(error.message);
  }

  if (error instanceof NotFoundError) {
    return notFound(error.message);
  }

  if (error instanceof RepositoryError) {
    return internalServerError(error.message, error.cause ?? undefined);
  }

  if (error instanceof Error) {
    return internalServerError(error.message);
  }

  return internalServerError();
}
