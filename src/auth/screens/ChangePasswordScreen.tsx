import { router } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { toApiError } from "@/api/errors";
import { toast } from "@/ui";
import { requestErrorMessage } from "../authErrors";
import { useAuthBranding } from "../brandingApi";
import { AuthLayout } from "../components/AuthLayout";
import {
  ChangePasswordForm,
  type ChangePasswordErrors,
  type ChangePasswordValues,
} from "../components/ChangePasswordForm";
import { fieldErrorsOf, newPassword, PASSWORD_HINT } from "../passwordRules";
import { useSession } from "../session";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter the password you signed in with."),
    newPassword,
    repeat: z.string(),
  })
  .refine((v) => v.newPassword === v.repeat, {
    path: ["repeat"],
    message: "The two passwords don't match.",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from the current one.",
  });

/** The API's refusal, next to the field it is about. */
function errorsOf(failure: unknown): ChangePasswordErrors {
  const apiError = toApiError(failure);
  if (apiError.code === "current_password_incorrect") {
    return { currentPassword: "That isn't the password you signed in with." };
  }
  const { currentPassword, newPassword: newPasswordErrors } = apiError.fieldErrors;
  if (currentPassword?.length || newPasswordErrors?.length) {
    return { currentPassword: currentPassword?.[0], newPassword: newPasswordErrors?.[0] };
  }
  return { form: requestErrorMessage(failure) };
}

/**
 * Changing the password. Someone with a temporary password lands here first: the API refuses everything else
 * until it is done. Every other device the person is signed in on is signed out; this phone stays signed in.
 */
export function ChangePasswordScreen() {
  const { user, changePassword, signOut } = useSession();
  const branding = useAuthBranding();
  const required = user?.mustChangePassword ?? false;
  const [values, setValues] = useState<ChangePasswordValues>({
    currentPassword: "",
    newPassword: "",
    repeat: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<ChangePasswordErrors>({});

  const submit = async () => {
    if (submitting) return;
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      await changePassword(parsed.data.currentPassword, parsed.data.newPassword);
    } catch (failure) {
      setErrors(errorsOf(failure));
      setSubmitting(false);
      return;
    }
    if (required) {
      router.replace("/today");
      return;
    }
    toast({ text: "Password changed", sub: "Your other devices are signed out." });
    if (router.canGoBack()) router.back();
    else router.replace("/settings");
  };

  const leave = () => {
    if (required) void signOut();
    else if (router.canGoBack()) router.back();
    else router.replace("/settings");
  };

  return (
    <AuthLayout
      title={required ? "Choose your own password" : "Change your password"}
      sub={
        required
          ? "You signed in with a temporary password. Pick one of your own to carry on."
          : "Every other device you're signed in on is signed out."
      }
      {...branding}
    >
      <ChangePasswordForm
        values={values}
        onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
        onSubmit={submit}
        onLeave={leave}
        required={required}
        submitting={submitting}
        errors={errors}
        hint={PASSWORD_HINT}
      />
    </AuthLayout>
  );
}
