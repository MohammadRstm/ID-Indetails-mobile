import { useId } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { moodName, type ProtonMood } from "./protonMood";
import { protonPalette, solidAndOpacity } from "./protonPalette";
import { useBlobPath } from "./useBlobPath";

type ProtonBlobProps = {
  mood: ProtonMood;
  size?: number;
  /** A button or title next to it already says who this is: hide it from screen readers. */
  decorative?: boolean;
};

/** The eyes for each mood, in the 100 × 100 box: open, smiling arcs, or closed lines. */
function Eyes({ mood, eye }: { mood: ProtonMood; eye: string }) {
  if (mood === "asleep" || mood === "happy") {
    const [left, right] =
      mood === "asleep"
        ? ["M34 50 q5 3 10 0", "M56 50 q5 3 10 0"]
        : ["M34 51 q5 -6 10 0", "M56 51 q5 -6 10 0"];
    return (
      <G fill="none" stroke={eye} strokeWidth={2.6} strokeLinecap="round">
        <Path d={left} />
        <Path d={right} />
      </G>
    );
  }
  // looking up while it thinks, narrowed while it works or something went wrong
  const y = mood === "thinking" || mood === "working" ? 44 : 48;
  const ry = mood === "working" || mood === "error" ? 3.2 : 5.2;
  return (
    <G fill={eye}>
      <Ellipse cx={39} cy={y} rx={3.6} ry={ry} />
      <Ellipse cx={61} cy={y} rx={3.6} ry={ry} />
    </G>
  );
}

/**
 * Proton as a soft, furry blob: a glow behind it, a fringe of fur and a gradient body that wobble while it
 * thinks, works or talks, a sheen, and eyes that show its mood. The web blurs its glow; here it is a radial
 * gradient, which draws the same on both platforms.
 */
export function ProtonBlob({ mood, size = 32, decorative = false }: ProtonBlobProps) {
  const { scheme } = useTheme();
  const id = `proton${useId().replace(/[^\w-]/g, "")}`;
  const d = useBlobPath(mood);
  const c = protonPalette(scheme, mood);
  const glow = solidAndOpacity(c.glow);
  const sheen = solidAndOpacity(c.sheen);

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : "image"}
      accessibilityLabel={decorative ? undefined : moodName(mood)}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "yes"}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`${id}-body`} cx="38%" cy="32%" r="75%">
            <Stop offset="0%" stopColor={c.body1} />
            <Stop offset="100%" stopColor={c.body2} />
          </RadialGradient>
          <RadialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <Stop offset="55%" stopColor={glow.solid} stopOpacity={glow.opacity} />
            <Stop offset="100%" stopColor={glow.solid} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={52} r={48} fill={`url(#${id}-glow)`} />
        <Path
          d={d}
          fill="none"
          stroke={c.fur}
          strokeWidth={7}
          strokeDasharray={[0.4, 3.1]}
          strokeLinecap="round"
        />
        <Path d={d} fill={`url(#${id}-body)`} />
        <Ellipse
          cx={38}
          cy={33}
          rx={11}
          ry={6.5}
          fill={sheen.solid}
          fillOpacity={sheen.opacity}
          transform="rotate(-24 38 33)"
        />
        <Eyes mood={mood} eye={c.eye} />
      </Svg>
    </View>
  );
}
