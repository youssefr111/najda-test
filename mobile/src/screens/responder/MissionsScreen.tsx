import { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useMyMissions } from "@/hooks/missions/useMyMissions";
import { MissionStatusBadge } from "@/components/emergency/IncidentStatusBadge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { Screen } from "@/components/ui/Screen";
import { useTheme } from "@/theme";
import type { Mission } from "@/types/mission";

const PAST_STATUSES = ["COMPLETED", "REJECTED", "CANCELLED"];

export function MissionsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { data: missions, isLoading, isRefetching, refetch } = useMyMissions();

  const active = useMemo(() => (missions ?? []).filter((m) => !PAST_STATUSES.includes(m.status)), [missions]);
  const past = useMemo(() => (missions ?? []).filter((m) => PAST_STATUSES.includes(m.status)), [missions]);

  if (isLoading) return <LoadingOverlay label={t("common.loading")} />;

  function MissionCard({ item }: { item: Mission }) {
    return (
      <Pressable onPress={() => router.push(`/responder/missions/${item.id}`)}>
        <Card className="mb-3 gap-2">
          <View className="flex-row items-start justify-between">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
              {t("responder.missions.incident", { id: item.incidentId })}
            </Text>
            <MissionStatusBadge status={item.status} />
          </View>
          <View className="flex-row items-center gap-2">
            <Ionicons name="car-outline" size={14} color={colors.textMuted} />
            <Text className="text-xs text-slate-500 dark:text-slate-400">{item.unitPlateNumber}</Text>
          </View>
        </Card>
      </Pressable>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerClassName="p-4 flex-grow"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {active.length === 0 && past.length === 0 ? (
          <EmptyState title={t("responder.missions.empty")} />
        ) : (
          <>
            {active.map((item) => (
              <MissionCard key={item.id} item={item} />
            ))}

            {past.length > 0 ? (
              <View className="mt-2">
                <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {t("responder.missions.pastTitle")}
                </Text>
                {past.map((item) => (
                  <MissionCard key={item.id} item={item} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
