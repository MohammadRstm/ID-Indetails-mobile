import { permissionsOf } from "@/permissions/permissions";
import { personas, type PersonaName } from "@test/personas";
import { greetingFor, startersFor } from "./greeting";
import type { ProtonPageContext } from "./pageContext";

const perms = (name: PersonaName) => permissionsOf(personas[name]);

const context = (change: Partial<ProtonPageContext>): ProtonPageContext => ({
  area: "design",
  page: null,
  entityType: null,
  entityId: null,
  section: null,
  surface: null,
  ...change,
});

describe("greetingFor", () => {
  it("greets by the company's time of day and the first name", () => {
    expect(greetingFor("Nadia", 5 * 60)).toBe("Good morning, Nadia.");
    expect(greetingFor("Nadia", 11 * 60 + 59)).toBe("Good morning, Nadia.");
    expect(greetingFor("Nadia", 12 * 60)).toBe("Good afternoon, Nadia.");
    expect(greetingFor("Nadia", 18 * 60)).toBe("Good evening, Nadia.");
    expect(greetingFor("Nadia", 4 * 60 + 59)).toBe("Good evening, Nadia.");
  });

  it("greets without a name when there is none", () => {
    expect(greetingFor(null, 9 * 60)).toBe("Good morning.");
    expect(greetingFor("  ", 9 * 60)).toBe("Good morning.");
  });
});

describe("startersFor", () => {
  it("asks about the project on screen, only what the person may see", () => {
    const project = context({ entityType: "project", entityId: 7, page: "projects" });
    expect(startersFor(project, perms("designAdmin"))).toEqual([
      "How is this project doing?",
      "What's still open on it?",
      "Who has worked on it this month?",
    ]);
    // no one's hours without work_entry:view_all
    expect(startersFor(project, perms("designEmployee"))).toEqual([
      "How is this project doing?",
      "What's still open on it?",
      "What needs my attention?",
    ]);
  });

  it("asks what a client still owes only of someone who sees money", () => {
    const client = context({ entityType: "client", entityId: 3, page: "clients" });
    expect(startersFor(client, perms("superAdmin"))).toContain("What does this client still owe?");
    expect(startersFor(client, perms("designAdmin"))).not.toContain(
      "What does this client still owe?",
    );
  });

  it("asks about the person's own work on their work page", () => {
    const starters = startersFor(context({ page: "my_work" }), perms("designEmployee"));
    expect(starters).toEqual([
      "How many hours have I logged this week?",
      "Did I log work yesterday?",
      "What needs my attention?",
    ]);
  });

  it("starts with general questions when no page is known, three at most", () => {
    expect(startersFor(null, perms("executionEmployee"))).toEqual([
      "What needs my attention?",
      "What changed this week?",
    ]);
    expect(startersFor(null, perms("designAdmin"))).toEqual([
      "What needs my attention?",
      "What changed this week?",
      "How did hours compare with last week?",
    ]);
  });
});
