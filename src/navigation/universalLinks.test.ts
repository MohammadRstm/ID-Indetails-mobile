import { routeForUniversalLink } from "./universalLinks";

const original = process.env.EXPO_PUBLIC_WEB_DOMAIN;
afterEach(() => {
  if (original === undefined) delete process.env.EXPO_PUBLIC_WEB_DOMAIN;
  else process.env.EXPO_PUBLIC_WEB_DOMAIN = original;
});

describe("routeForUniversalLink", () => {
  describe("with the web domain set", () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_WEB_DOMAIN = "app.example.com";
    });

    it("maps a project and its sections", () => {
      expect(routeForUniversalLink("https://app.example.com/projects/12")).toEqual({
        pathname: "/projects/[id]",
        params: { id: "12" },
      });
      expect(routeForUniversalLink("https://app.example.com/projects/12/requirements")).toEqual({
        pathname: "/projects/[id]/requirements",
        params: { id: "12" },
      });
    });

    it("maps meetings and the alert list", () => {
      expect(routeForUniversalLink("https://app.example.com/meetings")).toBe("/meetings");
      expect(routeForUniversalLink("https://app.example.com/meetings/3")).toEqual({
        pathname: "/meetings/[id]",
        params: { id: "3" },
      });
      expect(routeForUniversalLink("https://app.example.com/notifications")).toBe("/alerts");
    });

    it("leaves invitation and password-reset links to the website", () => {
      expect(routeForUniversalLink("https://app.example.com/accept-invitation?token=x")).toBeNull();
      expect(routeForUniversalLink("https://app.example.com/reset-password?token=x")).toBeNull();
    });

    it("refuses other hosts, plain http, bad ids and junk", () => {
      expect(routeForUniversalLink("https://evil.example.org/projects/12")).toBeNull();
      expect(routeForUniversalLink("https://app.example.com.evil.org/projects/12")).toBeNull();
      expect(routeForUniversalLink("http://app.example.com/projects/12")).toBeNull();
      expect(routeForUniversalLink("https://app.example.com/projects/abc")).toBeNull();
      expect(routeForUniversalLink("https://app.example.com/projects/12/secrets")).toBeNull();
      expect(routeForUniversalLink("not a url")).toBeNull();
    });
  });

  it("is off when the domain is unset", () => {
    delete process.env.EXPO_PUBLIC_WEB_DOMAIN;
    expect(routeForUniversalLink("https://app.example.com/projects/12")).toBeNull();
  });
});
