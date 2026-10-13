import { permissionsOf } from "@/permissions/permissions";
import { personas } from "@test/personas";
import type { ProtonBriefing } from "./api";
import { briefingRows } from "./briefing";

const briefing: ProtonBriefing = {
  more: 2,
  items: [
    {
      project: { type: "project", id: 7, name: "Villa Haddad", domain: "design" },
      domain: "design",
      facts: ["3 requirements are overdue", "A meeting is today"],
    },
    { project: null, domain: "execution", facts: ["2 sites have no labour report"] },
    { project: null, domain: null, facts: ["Salaries are due"] },
    { project: null, domain: "design", facts: [] },
  ],
};

describe("briefingRows", () => {
  it("shows the most pressing fact of each item and how many more it has", () => {
    const rows = briefingRows(briefing, permissionsOf(personas.designAdmin));
    expect(rows.map((r) => [r.name, r.fact, r.extra])).toEqual([
      ["Villa Haddad", "3 requirements are overdue", 1],
      ["Execution", "2 sites have no labour report", 0],
      ["Company", "Salaries are due", 0],
    ]);
  });

  it("links a project the person may open, and nothing else", () => {
    const rows = briefingRows(briefing, permissionsOf(personas.designAdmin));
    expect(rows[0].href).toEqual({ pathname: "/projects/[id]", params: { id: "7" } });
    expect(rows[1].href).toBeNull();
    // a project in a domain the person can't see has no link
    const elsewhere = briefingRows(briefing, permissionsOf(personas.executionAdmin));
    expect(elsewhere[0].href).toBeNull();
  });

  it("has no rows without a briefing", () => {
    expect(briefingRows(undefined, permissionsOf(personas.designAdmin))).toEqual([]);
  });
});
