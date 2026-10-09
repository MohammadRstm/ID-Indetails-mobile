import { StyleSheet, View } from "react-native";
import { fmtDayDateY } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import {
  Button,
  DateField,
  InlineError,
  Money,
  NumberField,
  Segmented,
  Select,
  Text,
  TextField,
  type SelectOption,
} from "@/ui";
import {
  PAYMENT_CURRENCIES,
  PAYMENT_METHODS,
  type PaymentDraft,
  type PaymentField,
  type PaymentMethod,
} from "../model";

/** "account" for money held on account, otherwise the invoice's id. */
export type InvoiceChoice = "account" | `${number}`;

type PaymentFormProps = {
  draft: PaymentDraft;
  onChange: (patch: Partial<PaymentDraft>) => void;
  /** The project to pick, or null when the payment's project is already known. */
  projectOptions: SelectOption<number>[] | null;
  /** The known project's name. */
  projectTitle?: string;
  /** The invoices it can pay, plus "on account"; null while the project isn't chosen. */
  invoiceOptions: SelectOption<InvoiceChoice>[] | null;
  invoiceValue: InvoiceChoice | null;
  onPickInvoice: (choice: InvoiceChoice) => void;
  invoiceHint?: string;
  /** The form's own checks, then the API's field messages. */
  errors: Partial<Record<PaymentField | "currency" | "method" | "invoiceId", string>>;
  today: string;
  onReview: () => void;
};

const METHOD_OPTIONS = (Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((value) => ({
  value,
  label: PAYMENT_METHODS[value],
}));

/** The payment as the person enters it. Nothing is worked out here: the API checks it and converts it. */
export function PaymentForm({
  draft,
  onChange,
  projectOptions,
  projectTitle,
  invoiceOptions,
  invoiceValue,
  onPickInvoice,
  invoiceHint,
  errors,
  today,
  onReview,
}: PaymentFormProps) {
  return (
    <View style={styles.form}>
      {projectOptions ? (
        <Select
          label="Project"
          value={draft.projectId}
          options={projectOptions}
          searchable
          placeholder="Choose the project"
          onChange={(projectId) => onChange({ projectId })}
          error={errors.projectId}
        />
      ) : (
        <View style={styles.fixed}>
          <Text variant="label" tone="secondary">
            Project
          </Text>
          <Text variant="bodyStrong">{projectTitle}</Text>
        </View>
      )}

      {invoiceOptions && (
        <Select
          label="Against which invoice?"
          value={invoiceValue}
          options={invoiceOptions}
          onChange={onPickInvoice}
          hint={invoiceHint}
          error={errors.invoiceId}
        />
      )}

      <Segmented
        accessibilityLabel="Currency"
        value={draft.currency}
        options={PAYMENT_CURRENCIES.map((c) => ({ value: c, label: c }))}
        onChange={(currency) => onChange({ currency, amount: null, fxRate: null })}
      />
      {errors.currency ? <InlineError message={errors.currency} /> : null}

      <NumberField
        label="Amount received"
        value={draft.amount}
        onChange={(amount) => onChange({ amount })}
        decimals={draft.currency === "USD" ? 2 : 0}
        suffix={draft.currency}
        error={errors.amount}
      />

      {draft.currency === "LBP" && (
        <NumberField
          label="Exchange rate on the day"
          optional
          value={draft.fxRate}
          onChange={(fxRate) => onChange({ fxRate })}
          suffix="LBP per $1"
          hint="Leave it empty to use the company's rate for the day it arrived."
          error={errors.fxRate}
        />
      )}

      <DateField
        label="Date received"
        value={draft.receivedOn}
        maximumDay={today}
        onChange={(receivedOn) => onChange({ receivedOn })}
        error={errors.receivedOn}
      />

      <Select
        label="How it arrived"
        value={draft.method}
        options={METHOD_OPTIONS}
        onChange={(method) => onChange({ method })}
        error={errors.method}
      />

      <TextField
        label="Reference"
        optional
        value={draft.reference}
        onChangeText={(reference) => onChange({ reference })}
        maxLength={100}
        placeholder={
          draft.method === "cheque"
            ? "Cheque number"
            : draft.method === "bank"
              ? "Transfer reference"
              : "Receipt number"
        }
        error={errors.reference}
      />

      <TextField
        label="Note"
        optional
        value={draft.note}
        onChangeText={(note) => onChange({ note })}
        multiline
        maxLength={500}
        error={errors.note}
      />

      <Text variant="small" tone="muted">
        A payment changes what was collected. It doesn&apos;t change the project&apos;s revenue,
        profit or margin.
      </Text>

      <Button label="Review" variant="primary" size="large" fullWidth onPress={onReview} />
    </View>
  );
}

type PaymentReviewProps = {
  projectTitle: string;
  /** The invoice number, or "On account". */
  against: string;
  amount: number;
  currency: string;
  fxRate: number | null;
  receivedOn: string;
  method: PaymentMethod;
  reference: string;
  note: string;
  busy: boolean;
  error?: string;
  onBack: () => void;
  onConfirm: () => void;
};

/** The payment read back before it is recorded: payments are never edited, only voided on the web. */
export function PaymentReview({
  projectTitle,
  against,
  amount,
  currency,
  fxRate,
  receivedOn,
  method,
  reference,
  note,
  busy,
  error,
  onBack,
  onConfirm,
}: PaymentReviewProps) {
  const { colors } = useTheme();
  const rows: [string, string][] = [
    ["Project", projectTitle],
    ["Against", against],
    ...(currency !== "USD"
      ? ([["Rate", fxRate ? `${fxRate} LBP per $1` : "The company's rate of the day"]] as [
          string,
          string,
        ][])
      : []),
    ["Received", fmtDayDateY(receivedOn)],
    ["How", PAYMENT_METHODS[method]],
    ...(reference.trim() ? ([["Reference", reference.trim()]] as [string, string][]) : []),
    ...(note.trim() ? ([["Note", note.trim()]] as [string, string][]) : []),
  ];

  return (
    <View style={styles.form}>
      <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text variant="micro">Amount received</Text>
        <Money amount={amount} currency={currency} size="large" exact cents={currency === "USD"} />
        {rows.map(([label, value]) => (
          <View key={label} style={styles.reviewRow}>
            <Text variant="small" tone="muted" style={styles.reviewLabel}>
              {label}
            </Text>
            <Text style={styles.reviewValue}>{value}</Text>
          </View>
        ))}
      </View>
      <Text variant="small" tone="muted">
        Payments can&apos;t be edited. One recorded by mistake is voided on the web.
      </Text>
      {error ? <InlineError message={error} /> : null}
      <Button
        label="Record payment"
        icon="check"
        variant="primary"
        size="large"
        fullWidth
        loading={busy}
        onPress={onConfirm}
      />
      <Button label="Change something" variant="quiet" fullWidth onPress={onBack} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.l },
  fixed: { gap: spacing.xxs },
  summary: { borderWidth: 1, borderRadius: radii.r2, padding: spacing.l, gap: spacing.m },
  reviewRow: { flexDirection: "row", gap: spacing.m },
  reviewLabel: { width: 84 },
  reviewValue: { flex: 1 },
});
