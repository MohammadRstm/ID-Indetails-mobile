import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { radii } from "@/theme/tokens";
import { COMPANY_MARK, COMPANY_MARK_BOX } from "./companyMark";

type BrandMarkProps = {
  /** The company's uploaded logo; without one, the company mark. */
  logoUri: string | null;
  size?: number;
};

/** The company logo or, by default, the company's mark on an ink tile, as the web's `Logo`. */
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
      <Rect x={0.6} y={0.6} width={26.8} height={26.8} rx={8} fill={colors.ink} />
      <Svg x={7.5} y={2.6} width={13} height={22.8} viewBox={COMPANY_MARK_BOX}>
        <Path d={COMPANY_MARK} fill={colors.surface} />
      </Svg>
    </Svg>
  );
}

const styles = StyleSheet.create({
  logo: { borderRadius: radii.input },
});
