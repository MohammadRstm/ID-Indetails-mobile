import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { http } from "@/api/http";
import type { CurrentUser } from "@/api/types";
import { clearToasts } from "@/ui/toast";
import { authApi } from "./authApi";
import { tokenManager } from "./tokenManager";

/*
 * The signed-in person. At start the session is restored from the stored refresh token; signing in and out goes
 * through the mobile endpoints (docs/contracts.md section 2). Phase 1b adds the lock, the foreground refresh of
 * /auth/me and the retries.
 */

export type SessionStatus = "loading" | "signedOut" | "signedIn";

export type Session = {
  status: SessionStatus;
  user: CurrentUser | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
};

type SessionState = { status: SessionStatus; user: CurrentUser | null };

const SessionContext = createContext<Session | null>(null);

/** The person behind the stored session, or null when there is none to restore. */
async function restore(): Promise<CurrentUser | null> {
  if (!(await tokenManager.getRefreshToken())) return null;
  try {
    if (!(await tokenManager.refresh())) return null;
    const { data } = await http.get<CurrentUser>("/auth/me");
    return data;
  } catch {
    // The API couldn't be reached. The stored session is kept; signing in again replaces it.
    return null;
  }
}

type SessionProviderProps = {
  children: ReactNode;
  /** Starts signed in as this person without restoring a session (tests and previews). */
  initialUser?: CurrentUser;
};

export function SessionProvider({ children, initialUser }: SessionProviderProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>(
    initialUser ? { status: "signedIn", user: initialUser } : { status: "loading", user: null },
  );

  const restoring = !initialUser;
  useEffect(() => {
    if (!restoring) return;
    let cancelled = false;
    void restore().then((user) => {
      if (!cancelled)
        setState(user ? { status: "signedIn", user } : { status: "signedOut", user: null });
    });
    return () => {
      cancelled = true;
    };
  }, [restoring]);

  // Nothing of one person's may show to the next: their data, and any toast with an Undo.
  const clearPersonalState = useCallback(() => {
    queryClient.clear();
    clearToasts();
  }, [queryClient]);

  useEffect(
    () =>
      tokenManager.onSessionEnded(() => {
        clearPersonalState();
        setState({ status: "signedOut", user: null });
      }),
    [clearPersonalState],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const auth = await authApi.login(email, password);
      await tokenManager.setSession(auth);
      clearPersonalState();
      setState({ status: "signedIn", user: auth.user });
    },
    [clearPersonalState],
  );

  const signOut = useCallback(async () => {
    const refreshToken = await tokenManager.getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // On a phone the intent to leave wins; the token dies on its own after 30 days.
      }
    }
    await tokenManager.clearSession();
    clearPersonalState();
    setState({ status: "signedOut", user: null });
  }, [clearPersonalState]);

  const value = useMemo<Session>(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession is used outside SessionProvider.");
  return session;
}

/** The signed-in person. Only used inside the signed-in part of the app. */
export function useCurrentUser(): CurrentUser {
  const { user } = useSession();
  if (!user) throw new Error("useCurrentUser is used while nobody is signed in.");
  return user;
}
