import type { ProtonUiCommand, Schemas } from "@/api/types";
import { permissionsOf } from "@/permissions/permissions";
import { personas, type PersonaName } from "@test/personas";
import { describePlan, hrefsToOpen, logWorkRequestOf, planCommands } from "./runCommands";

const perms = (name: PersonaName) => permissionsOf(personas[name]);

const command = (change: Partial<ProtonUiCommand>): ProtonUiCommand => ({
  type: "open_project",
  id: 7,
  clientId: null,
  domain: "design",
  label: "Villa Haddad",
  page: null,
  section: null,
  tab: null,
  companyTab: null,
  fill: null,
  settingsSection: null,
  sounds: null,
  surface: null,
  theme: null,
  ...change,
});

const fill = (change: Partial<Schemas["ProtonFormFill"]>): Schemas["ProtonFormFill"] => ({
  form: "log_work",
  id: null,
  client: null,
  editProject: null,
  invite: null,
  logWork: null,
  meeting: null,
  message: null,
  newProject: null,
  reportBug: null,
  ...change,
});

const logWork = (change: Partial<Schemas["LogWorkFill"]>): Schemas["LogWorkFill"] => ({
  day: null,
  description: null,
  endMinute: null,
  projectId: null,
  startMinute: null,
  ...change,
});

const fillLogWork = (values: Partial<Schemas["LogWorkFill"]>) =>
  command({
    type: "fill_form",
    id: null,
    label: "Log work",
    fill: fill({ form: "log_work", logWork: logWork(values) }),
  });

const draftOf = (surface: "message_person" | "message_team", id: number | null, body: string) =>
  command({
    type: "fill_form",
    id: null,
    domain: null,
    label: "your message",
    surface,
    fill: fill({ form: "message", id, message: { body } }),
  });

describe("planCommands", () => {
  const admin = perms("designAdmin");

  it("opens a project in a domain the person sees", () => {
    expect(planCommands([command({})], admin)).toEqual([
      {
        kind: "go",
        href: { pathname: "/projects/[id]", params: { id: "7" } },
        label: "Villa Haddad",
      },
    ]);
  });

  it("refuses a domain the person can't see, a bad id and pages that live on the web", () => {
    expect(planCommands([command({ domain: "execution" })], admin)).toEqual([
      { kind: "unavailable" },
    ]);
    expect(planCommands([command({ id: -1 })], admin)).toEqual([{ kind: "unavailable" }]);
    expect(
      planCommands([command({ type: "open_page", id: null, page: "reports" })], admin),
    ).toEqual([{ kind: "unavailable" }]);
  });

  it("refuses screens the person's permissions don't open", () => {
    const employee = perms("designEmployee");
    expect(planCommands([command({ type: "open_client", id: 3 })], employee)).toEqual([
      { kind: "unavailable" },
    ]);
  });

  it("refreshes, and plans nothing for no commands", () => {
    expect(planCommands([command({ type: "refresh" })], admin)).toEqual([{ kind: "refresh" }]);
    expect(planCommands([], admin)).toEqual([]);
    expect(planCommands(undefined, admin)).toEqual([]);
  });

  it("plans at most three commands, in the order they came", () => {
    const commands = [
      command({ type: "open_page", id: null, page: "settings" }),
      command({ type: "set_preference", theme: "dark" }),
      command({ type: "refresh" }),
      command({ type: "open_client", id: 3 }),
    ];
    expect(planCommands(commands, admin).map((s) => s.kind)).toEqual(["go", "theme", "refresh"]);
  });

  it("switches the theme and ignores sounds, which the phone has no setting for", () => {
    expect(planCommands([command({ type: "set_preference", theme: "light" })], admin)).toEqual([
      { kind: "theme", theme: "light" },
    ]);
    expect(planCommands([command({ type: "set_preference", sounds: false })], admin)).toEqual([
      { kind: "ignored" },
    ]);
    expect(planCommands([command({ type: "set_preference" })], admin)).toEqual([
      { kind: "unavailable" },
    ]);
  });

  it("opens the surfaces the phone has and refuses the rest", () => {
    const sarah = perms("designEmployee");
    const surface = (name: ProtonUiCommand["surface"]) =>
      planCommands(
        [command({ type: "open_surface", surface: name, id: null, domain: null })],
        sarah,
      );
    expect(surface("log_work")).toEqual([{ kind: "go", href: "/log-work", label: "Villa Haddad" }]);
    expect(surface("new_meeting")[0]).toMatchObject({ kind: "go", href: "/meetings/new" });
    expect(surface("settings_section")[0]).toMatchObject({ kind: "go", href: "/settings" });
    expect(surface("new_project")).toEqual([{ kind: "unavailable" }]);
    expect(surface("report_bug")).toEqual([{ kind: "unavailable" }]);
  });

  it("opens a section of a project: a screen of its own, or else the project", () => {
    const section = (name: ProtonUiCommand["section"]) =>
      planCommands([command({ section: name })], admin)[0];
    expect(section("requirements")).toMatchObject({
      href: { pathname: "/projects/[id]/requirements", params: { id: "7" } },
    });
    const others = ["financials", "analytics", "contributors", "timeline", "overview"] as const;
    for (const name of others) {
      expect(section(name)).toMatchObject({
        kind: "go",
        href: { pathname: "/projects/[id]", params: { id: "7" } },
      });
    }
  });
});

