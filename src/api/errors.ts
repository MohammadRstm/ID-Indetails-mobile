// Ported from the web client: src/api/errors.ts (see docs/ported-from-web.md). The phone keeps every message
// per field (fieldErrors: string[]) and the trace id, as docs/contracts.md section 4 sets out.
import { isAxiosError } from "axios";

/** The API's uniform error body: every failure has this shape. */
export type ApiErrorBody = {
  type: string;
  code: string;
  message: string;
  errors: Record<string, string[]> | null;
  traceId?: string;
};

export class ApiError extends Error {
  /** The HTTP status; 0 when the server couldn't be reached, -1 for a failure outside a request. */
  readonly status: number;
  readonly type: string;
  /** What screens branch on, never the message text. */
  readonly code: string;
  readonly fieldErrors: Record<string, string[]>;
  readonly traceId: string | null;

  constructor(status: number, body: Partial<ApiErrorBody>) {
    super(body.message || defaultMessage(status));
    this.name = "ApiError";
    this.status = status;
    this.type = body.type || "unexpected";
    this.code = body.code || (status === 0 ? "network_error" : "internal_error");
    this.fieldErrors = fieldErrorsOf(body.errors);
    this.traceId = body.traceId ?? null;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

function defaultMessage(status: number): string {
  if (status === 0) return "The server can't be reached. Check your connection and try again.";
  if (status === 401) return "Please sign in again.";
  if (status === 403) return "You don't have access to this.";
  if (status === 404) return "This couldn't be found.";
  if (status === 429) return "Too many requests. Wait a moment and try again.";
  return "Something went wrong. Please try again.";
}

/**
 * Field errors keyed the way forms name their fields. The API sends camelCase paths ("contacts[0].value");
 * malformed JSON comes as "$.startedAt", and errors about the whole request as "request".
 */
function fieldErrorsOf(
  errors: Record<string, string[]> | null | undefined,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!errors) return out;
  for (const [key, messages] of Object.entries(errors)) {
    const field = key.replace(/^\$\.?/, "");
    const name = field.charAt(0).toLowerCase() + field.slice(1);
    if (messages?.length) out[name] = [...(out[name] ?? []), ...messages];
  }
  return out;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isErrorBody(data: unknown): data is Partial<ApiErrorBody> {
  return typeof data === "object" && data !== null && "code" in data;
}

/** Any failure from a request, as an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    if (!error.response) return new ApiError(0, {});
    const data: unknown = error.response.data;
    return new ApiError(error.response.status, isErrorBody(data) ? data : {});
  }
  return new ApiError(-1, { message: error instanceof Error ? error.message : undefined });
}
