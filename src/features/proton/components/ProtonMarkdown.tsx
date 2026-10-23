import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Text } from "@/ui";
import { blocksOf, INLINE, plainText, type MdItem } from "../protonText";

type ProtonMarkdownProps = {
  /** Proton's answer, with its little markdown. */
  text: string;
};

/** One line's bold, italic and code as nested text; the rest stays text. `bold` keeps italics bold inside bold. */
function Inline({ text, bold = false }: { text: string; bold?: boolean }) {
  const { colors } = useTheme();
  const parts: ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(INLINE)) {
    const index = m.index ?? 0;
    if (index > at) parts.push(text.slice(at, index));
    const [, boldM, boldU, code, italic, italicU] = m;
    const strong = boldM ?? boldU;
    if (strong != null) {
      parts.push(
        <Text key={index} variant="bodyStrong">
          <Inline text={strong} bold />
        </Text>,
      );
    } else if (code != null) {
      parts.push(
        <Text key={index} variant="mono" style={{ backgroundColor: colors.surface2 }}>
          {code}
        </Text>,
      );
    } else {
      parts.push(
        <Text key={index} variant={bold ? "bodyStrong" : "body"} style={styles.italic}>
          <Inline text={italic ?? italicU ?? ""} bold={bold} />
        </Text>,
      );
    }
    at = index + m[0].length;
  }

  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}

function Item({ marker, children }: { marker: string; children: ReactNode }) {
  return (
    <View style={styles.item}>
      <Text style={styles.marker}>{marker}</Text>
      <View style={styles.itemBody}>{children}</View>
    </View>
  );
}

function List({ items, start }: { items: MdItem[]; start: number | null }) {
  return (
    <View style={styles.list}>
      {items.map((item, i) => (
        <Item key={i} marker={start == null ? "•" : `${start + i}.`}>
          <Text>
            <Inline text={item.text} />
          </Text>
          {item.sub.length > 0 && (
            <View style={styles.sub}>
              {item.sub.map((sub, j) => (
                <Item key={j} marker="–">
                  <Text>
                    <Inline text={sub} />
                  </Text>
                </Item>
              ))}
            </View>
          )}
        </Item>
      ))}
    </View>
  );
}

/** An answer of Proton's drawn from its markdown as text, never as a link; it reads as the plain text. */
export function ProtonMarkdown({ text }: ProtonMarkdownProps) {
  return (
    <View style={styles.blocks} accessible accessibilityLabel={plainText(text)}>
      {blocksOf(text).map((block, i) => {
        switch (block.kind) {
          case "h":
            return (
              <Text key={i} variant="bodyStrong">
                <Inline text={block.text} bold />
              </Text>
            );
          case "ul":
            return <List key={i} items={block.items} start={null} />;
          case "ol":
            return <List key={i} items={block.items} start={block.start} />;
          default:
            return (
              <Text key={i}>
                {block.lines.map((line, j) => (
                  <Text key={j}>
                    {j > 0 ? "\n" : ""}
                    <Inline text={line} />
                  </Text>
                ))}
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: spacing.m },
  list: { gap: spacing.xs },
  item: { flexDirection: "row", gap: spacing.s },
  marker: { minWidth: spacing.xl, textAlign: "right" },
  itemBody: { flex: 1, gap: spacing.xs },
  sub: { gap: spacing.xs },
  italic: { fontStyle: "italic" },
});
