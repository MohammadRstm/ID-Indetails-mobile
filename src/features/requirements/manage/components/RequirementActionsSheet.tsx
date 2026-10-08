import { Card, Icon, ListRow, Sheet } from "@/ui";

type RequirementActionsSheetProps = {
  visible: boolean;
  text: string;
  isDone: boolean;
  onClose: () => void;
  onTick: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** The manager's menu for one requirement: tick or untick it, edit it, delete it. */
export function RequirementActionsSheet({
  visible,
  text,
  isDone,
  onClose,
  onTick,
  onEdit,
  onDelete,
}: RequirementActionsSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Requirement" subtitle={text}>
      <Card padded={false}>
        <ListRow
          title={isDone ? "Mark as not done" : "Mark as done"}
          leading={<Icon name={isDone ? "refresh" : "checkCircle"} />}
          divider
          onPress={onTick}
        />
        <ListRow title="Edit" leading={<Icon name="edit" />} divider onPress={onEdit} />
        <ListRow title="Delete" leading={<Icon name="trash" />} onPress={onDelete} />
      </Card>
    </Sheet>
  );
}
