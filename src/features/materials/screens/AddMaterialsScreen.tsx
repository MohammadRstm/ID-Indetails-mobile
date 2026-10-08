import { randomUUID } from "expo-crypto";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { toApiError } from "@/api/errors";
import { useCurrentUser } from "@/auth/session";
import { useProjects } from "@/features/projects/api";
import { addMaterials } from "@/offline/outbox";
import { requestSync } from "@/offline/sync";
import { useIsOnline } from "@/offline/useOnline";
import { spacing } from "@/theme/tokens";
import {
  Button,
  Card,
  IconButton,
  InlineError,
  ListRow,
  Screen,
  ScreenHeader,
  Section,
  Select,
  Text,
  toast,
} from "@/ui";
import { useSiteMaterials } from "../api";
import { MaterialForm } from "../components/MaterialForm";
import { takeMaterialsCopy } from "../draft";
import {
  draftOf,
  draftProblem,
  EMPTY_DRAFT,
  isBlank,
  quantityText,
  quickPicks,
  toItem,
  type MaterialDraft,
} from "../model";

export type AddMaterialsScreenProps = {
  projectId: number | null;
};

const MAX_BATCH = 100;

const close = () => (router.canGoBack() ? router.back() : router.replace("/sites"));

/**
 * Adding materials on site, built for the phone: the site comes from where it was opened, types and suppliers
 * from the site's usual ones, "Repeat last" fills in the previous one, and the batch is saved on the phone at
 * once and sent when there is a connection.
 */
export function AddMaterialsScreen({ projectId }: AddMaterialsScreenProps) {
  const me = useCurrentUser();
  const online = useIsOnline();
  const [siteId, setSiteId] = useState<number | null>(projectId);
  const [batch, setBatch] = useState<MaterialDraft[]>(takeMaterialsCopy);
  const [draft, setDraft] = useState<MaterialDraft>(EMPTY_DRAFT);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sites = useProjects({ domain: "execution" });
  const materials = useSiteMaterials(siteId ?? 0, siteId != null);

  const openSites = (sites.data?.items ?? []).filter(
    (p) => p.status === "active" || p.status === "hold",
  );
  const site = sites.data?.items.find((p) => p.id === siteId);
  const firstPage = materials.data?.pages[0];
  const typePicks = quickPicks(
    [...(firstPage?.types ?? [])].sort((a, b) => b.count - a.count).map((t) => t.label),
    draft.name,
  );
  const supplierPicks = quickPicks(
    (firstPage?.suppliers ?? []).map((s) => s.label),
    draft.supplier,
  );
  const lastOnSite = firstPage?.items[0];

  function repeatLast() {
    const last = batch[batch.length - 1];
    if (last) setDraft(last);
    else if (lastOnSite) {
      const priced = lastOnSite.quantity != null && lastOnSite.unitCost != null;
      setDraft(
        draftOf({
          name: lastOnSite.name,
          quantity: lastOnSite.quantity,
          unit: lastOnSite.unit,
          unitCost: lastOnSite.unitCost,
          amount: priced ? null : lastOnSite.cost,
          supplier: lastOnSite.supplier,
          note: null,
        }),
      );
    }
    setProblem(null);
  }

  function addToBatch(): boolean {
    const issue = draftProblem(draft);
    if (issue) {
      setProblem(issue);
      return false;
    }
    if (batch.length >= MAX_BATCH) {
      setProblem(`A batch holds at most ${MAX_BATCH} materials. Save these first.`);
      return false;
    }
    setBatch([...batch, draft]);
    setDraft({ ...EMPTY_DRAFT, supplier: draft.supplier });
    setProblem(null);
    return true;
  }

  async function save() {
    if (siteId == null) {
      setProblem("Pick the site first.");
      return;
    }
    const all = [...batch];
    if (!isBlank(draft)) {
      const issue = draftProblem(draft);
      if (issue) {
        setProblem(issue);
        return;
      }
      all.push(draft);
    }
    if (all.length === 0) {
      setProblem("Add at least one material.");
      return;
    }
    setSaving(true);
    try {
      await addMaterials(me.id, siteId, {
        projectTitle: site?.title ?? "the site",
        items: all.slice(0, MAX_BATCH).map((d) => toItem(d, randomUUID())),
      });
      void requestSync();
      toast({
        text: online ? "Saved. Sending…" : "Saved on your phone",
        sub: online ? undefined : "It will send when you're back online.",
        icon: "checkCircle",
      });
      close();
    } catch (error) {
      setProblem(toApiError(error).message);
    } finally {
      setSaving(false);
    }
  }

  const count = batch.length + (isBlank(draft) ? 0 : 1);

  return (
    <Screen header={<ScreenHeader title="Add materials" subtitle={site?.title} onBack={close} />}>
      {projectId == null ? (
        <Section>
          <Select
            label="Site"
            value={siteId}
            options={openSites.map((p) => ({ value: p.id, label: p.title }))}
            onChange={(id) => {
              setSiteId(id);
              setProblem(null);
            }}
            placeholder={sites.isPending ? "Loading sites…" : "Pick a site"}
            searchable
          />
        </Section>
      ) : null}
      {batch.length > 0 ? (
        <Section title={`In this batch · ${batch.length}`}>
          <Card padded={false}>
            {batch.map((item, i) => (
              <ListRow
                key={i}
                title={item.name}
                subtitle={
                  [quantityText(item.quantity, item.unit || null), item.supplier || null]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
                trailing={
                  <IconButton
                    icon="x"
                    accessibilityLabel={`Remove ${item.name}`}
                    onPress={() => setBatch(batch.filter((_, j) => j !== i))}
                  />
                }
                divider={i < batch.length - 1}
              />
            ))}
          </Card>
        </Section>
      ) : null}
      <Section
        title={batch.length ? "Next material" : "Material"}
        action={
          batch.length || lastOnSite ? { label: "Repeat last", onPress: repeatLast } : undefined
        }
      >
        <Card>
          <MaterialForm
            draft={draft}
            onChange={(next) => {
              setDraft(next);
              setProblem(null);
            }}
            typePicks={typePicks}
            supplierPicks={supplierPicks}
          />
        </Card>
        {problem ? <InlineError message={problem} /> : null}
        <View style={styles.actions}>
          <Button label="Add another" icon="plus" onPress={addToBatch} disabled={isBlank(draft)} />
        </View>
      </Section>
      <Button
        label={count > 1 ? `Save ${count} materials` : "Save"}
        variant="primary"
        size="large"
        fullWidth
        loading={saving}
        onPress={() => void save()}
      />
      {!online ? (
        <Text variant="small" tone="muted" style={styles.note}>
          You're offline. They are saved on your phone and sent when you're back online.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: spacing.m },
  note: { marginTop: spacing.m },
});
