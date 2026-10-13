import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Text } from "@/ui";
import { Bubble } from "./Bubble";

type LiveReplyProps = {
  /** The answer as far as it is written; null before the first words. */
  text: string | null;
  /** What Proton is doing, in the server's words. */
  status: string;
};

/** An answer on its way: the words as they arrive, and a line saying what Proton is doing. */
export function LiveReply({ text, status }: LiveReplyProps) {
  return (
    <View style={styles.wrap}>
      {text ? <Bubble from="proton" text={text} /> : null}
      <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: spacing.s } });
