import { ValidationError, z } from "@/lib/validation";

const emailSchema = z.string().trim().min(1, "Email is required.").email("Enter a valid email address.");
const passwordSchema = z.string().min(1, "Password is required.");

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(2, "Enter your full name."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export function getAuthValidationMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ValidationError) {
    const fieldErrors = error.zodError.flatten().fieldErrors;
    const firstFieldError = Object.values(fieldErrors).flat()[0];
    return typeof firstFieldError === "string" ? firstFieldError : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
