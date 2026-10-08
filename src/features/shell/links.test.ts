import type { Href } from "expo-router";
import { routeForUniversalLink } from "@/navigation/universalLinks";
import { pathForIncomingLink, pathOfHref } from "./links";

jest.mock("@/navigation/universalLinks", () => ({ routeForUniversalLink: jest.fn(() => null) }));

const mockedUniversal = jest.mocked(routeForUniversalLink);

describe("pathOfHref", () => {
  it("fills the route's parameters and puts the rest in the query", () => {
    const href = {
      pathname: "/projects/[id]/requirements",
      params: { id: "12", requirementId: "9" },
    } as Href;
    expect(pathOfHref(href)).toBe("/projects/12/requirements?requirementId=9");
    expect(pathOfHref("/alerts")).toBe("/alerts");
  });

  it("keeps a parameter from changing the path", () => {
    const href = { pathname: "/people/[id]", params: { id: "../settings" } } as Href;
    expect(pathOfHref(href)).toBe("/people/..%2Fsettings");
  });
});

describe("pathForIncomingLink", () => {
  it("lets Expo Router open the app's own links", () => {
    expect(pathForIncomingLink("idindetails://projects/12")).toBe("idindetails://projects/12");
    expect(mockedUniversal).not.toHaveBeenCalled();
  });

  it("asks the universal-link mapping about https links", () => {
    mockedUniversal.mockReturnValueOnce({ pathname: "/clients/[id]", params: { id: "3" } });
    expect(pathForIncomingLink("https://example.com/clients/3")).toBe("/clients/3");
  });

  it("opens the start for an https link it doesn't know", () => {
    expect(pathForIncomingLink("https://example.com/whatever")).toBe("/");
  });
});
