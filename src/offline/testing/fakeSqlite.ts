// A stand-in for expo-sqlite in tests, backed by Node's own SQLite, so the outbox's real SQL runs. Not used by the
// app. Use it with: jest.mock("expo-sqlite", () => jest.requireActual("@/offline/testing/fakeSqlite")).
/// <reference types="node" />
import { DatabaseSync } from "node:sqlite";

type Param = string | number | null;

let db = new DatabaseSync(":memory:");

/** A fresh, empty database for the next test. */
export function resetFakeDatabase() {
  db.close();
  db = new DatabaseSync(":memory:");
}

export async function openDatabaseAsync() {
  return {
    execAsync: async (source: string) => {
      db.exec(source);
    },
    runAsync: async (source: string, params: Param[] = []) => db.prepare(source).run(...params),
    getAllAsync: async <T>(source: string, params: Param[] = []) =>
      db.prepare(source).all(...params) as T[],
  };
}
