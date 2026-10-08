import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Avatar, type AvatarPhoto } from "./Avatar";
import { Text } from "./Text";

export type StackPerson = { id: number; name: string; photo?: AvatarPhoto | null };

type AvatarStackProps = {
  people: StackPerson[];
  /** How many faces to show before "+N". */
  max?: number;
  size?: number;
};

/** Overlapping faces with a ring between them, and "+N" for the rest (the web's `.av-stack`). */
export function AvatarStack({ people, max = 4, size = 26 }: AvatarStackProps) {
  const { colors } = useTheme();
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const label = people.map((p) => p.name).join(", ");

  return (
    <View style={styles.stack} accessible accessibilityRole="image" accessibilityLabel={label}>
      {shown.map((person, i) => (
        <View
          key={person.id}
          style={[
            styles.ring,
            { borderColor: colors.ring, borderRadius: size, marginLeft: i === 0 ? 0 : -8 },
          ]}
        >
          <Avatar name={person.name} photo={person.photo} size={size} />
        </View>
      ))}
      {rest > 0 && (
        <Text variant="small" tone="muted" style={styles.more}>
          +{rest}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: "row", alignItems: "center" },
  ring: { borderWidth: 2 },
  more: { marginLeft: spacing.s, fontVariant: ["tabular-nums"] },
});
