import type { PushTarget } from "@/api/mobileTypes";
import type { Notification, Schemas } from "@/api/types";
import { money } from "@/format/money";
import type { PeriodKind } from "@/format/periods";
import { MONTHS, partsOf } from "@/format/time";
import type { Domain } from "@/permissions/permissions";
import type { IconName } from "@/ui";

/*
 * The words of the company screens and money follow-ups, as the web writes them (design/dashboard/followups.ts,
 * shared/notifications/notificationWords.ts). Amounts are the API's, formatted only.
 */

export type MoneyAttention = Schemas["MoneyAttentionResponse"];
export type CompanyOverview = Schemas["CompanyOverviewResponse"];
export type DomainOverview = Schemas["DomainOverviewResponse"];
export type CompanyMonth = Schemas["CompanyMonthResponse"];

/**
 * The monthly chart in a sentence for screen readers: the latest month and the month with the most revenue,
 * with the API's figures as they are.
 */
export function monthlySummary(
  months: Pick<CompanyMonth, "month" | "revenue" | "netProfit">[],
): string {
  const latest = months[months.length - 1];
  if (!latest) return "No months to show.";
  const describe = (m: (typeof months)[number]) =>
    `${MONTHS[partsOf(m.month).month]} revenue ${money.exact(m.revenue)}, net profit ${money.exact(m.netProfit)}`;
  const best = months.reduce((top, m) => (m.revenue > top.revenue ? m : top), latest);
  const text = `${months.length} months. Latest: ${describe(latest)}.`;
  return best === latest ? text : `${text} Most revenue: ${describe(best)}.`;
}

export const DOMAIN_LABEL: Record<Domain, string> = { design: "Design", execution: "Execution" };

/** The windows the company figures are measured over, each up to today. */
export type CompanyPeriod = Extract<PeriodKind, "month" | "quarter" | "year">;

export const PERIOD_OPTIONS: { value: CompanyPeriod; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

/** One line of a money list: what it says, and the screen it opens. */
export type MoneyLine = {
  key: string;
  title: string;
  sub?: string;
  icon: IconName;
  urgent: boolean;
  target: PushTarget | null;
};

/** A money follow-up from /finance/{domain}/attention. */
export function attentionLine(item: MoneyAttention, domain: Domain): MoneyLine {
  const key = `${domain}-${item.kind}-${item.invoiceId ?? item.projectId}`;
  const project: PushTarget = { type: "project", id: item.projectId, domain };
  switch (item.kind) {
    case "overdue_invoice":
      return {
        key,
        icon: "alert",
        urgent: true,
        title: `${item.invoiceNumber ?? "An invoice"} is ${item.daysOverdue ?? 0} days overdue`,
        sub: `${money.fmt(item.amount ?? 0)} from ${item.clientName ?? "a client"} · ${item.projectTitle}`,
        target: item.invoiceId != null ? { type: "invoice", id: item.invoiceId } : project,
      };
    case "finished_owed":
      return {
        key,
        icon: "card",
        urgent: true,
        title: `${item.projectTitle} is finished but still owed ${money.fmt(item.amount ?? 0)}`,
        sub: "Completion and payment are tracked separately",
        target: project,
      };
    case "no_payment":
      return {
        key,
        icon: "alert",
        urgent: false,
        title: `${item.projectTitle} has no customer payment agreed`,
        sub: "Add one so its profit can be tracked",
        target: project,
      };
    case "cost_high":
      return {
        key,
        icon: "trendUp",
        urgent: false,
        title: `${item.projectTitle} has used ${item.usedPct ?? 0}% of its payment in cost`,
        sub: `${money.fmt(item.amount ?? 0)} of ${money.fmt(item.revenue ?? 0)}`,
        target: project,
      };
  }
}

/** The notification kinds about money (docs/contracts.md section 3, category "money"). */
const MONEY_KINDS = new Set([
  "invoice_issued",
  "invoice_overdue",
  "invoice_sent_automatically",
  "invoice_send_due",
  "invoice_send_failed",
  "invoice_reminder_due",
  "invoice_draft_waiting",
  "payment_recorded",
  "statement_sent",
  "project_cost_high",
  "project_closed",
]);

export const isMoneyNotification = (note: Notification) => MONEY_KINDS.has(note.kind);

const text = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : 0);

