import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { DateField, Select, TextField, TimeField, type SelectOption } from "@/ui";
import type { MeetingDraft } from "../model";

type MeetingFormProps = {
  draft: MeetingDraft;
  onChange: (draft: MeetingDraft) => void;
  /** Null when the project can't be changed (editing, or opened from a project). */
  projectOptions: SelectOption<number>[] | null;
};

/** A meeting's project, day, times, topic and description. */
export function MeetingForm({ draft, onChange, projectOptions }: MeetingFormProps) {
  const set = (change: Partial<MeetingDraft>) => onChange({ ...draft, ...change });
  return (
    <View style={styles.form}>
      {projectOptions ? (
        <Select
          label="Project"
          value={draft.projectId}
          options={projectOptions}
          onChange={(projectId) => set({ projectId })}
          placeholder="Pick a project"
          searchable
        />
      ) : null}
      <DateField label="Day" value={draft.day} onChange={(day) => set({ day })} />
      <View style={styles.row}>
        <View style={styles.half}>
          <TimeField
            label="Starts"
            value={draft.startMin}
            onChange={(startMin) =>
              set({ startMin, endMin: Math.min(1440, startMin + (draft.endMin - draft.startMin)) })
            }
          />
        </View>
        <View style={styles.half}>
          <TimeField
            label="Ends"
            value={draft.endMin % 1440}
            onChange={(endMin) => set({ endMin })}
          />
        </View>
      </View>
      <TextField
        label="Topic"
        value={draft.topic}
        onChangeText={(topic) => set({ topic })}
        optional
        maxLength={200}
      />
      <TextField
        label="Description"
        value={draft.description}
        onChangeText={(description) => set({ description })}
        optional
        multiline
        maxLength={2000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.l },
  row: { flexDirection: "row", gap: spacing.m },
  half: { flex: 1 },
});
