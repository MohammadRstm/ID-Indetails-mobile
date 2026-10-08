import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import { Screen } from "@/ui";
import { SignInForm } from "../components/SignInForm";
import { useSession } from "../session";

/** The words for a failed sign-in, by the API's code. Anything else shows the API's own safe message. */
function signInError(error: unknown): string {
  const apiError = toApiError(error);
  switch (apiError.code) {
    case "invalid_credentials":
      return "That email and password don't match. Check them and try again.";
    case "rate_limited":
    case "too_many_requests":
      return "Too many attempts. Wait a minute and try again.";
    default:
      return apiError.message;
  }
}

/** Signing in. Where it goes next is the layouts' decision (the app, or changing a temporary password). */
export function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (submitting || !email.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (failure) {
      setError(signInError(failure));
      setSubmitting(false);
    }
  };

  return (
    <Screen edges={["top", "bottom", "left", "right"]}>
      <SignInForm
        email={email}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={submit}
        onForgotPassword={() => router.push("/forgot-password")}
        submitting={submitting}
        error={error}
      />
    </Screen>
  );
}
