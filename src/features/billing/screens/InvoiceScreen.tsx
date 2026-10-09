import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import { P } from "@/permissions/codes";
import { canOpen } from "@/permissions/screens";
import { usePermissions } from "@/permissions/usePermissions";
import { ConfirmDialog, LoadError, Screen, ScreenHeader, Section, Skeleton, toast } from "@/ui";
import {
  useClientContacts,
  useEmailInvoice,
  useInvoice,
  useIssueInvoice,
  useRecordInvoiceDelivery,
} from "../api";
import { InvoiceView } from "../components/InvoiceView";
import { DeliveryPromptSheet, EmailSheet } from "../components/SendSheets";
import { CHANNEL_LABEL, defaultEmail, isLiveIssued, pdfFileName, takesPayments } from "../model";
import { useShareDocument } from "../useShareDocument";

export type InvoiceScreenProps = {
  invoiceId: number;
};

/** One invoice: its status, amounts and deliveries, and the urgent actions. Editing stays on the web. */
export function InvoiceScreen({ invoiceId }: InvoiceScreenProps) {
  const perms = usePermissions();
  const query = useInvoice(invoiceId);
  const invoice = query.data;

  const canSend = perms.has(P.INVOICE_SEND);
  const live = !!invoice && isLiveIssued(invoice);
  const contacts = useClientContacts(
    invoice?.client.id ?? null,
    canSend && live && perms.has(P.CLIENT_VIEW),
  );
  const email = useEmailInvoice(invoiceId);
  const issue = useIssueInvoice(invoiceId);
  const delivery = useRecordInvoiceDelivery(invoiceId);
  const shareDoc = useShareDocument({
    path: `/invoices/${invoiceId}/pdf`,
    fileName: pdfFileName(invoice?.number ?? null, `invoice-${invoiceId}`),
    title: invoice?.number ?? "Invoice",
    askHowSent: canSend && live,
  });

  const [emailOpen, setEmailOpen] = useState(false);
  // null until the person types: the prefilled address follows the client's contacts as they load
  const [to, setTo] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [confirmIssue, setConfirmIssue] = useState(false);

  const header = (
    <ScreenHeader
      title={invoice?.number ?? "Invoice"}
      subtitle={invoice ? invoice.client.displayName : undefined}
      onBack={() => router.back()}
    />
  );

  if (!invoice) {
    const error = query.isError ? toApiError(query.error) : null;
    return (
      <Screen header={header}>
        {error ? (
          <LoadError
            what="this invoice"
            message={error.message}
            traceId={error.traceId}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <Section>
            <Skeleton height={150} radius={9} />
            <Skeleton lines={4} />
          </Section>
        )}
      </Screen>
    );
  }

  const address = to ?? (defaultEmail(contacts.data) || invoice.sendTo || "");
  const emailError = email.error ? toApiError(email.error) : null;

  function sendEmail() {
    const recipient = address.trim();
    email.mutate(
      { to: recipient, note: note.trim() || null },
      {
        onSuccess: (sent) => {
          setEmailOpen(false);
          setNote("");
          toast({
            text: `${sent.number ?? "The invoice"} emailed`,
            sub: `To ${recipient}`,
            icon: "mail",
          });
        },
      },
    );
  }

  function issueDraft() {
    issue.mutate(undefined, {
      onSuccess: (issued) => {
        setConfirmIssue(false);
        toast({
          text: `${issued.number ?? "The invoice"} issued`,
          sub: "It now counts as invoiced.",
          icon: "check",
        });
      },
      onError: (error) => {
        setConfirmIssue(false);
        toast({ text: "The draft wasn't issued", sub: toApiError(error).message, icon: "alert" });
      },
    });
  }

  function recordDelivery(channel: "whatsapp" | "download") {
    delivery.mutate(
      { channel },
      {
        onSuccess: () => {
          shareDoc.closePrompt();
          toast({ text: "Recorded as sent", sub: CHANNEL_LABEL[channel], icon: "send" });
        },
      },
    );
  }

  const projectOpens = canOpen(perms, "project") && perms.canSeeDomain(invoice.domain);
  const project = invoice.project;

  return (
    <Screen header={header} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <InvoiceView
        invoice={invoice}
        onEmail={canSend && live ? () => setEmailOpen(true) : undefined}
        onShare={() => void shareDoc.share()}
        sharing={shareDoc.sharing}
        onIssue={canSend && invoice.status === "draft" ? () => setConfirmIssue(true) : undefined}
        onRecordPayment={
          perms.has(P.PAYMENT_RECORD) && takesPayments(invoice)
            ? () =>
                router.push({
                  pathname: "/billing/payments/new",
                  params: { invoiceId: String(invoice.id) },
                })
            : undefined
        }
        onOpenProject={
          projectOpens
            ? () => router.push({ pathname: "/projects/[id]", params: { id: String(project.id) } })
            : undefined
        }
      />

      <EmailSheet
        visible={emailOpen}
        title={`Email ${invoice.number ?? "the invoice"}`}
        subtitle={invoice.client.displayName}
        to={address}
        note={note}
        onChangeTo={setTo}
        onChangeNote={setNote}
        toError={emailError?.fieldErrors.to?.[0]}
        error={emailError && !emailError.fieldErrors.to ? emailError.message : undefined}
        busy={email.isPending}
        onSend={sendEmail}
        onClose={() => {
          setEmailOpen(false);
          email.reset();
        }}
      />

      <DeliveryPromptSheet
        visible={shareDoc.asking}
        busy={delivery.isPending}
        error={delivery.error ? toApiError(delivery.error).message : undefined}
        onRecord={recordDelivery}
        onSkip={() => {
          shareDoc.closePrompt();
          delivery.reset();
        }}
      />

      <ConfirmDialog
        visible={confirmIssue}
        title="Issue this draft?"
        message="It gets its number and due date, and its payment clock starts. After this it can only be voided, on the web."
        confirmLabel="Issue"
        busy={issue.isPending}
        onConfirm={issueDraft}
        onCancel={() => setConfirmIssue(false)}
      />
    </Screen>
  );
}