describe("filling log work", () => {
  const sarah = perms("designEmployee");

  it("opens the log-work screen with what Proton filled, saving nothing", () => {
    const steps = planCommands(
      [
        fillLogWork({
          projectId: 7,
          day: "2026-10-12",
          startMinute: 540,
          endMinute: 1020,
          description: "  Joinery drawings ",
        }),
      ],
      sarah,
    );
    expect(steps).toEqual([
      {
        kind: "fill_log_work",
        href: "/log-work",
        label: "Log work",
        filled: ["project", "day", "start", "end", "description"],
        request: {
          projectId: 7,
          date: "2026-10-12",
          startMin: 540,
          endMin: 1020,
          description: "Joinery drawings",
          filledByProton: ["project", "day", "start", "end", "description"],
        },
      },
    ]);
    expect(describePlan(steps)).toBe(
      "Filled project, day, start, end, description: check it and save.",
    );
  });

  it("lets an end before the start run past midnight, and skips an end equal to the start", () => {
    expect(logWorkRequestOf(logWork({ startMinute: 1320, endMinute: 120 })).request).toMatchObject(
      { startMin: 1320, endMin: 1560 },
    );
    const same = logWorkRequestOf(logWork({ startMinute: 600, endMinute: 600 }));
    expect(same.request.endMin).toBeUndefined();
    expect(same.filled).toEqual(["start"]);
  });

  it("drops values that aren't what the form takes", () => {
    const result = logWorkRequestOf(
      logWork({
        projectId: -3,
        day: "2026-02-31",
        startMinute: 1500,
        endMinute: 600,
        description: "   ",
      }),
    );
    expect(result.filled).toEqual([]);
    expect(result.request).toEqual({ filledByProton: [] });
  });

  it("does not use an end without a start", () => {
    expect(logWorkRequestOf(logWork({ endMinute: 600 })).filled).toEqual([]);
  });

  it("opens the screen once when the surface and the fill both name it", () => {
    const steps = planCommands(
      [
        command({ type: "open_surface", surface: "log_work", id: null, domain: null }),
        fillLogWork({ projectId: 7 }),
      ],
      sarah,
    );
    expect(hrefsToOpen(steps)).toEqual(["/log-work"]);
    expect(describePlan(steps)).toBe("Opened Villa Haddad. Filled project: check it and save.");
  });

  it("refuses the fill for someone who can't log work, in Design or at all", () => {
    expect(planCommands([fillLogWork({ projectId: 7 })], perms("designAdmin"))).toEqual([
      { kind: "unavailable" },
    ]);
    expect(planCommands([fillLogWork({ projectId: 7 })], perms("executionEmployee"))).toEqual([
      { kind: "unavailable" },
    ]);
  });

  it("leaves every other form to the web", () => {
    const other = command({
      type: "fill_form",
      fill: fill({ form: "client", client: { name: "Mounir" } as Schemas["ClientFill"] }),
    });
    expect(planCommands([other], perms("superAdmin"))).toEqual([{ kind: "unavailable" }]);
    expect(describePlan(planCommands([other], perms("superAdmin")))).toBe(
      "That couldn't be opened here.",
    );
  });
});

