import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Screen, Text } from "@/ui";
import { BrandMark } from "./BrandMark";

type AuthLayoutProps = {
  title: string;
  sub?: string;
  /** The company's name from its branding; empty until it has loaded. */
  companyName: string | null;
  logoUri: string | null;
  children: ReactNode;
};

/** The signed-out screens' frame, as the web's sign-in card: the mark, a heading, and the form under it. */
export function AuthLayout({ title, sub, companyName, logoUri, children }: AuthLayoutProps) {
  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen edges={["top", "bottom", "left", "right"]} keyboardInsets={false}>
        <View style={styles.card}>
          <View style={styles.brand}>
            <BrandMark logoUri={logoUri} />
            <View style={styles.brandText}>
              <Text variant="heading">ID InDetails</Text>
              {companyName ? (
                <Text variant="small" tone="muted" numberOfLines={1}>
                  {companyName}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.head}>
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            {sub ? <Text tone="muted">{sub}</Text> : null}
          </View>
          {children}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  card: {
    gap: spacing.xl,
    paddingTop: spacing.xxxl,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.row },
  brandText: { flex: 1, minWidth: 0 },
  head: { gap: spacing.xs },
});
