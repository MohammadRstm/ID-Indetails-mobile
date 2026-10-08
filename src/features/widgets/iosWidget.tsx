import { createWidget } from "expo-widgets";
import { HStack, Link, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import type { TodayWidgetView } from "./snapshot";

export const IOS_WIDGET_NAME = "TodayHours";

/*
 * The 'widget' directive makes expo-widgets compile this function for the widget extension, so it stays
 * self-contained: it uses only what it imports and its props (the links repeat WIDGET_LINKS for that reason).
 */
function TodayHoursWidget(props: TodayWidgetView) {
  "widget";
  return (
    <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 12 })]}>
      <Text modifiers={[font({ size: 28, weight: "semibold" })]}>{props.hours}</Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle("#5B6B6A")]}>{props.caption}</Text>
      <HStack spacing={10}>
        <Link label="Timer" destination={"idindetails://today"} />
        <Link label="Log work" destination={"idindetails://log-work"} />
        <Link label="Materials" destination={"idindetails://materials/add"} />
      </HStack>
    </VStack>
  );
}

export const iosTodayWidget = createWidget<TodayWidgetView>(IOS_WIDGET_NAME, TodayHoursWidget);