/** A money notification as a line of the follow-ups. Notifications never carry amounts. */
export function notificationLine(note: Notification): MoneyLine {
  const p = (note.payload ?? {}) as Record<string, unknown>;
  const title = note.project?.title ?? (text(p.projectTitle) || "a project");
  const number = text(p.number) || "An invoice";
  const domain = note.project?.domain;
  const project: PushTarget | null =
    note.project && (domain === "design" || domain === "execution")
      ? { type: "project", id: note.project.id, domain }
      : null;
  const invoice: PushTarget | null =
    note.subjectId != null && note.kind.startsWith("invoice_")
      ? { type: "invoice", id: note.subjectId }
      : project;
  const key = `n${note.id}`;
  const urgent = note.readAt == null;

  switch (note.kind) {
    case "invoice_issued":
      return {
        key,
        urgent,
        icon: "file",
        title: `${number} was issued`,
        sub: title,
        target: invoice,
      };
    case "invoice_overdue":
      return {
        key,
        urgent,
        icon: "alert",
        title: `${number} is overdue`,
        sub: title,
        target: invoice,
      };
    case "invoice_sent_automatically":
      return {
        key,
        urgent,
        icon: "send",
        title: p.to
          ? `${number} was emailed to ${text(p.to)}`
          : `${number} was issued - already paid on account, so not emailed`,
        sub: `${title} · as scheduled`,
        target: invoice,
      };
    case "invoice_send_due":
      return {
        key,
        urgent,
        icon: "calendar",
        title: `A scheduled invoice on ${title} is due to go out`,
        sub: "There's no email address to send it to - send it yourself",
        target: invoice,
      };
    case "invoice_send_failed":
      return {
        key,
        urgent,
        icon: "alert",
        title: `A scheduled invoice on ${title} couldn't be emailed`,
        sub: `${p.sendTo ? `To ${text(p.sendTo)} · ` : ""}it is tried again every hour`,
        target: invoice,
      };
    case "invoice_reminder_due":
      return {
        key,
        urgent,
        icon: "alert",
        title: `${number} is due a reminder`,
        sub: `${title} · the client has no email address - chase it yourself`,
        target: invoice,
      };
    case "invoice_draft_waiting":
      return {
        key,
        urgent,
        icon: "file",
        title: `A draft invoice on ${title} is still waiting`,
        sub: "Ready to send to the client",
        target: invoice,
      };
    case "payment_recorded":
      return {
        key,
        urgent,
        icon: "card",
        title: `A payment was recorded on ${title}`,
        sub: p.invoiceNumber
          ? `Against ${text(p.invoiceNumber)}`
          : p.isInitial
            ? "The initial payment"
            : "On account",
        target: project,
      };
    case "statement_sent":
      return {
        key,
        urgent,
        icon: "file",
        title: `${text(p.number) || "A statement"} was sent to the client`,
        sub: title,
        target: note.subjectId != null ? { type: "statement", id: note.subjectId } : project,
      };
    case "project_cost_high":
      return {
        key,
        urgent,
        icon: "trendUp",
        title: `${title} has used ${num(p.usedPct)}% of its payment in cost`,
        sub: "Worth a look before it runs over",
        target: project,
      };
    case "project_closed":
      return {
        key,
        urgent,
        icon: "trendUp",
        title: `${title} closed at ${num(p.marginPct)}% margin`,
        target: project,
      };
    default:
      return { key, urgent, icon: "bell", title: "Billing update", sub: title, target: project };
  }
}
