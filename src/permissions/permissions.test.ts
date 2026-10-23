import { personas, type PersonaName } from "@test/personas";
import { P } from "./codes";
import { permissionsOf } from "./permissions";

const of = (name: PersonaName) => permissionsOf(personas[name]);

describe("permissionsOf", () => {
  it("has the 60 codes of the API", () => {
    expect(Object.values(P)).toHaveLength(60);
    expect(new Set(Object.values(P)).size).toBe(60);
  });

  it.each([
    ["superAdmin", "super_admin", null, ["design", "execution"], true, true, true],
    ["designAdmin", "admin", "design", ["design"], true, false, false],
    ["executionAdmin", "admin", "execution", ["execution"], true, false, false],
    ["designEmployee", "employee", "design", ["design"], false, false, false],
    ["executionEmployee", "employee", "execution", ["execution"], false, false, false],
    ["customGrants", "employee", "design", ["design", "execution"], false, false, false],
  ] as const)(
    "reads %s from /auth/me",
    (name, role, homeDomain, visibleDomains, isAdmin, isSuperAdmin, hasCompanyArea) => {
      const p = of(name);
      expect(p).toMatchObject({
        role,
        homeDomain,
        visibleDomains,
        isAdmin,
        isSuperAdmin,
        hasCompanyArea,
      });
    },
  );

  it("knows website staff, and no one else", () => {
    expect(of("websiteAdmin")).toMatchObject({
      role: "admin",
      homeDomain: null,
      visibleDomains: [],
      isWebsiteStaff: true,
    });
    expect(of("websiteAdmin").has(P.PROJECT_VIEW)).toBe(false);
    expect(of("websiteAdmin").has(P.WEBSITE_MANAGE)).toBe(true);
    for (const name of ["superAdmin", "designAdmin", "designEmployee", "customGrants"] as const) {
      expect(of(name).isWebsiteStaff).toBe(false);
    }
  });

  it("answers has, hasAny and hasAll from the effective codes", () => {
    const p = of("designEmployee");
    expect(p.has(P.WORK_ENTRY_CREATE)).toBe(true);
    expect(p.has(P.FINANCIAL_VIEW)).toBe(false);
    expect(p.hasAny(P.FINANCIAL_VIEW, P.PROJECT_VIEW)).toBe(true);
    expect(p.hasAll(P.FINANCIAL_VIEW, P.PROJECT_VIEW)).toBe(false);
  });

  it("only lets a person into the domains they can see", () => {
    expect(of("designEmployee").canSeeDomain("execution")).toBe(false);
    expect(of("customGrants").canSeeDomain("execution")).toBe(true);
    expect(of("superAdmin").canSeeDomain("design")).toBe(true);
    expect(of("superAdmin").canSeeDomain("elsewhere")).toBe(false);
    expect(of("superAdmin").canSeeDomain(null)).toBe(false);
  });

  it("keeps money to super admins by default", () => {
    expect(of("superAdmin").has(P.FINANCIAL_VIEW)).toBe(true);
    for (const name of [
      "designAdmin",
      "executionAdmin",
      "designEmployee",
      "executionEmployee",
    ] as const) {
      expect(of(name).has(P.FINANCIAL_VIEW)).toBe(false);
    }
  });

  it("treats an unknown role as an employee", () => {
    expect(permissionsOf({ ...personas.designEmployee, role: "intern" }).role).toBe("employee");
  });
});
