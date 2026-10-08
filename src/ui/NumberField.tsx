import { useState } from "react";
import { TextInput, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { typography } from "@/theme/typography";
import { FieldFrame, useBoxStyle } from "./FieldFrame";
import { Text } from "./Text";

type NumberFieldProps = {
  label?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Whole numbers only when 0 (the default allows decimals). */
  decimals?: number;
  placeholder?: string;
  /** A unit after the number, such as "LBP" or "pcs". */
  suffix?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

const display = (value: number | null) => (value == null ? "" : String(value));

/** Reads what was typed: null when empty or not a number yet. Commas are thousands separators. */
export function parseNumber(text: string, decimals?: number): number | null {
  const cleaned = text.replace(/,/g, "").trim();
  if (!cleaned || !/^-?\d*\.?\d*$/.test(cleaned) || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return decimals === 0 ? Math.trunc(value) : value;
}

/** A number input on the numeric keypad, in the mono figures font. */
export function NumberField({
  label,
  value,
  onChange,
  decimals,
  placeholder,
  suffix,
  hint,
  error,
  optional,
  disabled,
  accessibilityLabel,
}: NumberFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  // What the person is typing ("12." on the way to "12.5") stays as typed while the field has focus.
  const [text, setText] = useState(display(value));
  const shown = focused ? text : display(value);
  const box = useBoxStyle(focused, !!error, disabled);

  return (
    <FieldFrame label={label} hint={hint} error={error} optional={optional}>
      <View style={box}>
        <TextInput
          value={shown}
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={colors.ink3}
          selectionColor={colors.accent}
          keyboardType={decimals === 0 ? "number-pad" : "decimal-pad"}
          accessibilityLabel={accessibilityLabel ?? label}
          onFocus={() => {
            setText(display(value));
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onChangeText={(next) => {
            setText(next);
            onChange(parseNumber(next, decimals));
          }}
          style={[typography.mono, { flex: 1, color: colors.ink, minHeight: 42 }]}
        />
        {suffix ? (
          <Text variant="small" tone="muted">
            {suffix}
          </Text>
        ) : null}
      </View>
    </FieldFrame>
  );
}
