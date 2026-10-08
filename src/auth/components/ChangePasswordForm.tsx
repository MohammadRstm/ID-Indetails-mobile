import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Button, InlineError, TextField } from "@/ui";

export type ChangePasswordValues = { currentPassword: string; newPassword: string; repeat: string };
export type ChangePasswordErrors = Partial<Record<keyof ChangePasswordValues | "form", string>>;

type ChangePasswordFormProps = {
  values: ChangePasswordValues;
  onChange: (field: keyof ChangePasswordValues, value: string) => void;
  onSubmit: () => void;
  /** Leaving: signing out while a temporary password is pending, otherwise going back. */
  onLeave: () => void;
  /** The account still has the temporary password it was given. */
  required: boolean;
  submitting: boolean;
  errors: ChangePasswordErrors;
  hint: string;
};

/** The current password, a new one, and the new one again. */
export function ChangePasswordForm({
  values,
  onChange,
  onSubmit,
  onLeave,
  required,
  submitting,
  errors,
  hint,
}: ChangePasswordFormProps) {
  return (
    <View style={styles.form}>
      <TextField
        label={required ? "Temporary password" : "Current password"}
        value={values.currentPassword}
        onChangeText={(text) => onChange("currentPassword", text)}
        error={errors.currentPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      <TextField
        label="New password"
        value={values.newPassword}
        onChangeText={(text) => onChange("newPassword", text)}
        error={errors.newPassword}
        hint={hint}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Repeat it"
        value={values.repeat}
        onChangeText={(text) => onChange("repeat", text)}
        error={errors.repeat}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      {errors.form ? <InlineError message={errors.form} /> : null}
      <Button
        label={submitting ? "Saving…" : "Save password"}
        variant="primary"
        size="large"
        fullWidth
        onPress={onSubmit}
        loading={submitting}
      />
      <View style={styles.end}>
        <Button
          label={required ? "Sign out" : "Cancel"}
          icon={required ? "logout" : undefined}
          variant="quiet"
          onPress={onLeave}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.l },
  end: { alignItems: "flex-end" },
});