describe("drafting a message", () => {
  const sarah = perms("designEmployee");

  it("opens the chat with the message waiting, sending nothing", () => {
    const late = draftOf("message_person", 9, "Running late, see you at 10.");
    const person = planCommands([late], sarah);
    expect(person).toEqual([
      {
        kind: "draft",
        href: { pathname: "/messages/direct/[userId]", params: { userId: "9" } },
        chat: { kind: "direct", userId: 9 },
        body: "Running late, see you at 10.",
        label: "your message",
      },
    ]);
    const team = planCommands([draftOf("message_team", 5, "Site visit moved to Friday.")], sarah);
    expect(team[0]).toMatchObject({
      kind: "draft",
      href: { pathname: "/messages/team/[teamId]", params: { teamId: "5" } },
      chat: { kind: "team", teamId: 5 },
    });
    expect(describePlan(person)).toBe("Wrote your message: read it, then press Send.");
  });

  it("opens the chat once when the surface and the draft both name it", () => {
    const open = command({
      type: "open_surface",
      surface: "message_person",
      id: 9,
      domain: null,
      label: "Chat with Nadia",
    });
    const steps = planCommands([open, draftOf("message_person", 9, "Hello")], sarah);
    expect(hrefsToOpen(steps)).toHaveLength(1);
  });

  it("refuses a draft that has no chat to go to, no words, or too many", () => {
    expect(planCommands([draftOf("message_person", null, "Hello")], sarah)).toEqual([
      { kind: "unavailable" },
    ]);
    expect(planCommands([draftOf("message_person", 9, "   ")], sarah)).toEqual([
      { kind: "unavailable" },
    ]);
    expect(planCommands([draftOf("message_person", 9, "x".repeat(4001))], sarah)).toEqual([
      { kind: "unavailable" },
    ]);
    const noSurface = { ...draftOf("message_person", 9, "Hello"), surface: null };
    expect(planCommands([noSurface], sarah)).toEqual([{ kind: "unavailable" }]);
  });

  it("refuses a chat in a domain the person can't see", () => {
    const elsewhere = { ...draftOf("message_person", 9, "Hello"), domain: "execution" };
    expect(planCommands([elsewhere], sarah)).toEqual([{ kind: "unavailable" }]);
  });
});

describe("describePlan", () => {
  const admin = perms("designAdmin");

  it("says each different outcome once", () => {
    const steps = planCommands(
      [command({ domain: "execution" }), command({ id: -1 }), command({ type: "refresh" })],
      admin,
    );
    expect(describePlan(steps)).toBe("That couldn't be opened here. Refreshed the screens.");
  });

  it("says what was opened, and the theme it switched to", () => {
    const steps = planCommands(
      [command({}), command({ type: "set_preference", theme: "dark" })],
      admin,
    );
    expect(describePlan(steps)).toBe("Opened Villa Haddad. Switched to dark mode.");
  });

  it("has nothing to say for no commands or for sounds alone", () => {
    expect(describePlan([])).toBeNull();
    const sounds = planCommands([command({ type: "set_preference", sounds: true })], admin);
    expect(describePlan(sounds)).toBeNull();
  });
});
