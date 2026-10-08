import { ApiError } from "@/api/errors";
import {
  backoffMs,
  classify,
  expired,
  isDue,
  nextState,
  ORPHAN_KEPT_MS,
  SENT_KEPT_MS,
  type OutboxRecord,
} from "./model";

const record = (change: Partial<OutboxRecord> = {}): OutboxRecord =>
  ({
    id: "r1",
    userId: 4,
    projectId: 7,
    kind: "materials",
    weekStart: null,
    payload: {
      projectTitle: "Site",
      items: [
        {
          clientRef: "0b6f4a8e-9d3c-4b8e-9b1a-2f3c4d5e6f70",
          name: "Cement",
          quantity: 10,
          unit: "bags",
          unitCost: 8,
          amount: null,
          supplier: null,
          note: null,
        },
      ],
    },
    status: "pending",
    attempts: 0,
    nextAttemptAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    createdAt: 1000,
    updatedAt: 1000,
    ...change,
  }) as OutboxRecord;

describe("classifying a failed send", () => {
  it.each([
    [0, "retry"],
    [500, "retry"],
    [503, "retry"],
    [401, "unauthorized"],
    [429, "rate_limited"],
    [400, "refused"],
    [403, "refused"],
    [404, "refused"],
    [409, "refused"],
    [422, "refused"],
  ])("%i is %s", (status, type) => {
    expect(classify(new ApiError(status, { code: "x" })).type).toBe(type);
  });

  it("waits for Retry-After when the API gives it", () => {
    expect(classify(new ApiError(429, {}), 12)).toEqual({
      type: "rate_limited",
      retryAfterMs: 12_000,
    });
  });
});

it("backs off 5 s, 30 s, 2 min, 10 min, then every 10 min", () => {
  expect([1, 2, 3, 4, 5, 9].map(backoffMs)).toEqual([
    5_000, 30_000, 120_000, 600_000, 600_000, 600_000,
  ]);
});

describe("the next state", () => {
  const now = 50_000;

  it("marks a sent record sent", () => {
    const next = nextState(record({ status: "sending" }), { type: "sent" }, now);
    expect(next.record).toMatchObject({ status: "sent", nextAttemptAt: null, updatedAt: now });
    expect(next.pauseQueue).toBe(false);
  });

  it("keeps a record waiting after a network failure, backing off and stopping the run", () => {
    const first = nextState(record(), { type: "retry" }, now);
    expect(first.record).toMatchObject({
      status: "pending",
      attempts: 1,
      nextAttemptAt: now + 5_000,
    });
    expect(first.stopRun).toBe(true);
    const second = nextState(first.record, { type: "retry" }, now);
    expect(second.record).toMatchObject({ attempts: 2, nextAttemptAt: now + 30_000 });
  });

  it("keeps the payload, and so every clientRef, through retries", () => {
    const before = record();
    const after = nextState(before, { type: "retry" }, now).record;
    expect(after.payload).toEqual(before.payload);
  });

  it("pauses the whole queue on 401 without blaming the record", () => {
    const next = nextState(record({ attempts: 2 }), { type: "unauthorized" }, now);
    expect(next.pauseQueue).toBe(true);
    expect(next.record).toMatchObject({ status: "pending", attempts: 2 });
  });

  it("needs attention after a refusal, and is never retried on its own", () => {
    const next = nextState(
      record(),
      { type: "refused", status: 409, code: "labour_week_changed", message: "Changed." },
      now,
    );
    expect(next.record).toMatchObject({
      status: "needs_attention",
      lastErrorCode: "labour_week_changed",
    });
    expect(isDue(next.record, now + 10 ** 9)).toBe(false);
  });
});

it("is due once its wait is over", () => {
  expect(isDue(record({ nextAttemptAt: 2000 }), 1999)).toBe(false);
  expect(isDue(record({ nextAttemptAt: 2000 }), 2000)).toBe(true);
});

it("expires sent records after a week and other people's after 30 days", () => {
  const now = 100 * 24 * 60 * 60_000;
  const records = [
    record({ id: "sent-old", status: "sent", updatedAt: now - SENT_KEPT_MS - 1 }),
    record({ id: "sent-new", status: "sent", updatedAt: now - 1000 }),
    record({ id: "mine-pending-old", updatedAt: now - ORPHAN_KEPT_MS - 1 }),
    record({ id: "theirs-old", userId: 9, updatedAt: now - ORPHAN_KEPT_MS - 1 }),
    record({ id: "theirs-new", userId: 9, updatedAt: now - 1000 }),
  ];
  expect(expired(records, 4, now)).toEqual(["sent-old", "theirs-old"]);
});
