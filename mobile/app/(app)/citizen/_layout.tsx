import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme";

export default function CitizenTabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.home"),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      {/* My Reports is reachable from the Account screen now, not its own tab -- kept as a
          real route (href: null just hides it from the tab bar) so router.push still works. */}
      <Tabs.Screen name="incidents" options={{ href: null }} />
      <Tabs.Screen name="incidents/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="account"
        options={{
          title: t("nav.account"),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
