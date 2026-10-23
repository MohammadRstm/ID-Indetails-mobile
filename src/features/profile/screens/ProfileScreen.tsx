import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { toApiError } from "@/api/errors";
import { useCurrentUser } from "@/auth/session";
import { photoOf, pickMedia, uploadMedia } from "@/features/work/photos";
import { fmtDateY } from "@/format/time";
import { spacing } from "@/theme/tokens";
import {
  Avatar,
  Badge,
  Button,
  Card,
  InlineError,
  ListRow,
  Screen,
  ScreenHeader,
  Section,
  Sheet,
  Skeleton,
  Text,
  toast,
} from "@/ui";
import { useMyPermissions, useSetMyPhoto } from "../api";

const ROLE: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  employee: "Employee",
};
const AREA: Record<string, string> = {
  design: "Design",
  execution: "Execution",
  website: "Website",
};

/** My profile: my photo (changeable), my details, and what I'm allowed to do and why. */
export function ProfileScreen() {
  const me = useCurrentUser();
  const permissions = useMyPermissions();
  const setPhoto = useSetMyPhoto();
  // The session's copy of the person refreshes on its own; the new photo shows here at once.
  const [photoId, setPhotoId] = useState<number | null | undefined>(undefined);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const name = `${me.firstName} ${me.lastName}`;
  const shownPhoto = photoId === undefined ? me.photoFileId : photoId;

  async function change(source: "camera" | "library") {
    setChoosing(false);
    setProblem(null);
    try {
      const picked = await pickMedia(source);
      if (picked.status === "denied") {
        setProblem("Turn on the camera and photos for ID InDetails in your phone's settings.");
        return;
      }
      if (picked.status !== "picked") return;
      setBusy(true);
      const file = await uploadMedia(picked.media[0]);
      const user = await setPhoto.mutateAsync(file.id);
      setPhotoId(user.photoFileId);
      toast({ text: "Photo changed", icon: "checkCircle" });
    } catch (error) {
      setProblem(toApiError(error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setChoosing(false);
    setBusy(true);
    try {
      const user = await setPhoto.mutateAsync(null);
      setPhotoId(user.photoFileId);
    } catch (error) {
      setProblem(toApiError(error).message);
    } finally {
      setBusy(false);
    }
  }

  const held = (permissions.data ?? []).filter((p) => p.source !== "removed");
  const removed = (permissions.data ?? []).filter((p) => p.source === "removed");

  return (
    <Screen
      header={
        <ScreenHeader
          title="Profile"
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/more"))}
        />
      }
    >
      <Section>
        <Card>
          <View style={styles.head}>
            <Avatar name={name} size={72} photo={photoOf(shownPhoto)} />
            <View style={styles.headText}>
              <Text variant="heading">{name}</Text>
              {me.position ? (
                <Text variant="small" tone="secondary">
                  {me.position}
                </Text>
              ) : null}
              <Badge
                label={[ROLE[me.role] ?? me.role, AREA[me.domain ?? ""]]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </View>
          </View>
          <Button
            label="Change photo"
            icon="user"
            loading={busy}
            onPress={() => setChoosing(true)}
          />
          {problem ? <InlineError message={problem} /> : null}
        </Card>
      </Section>
      <Section title="Details">
        <Card padded={false}>
          <ListRow title="Email" subtitle={me.email} divider />
          <ListRow title="Phone" subtitle={me.phone ?? "Not given"} divider />
          <ListRow title="Team" subtitle={me.team?.name ?? "No team"} divider />
          <ListRow title="Joined" subtitle={me.joinedOn ? fmtDateY(me.joinedOn) : "Not recorded"} />
        </Card>
        <Text variant="small" tone="muted">
          Your name, email and phone are changed on the web.
        </Text>
      </Section>
      <Section title={me.isJoker ? "My permissions · changed for you" : "My permissions"}>
        {permissions.isError && !permissions.data ? (
          <InlineError
            what="your permissions"
            message={toApiError(permissions.error).message}
            onRetry={() => void permissions.refetch()}
          />
        ) : !permissions.data ? (
          <Skeleton lines={5} />
        ) : (
          <Card padded={false}>
            {[...held, ...removed].map((p, i, all) => (
              <ListRow
                key={p.code}
                title={p.description}
                subtitle={p.explanation}
                trailing={
                  p.source === "granted" ? (
                    <Badge label="Granted" tone="accent" />
                  ) : p.source === "removed" ? (
                    <Badge label="Removed" tone="now" />
                  ) : undefined
                }
                divider={i < all.length - 1}
              />
            ))}
          </Card>
        )}
      </Section>
      <Sheet visible={choosing} onClose={() => setChoosing(false)} title="Profile photo">
        <Button label="Take a photo" icon="plus" fullWidth onPress={() => void change("camera")} />
        <Button
          label="Choose from your photos"
          icon="folder"
          fullWidth
          onPress={() => void change("library")}
        />
        {shownPhoto ? (
          <Button
            label="Remove the photo"
            icon="trash"
            variant="danger"
            fullWidth
            onPress={() => void remove()}
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: spacing.l },
  headText: { flex: 1, gap: spacing.xs },
});
