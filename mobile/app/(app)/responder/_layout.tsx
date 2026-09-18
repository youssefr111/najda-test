import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme";

export default function ResponderTabsLayout() {
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
          title: t("nav.missions"),
          tabBarIcon: ({ color, size }) => <Ionicons name="navigate" color={color} size={size} />,
        }}
      />
      {/* Hidden from the tab bar, but still a real route for router.push -- avoids it
          appearing as a stray unlabeled fourth tab, same fix as citizen/incidents/[id]. */}
      <Tabs.Screen name="missions/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="shift"
        options={{
          title: t("nav.shift"),
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} />,
        }}
      />
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
