import { toApiError } from "@/api/errors";

/*
 * The words for the auth endpoints' failures, by the API's code (docs/contracts.md section 2). Anything else
 * shows the API's own safe message: `sign_in_suspended` says why and what to do, and an unreachable server
 * says to check the connection.
 */

export function requestErrorMessage(error: unknown): string {
  const apiError = toApiError(error);
  if (apiError.code === "too_many_requests" || apiError.code === "rate_limited") {
    return "Too many attempts. Wait a minute and try again.";
  }
  return apiError.message;
}

export function signInErrorMessage(error: unknown): string {
  if (toApiError(error).code === "invalid_credentials") {
    return "That email and password don't match an account.";
  }
  return requestErrorMessage(error);
}
