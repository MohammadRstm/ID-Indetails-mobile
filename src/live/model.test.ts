/// <reference types="node" />
import { messagesStale, needsFreshToken, tokenExpiry } from "./model";

const jwt = (payload: object) =>
  `x.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.y`;

it("reads a token's expiry and asks for a fresh one a minute ahead", () => {
  const token = jwt({ sub: "4", exp: 2_000_000 });
  expect(tokenExpiry(token)).toBe(2_000_000_000);
  expect(needsFreshToken(token, 2_000_000_000 - 120_000)).toBe(false);
  expect(needsFreshToken(token, 2_000_000_000 - 30_000)).toBe(true);
  expect(needsFreshToken(null, 0)).toBe(true);
  expect(needsFreshToken("not-a-token", 0)).toBe(true);
});

it("reloads the badge, the list and the chat a messages signal names", () => {
  expect(messagesStale({ teamId: 3 })).toEqual([
    ["messages", "badge"],
    ["messages", "conversations"],
    ["messages", "thread", "team-3"],
  ]);
  expect(messagesStale(undefined)).toHaveLength(2);
});
