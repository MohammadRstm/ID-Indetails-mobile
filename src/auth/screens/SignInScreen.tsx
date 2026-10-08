import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { z } from "zod";
import { env } from "@/config/env";
import { signInErrorMessage } from "../authErrors";
import { useAuthBranding } from "../brandingApi";
import { AuthLayout } from "../components/AuthLayout";
import { SignInForm, type SignInErrors } from "../components/SignInForm";
import { email as emailRule, fieldErrorsOf } from "../passwordRules";
import { useSession } from "../session";

const schema = z.object({ email: emailRule, password: z.string().min(1, "Enter your password.") });

/** Signing in. Where it goes next is the layouts' decision (the app, or changing a temporary password). */
export function SignInScreen() {
  const { signIn, notice } = useSession();
  const branding = useAuthBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<SignInErrors>({});

  const submit = async () => {
    if (submitting) return;
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      await signIn(parsed.data.email, parsed.data.password);
    } catch (failure) {
      setErrors({ form: signInErrorMessage(failure) });
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      sub="Projects, work entries and the time behind them."
      {...branding}
    >
      <SignInForm
        email={email}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={submit}
        onForgotPassword={() => router.push("/forgot-password")}
        onOpenWebsite={() => WebBrowser.openBrowserAsync(env.webUrl).catch(() => {})}
        submitting={submitting}
        errors={errors}
        notice={notice}
      />
    </AuthLayout>
  );
}
