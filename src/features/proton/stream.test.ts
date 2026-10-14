import { ApiError } from "@/api/errors";
import type { ProtonReply } from "@/api/types";
import { tokenManager } from "@/auth/tokenManager";
import { askProtonJson } from "./api";
import {
  askProton,
  StreamUnavailableError,
  streamQuestion,
  type StreamListener,
  type StreamRequest,
  type StreamResponse,
  type StreamTransport,
} from "./stream";

jest.mock("@/auth/tokenManager", () => ({
  tokenManager: { getAccessToken: jest.fn(), refresh: jest.fn() },
}));
jest.mock("./api", () => ({ askProtonJson: jest.fn() }));

const getAccessToken = tokenManager.getAccessToken as jest.Mock;
const refresh = tokenManager.refresh as jest.Mock;
const askJson = askProtonJson as jest.Mock;

const encoder = new TextEncoder();
const reply = { conversationId: "c1", reply: "Villa Haddad is on track." } as ProtonReply;

const event = (name: string, data: unknown) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;

/** A streamed response that delivers these chunks, one read each. */
function streamed(chunks: string[]): StreamResponse {
  let next = 0;
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
    body: {
      getReader: () => ({
        read: async () =>
          next < chunks.length
            ? { done: false, value: encoder.encode(chunks[next++]) }
            : { done: true },
        cancel: async () => undefined,
      }),
    },
  };
}

const refused = (status: number, body: unknown): StreamResponse => ({
  ok: false,
  status,
  json: async () => body,
  body: null,
});

function listener() {
  const heard: string[] = [];
  const on: StreamListener = {
    onStatus: (text) => heard.push(`status:${text}`),
    onDelta: (trip, text) => heard.push(`delta:${trip}:${text}`),
  };
  return { heard, on };
}

/** The transport answers each call with the next response. */
function transportOf(...responses: StreamResponse[]) {
  const calls: StreamRequest[] = [];
  const transport: StreamTransport = async (_url, init) => {
    calls.push(init);
    return responses[Math.min(calls.length, responses.length) - 1];
  };
  return { calls, transport };
}

beforeEach(() => {
  jest.clearAllMocks();
  getAccessToken.mockReturnValue(null);
});

describe("streamQuestion", () => {
  it("tells the listener what Proton does and returns the finished reply", async () => {
    const done = event("done", reply);
    const { heard, on } = listener();
    const { transport } = transportOf(
      streamed([
        ": ping\n\n",
        event("status", { text: "Reading the project" }),
        event("delta", { trip: 1, text: "Villa " }),
        // the finished reply arrives cut in two
        event("delta", { trip: 1, text: "Haddad" }) + done.slice(0, 30),
        done.slice(30),
      ]),
    );
    const result = await streamQuestion(
      { conversationId: null, text: "How is it?" },
      on,
      new AbortController().signal,
      transport,
    );
    expect(result).toEqual(reply);
    expect(heard).toEqual(["status:Reading the project", "delta:1:Villa ", "delta:1:Haddad"]);
  });

  it("sends the question with the bearer token", async () => {
    getAccessToken.mockReturnValue("token-1");
    const { calls, transport } = transportOf(streamed([event("done", reply)]));
    await streamQuestion(
      { conversationId: "c1", suggestion: 2 },
      listener().on,
      new AbortController().signal,
      transport,
    );
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers.Authorization).toBe("Bearer token-1");
    expect(calls[0].headers.Accept).toBe("text/event-stream");
    expect(JSON.parse(calls[0].body)).toEqual({ conversationId: "c1", suggestion: 2 });
  });

  it("refreshes the session once on a 401 and asks again with the new token", async () => {
    getAccessToken.mockReturnValue("old");
    refresh.mockResolvedValue("new");
    const { calls, transport } = transportOf(refused(401, {}), streamed([event("done", reply)]));
    await streamQuestion(
      { conversationId: null, text: "Hi" },
      listener().on,
      new AbortController().signal,
      transport,
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.headers.Authorization)).toEqual(["Bearer old", "Bearer new"]);
  });

  it("reads the error a refused question comes with, before the stream starts", async () => {
    const { transport } = transportOf(
      refused(404, { type: "not_found", code: "proton_conversation_ended", message: "Gone." }),
    );
    const failure = await streamQuestion(
      { conversationId: "c1", text: "Hi" },
      listener().on,
      new AbortController().signal,
      transport,
    ).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 404, code: "proton_conversation_ended" });
  });

  it("fails with the uniform error that comes as an event after the answer started", async () => {
    const { transport } = transportOf(
      streamed([
        event("status", { text: "Looking" }),
        event("error", { type: "business_rule", code: "proton_limit", message: "Too long." }),
      ]),
    );
    const failure = await streamQuestion(
      { conversationId: null, text: "Hi" },
      listener().on,
      new AbortController().signal,
      transport,
    ).catch((e: unknown) => e);
    expect(failure).toMatchObject({ status: 422, code: "proton_limit", message: "Too long." });
  });

  it("is unavailable when nothing arrived: no connection, no body, empty stream", async () => {
    const run = (transport: StreamTransport) =>
      streamQuestion(
        { conversationId: null, text: "Hi" },
        listener().on,
        new AbortController().signal,
        transport,
      );
    await expect(
      run(async () => {
        throw new TypeError("Network request failed");
      }),
    ).rejects.toBeInstanceOf(StreamUnavailableError);
    await expect(
      run(async () => ({ ok: true, status: 200, json: async () => ({}), body: null })),
    ).rejects.toBeInstanceOf(StreamUnavailableError);
    await expect(run(transportOf(streamed([": ping\n\n"])).transport)).rejects.toBeInstanceOf(
      StreamUnavailableError,
    );
  });

  it("is a network failure, not unavailable, when the stream breaks after it started", async () => {
    const { transport } = transportOf(streamed([event("status", { text: "Looking" })]));
    const failure = await streamQuestion(
      { conversationId: null, text: "Hi" },
      listener().on,
      new AbortController().signal,
      transport,
    ).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 0 });
  });

  it("ends a read in progress as soon as it is stopped", async () => {
    let release = () => {};
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const waiting: StreamResponse = {
      ok: true,
      status: 200,
      json: async () => ({}),
      body: {
        getReader: () => ({
          read: async () => {
            await blocked;
            return { done: true };
          },
          cancel: async () => release(),
        }),
      },
    };
    const controller = new AbortController();
    const asked = streamQuestion(
      { conversationId: null, text: "Hi" },
      listener().on,
      controller.signal,
      async () => waiting,
    );
    controller.abort();
    await expect(asked).rejects.toBeInstanceOf(ApiError);
    expect(controller.signal.aborted).toBe(true);
  });
});

describe("askProton", () => {
  const body = { conversationId: null, text: "Hi" };

  it("asks on the JSON endpoint when streaming is unavailable", async () => {
    askJson.mockResolvedValue(reply);
    const signal = new AbortController().signal;
    const result = await askProton(body, listener().on, signal, async () => {
      throw new TypeError("Network request failed");
    });
    expect(result).toEqual(reply);
    expect(askJson).toHaveBeenCalledWith(body, signal);
  });

  it("does not ask again on the JSON endpoint when the API refused the question", async () => {
    const { transport } = transportOf(refused(422, { type: "business_rule", code: "proton_x" }));
    await expect(
      askProton(body, listener().on, new AbortController().signal, transport),
    ).rejects.toMatchObject({ code: "proton_x" });
    expect(askJson).not.toHaveBeenCalled();
  });
});
