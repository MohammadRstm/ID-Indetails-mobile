import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { sceneOf, type ScreenState } from "../blob/conversationMood";
import { ProtonBlob } from "../blob/ProtonBlob";
import { useConversationMood } from "../blob/useConversationMood";

/** Proton's blob in the chat's header, in the mood of the conversation: from what the screen already knows. */
export function ProtonMark(state: ScreenState) {
  const mood = useConversationMood(sceneOf(state));
  return (
    <View style={styles.mark}>
      <ProtonBlob mood={mood} size={36} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: spacing.touch,
    height: spacing.touch,
    alignItems: "center",
    justifyContent: "center",
  },
});
