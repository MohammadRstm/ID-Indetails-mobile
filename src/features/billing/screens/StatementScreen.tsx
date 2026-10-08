import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import { P } from "@/permissions/codes";
import { canOpen } from "@/permissions/screens";
import { usePermissions } from "@/permissions/usePermissions";
import { LoadError, Screen, ScreenHeader, Section, Skeleton, toast } from "@/ui";
import {
  useClientContacts,
  useEmailStatement,
  useRecordStatementDelivery,
  useStatement,
} from "../api";
import { DeliveryPromptSheet, EmailSheet } from "../components/SendSheets";
import { StatementView } from "../components/StatementView";
import { CHANNEL_LABEL, defaultEmail, pdfFileName } from "../model";
import { useShareDocument } from "../useShareDocument";

export type StatementScreenProps = {
  statementId: number;
};

/** One client statement: read the snapshot, share its PDF, email it or record how it was sent. */
export function StatementScreen({ statementId }: StatementScreenProps) {
  const perms = usePermissions();
  const query = useStatement(statementId);
  const statement = query.data;
  const canSend = perms.has(P.STATEMENT_SEND);

  const contacts = useClientContacts(
    statement?.client.id ?? null,
    canSend && perms.has(P.CLIENT_VIEW),
  );
  const email = useEmailStatement(statementId);
  const delivery = useRecordStatementDelivery(statementId);
  const shareDoc = useShareDocument({
    path: `/statements/${statementId}/pdf`,
    fileName: pdfFileName(statement?.number ?? null, `statement-${statementId}`),
    title: statement?.number ?? "Statement",
    askHowSent: canSend,
  });

  const [emailOpen, setEmailOpen] = useState(false);
  const [to, setTo] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const header = (
    <ScreenHeader
      title={statement?.number ?? "Statement"}
      subtitle={statement?.projectTitle}
      onBack={() => router.back()}
    />
  );

  if (!statement) {
    const error = query.isError ? toApiError(query.error) : null;
    return (
      <Screen header={header}>
        {error ? (
          <LoadError
            what="this statement"
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

  const address = to ?? defaultEmail(contacts.data);
  const emailError = email.error ? toApiError(email.error) : null;

  function sendEmail() {
    const recipient = address.trim();
    email.mutate(
      { to: recipient, note: note.trim() || null },
      {
        onSuccess: (sent) => {
          setEmailOpen(false);
          setNote("");
          toast({ text: `${sent.number} emailed`, sub: `To ${recipient}`, icon: "mail" });
        },
      },
    );
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

  const projectId = statement.projectId;

  return (
    <Screen header={header} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <StatementView
        statement={statement}
        onEmail={canSend ? () => setEmailOpen(true) : undefined}
        onShare={() => void shareDoc.share()}
        sharing={shareDoc.sharing}
        onOpenProject={
          canOpen(perms, "project") && perms.canSeeDomain("execution")
            ? () => router.push({ pathname: "/projects/[id]", params: { id: String(projectId) } })
            : undefined
        }
      />

      <EmailSheet
        visible={emailOpen}
        title={`Email ${statement.number}`}
        subtitle={statement.client.displayName}
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
    </Screen>
  );
}
