import { ZodError, type ZodTypeAny, z } from "zod";

export { z };

export class ValidationError extends Error {
  constructor(public readonly zodError: ZodError, message = "Validation failed.") {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateInput<TSchema extends ZodTypeAny>(schema: TSchema, input: unknown): z.infer<TSchema> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError(parsed.error);
  }

  return parsed.data;
}

export function getSearchParamsObject(searchParams: URLSearchParams) {
  const entries = Array.from(searchParams.keys()).reduce<Record<string, string | string[]>>((acc, key) => {
    const values = searchParams.getAll(key);
    acc[key] = values.length > 1 ? values : (values[0] ?? "");
    return acc;
  }, {});

  return entries;
}

export function validateSearchParams<TSchema extends ZodTypeAny>(schema: TSchema, url: URL) {
  return validateInput(schema, getSearchParamsObject(url.searchParams));
}
