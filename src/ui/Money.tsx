import { useState } from "react";
import { Pressable } from "react-native";
import { money, type Currency } from "@/format/money";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

type MoneyProps = {
  /** An amount from the API. The app formats money and never calculates it. */
  amount: number;
  currency?: Currency;
  size?: "regular" | "large";
  /** Every digit always, instead of $12.2k with the full figure on a long press. */
  exact?: boolean;
  cents?: boolean;
  /** Gains in green and losses in red (profit, margins). */
  signed?: boolean;
};

/** A money figure in the condensed mono font: short on screen, the full amount on a long press. */
export function Money({
  amount,
  currency = "USD",
  size = "regular",
  exact,
  cents,
  signed,
}: MoneyProps) {
  const { colors } = useTheme();
  const [full, setFull] = useState(false);
  const fullText = money.exact(amount, currency, { cents });
  const text = exact || full ? fullText : money.fmt(amount, currency, { cents });
  const color = signed && amount !== 0 ? (amount > 0 ? colors.profit : colors.loss) : colors.ink;
  const figure = (
    <Text
      variant={size === "large" ? "figureLarge" : "mono"}
      style={{ color }}
      accessibilityLabel={fullText}
    >
      {text}
    </Text>
  );

  if (exact || text === fullText) return figure;
  return (
    <Pressable
      onLongPress={() => setFull(true)}
      onPressOut={() => setFull(false)}
      accessibilityHint="Long press for the full amount"
    >
      {figure}
    </Pressable>
  );
}
