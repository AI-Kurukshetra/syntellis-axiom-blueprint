import { ZodError, type ZodTypeAny } from "zod";

import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/http-errors";
import { RepositoryError } from "@/lib/repositories/base";
import { ValidationError, validateInput } from "@/lib/validation";

export type ServerActionSuccess<T> = {
  success: true;
  data: T;
};

export type ServerActionFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ServerActionResult<T> = ServerActionSuccess<T> | ServerActionFailure;

export function handleServerActionError(error: unknown): ServerActionFailure {
  if (error instanceof ValidationError) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: error.message,
        details: error.zodError.flatten(),
      },
    };
  }

  if (error instanceof ZodError) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: "Validation failed.",
        details: error.flatten(),
      },
    };
  }

  if (error instanceof UnauthorizedError) {
    return {
      success: false,
      error: {
        code: "unauthorized",
        message: error.message,
      },
    };
  }

  if (error instanceof ForbiddenError) {
    return {
      success: false,
      error: {
        code: "forbidden",
        message: error.message,
      },
    };
  }

  if (error instanceof NotFoundError) {
    return {
      success: false,
      error: {
        code: "not_found",
        message: error.message,
      },
    };
  }

  if (error instanceof RepositoryError) {
    return {
      success: false,
      error: {
        code: "repository_error",
        message: error.message,
        details: error.cause ?? undefined,
      },
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: "unexpected_error",
        message: error.message,
      },
    };
  }

  return {
    success: false,
    error: {
      code: "unexpected_error",
      message: "An unexpected server action error occurred.",
    },
  };
}

export async function executeServerAction<TOutput>(handler: () => Promise<TOutput> | TOutput): Promise<ServerActionResult<TOutput>> {
  try {
    const data = await handler();
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleServerActionError(error);
  }
}

export async function executeValidatedServerAction<TSchema extends ZodTypeAny, TOutput>(
  schema: TSchema,
  input: unknown,
  handler: (parsedInput: import("zod").infer<TSchema>) => Promise<TOutput> | TOutput
): Promise<ServerActionResult<TOutput>> {
  return executeServerAction(async () => {
    const parsedInput = validateInput(schema, input);
    return handler(parsedInput);
  });
}
