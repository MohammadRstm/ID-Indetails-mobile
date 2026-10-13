import { fetch as expoFetch } from "expo/fetch";
import { ApiError, type ApiErrorBody } from "@/api/errors";
import type { ProtonReply } from "@/api/types";
import { tokenManager } from "@/auth/tokenManager";
import { env } from "@/config/env";
import { askProtonJson, type AskBody } from "./api";
import { parseSse, type SseEvent } from "./sse";

/*
 * Asking Proton live (ported from the web's protonStream.ts): POST /api/proton/messages/stream answers with
 * server-sent events (status, delta, then done or error). It goes through expo/fetch rather than the axios
 * client, which can't read a body as it arrives, so the token and the one refresh on a 401 are done here the
 * way src/api/http.ts does them. Failures before the stream starts are ordinary JSON errors.
 */

const STREAM_URL = `${env.apiUrl}/api/proton/messages/stream`;

/** The part of a fetch response the stream needs; expo/fetch's response fits it, and a test can fake it. */
export type StreamResponse = {
  ok: boolean;
  status: number;
  body: { getReader(): StreamReader } | null;
  json(): Promise<unknown>;
};
type StreamReader = {
  read(): Promise<{ done: boolean; value?: Uint8Array }>;
  cancel(): Promise<void>;
};
export type StreamRequest = {
  method: "POST";
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
};
export type StreamTransport = (url: string, init: StreamRequest) => Promise<StreamResponse>;

const expoTransport: StreamTransport = (url, init) => expoFetch(url, init);

/** What Proton is doing, and the answer as it is written. */
export type StreamListener = {
  onStatus: (text: string) => void;
  onDelta: (trip: number, text: string) => void;
};

/** Streaming isn't available here, or failed before anything arrived: the JSON endpoint can answer instead. */
export class StreamUnavailableError extends Error {}

/** The status the API gives each kind of error, for an error that comes as an event after the answer started. */
const STATUS_OF_TYPE: Record<string, number> = {
  validation: 400,
  authentication: 401,
  authorization: 403,
  not_found: 404,
  conflict: 409,
  business_rule: 422,
  rate_limited: 429,
  unavailable: 503,
};

const bearer = (token: string) => `Bearer ${token}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function post(
  transport: StreamTransport,
  body: AskBody,
  token: string | null,
  signal: AbortSignal,
) {
  return transport(STREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: bearer(token) } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });
}

/** The response to the question; a 401 is answered once with a refreshed token, as the HTTP client does. */
async function open(
  transport: StreamTransport,
  body: AskBody,
  signal: AbortSignal,
): Promise<StreamResponse> {
  const sentWith = tokenManager.getAccessToken();
  const response = await post(transport, body, sentWith, signal);
  if (response.status !== 401) return response;

  // A refresh finished while this request was out: its token is already new, no need for another refresh.
  const current = tokenManager.getAccessToken();
  const token = current && current !== sentWith ? current : await refreshed();
  return token ? post(transport, body, token, signal) : response;
}

/** A refresh that couldn't reach the API fails the question and keeps the session, as in the HTTP client. */
async function refreshed(): Promise<string | null> {
  try {
    return await tokenManager.refresh();
  } catch (error) {
    throw error instanceof ApiError ? error : new ApiError(0, {});
  }
}

async function errorOf(response: StreamResponse): Promise<ApiError> {
  try {
    const body = await response.json();
    return new ApiError(response.status, isRecord(body) ? (body as Partial<ApiErrorBody>) : {});
  } catch {
    return new ApiError(response.status, {});
  }
}

/** Tells the listener what an event says, and returns the finished reply when it is the `done` event. */
function handle(event: SseEvent, listener: StreamListener): ProtonReply | null {
  const data: unknown = JSON.parse(event.data);
  if (!isRecord(data)) return null;
  switch (event.name) {
    case "status":
      if (typeof data.text === "string") listener.onStatus(data.text);
      return null;
    case "delta":
      if (typeof data.trip === "number" && typeof data.text === "string") {
        listener.onDelta(data.trip, data.text);
      }
      return null;
    case "done":
      if (typeof data.reply !== "string" || typeof data.conversationId !== "string") {
        throw new ApiError(0, {});
      }
      return data as unknown as ProtonReply;
    case "error":
      throw new ApiError(STATUS_OF_TYPE[String(data.type)] ?? 500, data as Partial<ApiErrorBody>);
    default:
      return null;
  }
}

/**
 * One question, answered live: `listener` hears what Proton is doing and the answer as it is written, and the
 * promise gives the finished reply (the same as the JSON endpoint's). Rejects with an ApiError, with a
 * StreamUnavailableError when nothing had arrived yet, or when `signal` stops it.
 */
export async function streamQuestion(
  body: AskBody,
  listener: StreamListener,
  signal: AbortSignal,
  transport: StreamTransport = expoTransport,
): Promise<ProtonReply> {
  let response: StreamResponse;
  try {
    response = await open(transport, body, signal);
  } catch (error) {
    if (signal.aborted || error instanceof ApiError) throw error;
    throw new StreamUnavailableError();
  }
  if (!response.ok) throw await errorOf(response);
  if (!response.body) throw new StreamUnavailableError();

  const reader = response.body.getReader();
  const stop = () => void reader.cancel().catch(() => undefined);
  // A read in progress ends at once on Stop, whatever the transport does with the abort.
  signal.addEventListener("abort", stop, { once: true });
  if (signal.aborted) stop();
  const decoder = new TextDecoder();
  let buffer = "";
  let heard = false;
  let reply: ProtonReply | null = null;
  try {
    while (!reply) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) buffer += decoder.decode(value, { stream: true });
      const parsed = parseSse(buffer);
      buffer = parsed.rest;
      for (const event of parsed.events) {
        heard = true;
        reply = handle(event, listener) ?? reply;
      }
    }
  } catch (error) {
    if (signal.aborted || error instanceof ApiError) throw error;
    throw heard ? new ApiError(0, {}) : new StreamUnavailableError();
  } finally {
    signal.removeEventListener("abort", stop);
    stop();
  }

  if (signal.aborted) throw new ApiError(-1, { message: "Stopped." });
  if (!reply) throw heard ? new ApiError(0, {}) : new StreamUnavailableError();
  return reply;
}

/** Asks live, or on the JSON endpoint when streaming isn't available or failed before anything arrived. */
export async function askProton(
  body: AskBody,
  listener: StreamListener,
  signal: AbortSignal,
  transport?: StreamTransport,
): Promise<ProtonReply> {
  try {
    return await streamQuestion(body, listener, signal, transport);
  } catch (error) {
    if (error instanceof StreamUnavailableError) return askProtonJson(body, signal);
    throw error;
  }
}
