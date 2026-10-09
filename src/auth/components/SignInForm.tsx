import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Button, Divider, InlineError, Text, TextField } from "@/ui";
import { AuthNotice } from "./AuthNotice";

export type SignInErrors = { email?: string; password?: string; form?: string };

type SignInFormProps = {
  email: string;
  password: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
  onForgotPassword: () => void;
  /** Opens the website, where invitations and reset links are completed. */
  onOpenWebsite: () => void;
  submitting: boolean;
  errors: SignInErrors;
  /** Why the person was signed out, such as a session that ended. */
  notice: string | null;
};

/** The sign-in form: email, password, why it didn't work, and the ways out. */
export function SignInForm({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onForgotPassword,
  onOpenWebsite,
  submitting,
  errors,
  notice,
}: SignInFormProps) {
  return (
    <View style={styles.form}>
      {notice ? <AuthNotice tone="hold" text={notice} /> : null}
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
        returnKeyType="next"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={onPasswordChange}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      {errors.form ? <InlineError message={errors.form} /> : null}
      <Button
        label={submitting ? "Signing in…" : "Sign in"}
        variant="primary"
        size="large"
        fullWidth
        onPress={onSubmit}
        loading={submitting}
      />
      <View style={styles.end}>
        <Button label="Forgot password?" variant="quiet" onPress={onForgotPassword} />
      </View>
      <Divider />
      <View style={styles.invitation}>
        <Text variant="small" tone="muted">
          Have an invitation or a password reset link? Open it from the email: it finishes on the
          website, then sign in here.
        </Text>
        <Button label="Open the website" icon="external" onPress={onOpenWebsite} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.l },
  end: { alignItems: "flex-end" },
  invitation: { gap: spacing.m },
});
