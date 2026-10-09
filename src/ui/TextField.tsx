import { useState } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { typography } from "@/theme/typography";
import { FieldFrame, useBoxStyle } from "./FieldFrame";

type TextFieldProps = Pick<
  TextInputProps,
  | "placeholder"
  | "secureTextEntry"
  | "keyboardType"
  | "autoComplete"
  | "autoCapitalize"
  | "autoCorrect"
  | "textContentType"
  | "returnKeyType"
  | "onSubmitEditing"
  | "maxLength"
  | "autoFocus"
> & {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
  error?: string;
  optional?: boolean;
  multiline?: boolean;
  disabled?: boolean;
  /** Read out when there is no visible label. */
  accessibilityLabel?: string;
};

/** A labelled text input (the web's `.field` with `.input`). */
export function TextField({
  label,
  hint,
  error,
  optional,
  multiline,
  disabled,
  accessibilityLabel,
  ...input
}: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const box = useBoxStyle(focused, !!error, disabled);

  return (
    <FieldFrame label={label} hint={hint} error={error} optional={optional}>
      <TextInput
        {...input}
        editable={!disabled}
        multiline={multiline}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={error}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.ink3}
        selectionColor={colors.accent}
        style={[box, typography.body, { color: colors.ink }, multiline && styles.multiline]}
      />
    </FieldFrame>
  );
}

const styles = StyleSheet.create({
  multiline: { minHeight: 96, paddingTop: spacing.row, textAlignVertical: "top" },
});
