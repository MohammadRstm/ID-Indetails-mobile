import { Pressable, StyleSheet, View } from "react-native";

type PointTouchProps = {
  count: number;
  selected: number | null;
  onSelect: (index: number | null) => void;
  height: number;
};

/** A touch strip over a chart: one slot per point; touching it shows that point's figure, touching it again hides it. */
export function PointTouch({ count, selected, onSelect, height }: PointTouchProps) {
  return (
    <View style={[styles.strip, { height }]}>
      {Array.from({ length: count }, (_, i) => (
        <Pressable
          key={i}
          accessible={false}
          style={styles.slot}
          onPress={() => onSelect(selected === i ? null : i)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row" },
  slot: { flex: 1 },
});
