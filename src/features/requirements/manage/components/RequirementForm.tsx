import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { AvatarStack, Button, Card, DateField, Icon, InlineError, ListRow, TextField } from "@/ui";

export type RequirementFormErrors = {
  text?: string;
  deadline?: string;
  assignees?: string;
  /** About the whole requirement, such as a project that closed meanwhile. */
  form?: string;
};

type RequirementFormProps = {
  isNew: boolean;
  /** For the placeholder's example: a site's or a design project's. */
  execution: boolean;
  text: string;
  deadline: string | null;
  assignees: { id: number; name: string }[];
  errors: RequirementFormErrors;
  saving: boolean;
  /** Assignees can be chosen (the person may list employees). */
  canAssign: boolean;
  onChangeText: (text: string) => void;
  onChangeDeadline: (day: string | null) => void;
  onPickAssignees: () => void;
  onSave: () => void;
  onDelete?: () => void;
};

export const REQUIREMENT_MAX_LENGTH = 500;

/** What has to be achieved, by when, and by whom (the web's requirement form). */
export function RequirementForm({
  isNew,
  execution,
  text,
  deadline,
  assignees,
  errors,
  saving,
  canAssign,
  onChangeText,
  onChangeDeadline,
  onPickAssignees,
  onSave,
  onDelete,
}: RequirementFormProps) {
  const who =
    assignees.length === 0
      ? "Not assigned"
      : assignees.length === 1
        ? assignees[0].name
        : `${assignees.length} people`;

  return (
    <View style={styles.form}>
      <TextField
        label="Requirement"
        value={text}
        onChangeText={onChangeText}
        placeholder={`What has to be achieved? e.g. ${
          execution ? "Kitchen tiling finished and inspected" : "Concept design approved by the client"
        }`}
        multiline
        maxLength={REQUIREMENT_MAX_LENGTH}
        error={errors.text}
        autoFocus={isNew}
      />
      <View style={styles.deadline}>
        <DateField
          label="Deadline"
          value={deadline}
          onChange={onChangeDeadline}
          placeholder="No deadline"
          optional
          error={errors.deadline}
        />
        {deadline ? (
          <Button label="No deadline" variant="quiet" onPress={() => onChangeDeadline(null)} />
        ) : null}
      </View>
      {canAssign && (
        <Card padded={false}>
          <ListRow
            title="Assigned to"
            subtitle={who}
            leading={<Icon name="people" />}
            trailing={assignees.length > 0 ? <AvatarStack people={assignees} size={22} /> : undefined}
            chevron
            onPress={onPickAssignees}
            accessibilityLabel={`Assigned to: ${who}`}
          />
        </Card>
      )}
      {errors.assignees ? <InlineError message={errors.assignees} /> : null}
      {errors.form ? <InlineError message={errors.form} /> : null}
      <Button
        label={isNew ? "Add requirement" : "Save"}
        icon={isNew ? "plus" : "check"}
        variant="primary"
        size="large"
        fullWidth
        loading={saving}
        onPress={onSave}
      />
      {onDelete && (
        <Button label="Delete requirement" icon="trash" variant="danger" fullWidth onPress={onDelete} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.l },
  deadline: { gap: spacing.xs },
});
