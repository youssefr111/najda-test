import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMission } from "@/hooks/missions/useMission";
import { useAcceptMission, useMarkArrived, useMarkEnRoute, useRejectMission } from "@/hooks/missions/useMissionActions";
import { useIncident } from "@/hooks/incidents/useIncident";
import { useUnit } from "@/hooks/units/useUnit";
import { MissionRouteMapView } from "@/components/map/MissionRouteMapView";
import { MissionStatusBadge } from "@/components/emergency/IncidentStatusBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BackHeader } from "@/components/ui/BackHeader";
import { TextField } from "@/components/ui/TextField";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { Screen } from "@/components/ui/Screen";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-slate-500 dark:text-slate-400">{label}</Text>
      <Text className="font-semibold text-slate-900 dark:text-slate-100">{value}</Text>
    </View>
  );
}

export function MissionDetailScreen({ missionId }: { missionId: number }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: mission, isLoading } = useMission(missionId);

  const acceptMission = useAcceptMission();
  const markEnRoute = useMarkEnRoute();
  const markArrived = useMarkArrived();
  const rejectMission = useRejectMission();

  const { data: incident } = useIncident(mission?.incidentId ?? null);
  const { data: unit } = useUnit(mission?.unitId ?? null);

  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  if (isLoading || !mission) return <LoadingOverlay label={t("common.loading")} />;

  async function handleReject() {
    await rejectMission.mutateAsync({ missionId: mission.id, reason });
    router.back();
  }

  return (
    <Screen scroll>
      <BackHeader title={t("responder.missions.incident", { id: mission.incidentId })} />
      <View className="mb-6 gap-2">
        <View className="flex-row">
          <MissionStatusBadge status={mission.status} />
        </View>
      </View>

      {incident ? (
        <View className="mb-4">
          <MissionRouteMapView
            unitLatitude={unit?.latitude ?? null}
            unitLongitude={unit?.longitude ?? null}
            facilityLatitude={unit?.facilityLatitude ?? null}
            facilityLongitude={unit?.facilityLongitude ?? null}
            destinationLatitude={incident.latitude}
            destinationLongitude={incident.longitude}
          />
        </View>
      ) : null}

      <Card>
        <Row label={t("responder.missions.unit")} value={mission.unitPlateNumber} />
        <Row label={t("responder.missions.participants")} value={mission.participantNames.join(", ") || "—"} />
      </Card>

      <View className="mt-6 gap-2">
        {mission.status === "OFFERED" && !showReject ? (
          <>
            <Button
              label={t("responder.missions.accept")}
              loading={acceptMission.isPending}
              onPress={() => acceptMission.mutate(mission.id)}
            />
            <Button label={t("responder.missions.reject")} variant="danger" onPress={() => setShowReject(true)} />
          </>
        ) : null}

        {mission.status === "OFFERED" && showReject ? (
          <View className="gap-2">
            <TextField
              placeholder={t("responder.missions.rejectReasonPlaceholder")}
              value={reason}
              onChangeText={setReason}
            />
            <Button
              label={rejectMission.isPending ? t("responder.missions.rejecting") : t("responder.missions.reject")}
              variant="danger"
              loading={rejectMission.isPending}
              disabled={!reason.trim()}
              onPress={handleReject}
            />
            <Button label={t("common.cancel")} variant="ghost" onPress={() => setShowReject(false)} />
          </View>
        ) : null}

        {mission.status === "ACCEPTED" ? (
          <Button
            label={t("responder.missions.markEnRoute")}
            loading={markEnRoute.isPending}
            onPress={() => markEnRoute.mutate(mission.id)}
          />
        ) : null}

        {mission.status === "EN_ROUTE" ? (
          <Button
            label={t("responder.missions.markArrived")}
            loading={markArrived.isPending}
            onPress={() => markArrived.mutate(mission.id)}
          />
        ) : null}
      </View>
    </Screen>
  );
}
