import { permissionsOf } from "@/permissions/permissions";
import { personas } from "@test/personas";
import type { ProtonRef } from "./api";
import { hrefOfRef } from "./refs";

const ref = (change: Partial<ProtonRef>): ProtonRef => ({
  type: "project",
  id: 7,
  name: "Villa Haddad",
  domain: "design",
  ...change,
});

describe("hrefOfRef", () => {
  const admin = permissionsOf(personas.designAdmin);

  it("opens a team in that team's chat", () => {
    const team = ref({ type: "team", id: 5, name: "Site crew", domain: null });
    expect(hrefOfRef(team, admin)).toEqual({
      pathname: "/messages/team/[teamId]",
      params: { teamId: "5" },
    });
  });

  it("opens projects, clients and people", () => {
    expect(hrefOfRef(ref({}), admin)).toEqual({
      pathname: "/projects/[id]",
      params: { id: "7" },
    });
    expect(hrefOfRef(ref({ type: "client", id: 3, domain: null }), admin)).toEqual({
      pathname: "/clients/[id]",
      params: { id: "3" },
    });
    expect(hrefOfRef(ref({ type: "person", id: 4, domain: null }), admin)).toEqual({
      pathname: "/people/[id]",
      params: { id: "4" },
    });
  });

  it("opens nothing for a project in a domain the person can't see, or without one", () => {
    expect(hrefOfRef(ref({ domain: "execution" }), admin)).toBeNull();
    expect(hrefOfRef(ref({ domain: null }), admin)).toBeNull();
    expect(hrefOfRef(ref({ domain: "company" }), admin)).toBeNull();
  });

  it("opens nothing for a bad id", () => {
    expect(hrefOfRef(ref({ type: "team", id: 0 }), admin)).toBeNull();
    expect(hrefOfRef(ref({ type: "team", id: -3 }), admin)).toBeNull();
  });
});
