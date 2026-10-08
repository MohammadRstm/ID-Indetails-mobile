import type { Device } from "@/api/types";
import { fmtDateY } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { Badge, Button, Card, Icon, ListRow } from "@/ui";

export const PLATFORM_NAMES: Record<Device["platform"], string> = {
  ios: "iPhone",
  android: "Android phone",
};

function subtitleOf(device: Device): string {
  const added = `Added ${fmtDateY(device.createdAt)}`;
  return device.appVersion ? `${added} · App ${device.appVersion}` : added;
}

type DeviceListProps = {
  devices: Device[];
  onSignOut: (device: Device) => void;
};

/** The person's phones: this one marked, every other one with "Sign out". */
export function DeviceList({ devices, onSignOut }: DeviceListProps) {
  const { colors } = useTheme();
  return (
    <Card padded={false}>
      {devices.map((device, i) => (
        <ListRow
          key={device.id}
          title={PLATFORM_NAMES[device.platform]}
          subtitle={subtitleOf(device)}
          divider={i < devices.length - 1}
          leading={<Icon name="phone" size={20} color={colors.ink2} />}
          trailing={
            device.current ? (
              <Badge label="This phone" tone="accent" />
            ) : (
              <Button
                label="Sign out"
                variant="danger"
                onPress={() => onSignOut(device)}
                accessibilityLabel={`Sign out ${PLATFORM_NAMES[device.platform]}, ${subtitleOf(device)}`}
              />
            )
          }
        />
      ))}
    </Card>
  );
}
