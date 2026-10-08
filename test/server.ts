import { setupServer } from "msw/node";
import { baseHandlers } from "./handlers";

/** The mock API every test talks to. Tests add their own handlers with `server.use(...)`. */
export const server = setupServer(...baseHandlers);
