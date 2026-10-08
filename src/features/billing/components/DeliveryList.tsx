import { StyleSheet, View } from "react-native";
import { fmtDateY, fmtTime } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Card, Icon, Text } from "@/ui";
import { CHANNEL_ICON, CHANNEL_LABEL, type DeliveryChannel } from "../model";

export type DeliveryItem = {
  id: number;
  channel: DeliveryChannel;
  recipient: string | null;
  note: string | null;
  sentAt: string;
  isReminder?: boolean;
  by?: string | null;
};

/** How a document reached the client, newest last, as the API lists them. */
export function DeliveryList({ deliveries }: { deliveries: DeliveryItem[] }) {
  const { colors } = useTheme();
  if (deliveries.length === 0) {
    return (
      <Text variant="small" tone="muted">
        Not sent to the client yet.
      </Text>
    );
  }
  return (
    <Card padded={false}>
      {deliveries.map((d, i) => (
        <View
          key={d.id}
          style={[
            styles.row,
            i < deliveries.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line },
          ]}
        >
          <Icon name={CHANNEL_ICON[d.channel]} size={18} color={colors.ink3} />
          <View style={styles.text}>
            <Text variant="bodyStrong">
              {d.isReminder ? "Automatic reminder" : CHANNEL_LABEL[d.channel]}
            </Text>
            <Text variant="small" tone="muted">
              {[
                d.recipient,
                `${fmtDateY(d.sentAt)} ${fmtTime(d.sentAt)}`,
                d.by ? `by ${d.by}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            {d.note ? (
              <Text variant="small" tone="secondary">
                {d.note}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.row,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    minHeight: 52,
  },
  text: { flex: 1, gap: spacing.xxs },
});
