import { router } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { requestErrorMessage } from "../authErrors";
import { authApi } from "../authApi";
import { useAuthBranding } from "../brandingApi";
import { AuthLayout } from "../components/AuthLayout";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";
import { email as emailRule, fieldErrorsOf } from "../passwordRules";

const schema = z.object({ email: emailRule });

/** Asks for a reset link. The API answers the same whether or not the address has an account. */
export function ForgotPasswordScreen() {
  const branding = useAuthBranding();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; form?: string }>({});

  const submit = async () => {
    if (submitting) return;
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      await authApi.forgotPassword(parsed.data.email);
      setSentTo(parsed.data.email);
    } catch (failure) {
      setErrors({ form: requestErrorMessage(failure) });
    } finally {
      setSubmitting(false);
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace("/sign-in"));

  return (
    <AuthLayout
      title={sentTo ? "Check your email" : "Reset your password"}
      sub={sentTo ? undefined : "We'll email you a link to choose a new one."}
      {...branding}
    >
      <ForgotPasswordForm
        email={email}
        onEmailChange={setEmail}
        onSubmit={submit}
        onBack={back}
        submitting={submitting}
        sentTo={sentTo}
        errors={errors}
      />
    </AuthLayout>
  );
}
