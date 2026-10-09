import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { typography } from "@/theme/typography";
import { FieldFrame, useBoxStyle } from "./FieldFrame";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";
import { Text } from "./Text";

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

type SelectProps<T extends string | number> = {
  label?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  /** A search box above the options, for long lists. */
  searchable?: boolean;
  hint?: string;
  error?: string;
  optional?: boolean;
  disabled?: boolean;
};

/** A field that opens a sheet of options (the web's select menu); the chosen one in accent with a check. */
export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose…",
  searchable,
  hint,
  error,
  optional,
  disabled,
}: SelectProps<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const box = useBoxStyle(open, !!error, disabled);
  const chosen = options.find((option) => option.value === value);
  const needle = query.trim().toLowerCase();
  const shown = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <FieldFrame label={label} hint={hint} error={error} optional={optional}>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? "Choice"}: ${chosen?.label ?? "not chosen"}`}
        style={box}
      >
        <Text style={styles.value} tone={chosen ? "default" : "muted"} numberOfLines={1}>
          {chosen?.label ?? placeholder}
        </Text>
        <Icon name="chevronDown" size={18} color={colors.ink3} />
      </Pressable>
      <Sheet visible={open} onClose={close} title={label}>
        {searchable && (
          <View
            style={[styles.search, { backgroundColor: colors.surface2, borderColor: colors.line }]}
          >
            <Icon name="search" size={17} color={colors.ink3} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={colors.ink3}
              selectionColor={colors.accent}
              accessibilityLabel="Search the options"
              style={[typography.body, styles.searchInput, { color: colors.ink }]}
            />
          </View>
        )}
        <View accessibilityRole="list">
          {shown.map((option) => {
            const on = option.value === value;
            return (
              <Pressable
                key={String(option.value)}
                disabled={option.disabled}
                onPress={() => {
                  onChange(option.value);
                  close();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: !!option.disabled }}
                style={({ pressed }) => [
                  styles.option,
                  (on || pressed) && { backgroundColor: on ? colors.accentSoft : colors.surface3 },
                  option.disabled && styles.disabled,
                ]}
              >
                <View style={styles.value}>
                  <Text variant={on ? "bodyStrong" : "body"} tone={on ? "accent" : "default"}>
                    {option.label}
                  </Text>
                  {option.description ? (
                    <Text variant="small" tone="muted">
                      {option.description}
                    </Text>
                  ) : null}
                </View>
                {on && <Icon name="check" size={18} color={colors.accent} />}
              </Pressable>
            );
          })}
          {shown.length === 0 && (
            <Text variant="small" tone="muted" style={styles.empty}>
              Nothing matches “{query.trim()}”.
            </Text>
          )}
        </View>
      </Sheet>
    </FieldFrame>
  );
}

const styles = StyleSheet.create({
  value: { flex: 1, minWidth: 0 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.m,
    minHeight: spacing.touch,
    paddingHorizontal: spacing.row,
    borderWidth: 1,
    borderRadius: radii.input,
  },
  searchInput: { flex: 1, minHeight: 42 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.row,
    minHeight: spacing.touch + 4,
    paddingHorizontal: spacing.row + 2,
    paddingVertical: spacing.s,
    borderRadius: radii.input,
  },
  disabled: { opacity: 0.45 },
  empty: { padding: spacing.row },
});
