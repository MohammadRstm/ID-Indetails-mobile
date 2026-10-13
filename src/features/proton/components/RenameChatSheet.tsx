import { Button, Sheet, TextField } from "@/ui";

export const MAX_CHAT_NAME = 120;

type RenameChatSheetProps = {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onSave: () => void;
  onClose: () => void;
  busy: boolean;
  error?: string;
};

/** Where a saved chat is given a new name. */
export function RenameChatSheet({
  visible,
  value,
  onChangeText,
  onSave,
  onClose,
  busy,
  error,
}: RenameChatSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Rename chat"
      footer={
        <>
          <Button label="Cancel" variant="quiet" onPress={onClose} disabled={busy} />
          <Button
            label="Save"
            variant="primary"
            onPress={onSave}
            disabled={!value.trim()}
            loading={busy}
          />
        </>
      }
    >
      <TextField
        label="Name"
        value={value}
        onChangeText={onChangeText}
        maxLength={MAX_CHAT_NAME}
        error={error}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={onSave}
      />
    </Sheet>
  );
}
