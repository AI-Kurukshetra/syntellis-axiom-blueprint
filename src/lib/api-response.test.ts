import { describe, expect, it } from "vitest";

import { handleApiError, ok } from "@/lib/api-response";
import { UnauthorizedError } from "@/lib/http-errors";
import { validateInput, z } from "@/lib/validation";

describe("api response helpers", () => {
  it("returns a consistent success envelope", async () => {
    const response = ok({ module: "admin" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        module: "admin",
      },
    });
  });

  it("maps validation errors to bad_request responses", async () => {
    let validationError: unknown;

    try {
      validateInput(
        z.object({
          email: z.string().email(),
        }),
        { email: "bad" }
      );
    } catch (error) {
      validationError = error;
    }

    const response = handleApiError(validationError);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "bad_request",
      },
    });
  });

  it("maps unauthorized errors to 401 responses", async () => {
    const response = handleApiError(new UnauthorizedError("Denied."));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "unauthorized",
        message: "Denied.",
      },
    });
  });
});
