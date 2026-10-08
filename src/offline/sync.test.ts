import { waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { createQueryClient } from "@/api/queryClient";
import { api } from "@test/handlers";
import { server } from "@test/server";
import type { LabourPayload, MaterialsPayload } from "./model";
import {
  addMaterials,
  allRecords,
  putLabourWeek,
  reloadOutbox,
  resetOutboxForTests,
  saveRecord,
} from "./outbox";
import { resendMine } from "./resolve";
import { isSyncPaused, requestSync, startSyncEngine } from "./sync";
import { resetFakeDatabase } from "./testing/fakeSqlite";

jest.mock("expo-sqlite", () => jest.requireActual("./testing/fakeSqlite"));
jest.mock("expo-crypto", () => ({
  randomUUID: () => jest.requireActual("node:crypto").randomUUID(),
}));

const materials = (names: string[]): MaterialsPayload => ({
  projectTitle: "Faqra site",
  items: names.map((name, i) => ({
    clientRef: jest.requireActual("node:crypto").randomUUID(),
    name,
    quantity: i + 1,
    unit: "bags",
    unitCost: 8,
    amount: null,
    supplier: null,
    note: null,
  })),
});

const week = (workers: number, expectedVersion = "0"): LabourPayload => ({
  projectTitle: "Faqra site",
  days: [{ date: "2026-10-05", workers, dailyPay: 25 }],
  note: null,
  expectedVersion,
});

let stop: (() => void) | null = null;

beforeEach(() => {
  resetFakeDatabase();
  resetOutboxForTests();
});

afterEach(() => {
  stop?.();
  stop = null;
});

async function start(userId = 4) {
  stop = startSyncEngine(userId, createQueryClient());
  // The engine starts by tidying the table, then sends what is due.
  await waitFor(async () =>
    expect((await allRecords()).some((r) => r.status === "sending")).toBe(false),
  );
}

const mine = async (userId = 4) => (await reloadOutbox()).filter((r) => r.userId === userId);

describe("materials", () => {
  it("sends a saved batch with each material's clientRef", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(api("/projects/7/materials"), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json([], { status: 200 });
      }),
    );
    const saved = await addMaterials(4, 7, materials(["Cement", "Sand"]));
    await start();
    await requestSync();
    await waitFor(async () => expect((await mine())[0].status).toBe("sent"));
    expect(bodies).toEqual([{ items: saved.payload.items }]);
  });

  it("sends the same clientRefs again after a lost answer, so the API can't save them twice", async () => {
    const refs: string[][] = [];
    let calls = 0;
    server.use(
      http.post(api("/projects/7/materials"), async ({ request }) => {
        const body = (await request.json()) as { items: { clientRef: string }[] };
        refs.push(body.items.map((i) => i.clientRef));
        calls += 1;
        // The first answer never reaches the phone.
        return calls === 1 ? HttpResponse.error() : HttpResponse.json([]);
      }),
    );
    await addMaterials(4, 7, materials(["Cement"]));
    await start();
    await waitFor(async () => expect((await mine())[0].attempts).toBe(1));
    expect((await mine())[0].status).toBe("pending");

    // Waiting out the backoff, then the retry.
    const [record] = await mine();
    await saveRecord({ ...record, nextAttemptAt: Date.now() - 1 });
    await requestSync();
    await waitFor(async () => expect((await mine())[0].status).toBe("sent"));
    expect(refs).toHaveLength(2);
    expect(refs[1]).toEqual(refs[0]);
  });

  it("needs attention when the site was finalised meanwhile, and isn't retried", async () => {
    let calls = 0;
    server.use(
      http.post(api("/projects/7/materials"), () => {
        calls += 1;
        return HttpResponse.json(
          { type: "business_rule", code: "project_locked", message: "The project is locked." },
          { status: 422 },
        );
      }),
    );
    await addMaterials(4, 7, materials(["Cement"]));
    await start();
    await waitFor(async () => expect((await mine())[0].status).toBe("needs_attention"));
    await requestSync();
    expect(calls).toBe(1);
    expect((await mine())[0].lastErrorCode).toBe("project_locked");
  });
});

describe("labour weeks", () => {
  it("keeps one unsent row per site and week: a newer edit replaces the waiting one", async () => {
    await putLabourWeek(4, 7, "2026-10-05", week(3));
    await putLabourWeek(4, 7, "2026-10-05", week(5));
    await putLabourWeek(4, 7, "2026-10-12", week(2));
    const rows = await mine();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.weekStart === "2026-10-05")?.payload).toMatchObject({
      days: [{ workers: 5 }],
    });
  });

  it("sends the version it loaded, and offers both choices on a conflict", async () => {
    const bodies: { expectedVersion?: string }[] = [];
    server.use(
      http.put(api("/projects/7/labour-weeks/2026-10-05"), async ({ request }) => {
        const body = (await request.json()) as { expectedVersion?: string };
        bodies.push(body);
        return body.expectedVersion === "1700"
          ? HttpResponse.json({})
          : HttpResponse.json(
              { type: "conflict", code: "labour_week_changed", message: "Changed." },
              { status: 409 },
            );
      }),
    );
    await putLabourWeek(4, 7, "2026-10-05", week(3, "0"));
    await start();
    await waitFor(async () => expect((await mine())[0].status).toBe("needs_attention"));
    expect((await mine())[0].lastErrorCode).toBe("labour_week_changed");

    // "Use mine": sent again against the version the server has now.
    const [record] = await mine();
    if (record.kind !== "labour_week") throw new Error("expected a week");
    await resendMine(record, "1700");
    await waitFor(async () => expect((await mine())[0].status).toBe("sent"));
    expect(bodies.map((b) => b.expectedVersion)).toEqual(["0", "1700"]);
  });
});

describe("owners", () => {
  it("never sends someone else's records with this session", async () => {
    let calls = 0;
    server.use(
      http.post(api("/projects/7/materials"), () => {
        calls += 1;
        return HttpResponse.json([]);
      }),
    );
    await addMaterials(9, 7, materials(["Theirs"]));
    await start(4);
    await requestSync();
    expect(calls).toBe(0);
    expect((await mine(9))[0].status).toBe("pending");
  });

  it("pauses the queue when the session is refused", async () => {
    server.use(
      http.post(api("/projects/7/materials"), () =>
        HttpResponse.json(
          { type: "authentication", code: "unauthenticated", message: "" },
          { status: 401 },
        ),
      ),
    );
    await addMaterials(4, 7, materials(["Cement", "Sand"]));
    await addMaterials(4, 7, materials(["Gravel"]));
    await start();
    await waitFor(() => expect(isSyncPaused()).toBe(true));
    const rows = await mine();
    expect(rows.every((r) => r.status === "pending" && r.attempts === 0)).toBe(true);
  });
});
