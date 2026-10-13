import { Text } from "@/ui";

/** Something the app says about the chat itself, between the messages. */
export function ChatNote({ text }: { text: string }) {
  return (
    <Text variant="small" tone="muted" align="center" accessibilityLiveRegion="polite">
      {text}
    </Text>
  );
}
