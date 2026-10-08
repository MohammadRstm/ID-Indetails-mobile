import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Button } from "@/ui";
import { callUrl, mailUrl, whatsappUrl } from "../contactLinks";

type ContactActionsProps = {
  phone?: string | null;
  email?: string | null;
  /** Whether the phone number has WhatsApp (clients say so; people are assumed to). */
  whatsapp?: boolean;
  onOpen: (url: string) => void;
};

/** One-tap Call, WhatsApp and Email buttons for whatever contact details there are. */
export function ContactActions({ phone, email, whatsapp = true, onOpen }: ContactActionsProps) {
  const call = phone ? callUrl(phone) : null;
  const chat = phone && whatsapp ? whatsappUrl(phone) : null;
  const mail = email ? mailUrl(email) : null;
  if (!call && !chat && !mail) return null;
  return (
    <View style={styles.row}>
      {call ? <Button label="Call" icon="phone" onPress={() => onOpen(call)} /> : null}
      {chat ? <Button label="WhatsApp" icon="chat" onPress={() => onOpen(chat)} /> : null}
      {mail ? <Button label="Email" icon="mail" onPress={() => onOpen(mail)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.s },
});
