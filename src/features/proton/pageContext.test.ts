import { permissionsOf } from "@/permissions/permissions";
import { personas, type PersonaName } from "@test/personas";
import { pageContextOf, protonHrefFor, protonPageHref } from "./pageContext";

const perms = (name: PersonaName) => permissionsOf(personas[name]);

describe("pageContextOf", () => {
  it("names a record, its page and the area it is in", () => {
    expect(
      pageContextOf({ about: "client", id: "3", area: "execution" }, perms("designAdmin")),
    ).toEqual({
      area: "execution",
      page: "clients",
      entityType: "client",
      entityId: 3,
      section: null,
      surface: null,
    });
  });

  it("names the section of a project, and drops a section that isn't one", () => {
    const params = { about: "project", id: "7", area: "design" };
    const admin = perms("designAdmin");
    expect(pageContextOf({ ...params, section: "financials" }, admin)).toMatchObject({
      page: "projects",
      entityType: "project",
      entityId: 7,
      section: "financials",
    });
    expect(pageContextOf({ ...params, section: "../admin" }, admin)).toMatchObject({
      section: null,
    });
  });

  it("gives a section only to a project", () => {
    expect(
      pageContextOf(
        { about: "client", id: "3", area: "design", section: "financials" },
        perms("designAdmin"),
      ),
    ).toMatchObject({ section: null });
  });

  it("names the phone's own pages, in the area of the person's domain", () => {
    const pages = ["dashboard", "my_work", "my_pay", "messages", "notifications", "settings"];
    for (const page of pages) {
      expect(pageContextOf({ page }, perms("designEmployee"))).toEqual({
        area: "design",
        page,
        entityType: null,
        entityId: null,
        section: null,
        surface: null,
      });
    }
    expect(pageContextOf({ page: "settings" }, perms("executionEmployee"))).toMatchObject({
      area: "execution",
    });
    expect(pageContextOf({ page: "dashboard" }, perms("superAdmin"))).toMatchObject({
      area: "company",
    });
  });

  it("names an open chat by who it is with, or which team", () => {
    expect(
      pageContextOf({ page: "messages", about: "person", id: "9" }, perms("designEmployee")),
    ).toMatchObject({ page: "messages", entityType: "person", entityId: 9 });
    expect(pageContextOf({ about: "team", id: "5" }, perms("designEmployee"))).toMatchObject({
      page: "messages",
      entityType: "team",
      entityId: 5,
    });
  });

  it("drops anything that doesn't fit", () => {
    const p = perms("designAdmin");
    expect(pageContextOf({}, p)).toBeNull();
    expect(pageContextOf({ about: "invoice", id: "7", area: "design" }, p)).toBeNull();
    expect(pageContextOf({ about: "project", id: "-7", area: "design" }, p)).toBeNull();
    expect(pageContextOf({ about: "project", id: "7x", area: "design" }, p)).toBeNull();
    expect(pageContextOf({ page: "reports" }, p)).toBeNull();
    // an area the API doesn't know falls back to the person's own
    expect(pageContextOf({ about: "project", id: "7", area: "mars" }, p)).toMatchObject({
      area: "design",
    });
  });
});

describe("the links that open Proton", () => {
  it("passes the record, its area and the project section as parameters", () => {
    expect(protonHrefFor("project", 7, "design")).toEqual({
      pathname: "/proton",
      params: { about: "project", id: "7", area: "design" },
    });
    expect(protonHrefFor("project", 7, "design", "financials")).toEqual({
      pathname: "/proton",
      params: { about: "project", id: "7", area: "design", section: "financials" },
    });
    expect(protonHrefFor("person", 4, null)).toEqual({
      pathname: "/proton",
      params: { about: "person", id: "4" },
    });
  });

  it("passes the page the person is on", () => {
    expect(protonPageHref("dashboard", "execution")).toEqual({
      pathname: "/proton",
      params: { page: "dashboard", area: "execution" },
    });
  });
});
