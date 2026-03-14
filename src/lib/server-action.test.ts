import { describe, expect, it } from "vitest";

import { UnauthorizedError } from "@/lib/http-errors";
import { RepositoryError } from "@/lib/repositories/base";
import { executeServerAction, executeValidatedServerAction, handleServerActionError } from "@/lib/server-action";
import { z } from "@/lib/validation";

describe("server action helpers", () => {
  it("returns success envelopes for successful handlers", async () => {
    const result = await executeServerAction(async () => ({ status: "ok" }));

    expect(result).toEqual({
      success: true,
      data: {
        status: "ok",
      },
    });
  });

  it("returns validation_error for invalid input", async () => {
    const result = await executeValidatedServerAction(
      z.object({
        limit: z.coerce.number().int().min(1),
      }),
      { limit: 0 },
      async ({ limit }) => limit
    );

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.code).toBe("validation_error");
      expect(result.error.details).toBeDefined();
    }
  });

  it("maps unauthorized errors", () => {
    const result = handleServerActionError(new UnauthorizedError("Authentication required."));

    expect(result).toEqual({
      success: false,
      error: {
        code: "unauthorized",
        message: "Authentication required.",
      },
    });
  });

  it("maps repository errors", () => {
    const result = handleServerActionError(new RepositoryError("Storage failed."));

    expect(result).toEqual({
      success: false,
      error: {
        code: "repository_error",
        message: "Storage failed.",
        details: undefined,
      },
    });
  });
});
