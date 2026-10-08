import { FlexWidget, TextWidget } from "react-native-android-widget";
import { WIDGET_LINKS, type TodayWidgetView } from "./snapshot";

const INK = "#0B1011";
const MUTED = "#5B6B6A";
const GROUND = "#F2F5F4";
const ACCENT = "#0C6B69";

function LinkButton({ label, uri }: { label: string; uri: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{
        flex: 1,
        backgroundColor: ACCENT,
        borderRadius: 12,
        paddingVertical: 8,
        marginHorizontal: 3,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <TextWidget text={label} style={{ fontSize: 12, color: "#FFFFFF" }} />
    </FlexWidget>
  );
}

/** The Android home-screen widget: today's hours and three buttons that open the app on a screen. */
export function AndroidTodayWidget({ view }: { view: TodayWidgetView }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: GROUND,
        borderRadius: 20,
        padding: 12,
        justifyContent: "space-between",
      }}
    >
      <FlexWidget style={{ flexDirection: "column" }}>
        <TextWidget text={view.hours} style={{ fontSize: 28, color: INK }} />
        <TextWidget text={view.caption} style={{ fontSize: 12, color: MUTED }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: "row", width: "match_parent" }}>
        <LinkButton label="Timer" uri={WIDGET_LINKS.startTimer} />
        <LinkButton label="Log work" uri={WIDGET_LINKS.logWork} />
        <LinkButton label="Materials" uri={WIDGET_LINKS.addMaterials} />
      </FlexWidget>
    </FlexWidget>
  );
}
