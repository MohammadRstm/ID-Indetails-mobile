import { personas, withPermissions, type PersonaName } from "@test/personas";
import { P } from "./codes";
import { permissionsOf } from "./permissions";
import { canOpen, persona, screens, tabsFor, type ScreenKey } from "./screens";

/*
 * The whole matrix, like the web's permissionMatrix.test.ts: which screens each kind of person may open with the
 * permissions the API gives their role. A change to any rule shows up here, to be looked at on purpose.
 */

const PEOPLE: PersonaName[] = [
  "superAdmin",
  "designAdmin",
  "executionAdmin",
  "designEmployee",
  "executionEmployee",
  "customGrants",
];

// One letter per person, in PEOPLE order: o opens, - not available.
// Columns: superAdmin, designAdmin, executionAdmin, designEmployee, executionEmployee, customGrants.
const MATRIX: Record<ScreenKey, string> = {
  today: "oooooo",
  work: "---o-o",
  sites: "o-o-oo",
  projects: "oooooo",
  messages: "oooooo",
  alerts: "oooooo",
  more: "oooooo",
  notAvailable: "oooooo",
  settings: "oooooo",
  devGallery: "oooooo",
  workEntry: "---o-o",
  logWork: "---o-o",
  pay: "---o-o",
  projectMaterials: "o-o-oo",
  addMaterials: "o-o-oo",
  labourWeeks: "o-o-o-",
  labourWeek: "o-o-o-",
  pending: "o-o-oo",
  project: "oooooo",
  projectRequirements: "oooooo",
  myRequirements: "oooooo",
  meetings: "oooooo",
  newMeeting: "ooooo-",
  meeting: "oooooo",
  teamChat: "oooooo",
  directChat: "oooooo",
  notificationSettings: "oooooo",
  profile: "oooooo",
  editRequirement: "ooo---",
  projectActivity: "ooo---",
  activity: "oo----",
  people: "oo----",
  person: "ooo---",
  clients: "ooo--o",
  client: "ooo--o",
  proton: "ooo---",
  company: "o-----",
  companyAlerts: "o-----",
  invoices: "o-----",
  invoice: "o-----",
  newPayment: "o-----",
  statement: "o-----",
  devices: "oooooo",
};

describe("the screen table", () => {
  it("covers every screen", () => {
    expect(Object.keys(MATRIX).sort()).toEqual(Object.keys(screens).sort());
  });

  PEOPLE.forEach((name, column) => {
    it(`opens the right screens for ${name}`, () => {
      const p = permissionsOf(personas[name]);
      const keys = Object.keys(MATRIX) as ScreenKey[];
      const got = Object.fromEntries(keys.map((key) => [key, canOpen(p, key) ? "o" : "-"]));
      const expected = Object.fromEntries(keys.map((key) => [key, MATRIX[key][column]]));
      expect(got).toEqual(expected);
    });
  });

  it("keeps money screens away from anyone without financial:view, even an admin with the company area", () => {
    const admin = withPermissions(personas.designAdmin, { grant: [P.COMPANY_VIEW] });
    const p = permissionsOf(admin);
    expect(canOpen(p, "company")).toBe(false);
    expect(canOpen(p, "invoices")).toBe(false);
  });
});

describe("persona", () => {
  it.each([
    ["superAdmin", "super_admin"],
    ["designAdmin", "admin"],
    ["executionAdmin", "admin"],
    ["designEmployee", "design_employee"],
    ["executionEmployee", "execution_employee"],
    ["customGrants", "design_employee"],
    ["websiteAdmin", "website_staff"],
  ] as const)("%s is a %s", (name, kind) => {
    expect(persona(permissionsOf(personas[name]))).toBe(kind);
  });
});

describe("tabsFor", () => {
  const tabs = (name: PersonaName) => tabsFor(permissionsOf(personas[name])).map((t) => t.label);

  it("gives each person the tabs of phase-0-plan.md section 4", () => {
    expect(tabs("designEmployee")).toEqual(["Today", "Work", "Messages", "Alerts", "More"]);
    expect(tabs("executionEmployee")).toEqual(["Today", "Sites", "Messages", "Alerts", "More"]);
    expect(tabs("designAdmin")).toEqual(["Today", "Projects", "Messages", "Alerts", "More"]);
    expect(tabs("executionAdmin")).toEqual(["Today", "Projects", "Messages", "Alerts", "More"]);
    expect(tabs("superAdmin")).toEqual(["Company", "Projects", "Messages", "Alerts", "More"]);
    expect(tabs("customGrants")).toEqual(["Today", "Work", "Messages", "Alerts", "More"]);
    expect(tabs("websiteAdmin")).toEqual(["Today", "Messages", "Alerts", "More"]);
  });

  it("drops a tab whose screen the person can no longer open", () => {
    const noLogging = withPermissions(personas.designEmployee, { revoke: [P.WORK_ENTRY_CREATE] });
    expect(tabsFor(permissionsOf(noLogging)).map((t) => t.key)).toEqual([
      "today",
      "messages",
      "alerts",
      "more",
    ]);
  });
});
