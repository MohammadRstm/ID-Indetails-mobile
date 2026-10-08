import { Tabs } from "expo-router/js-tabs";
import { useTabBadges } from "@/features/notifications/slots/useTabBadges";
import { usePermissions } from "@/permissions/usePermissions";
import { tabsFor, type TabKey } from "@/permissions/screens";
import { useTheme } from "@/theme/ThemeProvider";
import { Icon } from "@/ui";

// Every tab route, in tab-bar order. Each person sees their own (tabsFor); the rest are hidden.
const TAB_ROUTES: TabKey[] = ["today", "work", "sites", "projects", "messages", "alerts", "more"];

export default function TabsLayout() {
  const perms = usePermissions();
  const { colors } = useTheme();
  const badges = useTabBadges();
  const tabs = tabsFor(perms);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentInk,
        tabBarInactiveTintColor: colors.ink3,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarBadgeStyle: { backgroundColor: colors.now, color: colors.onAccent },
        sceneStyle: { backgroundColor: colors.ground },
      }}
    >
      {TAB_ROUTES.map((key) => {
        const tab = tabs.find((t) => t.key === key);
        const badge =
          key === "alerts" ? badges.alerts : key === "messages" ? badges.messages : undefined;
        return (
          <Tabs.Screen
            key={key}
            name={key}
            options={
              tab
                ? {
                    title: tab.label,
                    tabBarAccessibilityLabel: tab.label,
                    tabBarBadge: badge ? (badge > 99 ? "99+" : badge) : undefined,
                    tabBarIcon: ({ color, size }) => (
                      <Icon name={tab.icon} color={color} size={size} />
                    ),
                  }
                : { href: null }
            }
          />
        );
      })}
    </Tabs>
  );
}
