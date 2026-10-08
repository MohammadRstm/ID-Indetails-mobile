import { createLiveActivity, type LiveActivity } from "expo-widgets";
import { Text, VStack } from "@expo/ui/swift-ui";
import { font } from "@expo/ui/swift-ui/modifiers";

export type TimerActivityProps = {
  projectTitle: string;
  description: string;
  /** Milliseconds since the epoch: the running time is always now minus this. */
  startedAtMs: number;
};

/* Compiled for the widget extension by expo-widgets, so self-contained (see iosWidget.tsx). */
function TimerLayout(props: TimerActivityProps) {
  "widget";
  const started = new Date(props.startedAtMs);
  return {
    banner: (
      <VStack alignment="leading" spacing={4}>
        <Text modifiers={[font({ size: 15, weight: "semibold" })]}>{props.projectTitle}</Text>
        <Text modifiers={[font({ size: 12 })]}>{props.description}</Text>
        <Text
          date={started}
          dateStyle="timer"
          modifiers={[font({ size: 24, weight: "semibold" })]}
        />
      </VStack>
    ),
    compactLeading: <Text>ID</Text>,
    compactTrailing: <Text date={started} dateStyle="timer" />,
    minimal: <Text date={started} dateStyle="timer" />,
  };
}

const factory = createLiveActivity<TimerActivityProps>("TimerActivity", TimerLayout);

let running: LiveActivity<TimerActivityProps> | null = null;

/** The iOS Live Activity for the running timer. One at a time: starting replaces any earlier one. */
export const timerActivity = {
  async start(timer: { projectTitle: string; description: string; startedAt: string }) {
    await this.stop();
    running = factory.start({
      projectTitle: timer.projectTitle,
      description: timer.description,
      startedAtMs: new Date(timer.startedAt).getTime(),
    });
  },
  async stop() {
    const instances = running ? [running] : factory.getInstances();
    running = null;
    await Promise.all(instances.map((activity) => activity.end("immediate")));
  },
};
