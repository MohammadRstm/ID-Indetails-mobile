import { useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { useCurrentUser } from "@/auth/session";
import { openChat } from "@/features/messages/openChat";
import { useTabBadges } from "@/features/notifications/slots/useTabBadges";
import { stopTimer } from "@/features/timer/actions";
import {
  isTimerNotification,
  registerTimerCategory,
  showTimerNotification,
} from "@/features/timer/notifications";
import { timerState } from "@/features/timer/store";
import { logRun } from "@/features/timer/screens/TimerPanel";
import { routeForTarget } from "@/navigation/targets";
import { usePermissions } from "@/permissions/usePermissions";
import { toast } from "@/ui";
import { registerNotificationCategories } from "./categories";
import { ensureAndroidChannels } from "./channels";
import { isForMe, isForOpenChat, parsePushData, staleQueries } from "./model";
import { askAndRegister, askedBefore, registerIfAllowed } from "./register";
import { respondToNotification, type ResponseContext } from "./respond";

/*
 * Push on the phone while someone is signed in: channels and categories, the permission (asked once, on the
 * first signed-in start), registration and re-registration, what a push does in the foreground, what a tap
 * does, and the app icon's badge.
 */

// In the foreground nothing is drawn by the system: the app shows its own banner (or nothing, for the open chat).
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const local = isTimerNotification(notification.request.content.data);
    return {
      shouldShowBanner: false,
      shouldShowList: local,
      shouldPlaySound: false,
      shouldSetBadge: !local,
    };
  },
});

export function usePushSetup() {
  const me = useCurrentUser();
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const badges = useTabBadges();
  // The listeners are set up once; they read the latest person and permissions from here.
  const context = useRef<ResponseContext | null>(null);
  useEffect(() => {
    context.current = {
      userId: me.id,
      perms,
      navigate: (href) => router.push(href),
      stopTimer: () => {
        const run = stopTimer(me.id);
        if (run) logRun(run);
      },
    };
  }, [me.id, perms]);

  useEffect(() => {
    void (async () => {
      try {
        await ensureAndroidChannels();
        await registerTimerCategory();
        await registerNotificationCategories();
        const running = timerState(me.id).running;
        // A restart clears the ongoing notification: it is posted again.
        if (running) await showTimerNotification(running);
        if (askedBefore()) await registerIfAllowed();
        else await askAndRegister();
      } catch {
        // Push isn't essential: the app works without it, and the next start tries again.
      }
    })();

    const tokens = Notifications.addPushTokenListener(() => {
      void registerIfAllowed().catch(() => undefined);
    });

    const received = Notifications.addNotificationReceivedListener((notification) => {
      const data = parsePushData(notification.request.content.data);
      const ctx = context.current;
      if (!ctx || !data || !isForMe(data, ctx.userId)) return;
      for (const queryKey of staleQueries(data)) void queryClient.invalidateQueries({ queryKey });
      if (isForOpenChat(data, openChat())) return;
      const { title, body } = notification.request.content;
      if (!title) return;
      const href = routeForTarget(data.target, ctx.perms);
      toast({
        text: title,
        sub: body ?? undefined,
        icon: data.kind === "message" ? "chat" : "bell",
        actionLabel: href ? "Open" : undefined,
        action: href ? () => ctx.navigate(href) : undefined,
      });
    });

    const responses = Notifications.addNotificationResponseReceivedListener((response) => {
      if (context.current) void respondToNotification(response, context.current);
    });
    // Opened from a notification while the app wasn't running: handled once the person is signed in and in.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && context.current) {
        void respondToNotification(response, context.current);
        void Notifications.clearLastNotificationResponseAsync();
      }
    });

    return () => {
      tokens.remove();
      received.remove();
      responses.remove();
    };
    // Set up once per signed-in person.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id]);

  const total = (badges.alerts ?? 0) + (badges.messages ?? 0);
  useEffect(() => {
    void Notifications.setBadgeCountAsync(total).catch(() => undefined);
  }, [total]);
}
