/// <reference types="node" />
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import type { Href } from "expo-router";
import type { PushTarget } from "@/api/mobileTypes";
import type { ProtonUiCommand } from "@/api/types";
import { permissionsOf } from "@/permissions/permissions";
import { screens } from "@/permissions/screens";
import { personas, type PersonaName } from "@test/personas";
import { screenKeyForSegments } from "./routeKey";
import { routeForProtonCommand, routeForTarget } from "./targets";

const perms = (name: PersonaName) => permissionsOf(personas[name]);

/** Every route path the app/ folder defines, without groups: "/projects/[id]/labour". */
function routePaths(): Set<string> {
  const root = join(__dirname, "../../app");
  const paths = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".tsx") && !entry.name.startsWith("_")) {
        const segments = relative(root, full)
          .replace(/\.tsx$/, "")
          .split(/[\\/]/);
        const parts = segments.filter((s) => !/^\(.*\)$/.test(s));
        if (parts[parts.length - 1] === "index") parts.pop();
        paths.add(`/${parts.join("/")}`);
      }
    }
  };
  walk(root);
  return paths;
}

const pathnameOf = (href: Href | null) =>
  href == null ? null : typeof href === "string" ? href : href.pathname;

describe("the route tree", () => {
  const paths = routePaths();

  it("has a route file for every screen in the table", () => {
    for (const [key, screen] of Object.entries(screens)) {
      expect({ key, exists: paths.has(screen.pathname) }).toEqual({ key, exists: true });
    }
  });

  it("finds a screen's key from Expo Router's segments", () => {
    expect(screenKeyForSegments(["(app)", "(tabs)", "today"])).toBe("today");
    expect(screenKeyForSegments(["(app)", "projects", "[id]"])).toBe("project");
    expect(screenKeyForSegments(["(app)", "projects", "[id]", "index"])).toBe("project");
    expect(screenKeyForSegments(["(app)", "projects", "[id]", "labour", "[weekStart]"])).toBe(
      "labourWeek",
    );
    expect(screenKeyForSegments(["(auth)", "sign-in"])).toBeNull();
  });
});

