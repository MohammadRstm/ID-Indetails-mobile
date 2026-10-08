import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import { allRecords, resetOutboxForTests } from "@/offline/outbox";
import { resetFakeDatabase } from "@/offline/testing/fakeSqlite";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { clearToasts } from "@/ui";
import { AddMaterialsScreen } from "./AddMaterialsScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock("expo-sqlite", () => jest.requireActual("@/offline/testing/fakeSqlite"));
jest.mock("expo-crypto", () => ({
  randomUUID: () => jest.requireActual("node:crypto").randomUUID(),
}));
jest.setTimeout(20_000);
afterEach(() => clearToasts());

const emptyList = (change: object = {}) => ({
  addedBy: [],
  all: {},
  canAdd: true,
  defaultMarkup: null,
  items: [],
  matching: {},
  page: 1,
  pageSize: 30,
  suppliers: [],
  totalCount: 0,
  types: [],
  ...change,
});

beforeEach(() => {
  resetFakeDatabase();
  resetOutboxForTests();
  server.use(
    http.get(api("/projects"), () =>
      HttpResponse.json({ items: [], page: 1, pageSize: 100, totalCount: 0 }),
    ),
  );
});

it("saves the batch on the phone as one record, each material with its own clientRef", async () => {
  server.use(
    http.get(api("/projects/9/materials"), () =>
      HttpResponse.json(
        emptyList({ types: [{ key: "cement", label: "Cement", count: 3, cost: 0 }] }),
      ),
    ),
  );
  await renderWithProviders(<AddMaterialsScreen projectId={9} />, { persona: "executionEmployee" });

  await fireEvent.press(await screen.findByRole("button", { name: "Cement" }));
  await fireEvent.changeText(screen.getByLabelText("Quantity"), "10");
  await fireEvent.changeText(screen.getByLabelText("Or the total"), "80");
  await fireEvent.press(screen.getByRole("button", { name: "Add another" }));
  await fireEvent.changeText(screen.getByLabelText("Type"), "Sand");
  await fireEvent.changeText(screen.getByLabelText("Or the total"), "40");
  await fireEvent.press(screen.getByRole("button", { name: "Save 2 materials" }));

  await waitFor(() => expect(router.back).toHaveBeenCalled());
  const records = await allRecords();
  expect(records).toHaveLength(1);
  const [record] = records;
  if (record.kind !== "materials") throw new Error("expected materials");
  expect(record.payload.items.map((i) => i.name)).toEqual(["Cement", "Sand"]);
  expect(new Set(record.payload.items.map((i) => i.clientRef)).size).toBe(2);
});

it("won't save a material without a cost", async () => {
  server.use(http.get(api("/projects/9/materials"), () => HttpResponse.json(emptyList())));
  await renderWithProviders(<AddMaterialsScreen projectId={9} />, { persona: "executionEmployee" });
  await fireEvent.changeText(await screen.findByLabelText("Type"), "Gravel");
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("Give the quantity and unit cost, or the total.")).toBeTruthy();
  expect(await allRecords()).toHaveLength(0);
});
