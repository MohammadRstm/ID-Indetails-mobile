import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import type { InvoiceSummary } from "@/api/types";
import { money } from "@/format/money";
import { companyToday, fmtDate } from "@/format/time";
import {
  EmptyState,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  toast,
  type SelectOption,
} from "@/ui";
import { useInvoice, usePayableProjects, useProjectInvoices, useRecordPayment } from "../api";
import { PaymentForm, PaymentReview, type InvoiceChoice } from "../components/PaymentForm";
import {
  INVOICE_STATE,
  invoiceStateOf,
  paymentErrors,
  paymentRequest,
  takesPayments,
  type PaymentDraft,
} from "../model";

export type RecordPaymentScreenProps = {
  invoiceId: number | null;
};

const FIELD_NAMES = [
  "projectId",
  "invoiceId",
  "amount",
  "currency",
  "fxRate",
  "receivedOn",
  "method",
  "reference",
  "note",
] as const;

type Draft = Omit<PaymentDraft, "invoiceId">;

function invoiceOption(i: InvoiceSummary): SelectOption<InvoiceChoice> {
  return {
    value: `${i.id}`,
    label: i.number ?? "Invoice",
    description: [
      i.balance != null ? `${money.exact(i.balance, i.currency, { cents: true })} left` : null,
      i.dueOn ? `due ${fmtDate(i.dueOn)}` : null,
      invoiceStateOf(i) === "overdue" ? INVOICE_STATE.overdue.label : null,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

/**
 * Money a client sent: against an invoice (opened from one) or for a project, against one of its invoices or
 * held on account. The API checks the balance, converts LBP and refuses what doesn't fit; the app only shows it.
 */
export function RecordPaymentScreen({ invoiceId }: RecordPaymentScreenProps) {
  const today = companyToday();
  const fromInvoice = invoiceId != null;
  const invoiceQuery = useInvoice(invoiceId);
  const presetInvoice = invoiceQuery.data;
  const projects = usePayableProjects(!fromInvoice);

  const [draft, setDraft] = useState<Draft>({
    projectId: null,
    amount: null,
    currency: "USD",
    fxRate: null,
    receivedOn: today,
    method: "bank",
    reference: "",
    note: "",
  });
  // null until the person picks: then the project's first open invoice, as on the web
  const [picked, setPicked] = useState<InvoiceChoice | null>(null);
  const [step, setStep] = useState<"form" | "review">("form");
  const [tried, setTried] = useState(false);

  const projectId = fromInvoice ? (presetInvoice?.project.id ?? null) : draft.projectId;
  const projectInvoices = useProjectInvoices(fromInvoice ? null : projectId);
  const record = useRecordPayment(projectId ?? 0);

  const openInvoices: InvoiceSummary[] = fromInvoice
    ? presetInvoice && takesPayments(presetInvoice)
      ? [presetInvoice]
      : []
    : (projectInvoices.data ?? []).filter(takesPayments);
  const choice: InvoiceChoice | null = fromInvoice
    ? `${invoiceId}`
    : (picked ??
      (projectInvoices.data ? (openInvoices[0] ? `${openInvoices[0].id}` : "account") : null));
  const chosenInvoice = openInvoices.find((i) => `${i.id}` === choice) ?? null;
  // Until an amount is typed, a dollar payment against an invoice starts at what the API says is left on it.
  const amount =
    draft.amount ??
    (draft.currency === "USD" && chosenInvoice?.currency === "USD" ? chosenInvoice.balance : null);
  const current: PaymentDraft = {
    ...draft,
    projectId,
    amount,
    invoiceId: chosenInvoice?.id ?? null,
  };

  const header = (
    <ScreenHeader
      title="Record a payment"
      subtitle={presetInvoice?.number ?? undefined}
      onBack={() => (step === "review" ? setStep("form") : router.back())}
    />
  );

  const loadError = fromInvoice
    ? invoiceQuery.isError && toApiError(invoiceQuery.error)
    : projects.isError && !projects.data && toApiError(projects.error);
  if (loadError) {
    return (
      <Screen header={header}>
        <LoadError
          what={fromInvoice ? "the invoice" : "the projects"}
          message={loadError.message}
          traceId={loadError.traceId}
          onRetry={() => void (fromInvoice ? invoiceQuery.refetch() : projects.refetch())}
        />
      </Screen>
    );
  }
  if (fromInvoice ? !presetInvoice : !projects.data) {
    return (
      <Screen header={header}>
        <Section>
          <Skeleton lines={6} height={20} />
        </Section>
      </Screen>
    );
  }
  if (fromInvoice && openInvoices.length === 0) {
    return (
      <Screen header={header}>
        <EmptyState
          art="done"
          title="This invoice isn't waiting for a payment"
          text="Only issued invoices with something left to pay take payments."
        />
      </Screen>
    );
  }

  const apiError = record.error ? toApiError(record.error) : null;
  const apiFieldErrors = Object.fromEntries(
    FIELD_NAMES.flatMap((field) => {
      const message = apiError?.fieldErrors[field]?.[0];
      return message ? [[field, message]] : [];
    }),
  );
  const errors = { ...apiFieldErrors, ...(tried ? paymentErrors(current, today) : {}) };
  // An error the form can't place next to a field: a business rule, a missing rate, the connection.
  const generalError =
    apiError && Object.keys(apiFieldErrors).length === 0 ? apiError.message : undefined;

  const projectTitle = fromInvoice
    ? (presetInvoice?.project.title ?? "")
    : ((projects.data ?? []).find((p) => p.id === projectId)?.title ?? "");
  const invoiceOptions: SelectOption<InvoiceChoice>[] | null =
    projectId == null || (!fromInvoice && !projectInvoices.data)
      ? null
      : [
          ...openInvoices.map(invoiceOption),
          ...(fromInvoice
            ? []
            : [
                {
                  value: "account" as const,
                  label: "On account",
                  description: "No invoice: held as a credit on the project",
                },
              ]),
        ];

  function review() {
    setTried(true);
    record.reset();
    if (Object.keys(paymentErrors(current, today)).length > 0) return;
    setStep("review");
  }

  function confirm() {
    record.mutate(paymentRequest(current), {
      onSuccess: (payment) => {
        toast({
          text: `${money.exact(payment.amount, payment.currency, { cents: payment.currency === "USD" })} recorded`,
          sub: payment.invoiceNumber ? `Against ${payment.invoiceNumber}` : "Held on account",
          icon: "card",
        });
        router.back();
      },
      onError: (error) => {
        // A field the API refused is shown next to it, on the form.
        if (Object.keys(toApiError(error).fieldErrors).length > 0) setStep("form");
      },
    });
  }

  return (
    <Screen header={header}>
      {step === "form" ? (
        <PaymentForm
          draft={current}
          onChange={(patch) => {
            if (patch.projectId !== undefined && patch.projectId !== draft.projectId) {
              setPicked(null);
              setDraft((d) => ({ ...d, ...patch, amount: null }));
            } else {
              setDraft((d) => ({ ...d, ...patch }));
            }
            record.reset();
          }}
          projectOptions={
            fromInvoice
              ? null
              : (projects.data ?? []).map((p) => ({
                  value: p.id,
                  label: p.title,
                  description: p.client?.displayName,
                }))
          }
          projectTitle={projectTitle}
          invoiceOptions={invoiceOptions}
          invoiceValue={choice}
          onPickInvoice={(next) => {
            setPicked(next);
            setDraft((d) => ({ ...d, amount: null }));
            record.reset();
          }}
          invoiceHint={
            chosenInvoice
              ? "More than is left on it is refused; record the rest on account."
              : undefined
          }
          errors={errors}
          today={today}
          onReview={review}
        />
      ) : (
        <PaymentReview
          projectTitle={projectTitle}
          against={chosenInvoice?.number ?? "On account"}
          amount={current.amount ?? 0}
          currency={current.currency}
          fxRate={current.currency === "USD" ? null : current.fxRate}
          receivedOn={current.receivedOn ?? today}
          method={current.method}
          reference={current.reference}
          note={current.note}
          busy={record.isPending}
          error={generalError}
          onBack={() => setStep("form")}
          onConfirm={confirm}
        />
      )}
    </Screen>
  );
}