describe("routeForTarget", () => {
  it("opens a project, and its sections", () => {
    const p = perms("executionEmployee");
    expect(routeForTarget({ type: "project", id: 12, domain: "execution" }, p)).toEqual({
      pathname: "/projects/[id]",
      params: { id: "12" },
    });
    expect(
      routeForTarget({ type: "project", id: 12, domain: "execution", section: "materials" }, p),
    ).toEqual({
      pathname: "/projects/[id]/materials",
      params: { id: "12" },
    });
    expect(
      routeForTarget({ type: "project", id: 12, domain: "execution", section: "meetings" }, p),
    ).toEqual({
      pathname: "/projects/[id]",
      params: { id: "12", section: "meetings" },
    });
  });

  it("refuses a project in a domain the person can't see", () => {
    expect(
      routeForTarget({ type: "project", id: 12, domain: "execution" }, perms("designEmployee")),
    ).toBeNull();
  });

  it("refuses a section the person's permissions don't open", () => {
    const target: PushTarget = { type: "project", id: 12, domain: "execution", section: "labour" };
    expect(routeForTarget(target, perms("executionEmployee"))).not.toBeNull();
    expect(routeForTarget(target, perms("superAdmin"))).not.toBeNull();
    expect(routeForTarget({ ...target, domain: "design" }, perms("designAdmin"))).toBeNull();
  });

  it("opens a requirement highlighted in its project's requirements", () => {
    expect(
      routeForTarget(
        { type: "requirement", projectId: 3, requirementId: 9, domain: "design" },
        perms("designEmployee"),
      ),
    ).toEqual({ pathname: "/projects/[id]/requirements", params: { id: "3", requirementId: "9" } });
  });

  it("opens work entries only for people who log their own work", () => {
    expect(pathnameOf(routeForTarget({ type: "work_entry", id: 5 }, perms("designEmployee")))).toBe(
      "/work/entry/[id]",
    );
    expect(routeForTarget({ type: "work_entry", id: 5 }, perms("designAdmin"))).toBeNull();
  });

  it("opens conversations", () => {
    const p = perms("designEmployee");
    expect(routeForTarget({ type: "conversation", teamId: 2 }, p)).toEqual({
      pathname: "/messages/team/[teamId]",
      params: { teamId: "2" },
    });
    expect(routeForTarget({ type: "conversation", userId: 7 }, p)).toEqual({
      pathname: "/messages/direct/[userId]",
      params: { userId: "7" },
    });
    expect(routeForTarget({ type: "conversation" }, p)).toBeNull();
  });

  it("opens a labour week for site staff, with a valid week", () => {
    const p = perms("executionEmployee");
    expect(
      routeForTarget({ type: "labour_week", projectId: 4, weekStart: "2026-10-03" }, p),
    ).toEqual({
      pathname: "/projects/[id]/labour/[weekStart]",
      params: { id: "4", weekStart: "2026-10-03" },
    });
    expect(
      routeForTarget({ type: "labour_week", projectId: 4, weekStart: "../../x" }, p),
    ).toBeNull();
    expect(
      routeForTarget(
        { type: "labour_week", projectId: 4, weekStart: "2026-10-03" },
        perms("designEmployee"),
      ),
    ).toBeNull();
  });

  it("opens people and clients for admins only", () => {
    expect(pathnameOf(routeForTarget({ type: "person", id: 2 }, perms("designAdmin")))).toBe(
      "/people/[id]",
    );
    expect(routeForTarget({ type: "person", id: 2 }, perms("designEmployee"))).toBeNull();
    expect(pathnameOf(routeForTarget({ type: "client", id: 2 }, perms("executionAdmin")))).toBe(
      "/clients/[id]",
    );
    expect(routeForTarget({ type: "client", id: 2 }, perms("executionEmployee"))).toBeNull();
  });

  it("opens money only for people who see money", () => {
    const money: PushTarget[] = [
      { type: "invoice", id: 1 },
      { type: "payment", id: 1 },
      { type: "statement", id: 1 },
      { type: "page", page: "company" },
    ];
    for (const target of money) {
      expect(routeForTarget(target, perms("superAdmin"))).not.toBeNull();
      expect(routeForTarget(target, perms("designAdmin"))).toBeNull();
      expect(routeForTarget(target, perms("executionEmployee"))).toBeNull();
    }
  });

  it("opens pages", () => {
    const p = perms("designEmployee");
    expect(routeForTarget({ type: "page", page: "notifications" }, p)).toBe("/alerts");
    expect(routeForTarget({ type: "page", page: "today" }, p)).toBe("/today");
    expect(routeForTarget({ type: "page", page: "work" }, p)).toBe("/work");
    expect(routeForTarget({ type: "page", page: "meetings" }, p)).toBe("/meetings");
    expect(routeForTarget({ type: "page", page: "work" }, perms("executionEmployee"))).toBeNull();
  });

  it("refuses ids that aren't positive whole numbers, and unknown targets", () => {
    const p = perms("superAdmin");
    expect(routeForTarget({ type: "client", id: -1 }, p)).toBeNull();
    expect(routeForTarget({ type: "client", id: 1.5 }, p)).toBeNull();
    expect(routeForTarget({ type: "invoice", id: Number.NaN }, p)).toBeNull();
    expect(routeForTarget({ type: "nonsense" } as unknown as PushTarget, p)).toBeNull();
    expect(
      routeForTarget({ type: "page", page: "constructor" } as unknown as PushTarget, p),
    ).toBeNull();
  });

  it("only ever points at routes that exist", () => {
    const paths = routePaths();
    const targets: PushTarget[] = [
      { type: "project", id: 1, domain: "execution" },
      { type: "project", id: 1, domain: "execution", section: "requirements" },
      { type: "project", id: 1, domain: "execution", section: "materials" },
      { type: "project", id: 1, domain: "execution", section: "labour" },
      { type: "requirement", projectId: 1, requirementId: 2, domain: "design" },
      { type: "conversation", teamId: 1 },
      { type: "conversation", userId: 1 },
      { type: "labour_week", projectId: 1, weekStart: "2026-10-03" },
      { type: "person", id: 1 },
      { type: "client", id: 1 },
      { type: "invoice", id: 1 },
      { type: "payment", id: 1 },
      { type: "statement", id: 1 },
      { type: "page", page: "notifications" },
      { type: "page", page: "today" },
      { type: "page", page: "meetings" },
      { type: "page", page: "company" },
    ];
    for (const target of targets) {
      const path = pathnameOf(routeForTarget(target, perms("superAdmin")));
      expect({ target, exists: path != null && paths.has(path) }).toEqual({ target, exists: true });
    }
    expect(
      paths.has(
        pathnameOf(routeForTarget({ type: "work_entry", id: 1 }, perms("designEmployee"))) ?? "",
      ),
    ).toBe(true);
  });
});

