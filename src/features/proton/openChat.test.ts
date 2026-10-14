import Storage from "expo-sqlite/kv-store";
import { runSignOutCleanups } from "@/auth/signOutCleanup";
import { readOpenChat, saveOpenChat } from "./openChat";

const CHAT = "11111111-1111-1111-1111-111111111111";

describe("the open chat", () => {
  it("is remembered per person", () => {
    saveOpenChat(1, CHAT);
    expect(readOpenChat(1)).toBe(CHAT);
    expect(readOpenChat(2)).toBeNull();
  });

  it("is forgotten when set to null", () => {
    saveOpenChat(3, CHAT);
    saveOpenChat(3, null);
    expect(readOpenChat(3)).toBeNull();
  });

  it("ignores a stored value that isn't a chat id", () => {
    Storage.setItemSync("idi.proton.chat.4", "../../somewhere");
    expect(readOpenChat(4)).toBeNull();
  });

  it("goes when the person signs out", async () => {
    saveOpenChat(5, CHAT);
    await runSignOutCleanups("signedOut");
    expect(readOpenChat(5)).toBeNull();
  });
});
