import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Chip, NumberField, TextField } from "@/ui";
import type { MaterialDraft } from "../model";

type MaterialFormProps = {
  draft: MaterialDraft;
  onChange: (draft: MaterialDraft) => void;
  /** The site's usual types and suppliers, as one-tap picks. */
  typePicks: string[];
  supplierPicks: string[];
};

function Picks({ labels, onPick }: { labels: string[]; onPick: (label: string) => void }) {
  if (labels.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.picks}
    >
      {labels.map((label) => (
        <Chip key={label} label={label} onPress={() => onPick(label)} />
      ))}
    </ScrollView>
  );
}

/** One material, typed on the phone: its type and supplier from the site's usual ones, then the numbers. */
export function MaterialForm({ draft, onChange, typePicks, supplierPicks }: MaterialFormProps) {
  const set = (change: Partial<MaterialDraft>) => onChange({ ...draft, ...change });
  return (
    <View style={styles.form}>
      <TextField
        label="Type"
        value={draft.name}
        onChangeText={(name) => set({ name })}
        placeholder="e.g. Cement bags"
        maxLength={200}
        autoCapitalize="sentences"
      />
      <Picks labels={typePicks} onPick={(name) => set({ name })} />
      <TextField
        label="Supplier"
        value={draft.supplier}
        onChangeText={(supplier) => set({ supplier })}
        optional
        maxLength={200}
      />
      <Picks labels={supplierPicks} onPick={(supplier) => set({ supplier })} />
      <View style={styles.row}>
        <View style={styles.half}>
          <NumberField
            label="Quantity"
            value={draft.quantity}
            onChange={(quantity) => set({ quantity })}
          />
        </View>
        <View style={styles.half}>
          <TextField
            label="Unit"
            value={draft.unit}
            onChangeText={(unit) => set({ unit })}
            placeholder="bags, m², …"
            maxLength={40}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <NumberField
            label="Unit cost"
            value={draft.unitCost}
            onChange={(unitCost) => set({ unitCost })}
            suffix="USD"
          />
        </View>
        <View style={styles.half}>
          <NumberField
            label="Or the total"
            value={draft.amount}
            onChange={(amount) => set({ amount })}
            suffix="USD"
          />
        </View>
      </View>
      <TextField
        label="Note"
        value={draft.note}
        onChangeText={(note) => set({ note })}
        optional
        maxLength={1000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.m },
  picks: { gap: spacing.s },
  row: { flexDirection: "row", gap: spacing.m },
  half: { flex: 1 },
});
