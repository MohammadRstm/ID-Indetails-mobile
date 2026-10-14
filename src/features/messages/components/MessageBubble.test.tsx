import { screen } from "@testing-library/react-native";
import type { Message } from "@/api/types";
import { renderWithProviders } from "@test/render";
import { VIA_PROTON_LABEL } from "../model";
import { MessageBubble } from "./MessageBubble";

const message = (change: Partial<Message> = {}): Message => ({
  id: 1,
  attachments: [],
  body: "I'll be late by ten minutes",
  createdAt: "2026-10-08T06:00:00Z",
  kind: "text",
  mentions: [],
  sender: { id: 4, name: "Sarah Test", photoFileId: null },
  taskComment: null,
  viaProton: false,
  ...change,
});

async function show(m: Message) {
  await renderWithProviders(
    <MessageBubble
      message={m}
      mine={false}
      showSender
      senderPhoto={null}
      mentionNames={[]}
      imageSource={() => ({ uri: "https://example.test/photo" })}
    />,
  );
}

describe("MessageBubble", () => {
  it("marks a message Proton wrote and says what the mark means", async () => {
    await show(message({ viaProton: true }));
    expect(screen.getByText("with Proton ·")).toBeTruthy();
    expect(screen.getByLabelText(new RegExp(VIA_PROTON_LABEL))).toBeTruthy();
  });

  it("leaves an ordinary message unmarked", async () => {
    await show(message());
    expect(screen.getByText("I'll be late by ten minutes")).toBeTruthy();
    expect(screen.queryByText("with Proton ·")).toBeNull();
    expect(screen.queryByLabelText(new RegExp(VIA_PROTON_LABEL))).toBeNull();
  });
});
