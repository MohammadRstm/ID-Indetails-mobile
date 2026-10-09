import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { typography } from "@/theme/typography";
import { Avatar, Button, Card, Icon, ListRow, Sheet, Skeleton, Text } from "@/ui";

export type PickablePerson = { id: number; name: string; detail?: string | null };

type PeoplePickerSheetProps = {
  visible: boolean;
  title: string;
  people: PickablePerson[];
  selected: number[];
  /** Still loading the people. */
  loading?: boolean;
  /** Several can be chosen; the sheet then has a Done button. */
  multiple?: boolean;
  /** A choice is being saved: nothing can be picked meanwhile. */
  busy?: boolean;
  emptyText: string;
  onToggle: (id: number) => void;
  onClose: () => void;
};

/** A searchable list of people to choose one or several from (the web's assignee and owner pickers). */
export function PeoplePickerSheet({
  visible,
  title,
  people,
  selected,
  loading,
  multiple,
  busy,
  emptyText,
  onToggle,
  onClose,
}: PeoplePickerSheetProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle ? people.filter((p) => p.name.toLowerCase().includes(needle)) : people;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        multiple ? <Button label="Done" variant="primary" fullWidth onPress={onClose} /> : undefined
      }
    >
      <View style={[styles.search, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
        <Icon name="search" size={17} color={colors.ink3} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search people"
          placeholderTextColor={colors.ink3}
          accessibilityLabel="Search people"
          autoCorrect={false}
          style={[typography.body, styles.input, { color: colors.ink }]}
        />
      </View>
      {loading ? (
        <Skeleton lines={4} height={18} />
      ) : shown.length === 0 ? (
        <Text tone="muted" style={styles.empty}>
          {people.length === 0 ? emptyText : "No one matches."}
        </Text>
      ) : (
        <Card padded={false}>
          {shown.map((person, i) => {
            const on = selected.includes(person.id);
            return (
              <ListRow
                key={person.id}
                title={person.name}
                subtitle={person.detail ?? undefined}
                leading={<Avatar name={person.name} size={28} />}
                trailing={on ? <Icon name="check" color={colors.accentInk} /> : undefined}
                selected={on}
                divider={i < shown.length - 1}
                onPress={busy ? undefined : () => onToggle(person.id)}
              />
            );
          })}
        </Card>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s,
    minHeight: spacing.touch,
    paddingHorizontal: spacing.row,
    borderWidth: 1,
    borderRadius: radii.input,
  },
  input: { flex: 1, paddingVertical: spacing.s },
  empty: { paddingVertical: spacing.l },
});
