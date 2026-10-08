import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
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
import type { MobileAuthResponse } from "@/api/mobileTypes";
import type { CurrentUser } from "@/api/types";
import { clearToasts } from "@/ui/toast";
import { authApi } from "./authApi";
import { runSignOutCleanups, type SignOutCause } from "./signOutCleanup";
import { tokenManager } from "./tokenManager";
import { cacheUser, forgetCachedUser, readCachedUser } from "./userCache";

/*
 * The signed-in person (phase-0-plan.md sections 5 and 6). At start the session is restored from the stored
 * refresh token; signing in and out goes through the mobile endpoints. The person is read again from
 * /auth/me every 5 minutes and on every return to the foreground, and from every refresh's answer, so a
 * change of permissions reaches the phone (the API doesn't push them).
 */

export type SessionStatus = "loading" | "signedOut" | "signedIn";

/** How the current session began: the password just now, or a session restored when the app started. */
export type SignedInWith = "password" | "storedSession";

export type Session = {
  status: SessionStatus;
  user: CurrentUser | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Why the person was signed out without choosing to be, for the sign-in screen. */
  notice: string | null;
  signedInWith: SignedInWith | null;
  /**
   * Changes the password (also a pending temporary one). Every other session of the person ends; this phone
   * keeps its session with new tokens. Rejects with the API's error.
   */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
};

export const SESSION_ENDED_NOTICE = "Your session ended. Please sign in again.";
export const SERVER_UNREACHABLE_NOTICE =
  "The server can't be reached right now. Check your connection and try again.";

export const meQueryKey = ["auth", "me"] as const;
const ME_REFRESH_MS = 5 * 60_000;

type SessionState = {
  status: SessionStatus;
  /** The person as last adopted; the /auth/me query's answer wins once it has one. */
  user: CurrentUser | null;
  signedInWith: SignedInWith | null;
  notice: string | null;
};

const SIGNED_OUT: SessionState = {
  status: "signedOut",
  user: null,
  signedInWith: null,
  notice: null,
};

const SessionContext = createContext<Session | null>(null);

function clearImageCaches() {
  try {
    void Image.clearMemoryCache().catch(() => {});
    void Image.clearDiskCache().catch(() => {});
  } catch {
    // no image module (tests): nothing cached
  }
}

/** Nothing of one person's may show to the next: their data, images, toasts with an Undo, stored state. */
async function clearPersonalState(queryClient: QueryClient, cause: SignOutCause) {
  queryClient.clear();
  clearToasts();
  clearImageCaches();
  await forgetCachedUser();
  await runSignOutCleanups(cause);
}

type SessionProviderProps = {
  children: ReactNode;
  /** Starts signed in as this person without restoring a session (tests and previews). */
  initialUser?: CurrentUser;
};

export function SessionProvider({ children, initialUser }: SessionProviderProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>(() =>
    initialUser
      ? { status: "signedIn", user: initialUser, signedInWith: "password", notice: null }
      : { status: "loading", user: null, signedInWith: null, notice: null },
  );
  const signedIn = state.status === "signedIn";

  const me = useQuery({
    queryKey: meQueryKey,
    queryFn: async () => (await http.get<CurrentUser>("/auth/me")).data,
    enabled: signedIn,
    initialData: initialUser,
    staleTime: ME_REFRESH_MS,
    refetchInterval: ME_REFRESH_MS,
    refetchOnWindowFocus: "always",
  });
  const user = signedIn ? (me.data ?? state.user) : null;

  /** Takes a person the API just described as the signed-in one. */
  const adopt = useCallback(
    (next: CurrentUser) => {
      queryClient.setQueryData(meQueryKey, next);
      setState((s) => (s.status === "signedIn" ? { ...s, user: next } : s));
    },
    [queryClient],
  );

  useEffect(() => {
    if (user) cacheUser(user);
  }, [user]);

  // Signed out first, so nothing signed in asks for data while it is cleared.
  const endSession = useCallback(
    async (notice: string) => {
      setState({ ...SIGNED_OUT, notice });
      await clearPersonalState(queryClient, "sessionEnded");
    },
    [queryClient],
  );

  // Listening starts before the restore below, so its refresh is heard too.
  useEffect(() => {
    const stopEnded = tokenManager.onSessionEnded(() => void endSession(SESSION_ENDED_NOTICE));
    const stopRefreshed = tokenManager.onRefreshed((auth) => adopt(auth.user));
    return () => {
      stopEnded();
      stopRefreshed();
    };
  }, [adopt, endSession]);

  const restoring = !initialUser;
  useEffect(() => {
    if (!restoring) return;
    let cancelled = false;
    const finish = (next: SessionState) => {
      if (!cancelled) setState(next);
    };

    void (async () => {
      if (!(await tokenManager.getRefreshToken())) return finish(SIGNED_OUT);

      // Known from last time: open at once, even offline, and check the session behind it.
      const cached = readCachedUser();
      if (cached) {
        queryClient.setQueryData(meQueryKey, cached);
        finish({ status: "signedIn", user: cached, signedInWith: "storedSession", notice: null });
        tokenManager.refresh().catch(() => {
          // kept: the next request tries again
        });
        return;
      }

      try {
        // A refused refresh ends the session through its listener, which sets the notice.
        if (!(await tokenManager.refresh())) return;
        const known = queryClient.getQueryData<CurrentUser>(meQueryKey);
        const person = known ?? (await http.get<CurrentUser>("/auth/me")).data;
        queryClient.setQueryData(meQueryKey, person);
        finish({ status: "signedIn", user: person, signedInWith: "storedSession", notice: null });
      } catch {
        // The API couldn't be reached. The stored session is kept; signing in again replaces it.
        finish({ ...SIGNED_OUT, notice: SERVER_UNREACHABLE_NOTICE });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restoring, queryClient]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const auth = await authApi.login(email, password);
      await tokenManager.setSession(auth);
      queryClient.clear();
      clearToasts();
      queryClient.setQueryData(meQueryKey, auth.user);
      setState({ status: "signedIn", user: auth.user, signedInWith: "password", notice: null });
    },
    [queryClient],
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
    setState(SIGNED_OUT);
    await clearPersonalState(queryClient, "signedOut");
  }, [queryClient]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const { data } = await http.post<MobileAuthResponse>("/mobile/auth/change-password", {
        currentPassword,
        newPassword,
      });
      try {
        await tokenManager.setSession(data);
      } catch {
        // The API replaced the token this phone holds, and the new one couldn't be kept.
        await tokenManager.clearSession();
        await endSession(SESSION_ENDED_NOTICE);
        return;
      }
      adopt(data.user);
    },
    [adopt, endSession],
  );

  const value = useMemo<Session>(
    () => ({
      status: state.status,
      user,
      notice: state.notice,
      signedInWith: state.signedInWith,
      signIn,
      signOut,
      changePassword,
    }),
    [state.status, state.notice, state.signedInWith, user, signIn, signOut, changePassword],
  );
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
