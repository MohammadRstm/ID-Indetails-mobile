import { router } from "expo-router";
import { useState } from "react";
import { usePermissions } from "@/permissions/usePermissions";
import { Sheet, Text } from "@/ui";
import type { ProtonRef } from "../api";
import { BlockCard } from "../components/figures/BlockCard";
import { ChartView } from "../components/figures/ChartView";
import { KpiRow } from "../components/figures/KpiRow";
import { TableView } from "../components/figures/TableView";
import {
  chartLabel,
  chartTable,
  COMPACT_ROWS,
  kpiTiles,
  sourceLine,
  tableShape,
  truncationNote,
} from "../figureModel";
import type { ProtonBlock } from "../figures";
import { hrefOfRef } from "../refs";

type OpenRef = (ref: ProtonRef) => (() => void) | null;

/**
 * The charts, tables and headline figures under one answer. A table shows its first rows with "Show all", a chart
 * has its figures as a table, and a name in a table's first column opens its record where this person may see it.
 */
export function ProtonBlocks({ blocks }: { blocks: ProtonBlock[] }) {
  const perms = usePermissions();
  const [open, setOpen] = useState<ProtonBlock | null>(null);

  const openRef: OpenRef = (ref) => {
    const href = hrefOfRef(ref, perms);
    if (!href) return null;
    return () => {
      setOpen(null);
      router.push(href);
    };
  };

  return (
    <>
      {blocks.map((block) => (
        <BlockItem
          key={block.id}
          block={block}
          openRef={openRef}
          onShowAll={() => setOpen(block)}
        />
      ))}
      <Sheet
        visible={open != null}
        onClose={() => setOpen(null)}
        title={open?.title}
        subtitle={open?.period ?? undefined}
      >
        {open ? <FullBlock block={open} openRef={openRef} /> : null}
      </Sheet>
    </>
  );
}

type BlockItemProps = { block: ProtonBlock; openRef: OpenRef; onShowAll: () => void };

/** A block in the chat: small, with a way to see more of it where there is more. */
function BlockItem({ block, openRef, onShowAll }: BlockItemProps) {
  const { chart, table, kpis } = block;
  const compact = table ? tableShape(table, COMPACT_ROWS) : null;
  const note = table ? truncationNote(table) : null;
  let action: { label: string; onPress: () => void } | undefined;
  if (table && compact && compact.hidden > 0) {
    action = { label: `Show all ${table.rows.length} rows`, onPress: onShowAll };
  } else if (chart) {
    action = { label: "Show figures as a table", onPress: onShowAll };
  }
  return (
    <BlockCard
      title={block.title}
      period={block.period ?? null}
      notes={note ? [...block.notes, note] : block.notes}
      source={sourceLine(block)}
      action={action}
    >
      {kpis ? <KpiRow tiles={kpiTiles(kpis)} /> : null}
      {compact ? <TableView table={compact} openRef={openRef} /> : null}
      {chart ? <ChartView chart={chart} accessibilityLabel={chartLabel(block, chart)} /> : null}
    </BlockCard>
  );
}

/** A block in full: every row of a table, or a chart's figures as a table. */
function FullBlock({ block, openRef }: { block: ProtonBlock; openRef: OpenRef }) {
  const { chart, table } = block;
  const note = table ? truncationNote(table) : null;
  const notes = note ? [...block.notes, note] : block.notes;
  return (
    <>
      {table ? <TableView table={tableShape(table)} openRef={openRef} /> : null}
      {chart ? <TableView table={chartTable(chart)} openRef={openRef} /> : null}
      {notes.map((text) => (
        <Text key={text} variant="small" tone="muted">
          {text}
        </Text>
      ))}
      <Text variant="small" tone="muted">
        {sourceLine(block)}
      </Text>
    </>
  );
}
