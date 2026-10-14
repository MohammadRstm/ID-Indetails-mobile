import type { ProtonChatSummary } from "./api";
import { chatRows, emptyChatsText } from "./chatList";

const chat = (change: Partial<ProtonChatSummary>): ProtonChatSummary => ({
  id: "11111111-1111-1111-1111-111111111111",
  title: "Villa Haddad hours",
  createdAt: "2026-10-13T08:00:00Z",
  updatedAt: "2026-10-13T08:00:00Z",
  messageCount: 4,
  ...change,
});

describe("chatRows", () => {
  const now = new Date("2026-10-13T10:00:00Z");

  it("names each chat and says when it was last used and how long it is", () => {
    const [row] = chatRows([chat({})], now);
    expect(row).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      title: "Villa Haddad hours",
      subtitle: "2 hours ago · 4 messages",
    });
  });

  it("says 1 message in the singular", () => {
    expect(chatRows([chat({ messageCount: 1 })], now)[0].subtitle).toMatch(/· 1 message$/);
  });

  it("gives a chat with a blank name a name to be found by", () => {
    expect(chatRows([chat({ title: "  " })], now)[0].title).toBe("Untitled chat");
  });
});

describe("emptyChatsText", () => {
  it("says why a search found nothing, or what the list is for", () => {
    expect(emptyChatsText(true)).toBe("No chat has that in its name.");
    expect(emptyChatsText(false)).toBe("Your chats with Proton will be kept here.");
  });
});
