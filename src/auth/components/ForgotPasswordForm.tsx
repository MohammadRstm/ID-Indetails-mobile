import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Button, InlineError, TextField } from "@/ui";
import { AuthNotice } from "./AuthNotice";

type ForgotPasswordFormProps = {
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  /** The address the link was asked for; the form is replaced by the answer. */
  sentTo: string | null;
  errors: { email?: string; form?: string };
};

/** Asking for a reset link, then the same answer whether or not the address has an account. */
export function ForgotPasswordForm({
  email,
  onEmailChange,
  onSubmit,
  onBack,
  submitting,
  sentTo,
  errors,
}: ForgotPasswordFormProps) {
  if (sentTo) {
    return (
      <View style={styles.form}>
        <AuthNotice
          tone="ok"
          icon="mail"
          text={`If an account uses ${sentTo}, a link to choose a new password is on its way. It works once, for 30 minutes, and opens the website.`}
        />
        <Button label="Back to sign in" size="large" fullWidth onPress={onBack} />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <TextField
        label="Work email"
        value={email}
        onChangeText={onEmailChange}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="send"
        onSubmitEditing={onSubmit}
      />
      {errors.form ? <InlineError message={errors.form} /> : null}
      <Button
        label={submitting ? "Sending…" : "Send the link"}
        variant="primary"
        size="large"
        fullWidth
        onPress={onSubmit}
        loading={submitting}
      />
      <View style={styles.end}>
        <Button label="Back to sign in" variant="quiet" onPress={onBack} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.l },
  end: { alignItems: "flex-end" },
});
