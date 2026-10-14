import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { typography, type TextVariant } from "@/theme/typography";
import {
  Avatar,
  AvatarStack,
  Badge,
  Bar,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  DateField,
  Divider,
  EmptyState,
  Icon,
  IconButton,
  InlineError,
  ListRow,
  LoadError,
  Money,
  NumberField,
  OfflineBanner,
  Section,
  Segmented,
  Select,
  Sheet,
  Skeleton,
  StatusBadge,
  Switch,
  Text,
  TextField,
  TimeField,
  toast,
} from "@/ui";
import { DayRuler, ProgressRing, WeekBars } from "@/ui/charts";
import { icons, type IconName } from "@/ui/icons";

const ICON_NAMES = Object.keys(icons) as IconName[];
const VARIANTS = Object.keys(typography) as TextVariant[];
const PEOPLE = [
  { id: 1, name: "Rana Test" },
  { id: 2, name: "Nadia Haddad" },
  { id: 3, name: "Karim Saleh" },
  { id: 4, name: "Sarah Khoury" },
  { id: 5, name: "Tarek Aoun" },
  { id: 6, name: "Maya Nassar" },
];
const WEEK = [
  { key: "2026-10-05", label: "Mon", minutes: 480, targetMinutes: 480 },
  { key: "2026-10-06", label: "Tue", minutes: 525, targetMinutes: 480 },
  { key: "2026-10-07", label: "Wed", minutes: 390, targetMinutes: 480 },
  { key: "2026-10-08", label: "Thu", minutes: 200, targetMinutes: 480, today: true },
  { key: "2026-10-09", label: "Fri", minutes: 0, targetMinutes: 480 },
  { key: "2026-10-10", label: "Sat", minutes: 0, targetMinutes: null },
];

