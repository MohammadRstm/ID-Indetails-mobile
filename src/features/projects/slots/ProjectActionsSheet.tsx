import { Card, Icon, ListRow, Section, Sheet, type IconName } from "@/ui";
import type { StatusAction } from "./projectAdminApi";

export const STATUS_ACTION_LOOK: Record<StatusAction, { label: string; icon: IconName }> = {
  hold: { label: "Put on hold", icon: "pause" },
  resume: { label: "Resume", icon: "play" },
  complete: { label: "Complete project", icon: "checkCircle" },
  archive: { label: "Archive", icon: "archive" },
  reopen: { label: "Reopen", icon: "refresh" },
};

type Row = { key: string; title: string; subtitle?: string; icon: IconName; onPress: () => void };

type ProjectActionsSheetProps = {
  visible: boolean;
  title: string;
  /** The status changes on offer, empty without the permission. */
  statusActions: StatusAction[];
  ownerName: string;
  onClose: () => void;
  onStatus: (action: StatusAction) => void;
  /** Missing when the owner can't be changed here. */
  onChangeOwner?: () => void;
  onActivity?: () => void;
  onAskProton?: () => void;
};

/** The admin's menu for one project: its status, its owner, its activity and Proton. */
export function ProjectActionsSheet({
  visible,
  title,
  statusActions,
  ownerName,
  onClose,
  onStatus,
  onChangeOwner,
  onActivity,
  onAskProton,
}: ProjectActionsSheetProps) {
  const others: Row[] = [];
  if (onChangeOwner) {
    others.push({
      key: "owner",
      title: "Change owner",
      subtitle: ownerName,
      icon: "user",
      onPress: onChangeOwner,
    });
  }
  if (onActivity)
    others.push({ key: "activity", title: "Activity", icon: "activity", onPress: onActivity });
  if (onAskProton) {
    others.push({
      key: "proton",
      title: "Ask Proton about it",
      icon: "compass",
      onPress: onAskProton,
    });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {statusActions.length > 0 && (
        <Section title="Set status">
          <Card padded={false}>
            {statusActions.map((action, i) => (
              <ListRow
                key={action}
                title={STATUS_ACTION_LOOK[action].label}
                leading={<Icon name={STATUS_ACTION_LOOK[action].icon} />}
                divider={i < statusActions.length - 1}
                onPress={() => onStatus(action)}
              />
            ))}
          </Card>
        </Section>
      )}
      {others.length > 0 && (
        <Section>
          <Card padded={false}>
            {others.map((row, i) => (
              <ListRow
                key={row.key}
                title={row.title}
                subtitle={row.subtitle}
                leading={<Icon name={row.icon} />}
                chevron
                divider={i < others.length - 1}
                onPress={row.onPress}
              />
            ))}
          </Card>
        </Section>
      )}
    </Sheet>
  );
}
