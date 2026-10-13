import type { ReactNode } from "react";
import { View } from "react-native";

type SectionAnchorProps = {
  children: ReactNode;
  /** Reports where the section starts in the scrolling content. */
  onPosition: (y: number) => void;
};

/** Wraps a section of the project screen so a link can scroll to it. */
export function SectionAnchor({ children, onPosition }: SectionAnchorProps) {
  return <View onLayout={(event) => onPosition(event.nativeEvent.layout.y)}>{children}</View>;
}
