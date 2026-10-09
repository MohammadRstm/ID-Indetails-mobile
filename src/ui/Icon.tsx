import type { ColorValue } from "react-native";
import { SvgXml } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { icons, type IconName } from "./icons";

export type { IconName };

/*
 * The web's 24×24 icons, drawn from the same path strings. Strokes use the current colour at 1.6, round caps and
 * joins (the web's `.ic` rules); elements marked class="f" are filled instead.
 */

const xmlCache = new Map<IconName, string>();

function xmlOf(name: IconName): string {
  const cached = xmlCache.get(name);
  if (cached) return cached;
  const inner = icons[name].replace(/class="f"/g, 'fill="currentColor" stroke="none"');
  const xml =
    `<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" ` +
    `stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
  xmlCache.set(name, xml);
  return xml;
}

type IconProps = {
  name: IconName;
  size?: number;
  /** Defaults to the theme's ink. */
  color?: ColorValue;
};

export function Icon({ name, size = 20, color }: IconProps) {
  const { colors } = useTheme();
  return (
    <SvgXml
      xml={xmlOf(name)}
      width={size}
      height={size}
      color={color ?? colors.ink}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
