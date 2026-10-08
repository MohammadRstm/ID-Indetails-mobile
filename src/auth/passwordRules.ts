// Ported from the web client: src/auth/passwordRules.ts (see docs/ported-from-web.md).
import { z } from "zod";

// The API's rule (ValidationRules.NewPassword): length is what makes a password strong, no composition rules.
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export const newPassword = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`);

export const email = z
  .string()
  .trim()
  .min(1, "Enter your email.")
  .pipe(z.email("Enter a valid email address."));

export const PASSWORD_HINT = `At least ${PASSWORD_MIN} characters. A few words together make a strong one.`;

/** The first message per field of a failed parse, keyed by the field's name. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    out[field] ??= issue.message;
  }
  return out;
}
