import type { Schemas } from "@/api/types";
import type { BadgeTone, IconName } from "@/ui";

/*
 * Words and looks for invoices, payments and deliveries, as the web shows them
 * (src/domains/shared/billing/invoiceStatus.ts, src/shared/format/labels.ts). Nothing here works out money:
 * every amount, balance and status comes from the API.
 */

export type InvoiceStatus = Schemas["InvoiceStatus"];
export type DeliveryChannel = Schemas["DeliveryChannel"];
export type PaymentMethod = Schemas["PaymentMethod"];

/** What an invoice reads as: its status, or "overdue" when the API says it is past due. */
export type InvoiceState = InvoiceStatus | "overdue";

export const INVOICE_STATE: Record<
  InvoiceState,
  { label: string; tone: BadgeTone; icon: IconName }
> = {
  draft: { label: "Draft", tone: "neutral", icon: "file" },
  sent: { label: "Sent", tone: "accent", icon: "send" },
  partial: { label: "Part-paid", tone: "warn", icon: "circleDot" },
  paid: { label: "Paid", tone: "ok", icon: "checkCircle" },
  void: { label: "Void", tone: "arch", icon: "x" },
  overdue: { label: "Overdue", tone: "now", icon: "alert" },
};

export function invoiceStateOf(invoice: {
  status: InvoiceStatus;
  isOverdue: boolean | null;
}): InvoiceState {
  if (invoice.isOverdue && invoice.status !== "paid" && invoice.status !== "void") return "overdue";
  return invoice.status;
}

/** Issued and not voided: only these can be emailed, have deliveries recorded or take payments. */
export function isLiveIssued(invoice: { status: InvoiceStatus; issuedAt: string | null }): boolean {
  return invoice.issuedAt != null && invoice.status !== "void" && invoice.status !== "draft";
}

/** Still owed something, by the API's own status. */
export function takesPayments(invoice: {
  status: InvoiceStatus;
  issuedAt: string | null;
}): boolean {
  return isLiveIssued(invoice) && (invoice.status === "sent" || invoice.status === "partial");
}

export const CHANNEL_LABEL: Record<DeliveryChannel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  download: "PDF shared or saved",
};

export const CHANNEL_ICON: Record<DeliveryChannel, IconName> = {
  email: "mail",
  whatsapp: "send",
  download: "download",
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  bank: "Bank transfer",
  cheque: "Cheque",
  cash: "Cash",
  other: "Other",
};

/** The currencies a payment can be recorded in (the API's PaymentRules). */
export const PAYMENT_CURRENCIES = ["USD", "LBP"] as const;
export type PaymentCurrency = (typeof PAYMENT_CURRENCIES)[number];

type Contact = Schemas["ClientContactResponse"];

/** The address to prefill: the client's primary email, else their first one. */
export function defaultEmail(contacts: Contact[] | undefined): string {
  const emails = (contacts ?? []).filter((c) => c.kind === "email");
  return (emails.find((c) => c.isPrimary) ?? emails[0])?.value ?? "";
}

/** A safe file name for a document's PDF in the cache, such as "hl-2026-014.pdf". */
export function pdfFileName(number: string | null, fallback: string): string {
  const base = (number ?? fallback).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  return `${base.replace(/^-+|-+$/g, "") || "document"}.pdf`;
}

/** What the payment form holds before it is sent. */
export type PaymentDraft = {
  projectId: number | null;
  /** The invoice it pays, or null for money held on account. */
  invoiceId: number | null;
  amount: number | null;
  currency: PaymentCurrency;
  /** LBP per US dollar; empty to use the rate of the day received. */
  fxRate: number | null;
  receivedOn: string | null;
  method: PaymentMethod;
  reference: string;
  note: string;
};

export type PaymentField = "projectId" | "amount" | "fxRate" | "receivedOn" | "reference" | "note";

/**
 * What must be fixed before sending: the basic shape only. Everything that needs the records (the balance, the
 * exchange rate of the day, the project taking payments) is the API's to check.
 */
export function paymentErrors(
  draft: PaymentDraft,
  today: string,
): Partial<Record<PaymentField, string>> {
  const errors: Partial<Record<PaymentField, string>> = {};
  if (draft.projectId == null) errors.projectId = "Choose the project the money is for.";
  if (draft.amount == null || !(draft.amount > 0)) errors.amount = "Enter the amount received.";
  if (draft.currency !== "USD" && draft.fxRate != null && !(draft.fxRate > 0)) {
    errors.fxRate = "Enter a rate above zero, or leave it empty.";
  }
  if (!draft.receivedOn) errors.receivedOn = "Choose the day it arrived.";
  else if (draft.receivedOn > today) errors.receivedOn = "The day can't be in the future.";
  if (draft.reference.trim().length > 100) errors.reference = "At most 100 characters.";
  if (draft.note.trim().length > 500) errors.note = "At most 500 characters.";
  return errors;
}

/** The request the API takes; USD is always at a rate of 1, so no rate goes with it. */
export function paymentRequest(draft: PaymentDraft): Schemas["RecordPaymentRequest"] {
  return {
    amount: draft.amount ?? 0,
    currency: draft.currency,
    fxRate: draft.currency === "USD" ? null : draft.fxRate,
    receivedOn: draft.receivedOn,
    method: draft.method,
    reference: draft.reference.trim() || null,
    note: draft.note.trim() || null,
    invoiceId: draft.invoiceId,
  };
}