describe("routeForProtonCommand", () => {
  const command = (c: Partial<ProtonUiCommand>): ProtonUiCommand => ({
    type: "open_page",
    id: null,
    clientId: null,
    domain: null,
    label: "Open",
    page: null,
    section: null,
    tab: null,
    companyTab: null,
    fill: null,
    settingsSection: null,
    sounds: null,
    surface: null,
    theme: null,
    ...c,
  });

  it("opens projects, clients and people", () => {
    const p = perms("designAdmin");
    expect(
      routeForProtonCommand(command({ type: "open_project", id: 8, domain: "design" }), p),
    ).toEqual({
      pathname: "/projects/[id]",
      params: { id: "8" },
    });
    expect(
      routeForProtonCommand(
        command({ type: "open_project", id: 8, domain: "design", section: "requirements" }),
        p,
      ),
    ).toEqual({ pathname: "/projects/[id]/requirements", params: { id: "8" } });
    expect(
      routeForProtonCommand(command({ type: "open_client", id: 3, domain: "design" }), p),
    ).toEqual({
      pathname: "/clients/[id]",
      params: { id: "3" },
    });
    expect(routeForProtonCommand(command({ type: "open_person", id: 4 }), p)).toEqual({
      pathname: "/people/[id]",
      params: { id: "4" },
    });
  });

  it("refuses a project in a domain the person can't see", () => {
    expect(
      routeForProtonCommand(
        command({ type: "open_project", id: 8, domain: "execution" }),
        perms("designAdmin"),
      ),
    ).toBeNull();
  });

  it("maps Proton's pages onto the phone's screens", () => {
    const sa = perms("superAdmin");
    const page = (name: ProtonUiCommand["page"], domain: string | null = "design") =>
      routeForProtonCommand(command({ page: name, domain }), sa);
    expect(page("dashboard")).toBe("/today");
    expect(page("projects")).toBe("/projects");
    expect(page("clients")).toBe("/clients");
    expect(page("people")).toBe("/people");
    expect(page("meetings")).toBe("/meetings");
    expect(page("activity")).toBe("/activity");
    expect(page("financials")).toBe("/company");
    expect(page("company_overview", null)).toBe("/company");
  });

  it("leaves the web-only pages on the web", () => {
    const sa = perms("superAdmin");
    expect(routeForProtonCommand(command({ page: "reports", domain: "design" }), sa)).toBeNull();
    expect(routeForProtonCommand(command({ page: "company_expenses" }), sa)).toBeNull();
  });

  it("leaves the pages and commands added later unopened until the phone maps them", () => {
    const sa = perms("superAdmin");
    for (const page of ["my_work", "my_pay", "settings", "messages", "launcher"] as const) {
      expect(routeForProtonCommand(command({ page, domain: null }), sa)).toBeNull();
    }
    for (const type of ["open_surface", "fill_form", "set_preference"] as const) {
      expect(routeForProtonCommand(command({ type }), sa)).toBeNull();
    }
  });

  it("keeps the company's figures to super admins", () => {
    expect(
      routeForProtonCommand(
        command({ page: "financials", domain: "design" }),
        perms("designAdmin"),
      ),
    ).toBeNull();
    expect(
      routeForProtonCommand(command({ page: "company_overview" }), perms("designAdmin")),
    ).toBeNull();
  });

  it("does nothing for refresh and unknown commands", () => {
    const p = perms("superAdmin");
    expect(routeForProtonCommand(command({ type: "refresh" }), p)).toBeNull();
    expect(routeForProtonCommand(command({ type: "open_client", id: null }), p)).toBeNull();
    expect(
      routeForProtonCommand({ type: "delete_everything" } as unknown as ProtonUiCommand, p),
    ).toBeNull();
  });
});
