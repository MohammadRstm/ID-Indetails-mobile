import { fmtDateY, fmtTime } from "@/format/time";
import type { ProtonRef } from "./api";
import {
  formatChange,
  formatValue,
  pointTitle,
  type ProtonBlock,
  type ProtonChartBlock,
  type ProtonKpiBlock,
  type ProtonTableBlock,
} from "./figures";

/** Rows a table shows in the chat; the rest are in its full view. */
export const COMPACT_ROWS = 5;

/** The first column's cell can open the row's record. */
export type TableRow = {
  cells: string[];
  /** The record the row is about, for the first cell to open. */
  ref: ProtonRef | null;
};

export type TableColumn = { key: string; label: string; right: boolean };

export type TableShape = {
  columns: TableColumn[];
  rows: TableRow[];
  /** Rows the block has that this view leaves out. */
  hidden: number;
};

function cellText(
  cell: ProtonTableBlock["rows"][number]["cells"][number] | undefined,
  column: ProtonTableBlock["columns"][number],
): string {
  if (!cell) return "–";
  if (cell.text) return cell.text;
  if (cell.number != null) return formatValue(column.unit ?? "count", cell.number);
  if (cell.date) {
    return column.kind === "week" || column.kind === "month"
      ? pointTitle(column.kind, cell.date)
      : fmtDateY(cell.date);
  }
  return "–";
}

/** A table block as rows of words; `limit` keeps the first few rows for the chat. */
export function tableShape(table: ProtonTableBlock, limit?: number): TableShape {
  const shown = limit ? table.rows.slice(0, limit) : table.rows;
  return {
    columns: table.columns.map((c) => ({ key: c.key, label: c.label, right: c.kind === "number" })),
    rows: shown.map((row) => ({
      cells: table.columns.map((column, i) => {
        const text = cellText(row.cells[i], column);
        return i === 0 && row.partial ? `${text} (so far)` : text;
      }),
      ref: row.ref ? { ...row.ref, domain: row.ref.domain ?? null } : null,
    })),
    hidden: table.rows.length - shown.length,
  };
}

/** A table the server cut short (it sends 100 rows at most) says how much of it this is. */
export function truncationNote(table: ProtonTableBlock): string | null {
  return table.totalRows > table.rows.length
    ? `Showing the first ${table.rows.length} of ${table.totalRows} rows.`
    : null;
}

export type KpiTile ={ key: string; label: string; value: string; sub: string | null };

/** Headline figures as tiles: the value, and the change against the previous period when there is one. */
export function kpiTiles(kpis: ProtonKpiBlock): KpiTile[] {
  return kpis.items.map((k) => ({
    key: k.key,
    label: k.label,
    value: formatValue(k.unit, k.value),
    sub:
      k.previous != null
        ? `${formatChange(k.unit, k.change)} vs ${formatValue(k.unit, k.previous)}`
        : null,
  }));
}

/** A chart's figures as a table: every series, every point, in full. */
export function chartTable(chart: ProtonChartBlock): TableShape {
  return {
    columns: [
      { key: "axis", label: chart.axisLabel, right: false },
      ...chart.series.map((s) => ({ key: s.key, label: s.label, right: true })),
    ],
    rows: chart.points.map((p) => ({
      cells: [titleOf(chart, p), ...chart.series.map((s, si) => formatValue(s.unit, p.values[si]))],
      ref: null,
    })),
    hidden: 0,
  };
}

const KIND_NAMES: Record<ProtonChartBlock["kind"], string> = {
  bar: "Bar chart",
  columns: "Column chart",
  line: "Line chart",
  composition: "Chart of the parts of a whole",
};

/** What a screen reader says for a chart: what it is, and its figures in words. */
export function chartLabel(block: ProtonBlock, chart: ProtonChartBlock): string {
  return `${KIND_NAMES[chart.kind]}: ${block.title}${block.period ? `, ${block.period}` : ""}`;
}

const SUMMARY_POINTS = 8;

type ChartPoint = ProtonChartBlock["points"][number];

const titleOf = (chart: ProtonChartBlock, p: ChartPoint) =>
  `${pointTitle(chart.axis, p.label)}${p.partial ? " (so far)" : ""}`;

/** A point's figures, each series named when there are several; a missing one is a dash. */
function figuresOf(chart: ProtonChartBlock, p: ChartPoint): string {
  const many = chart.series.length > 1;
  return chart.series
    .map((s, i) => `${many ? `${s.label} ` : ""}${formatValue(s.unit, p.values[i])}`)
    .join(", ");
}

/** One point's figures for the line under a chart that was touched: "Week of Mar 2, 2026: 3h". */
export function pointReadout(chart: ProtonChartBlock, index: number): string {
  const p = chart.points[index];
  return `${titleOf(chart, p)}: ${figuresOf(chart, p)}`;
}

/** The chart's figures in one sentence-like line: the first few for ranked kinds, the span for a trend. */
export function chartSummary(chart: ProtonChartBlock): string {
  const say = (p: ChartPoint) => `${titleOf(chart, p)} ${figuresOf(chart, p)}`;
  const { points } = chart;
  if (chart.kind === "columns" || chart.kind === "line") {
    const first = points[0];
    const last = points[points.length - 1];
    return points.length === 1
      ? say(first)
      : `${points.length} points. First: ${say(first)}. Last: ${say(last)}.`;
  }
  const shown = points.slice(0, SUMMARY_POINTS).map(say).join("; ");
  const more = points.length - SUMMARY_POINTS;
  return more > 0 ? `${shown}; and ${more} more.` : `${shown}.`;
}

/** The line under a block saying when its figures were read. */
export function sourceLine(block: ProtonBlock): string {
  return `Read at ${fmtTime(block.source.asOf)}.`;
}
