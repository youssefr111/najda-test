import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useIncident } from "@/hooks/incidents/useIncident";
import { useCancelIncident } from "@/hooks/incidents/useCancelIncident";
import { confirmAsync } from "@/lib/confirm";
import { IncidentStatusBadge, PriorityBadge } from "@/components/emergency/IncidentStatusBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BackHeader } from "@/components/ui/BackHeader";
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

export function IncidentDetailScreen({ incidentId }: { incidentId: number }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: incident, isLoading } = useIncident(incidentId);
  const cancelIncident = useCancelIncident();
  const [cancelling, setCancelling] = useState(false);

  if (isLoading || !incident) return <LoadingOverlay label={t("common.loading")} />;

  const canCancel = incident.status === "NEW" || incident.status === "AI_PROCESSED";

  async function handleCancel() {
    const confirmed = await confirmAsync(
      t("citizen.incidents.cancelConfirmTitle"),
      t("citizen.incidents.cancelConfirmBody"),
      { confirmLabel: t("citizen.incidents.cancel"), cancelLabel: t("common.cancel"), destructive: true }
    );
    if (!confirmed || !incident) return;

    setCancelling(true);
    try {
      await cancelIncident.mutateAsync(incident.id);
      router.back();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Screen scroll>
      <BackHeader title={t("citizen.incidentDetail.title")} />
      <View className="mb-6 gap-2">
        <View className="flex-row gap-2">
          <IncidentStatusBadge status={incident.status} />
          {incident.aiPriority ? <PriorityBadge priority={incident.aiPriority} /> : null}
        </View>
      </View>

      <Card>
        <Row label={t("citizen.incidentDetail.category")} value={t(`enums.category.${incident.category}`)} />
        <Row label={t("citizen.incidentDetail.injured")} value={String(incident.injuredCount)} />
        <Row label={t("citizen.incidentDetail.reportedAt")} value={new Date(incident.createdAt).toLocaleString()} />
        <Row
          label={t("citizen.incidentDetail.address")}
          value={incident.address ?? t("citizen.incidentDetail.noAddress")}
        />
      </Card>

      {canCancel ? (
        <Button
          label={cancelling ? t("citizen.incidents.cancelling") : t("citizen.incidents.cancel")}
          variant="danger"
          loading={cancelling}
          onPress={handleCancel}
          className="mt-6"
        />
      ) : null}
    </Screen>
  );
}
