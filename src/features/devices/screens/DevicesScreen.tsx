import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import type { Device } from "@/api/types";
import {
  ConfirmDialog,
  EmptyState,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  Text,
  toast,
} from "@/ui";
import { useDevices, useSignOutDevice } from "../api";
import { DeviceList, PLATFORM_NAMES } from "../components/DeviceList";

/** My devices: the phones that receive my notifications, and signing one of them out. */
export function DevicesScreen() {
  const devices = useDevices();
  const signOut = useSignOutDevice();
  const [confirming, setConfirming] = useState<Device | null>(null);

  const confirmSignOut = () => {
    if (!confirming) return;
    const name = PLATFORM_NAMES[confirming.platform];
    signOut.mutate(confirming.id, {
      onSuccess: () => toast({ text: `Signed out the ${name}`, icon: "check" }),
      onError: (error) => {
        const apiError = toApiError(error);
        toast(
          apiError.status === 404
            ? { text: `The ${name} was already signed out`, icon: "info" }
            : { text: "Couldn't sign that phone out", sub: apiError.message, icon: "alert" },
        );
      },
      onSettled: () => setConfirming(null),
    });
  };

  const loadError = devices.isError ? toApiError(devices.error) : null;

  return (
    <Screen
      header={
        <ScreenHeader
          title="My devices"
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
      }
      refreshing={devices.isRefetching}
      onRefresh={() => void devices.refetch()}
    >
      <Section title="Phones that get your notifications">
        {devices.isPending ? (
          <Skeleton lines={3} height={20} />
        ) : loadError ? (
          <LoadError
            what="your devices"
            message={loadError.message}
            traceId={loadError.traceId}
            onRetry={() => void devices.refetch()}
          />
        ) : devices.data?.length ? (
          <DeviceList devices={devices.data} onSignOut={setConfirming} />
        ) : (
          <EmptyState
            title="No phones get your notifications"
            text="A phone shows here once notifications are turned on in the app."
          />
        )}
        <Text variant="small" tone="muted">
          Signing a phone out ends its session there. Whoever uses it has to sign in again.
        </Text>
      </Section>

      <ConfirmDialog
        visible={confirming !== null}
        title="Sign this phone out?"
        message={
          confirming
            ? `The ${PLATFORM_NAMES[confirming.platform]} stops getting notifications and has to sign in again.`
            : undefined
        }
        confirmLabel="Sign out"
        destructive
        busy={signOut.isPending}
        onConfirm={confirmSignOut}
        onCancel={() => setConfirming(null)}
      />
    </Screen>
  );
}
