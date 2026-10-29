import { http, HttpResponse } from "msw";
import { UNFINISHED_SIGN_OUTS_KEY } from "@test/auth";
import { api } from "@test/handlers";
import { secureStoreItems } from "@test/mocks/secureStore";
import { server } from "@test/server";
import { finishSignOuts, signOutOnServer } from "./unfinishedSignOuts";

const kept = () => JSON.parse(secureStoreItems.get(UNFINISHED_SIGN_OUTS_KEY) ?? "[]") as string[];

/** Answers each logout by its token: a status, or no answer at all. */
function answerLogouts(answers: Record<string, number | "none">) {
  server.use(
    http.post(api("/mobile/auth/logout"), async ({ request }) => {
      const { refreshToken } = (await request.json()) as { refreshToken: string };
      const answer = answers[refreshToken] ?? 204;
      return answer === "none" ? HttpResponse.error() : new HttpResponse(null, { status: answer });
    }),
  );
}

beforeEach(() => secureStoreItems.clear());

describe("a sign-out the API didn't hear about", () => {
  it("is kept when the API gave no answer or couldn't deal with it, and not when it answered", async () => {
    answerLogouts({ offline: "none", busy: 503, limited: 429, refused: 400 });
    for (const token of ["offline", "busy", "limited", "refused", "done"]) {
      await signOutOnServer(token);
    }
    expect(kept()).toEqual(["offline", "busy", "limited"]);
  });

  it("is finished once the API answers, and stays while it doesn't", async () => {
    secureStoreItems.set(UNFINISHED_SIGN_OUTS_KEY, JSON.stringify(["a", "b"]));
    answerLogouts({ b: "none" });
    await finishSignOuts();
    expect(kept()).toEqual(["b"]);

    answerLogouts({});
    await finishSignOuts();
    expect(secureStoreItems.has(UNFINISHED_SIGN_OUTS_KEY)).toBe(false);
  });
});
