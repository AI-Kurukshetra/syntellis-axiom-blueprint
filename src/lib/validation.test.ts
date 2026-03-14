import { describe, expect, it } from "vitest";

import { ValidationError, getSearchParamsObject, validateInput, validateSearchParams, z } from "@/lib/validation";

describe("validation helpers", () => {
  it("returns parsed input for valid payloads", () => {
    const schema = z.object({
      email: z.string().email(),
      limit: z.coerce.number().int().min(1),
    });

    const result = validateInput(schema, {
      email: "ops@example.com",
      limit: "5",
    });

    expect(result).toEqual({
      email: "ops@example.com",
      limit: 5,
    });
  });

  it("throws ValidationError for invalid payloads", () => {
    const schema = z.object({
      email: z.string().email(),
    });

    expect(() => validateInput(schema, { email: "not-an-email" })).toThrow(ValidationError);
  });

  it("keeps repeated search params as arrays", () => {
    const params = new URLSearchParams("scope=facility&scope=department&limit=8");

    expect(getSearchParamsObject(params)).toEqual({
      scope: ["facility", "department"],
      limit: "8",
    });
  });

  it("validates URL search params with coercion", () => {
    const schema = z.object({
      limit: z.coerce.number().int().min(1).max(10),
      status: z.string(),
    });

    const result = validateSearchParams(schema, new URL("https://example.com/admin?limit=3&status=active"));

    expect(result).toEqual({
      limit: 3,
      status: "active",
    });
  });
});
