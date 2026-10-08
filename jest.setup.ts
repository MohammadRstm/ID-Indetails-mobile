import { server } from "./test/server";

jest.mock("@react-native-community/netinfo", () =>
  jest.requireActual("@react-native-community/netinfo/jest/netinfo-mock"),
);
jest.mock("expo-secure-store", () => jest.requireActual("./test/mocks/secureStore"));
jest.mock("expo-sqlite/kv-store", () => jest.requireActual("./test/mocks/kvStore"));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
