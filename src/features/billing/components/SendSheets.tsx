import { Button, InlineError, Sheet, Text, TextField } from "@/ui";
import type { DeliveryChannel } from "../model";

type EmailSheetProps = {
  visible: boolean;
  /** "Email HL-2026-014". */
  title: string;
  subtitle?: string;
  to: string;
  note: string;
  onChangeTo: (to: string) => void;
  onChangeNote: (note: string) => void;
  /** The API's message for the address field, or for the whole send. */
  toError?: string;
  error?: string;
  busy: boolean;
  onSend: () => void;
  onClose: () => void;
};

/** The address and a private note for an email the server sends with the PDF attached. */
export function EmailSheet({
  visible,
  title,
  subtitle,
  to,
  note,
  onChangeTo,
  onChangeNote,
  toError,
  error,
  busy,
  onSend,
  onClose,
}: EmailSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={busy ? () => undefined : onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button label="Cancel" variant="quiet" onPress={onClose} disabled={busy} />
          <Button
            label="Send email"
            icon="mail"
            variant="primary"
            onPress={onSend}
            loading={busy}
            disabled={!to.trim()}
          />
        </>
      }
    >
      <TextField
        label="To"
        value={to}
        onChangeText={onChangeTo}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        error={toError}
      />
      <TextField
        label="Note"
        optional
        value={note}
        onChangeText={onChangeNote}
        multiline
        maxLength={500}
        hint="Kept with the delivery; it isn't put in the email."
      />
      <Text variant="small" tone="muted">
        ID InDetails emails it with the PDF attached and records who it went to.
      </Text>
      {error ? <InlineError message={error} /> : null}
    </Sheet>
  );
}

type DeliveryPromptProps = {
  visible: boolean;
  /** Recording it is running. */
  busy: boolean;
  error?: string;
  onRecord: (channel: Exclude<DeliveryChannel, "email">) => void;
  onSkip: () => void;
};

/**
 * Asked after the share sheet closes: the phone can't tell where the PDF went, so the person says, and only a
 * real send is recorded as a delivery.
 */
export function DeliveryPromptSheet({
  visible,
  busy,
  error,
  onRecord,
  onSkip,
}: DeliveryPromptProps) {
  return (
    <Sheet
      visible={visible}
      onClose={busy ? () => undefined : onSkip}
      title="Did it reach the client?"
      subtitle="Record how it was sent, so everyone sees it went out."
    >
      <Button
        label="Sent on WhatsApp"
        icon="send"
        variant="primary"
        fullWidth
        onPress={() => onRecord("whatsapp")}
        disabled={busy}
      />
      <Button
        label="Sent or saved another way"
        icon="download"
        fullWidth
        onPress={() => onRecord("download")}
        disabled={busy}
      />
      <Button label="Not sent" variant="quiet" fullWidth onPress={onSkip} disabled={busy} />
      {error ? <InlineError message={error} /> : null}
    </Sheet>
  );
}
