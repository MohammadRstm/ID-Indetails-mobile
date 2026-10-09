import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import type { Colors } from "@/theme/tokens";
import { spacing } from "@/theme/tokens";
import { Text } from "./Text";

/** The web's empty-state illustrations (src/shared/components/Feedback/Empty.tsx), drawn in the theme's colours. */
const ART = {
  projects: (c: Colors) => (
    <>
      <Rect x="24" y="26" width="86" height="60" rx="7" fill={c.surface3} stroke={c.line2} />
      <Rect x="34" y="18" width="86" height="60" rx="7" fill={c.surface} stroke={c.line2} />
      <Path
        d="M46 36h48M46 48h34M46 60h26"
        stroke={c.line2}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <Circle cx="122" cy="72" r="18" fill={c.accentSoft} stroke={c.accent} strokeWidth="1.6" />
      <Path d="M122 62v10l6.5 4" stroke={c.accent} strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  search: (c: Colors) => (
    <>
      <Rect x="26" y="24" width="80" height="12" rx="4" fill={c.surface3} />
      <Rect x="26" y="46" width="62" height="12" rx="4" fill={c.surface3} />
      <Rect x="26" y="68" width="44" height="12" rx="4" fill={c.surface3} />
      <Circle cx="116" cy="54" r="22" fill={c.surface} stroke={c.accent} strokeWidth="2.4" />
      <Path d="M132 70l14 14" stroke={c.accent} strokeWidth="3.2" strokeLinecap="round" />
    </>
  ),
  done: (c: Colors) => (
    <>
      <Circle cx="85" cy="55" r="30" fill={c.accentSoft} />
      <Path
        d="M72 56l10 10 22-24"
        stroke={c.accent}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M33 30h14M27 44h20M124 66h18M130 80h14"
        stroke={c.line2}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </>
  ),
  time: (c: Colors) => (
    <>
      <Rect x="30" y="34" width="110" height="44" rx="8" fill={c.surface3} stroke={c.line2} />
      <Rect x="40" y="48" width="26" height="16" rx="4" fill={c.accent} />
      <Rect x="72" y="48" width="40" height="16" rx="4" fill={c.accentSoft} stroke={c.accent} />
      <Path d="M30 88h110" stroke={c.line2} strokeWidth="2" strokeLinecap="round" />
      <Path d="M46 24v6M86 24v6M126 24v6" stroke={c.line2} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
};

export type IllustrationName = keyof typeof ART;

type EmptyStateProps = {
  art?: IllustrationName;
  /** What is missing. */
  title: string;
  /** What to do about it, where there is something to do. */
  text?: string;
  /** A button, such as "Add materials". */
  action?: ReactNode;
};

/** An empty state: illustration, title, a line of text and an optional action. */
export function EmptyState({ art = "search", title, text, action }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Svg width={132} height={85} viewBox="0 0 170 110" fill="none" accessibilityElementsHidden>
        {ART[art](colors)}
      </Svg>
      <Text variant="subheading" align="center">
        {title}
      </Text>
      {text ? (
        <Text variant="small" tone="muted" align="center" style={styles.text}>
          {text}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    gap: spacing.row + 2,
    paddingVertical: spacing.xxxl + 2,
    paddingHorizontal: spacing.xl,
  },
  text: { maxWidth: 320 },
});
