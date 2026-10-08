import { http, HttpResponse } from "msw";
import type { CompanySettings } from "@/api/types";
import { env } from "@/config/env";
import { personas } from "./personas";

/** The full address of an API path, as the app calls it: api("/auth/me"). */
export const api = (path: string) => `${env.apiUrl}/api${path}`;

export const companySettings: CompanySettings = {
  name: "ID InDetails",
  address: null,
  website: null,
  logoFileId: null,
  defaultCurrency: "USD",
  isSetUp: true,
  timeZone: "Asia/Beirut",
  use24HourTime: false,
  weekStart: 1,
  updatedAt: null,
};

/** What every test's API answers unless the test says otherwise (`server.use(...)`). */
export const baseHandlers = [
  http.get(api("/auth/me"), () => HttpResponse.json(personas.designEmployee)),
  http.get(api("/company/settings"), () => HttpResponse.json(companySettings)),
];
