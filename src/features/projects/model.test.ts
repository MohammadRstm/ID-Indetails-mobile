import { permissionsOf } from "@/permissions/permissions";
import { personas, type PersonaName } from "@test/personas";
import { projectSections, sectionToShow } from "./model";

function sections(persona: PersonaName, domain: string, hasMoney = true) {
  const perms = permissionsOf(personas[persona]);
  return projectSections({ domain, hasMoney, has: perms.has });
}

describe("the sections of a Design project", () => {
  it("gives a super admin money first, then who worked, with no Overview (they log no hours)", () => {
    expect(sections("superAdmin", "design")).toEqual([
      "financials",
      "contributors",
      "requirements",
      "meetings",
    ]);
  });

  it("gives a Design admin everyone's work but no money", () => {
    expect(sections("designAdmin", "design")).toEqual(["contributors", "requirements", "meetings"]);
  });

  it("gives a Design employee their own overview, requirements and meetings", () => {
    expect(sections("designEmployee", "design")).toEqual(["overview", "requirements", "meetings"]);
  });

  it("leaves out money the API did not send", () => {
    expect(sections("superAdmin", "design", false)).not.toContain("financials");
  });

  it("gives someone with neither money nor others' work nor their own work the overview", () => {
    const has = () => false;
    expect(projectSections({ domain: "design", hasMoney: false, has })).toEqual([
      "overview",
      "meetings",
    ]);
  });
});

describe("the sections of an Execution project", () => {
  it("never shows who worked, since nobody logs hours on a site", () => {
    expect(sections("superAdmin", "execution")).toEqual([
      "financials",
      "overview",
      "requirements",
      "meetings",
    ]);
    expect(sections("executionAdmin", "execution")).not.toContain("contributors");
  });

  it("gives site staff the overview with the site's parts, then requirements and meetings", () => {
    expect(sections("executionEmployee", "execution")).toEqual([
      "overview",
      "requirements",
      "meetings",
    ]);
  });
});

describe("the section a link asks for", () => {
  const shown = sections("designEmployee", "design");

  it("is kept when it is on the page", () => {
    expect(sectionToShow("meetings", shown)).toBe("meetings");
    expect(sectionToShow("requirements", shown)).toBe("requirements");
  });

  it("falls back to the top when the person may not see it", () => {
    expect(sectionToShow("financials", shown)).toBeNull();
    expect(sectionToShow("contributors", shown)).toBeNull();
  });

  it("falls back to the top for the web-only sections, even for a super admin", () => {
    const all = sections("superAdmin", "design");
    expect(sectionToShow("analytics", all)).toBeNull();
    expect(sectionToShow("timeline", all)).toBeNull();
  });

  it("does nothing when no section was asked for", () => {
    expect(sectionToShow(null, shown)).toBeNull();
  });
});
