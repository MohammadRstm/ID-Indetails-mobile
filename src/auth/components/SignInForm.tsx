import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Button, InlineError, Text, TextField } from "@/ui";

type SignInFormProps = {
  email: string;
  password: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
  onForgotPassword: () => void;
  submitting: boolean;
  /** Why the last attempt failed, in words for the person. */
  error: string | null;
};

/** The sign-in form: email, password, and why it didn't work. */
export function SignInForm({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onForgotPassword,
  submitting,
  error,
}: SignInFormProps) {
  return (
    <View style={styles.form}>
      <View style={styles.head}>
        <Text variant="title">ID InDetails</Text>
        <Text tone="muted">Sign in with your work email.</Text>
      </View>
      <TextField
        label="Email"
        value={email}
        onChangeText={onEmailChange}
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
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      {error ? <InlineError message={error} /> : null}
      <Button
        label="Sign in"
        variant="primary"
        size="large"
        fullWidth
        onPress={onSubmit}
        loading={submitting}
        disabled={!email.trim() || !password}
      />
      <Button label="Forgot your password?" variant="quiet" onPress={onForgotPassword} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.l },
  head: { gap: spacing.xs, marginBottom: spacing.m },
});
