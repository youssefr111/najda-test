import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useMyIncidents } from "@/hooks/incidents/useMyIncidents";
import { IncidentStatusBadge, PriorityBadge } from "@/components/emergency/IncidentStatusBadge";
import { Card } from "@/components/ui/Card";
import { BackHeader } from "@/components/ui/BackHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { Screen } from "@/components/ui/Screen";
import { useTheme } from "@/theme";
import type { Incident } from "@/types/incident";

export function IncidentsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { data: incidents, isLoading, isRefetching, refetch } = useMyIncidents();

  if (isLoading) return <LoadingOverlay label={t("common.loading")} />;

  function renderItem({ item }: { item: Incident }) {
    return (
      <Pressable onPress={() => router.push(`/citizen/incidents/${item.id}`)}>
        <Card className="mb-3 gap-2">
          <View className="flex-row items-start justify-between">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
              {t(`enums.category.${item.category}`)}
            </Text>
            <IncidentStatusBadge status={item.status} />
          </View>
          <View className="flex-row items-center gap-2">
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
          {item.aiPriority ? (
            <View className="flex-row">
              <PriorityBadge priority={item.aiPriority} />
            </View>
          ) : null}
        </Card>
      </Pressable>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={incidents ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerClassName="p-4 flex-grow"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={<BackHeader title={t("account.myReports")} />}
        ListEmptyComponent={<EmptyState title={t("citizen.incidents.empty")} />}
      />
    </Screen>
  );
}
