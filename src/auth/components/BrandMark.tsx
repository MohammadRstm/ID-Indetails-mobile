import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { radii } from "@/theme/tokens";

type BrandMarkProps = {
  /** The company's uploaded logo; without one, the ID InDetails mark. */
  logoUri: string | null;
  size?: number;
};

/** The company logo or the product mark, as the web's `Logo`. */
export function BrandMark({ logoUri, size = 40 }: BrandMarkProps) {
  const { colors } = useTheme();
  if (logoUri) {
    return (
      <Image
        source={{ uri: logoUri }}
        style={[styles.logo, { width: size, height: size }]}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" accessibilityElementsHidden>
      <Rect x={0.6} y={0.6} width={26.8} height={26.8} rx={8} fill={colors.accent} />
      <Circle
        cx={14}
        cy={14}
        r={7.6}
        fill="none"
        stroke={colors.onAccent}
        strokeWidth={1.7}
        opacity={0.55}
      />
      <Path
        d="M14 8.6V14h5.2"
        fill="none"
        stroke={colors.onAccent}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  logo: { borderRadius: radii.input },
});