/** Every UI kit component with sample props, in the scheme of the ThemeProvider around it. */
export function Gallery() {
  const { colors, scheme } = useTheme();
  const [text, setText] = useState("");
  const [amount, setAmount] = useState<number | null>(12.5);
  const [day, setDay] = useState<string | null>("2026-10-08");
  const [time, setTime] = useState<number | null>(9 * 60 + 30);
  const [choice, setChoice] = useState<string | null>("design");
  const [segment, setSegment] = useState<"day" | "week" | "month">("week");
  const [chip, setChip] = useState(true);
  const [on, setOn] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <View style={[styles.page, { backgroundColor: colors.ground }]}>
      <Text variant="title">{scheme === "dark" ? "Dark" : "Light"}</Text>

      <Section title="Text">
        {VARIANTS.map((variant) => (
          <Text key={variant} variant={variant}>
            {variant} 1,240h
          </Text>
        ))}
        <Text tone="muted">muted</Text>
        <Text tone="accent">accent</Text>
        <Text tone="danger">danger</Text>
      </Section>

      <Section title="Buttons">
        <View style={styles.row}>
          <Button
            label="Primary"
            variant="primary"
            onPress={() => toast({ text: "Logged 2h 15m on Villa Haddad" })}
          />
          <Button label="Secondary" icon="plus" onPress={() => {}} />
          <Button label="Quiet" variant="quiet" onPress={() => {}} />
          <Button label="Danger" variant="danger" onPress={() => {}} />
          <Button label="Loading" loading onPress={() => {}} />
          <Button label="Disabled" disabled onPress={() => {}} />
        </View>
        <Button
          label="Undo toast"
          size="large"
          fullWidth
          onPress={() => toast({ text: "Entry deleted", actionLabel: "Undo", action: () => {} })}
        />
        <View style={styles.row}>
          <IconButton icon="bell" badge={3} onPress={() => {}} accessibilityLabel="Notifications" />
          <IconButton icon="chat" badge onPress={() => {}} accessibilityLabel="Messages" />
          <IconButton icon="sun" active onPress={() => {}} accessibilityLabel="Theme" />
          <IconButton icon="trash" tone="danger" onPress={() => {}} accessibilityLabel="Delete" />
        </View>
      </Section>

      <Section title="Badges and chips">
        <View style={styles.row}>
          <StatusBadge status="active" />
          <StatusBadge status="hold" />
          <StatusBadge status="completed" />
          <StatusBadge status="archived" />
          <Badge label="New" tone="accent" />
          <Badge label="Overdue" tone="now" icon="alert" />
          <Badge label="Live" tone="live" />
        </View>
        <View style={styles.row}>
          <Chip label="Open" count={12} selected={chip} onPress={() => setChip(!chip)} />
          <Chip label="Done" count={4} selected={!chip} onPress={() => setChip(!chip)} />
        </View>
        <Segmented
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
          value={segment}
          onChange={setSegment}
        />
        <View style={styles.row}>
          <Switch value={on} onValueChange={setOn} accessibilityLabel="Sample switch" />
          <Switch
            value={!on}
            onValueChange={(v) => setOn(!v)}
            accessibilityLabel="Another switch"
          />
        </View>
      </Section>

      <Section title="Fields">
        <TextField
          label="Description"
          value={text}
          onChangeText={setText}
          placeholder="What did you work on?"
        />
        <TextField
          label="With an error"
          value="x"
          onChangeText={() => {}}
          error="This field is required."
        />
        <NumberField label="Quantity" value={amount} onChange={setAmount} suffix="pcs" />
        <DateField label="Day" value={day} onChange={setDay} />
        <TimeField label="Start" value={time} onChange={setTime} />
        <Select
          label="Domain"
          value={choice}
          onChange={setChoice}
          searchable
          options={[
            { value: "design", label: "Design", description: "Design and engineering" },
            {
              value: "execution",
              label: "Execution",
              description: "Construction and site delivery",
            },
          ]}
        />
      </Section>

      <Section title="Cards and rows" action={{ label: "See all", onPress: () => {} }}>
        <Card accent>
          <Text variant="heading">Villa Haddad</Text>
          <Text variant="small" tone="muted">
            A task card with the accent stripe.
          </Text>
          <Bar value={0.62} />
          <Bar value={0.9} tone="warn" thin />
        </Card>
        <Card padded={false}>
          <ListRow
            title="Sarah Khoury"
            subtitle="Interior designer"
            leading={<Avatar name="Sarah Khoury" presence="online" />}
            chevron
            divider
            onPress={() => {}}
          />
          <ListRow
            title="Selected row"
            leading={<Icon name="projects" />}
            selected
            onPress={() => {}}
          />
          <Divider inset={14} />
          <ListRow title="Static row" trailing={<Money amount={12_480} />} />
        </Card>
      </Section>

      <Section title="People and money">
        <View style={styles.row}>
          {PEOPLE.slice(0, 4).map((p) => (
            <Avatar key={p.id} name={p.name} size={40} />
          ))}
          <Avatar name="Tarek Aoun" size={40} presence="offline" />
        </View>
        <AvatarStack people={PEOPLE} />
        <View style={styles.row}>
          <Money amount={1_250_000} size="large" />
          <Money amount={-4200} signed />
          <Money amount={2_500_000} currency="LBP" />
          <Money amount={1250.5} cents exact />
        </View>
      </Section>

      <Section title="Charts">
        <WeekBars
          days={WEEK}
          accessibilityLabel="Hours this week"
          summary="Sample week: the most on Tuesday, 8h 45m."
        />
        <DayRuler
          accessibilityLabel="Where the hours sit in the day"
          summary="Sample day: one block in the morning."
          large
          blocks={[{ start: "2026-10-08T06:00:00Z", end: "2026-10-08T08:30:00Z" }]}
          others={[{ start: "2026-10-08T10:00:00Z", end: "2026-10-08T11:00:00Z" }]}
          now="2026-10-08T12:15:00Z"
        />
        <View style={styles.row}>
          <ProgressRing value={0.7} accessibilityLabel="Hours logged today" summary="5h 36m of 8h.">
            <Text variant="figure">5h 36m</Text>
          </ProgressRing>
          <ProgressRing
            value={1}
            tone="ok"
            size={64}
            stroke={6}
            accessibilityLabel="Hours logged today"
            summary="The day's hours are logged."
          />
        </View>
      </Section>

      <Section title="Loading, errors and empty">
        <Skeleton lines={3} />
        <Skeleton width={120} height={22} />
        <InlineError
          what="the materials"
          message="The server can't be reached."
          onRetry={() => {}}
        />
        <OfflineBanner loadedAt="10:42 AM" />
        <Card>
          <LoadError
            what="this project"
            message="Something went wrong."
            traceId="00-abc-01"
            onRetry={() => {}}
          />
        </Card>
        <Card>
          <EmptyState art="done" title="No requirements assigned to you" text="Enjoy the quiet." />
        </Card>
        <View style={styles.row}>
          <EmptyStateArt />
        </View>
      </Section>

      <Section title="Overlays">
        <View style={styles.row}>
          <Button label="Open a sheet" onPress={() => setSheet(true)} />
          <Button label="Confirm" variant="danger" onPress={() => setConfirm(true)} />
        </View>
        <Sheet
          visible={sheet}
          onClose={() => setSheet(false)}
          title="Add materials"
          subtitle="Villa Haddad"
          footer={<Button label="Save" variant="primary" onPress={() => setSheet(false)} />}
        >
          <TextField label="Material" value={text} onChangeText={setText} />
          <NumberField label="Quantity" value={amount} onChange={setAmount} />
        </Sheet>
        <ConfirmDialog
          visible={confirm}
          title="Delete this entry?"
          message="It can't be brought back."
          confirmLabel="Delete"
          destructive
          onConfirm={() => setConfirm(false)}
          onCancel={() => setConfirm(false)}
        />
      </Section>

      <Section title={`Icons (${ICON_NAMES.length})`}>
        <View style={styles.icons}>
          {ICON_NAMES.map((name) => (
            <View key={name} style={styles.icon}>
              <Icon name={name} size={22} />
              <Text variant="micro" numberOfLines={1}>
                {name}
              </Text>
            </View>
          ))}
        </View>
      </Section>
    </View>
  );
}

function EmptyStateArt() {
  return (
    <>
      <EmptyState art="projects" title="projects" />
      <EmptyState art="time" title="time" />
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.l, gap: spacing.l },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.m, alignItems: "center" },
  icons: { flexDirection: "row", flexWrap: "wrap", gap: spacing.m },
  icon: { width: 72, alignItems: "center", gap: spacing.xs },
});
