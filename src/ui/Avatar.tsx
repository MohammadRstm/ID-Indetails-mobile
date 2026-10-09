import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { radii } from "@/theme/tokens";
import { avatarSvg, initials } from "./avatars";
import { Text } from "./Text";

/** An uploaded photo, fetched with the signed-in person's headers and cached on disk by its address. */
export type AvatarPhoto = { uri: string; headers?: Record<string, string> };

type AvatarProps = {
  name: string;
  size?: number;
  /** The person's uploaded photo; it wins over the generated face. */
  photo?: AvatarPhoto | null;
  /** The online / offline dot. */
  presence?: "online" | "offline";
};

function safeSvg(name: string): string | null {
  try {
    return avatarSvg(name);
  } catch {
    return null;
  }
}

/** A person's photo, or their generated face (as on the web), or their initials. */
export function Avatar({ name, size = 32, photo, presence }: AvatarProps) {
  const { colors } = useTheme();
  const [photoFailed, setPhotoFailed] = useState(false);
  const svg = useMemo(() => safeSvg(name), [name]);
  const round = { width: size, height: size, borderRadius: size / 2 };

  let face;
  if (photo && !photoFailed) {
    face = (
      <Image
        source={{ uri: photo.uri, headers: photo.headers }}
        cachePolicy="disk"
        style={[round, { backgroundColor: colors.surface3 }]}
        onError={() => setPhotoFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  } else if (svg) {
    face = <SvgXml xml={svg} width={size} height={size} />;
  } else {
    face = (
      <View style={[round, styles.initials, { backgroundColor: colors.surface3 }]}>
        <Text variant="badge" style={{ color: colors.ink2, fontSize: Math.max(9, size * 0.36) }}>
          {initials(name).toUpperCase()}
        </Text>
      </View>
    );
  }

  const dot = Math.max(8, Math.round(size * 0.28));
  return (
    <View
      style={[round, styles.wrap]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={presence ? `${name}, ${presence}` : name}
    >
      {face}
      {presence && (
        <View
          style={[
            styles.dot,
            { width: dot, height: dot, borderColor: colors.ring },
            presence === "online"
              ? { backgroundColor: colors.ok }
              : { backgroundColor: colors.surface, borderColor: colors.line2 },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "visible" },
  initials: { alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", right: -1, bottom: -1, borderRadius: radii.pill, borderWidth: 2 },
});
