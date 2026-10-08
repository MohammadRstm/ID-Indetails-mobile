import {
  HttpTransportType,
  HubConnectionBuilder,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import { tokenManager } from "@/auth/tokenManager";
import { env } from "@/config/env";
import { messagesStale, needsFreshToken, type MessagesSignal } from "./model";

/*
 * The live connection (`/hubs/live`, phase-0-plan.md section 17): open only while the app is in the foreground,
 * with the access token in the Authorization header (the token manager refreshes it first when it is about to
 * expire). Its signals, and every reconnect, reload what they name, so nothing is missed.
 */

async function accessToken(): Promise<string> {
  const current = tokenManager.getAccessToken();
  if (!needsFreshToken(current, Date.now())) return current as string;
  return (await tokenManager.refresh()) ?? "";
}

export function useLiveConnection() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let connection: HubConnection | null = null;
    let stopped = false;

    const reloadAll = () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
    };

    async function connect() {
      if (connection || stopped) return;
      const hub = new HubConnectionBuilder()
        .withUrl(`${env.apiUrl}/hubs/live`, {
          accessTokenFactory: accessToken,
          transport: HttpTransportType.WebSockets,
          skipNegotiation: true,
        })
        .withAutomaticReconnect([0, 2_000, 10_000, 30_000, 60_000])
        .configureLogging(LogLevel.None)
        .build();
      hub.on("notifications", () => {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      });
      hub.on("messages", (signal: MessagesSignal) => {
        for (const queryKey of messagesStale(signal))
          void queryClient.invalidateQueries({ queryKey });
      });
      hub.onreconnected(reloadAll);
      // The server closes the connection when the token expires; it is opened again with a fresh one.
      hub.onclose(() => {
        if (connection === hub) connection = null;
        if (!stopped && AppState.currentState === "active") setTimeout(() => void connect(), 2_000);
      });
      connection = hub;
      try {
        await hub.start();
        reloadAll();
      } catch {
        if (connection === hub) connection = null;
      }
    }

    function disconnect() {
      const hub = connection;
      connection = null;
      void hub?.stop();
    }

    if (AppState.currentState === "active") void connect();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void connect();
      else disconnect();
    });
    return () => {
      stopped = true;
      subscription.remove();
      disconnect();
    };
  }, [queryClient]);
}
