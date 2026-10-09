import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

/** A 1pt hairline in the line colour (the web's `.divider`). */
export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: 1, marginLeft: inset, backgroundColor: colors.line }} />;
}
