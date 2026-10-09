import { http as mock, HttpResponse } from "msw";
import { tokenManager } from "@/auth/tokenManager";
import { authResponse, REFRESH_TOKEN_KEY } from "@test/auth";
import { api } from "@test/handlers";
import { secureStoreItems } from "@test/mocks/secureStore";
import { server } from "@test/server";
import { isApiError, type ApiError } from "./errors";
import { http } from "./http";

beforeEach(async () => {
  await tokenManager.clearSession();
  secureStoreItems.clear();
});

/** A protected endpoint that only accepts the given access token. */
function protectedThing(accepted: string) {
  const seen: (string | null)[] = [];
  server.use(
    mock.get(api("/thing"), ({ request }) => {
      const header = request.headers.get("Authorization");
      seen.push(header);
      return header === `Bearer ${accepted}`
        ? HttpResponse.json({ ok: true })
        : HttpResponse.json(
            { type: "authentication", code: "unauthenticated", message: "Sign in." },
            { status: 401 },
          );
    }),
  );
  return seen;
}

describe("http", () => {
  it("sends the access token", async () => {
    await tokenManager.setSession(authResponse({ accessToken: "a1" }));
    const seen = protectedThing("a1");
    await expect(http.get("/thing")).resolves.toMatchObject({ data: { ok: true } });
    expect(seen).toEqual(["Bearer a1"]);
  });

  it("refreshes once on a 401 and repeats the request", async () => {
    await tokenManager.setSession(authResponse({ accessToken: "old", refreshToken: "r1" }));
    const seen = protectedThing("new");
    let refreshes = 0;
    server.use(
      mock.post(api("/mobile/auth/refresh"), () => {
        refreshes++;
        return HttpResponse.json(authResponse({ accessToken: "new", refreshToken: "r2" }));
      }),
    );

    const answers = await Promise.all([http.get("/thing"), http.get("/thing"), http.get("/thing")]);
    expect(answers.map((a) => a.data)).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshes).toBe(1);
    expect(seen.filter((h) => h === "Bearer old")).toHaveLength(3);
    expect(secureStoreItems.get(REFRESH_TOKEN_KEY)).toBe("r2");
  });

  it("repeats a request refused after another refresh finished, without refreshing again", async () => {
    await tokenManager.setSession(authResponse({ accessToken: "old", refreshToken: "r1" }));
    let refreshes = 0;
    server.use(
      mock.post(api("/mobile/auth/refresh"), () => {
        refreshes++;
        return HttpResponse.json(authResponse({ accessToken: "new", refreshToken: "r2" }));
      }),
      // The slow request leaves with the old token and is refused only after the refresh is done.
      mock.get(api("/slow"), async ({ request }) => {
        const header = request.headers.get("Authorization");
        if (header === "Bearer new") return HttpResponse.json({ ok: true });
        await tokenManager.refresh();
        return HttpResponse.json({ code: "unauthenticated" }, { status: 401 });
      }),
    );

    await expect(http.get("/slow")).resolves.toMatchObject({ data: { ok: true } });
    expect(refreshes).toBe(1);
  });

  it("fails with 401 and ends the session when the refresh is refused", async () => {
    await tokenManager.setSession(authResponse({ accessToken: "old" }));
    protectedThing("new");
    server.use(
      mock.post(api("/mobile/auth/refresh"), () =>
        HttpResponse.json({ code: "refresh_token_invalid" }, { status: 401 }),
      ),
    );
    const ended = jest.fn();
    const stop = tokenManager.onSessionEnded(ended);

    const failure = (await http.get("/thing").catch((e: unknown) => e)) as ApiError;
    expect(isApiError(failure)).toBe(true);
    expect(failure.status).toBe(401);
    expect(ended).toHaveBeenCalledWith("expired");
    stop();
  });

  it("sends arrays as repeated keys, the way ASP.NET binds them", async () => {
    let query = "";
    server.use(
      mock.get(api("/list"), ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );
    await http.get("/list", { params: { status: ["active", "hold"], page: 2 } });
    expect(query).toBe("?status=active&status=hold&page=2");
  });

  it("turns the API's error body into an ApiError", async () => {
    server.use(
      mock.post(api("/projects"), () =>
        HttpResponse.json(
          {
            type: "validation",
            code: "validation_failed",
            message: "Check the highlighted fields.",
            errors: { Title: ["Title is required."], "$.startedAt": ["Not a date.", "Too early."] },
            traceId: "00-trace-01",
          },
          { status: 400 },
        ),
      ),
    );
    const failure = (await http.post("/projects", {}).catch((e: unknown) => e)) as ApiError;
    expect(failure).toMatchObject({
      status: 400,
      type: "validation",
      code: "validation_failed",
      message: "Check the highlighted fields.",
      traceId: "00-trace-01",
      fieldErrors: { title: ["Title is required."], startedAt: ["Not a date.", "Too early."] },
    });
  });

  it("says when the server can't be reached", async () => {
    server.use(mock.get(api("/thing"), () => HttpResponse.error()));
    const failure = (await http.get("/thing").catch((e: unknown) => e)) as ApiError;
    expect(failure.isNetwork).toBe(true);
    expect(failure.code).toBe("network_error");
  });
});
