import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useMyShift } from "@/hooks/shifts/useMyShift";
import { useEndShift, useJoinShift, useLeaveShift, useStartShift } from "@/hooks/shifts/useShiftActions";
import { useMyFacilityUnits } from "@/hooks/units/useMyFacilityUnits";
import { useReportUnitLocation } from "@/lib/location/useReportUnitLocation";
import { confirmAsync } from "@/lib/confirm";
import { CrewList } from "@/components/emergency/CrewList";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { Screen } from "@/components/ui/Screen";

export function ShiftScreen() {
  const { t } = useTranslation();

  const { data: shift, isLoading: shiftLoading } = useMyShift();
  const { data: units, isLoading: unitsLoading } = useMyFacilityUnits();
  const startShift = useStartShift();
  const joinShift = useJoinShift();
  const leaveShift = useLeaveShift();
  const endShift = useEndShift();

  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);

  const availableUnits = useMemo(() => units?.filter((u) => u.status !== "MAINTENANCE") ?? [], [units]);

  const locationSharing = useReportUnitLocation(shift?.unitId ?? null);

  if (shiftLoading || unitsLoading) return <LoadingOverlay label={t("common.loading")} />;

  if (shift) {
    return (
      <Screen scroll>
        <View className="mb-6 mt-3">
          <Text className="text-[22px] font-bold text-slate-900 dark:text-slate-100">
            {t("responder.shift.title")}
          </Text>
        </View>

        <Card className="gap-2">
          <Text className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
            {t("responder.shift.onShiftAs", { role: t(`enums.roleInShift.${shift.roleInShift}`) })}
          </Text>
          <View className="flex-row justify-between">
            <Text className="text-slate-500 dark:text-slate-400">{t("responder.shift.unit")}</Text>
            <Text className="font-semibold text-slate-900 dark:text-slate-100">{shift.unitPlateNumber}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-slate-500 dark:text-slate-400">{t("responder.shift.startedAt")}</Text>
            <Text className="font-semibold text-slate-900 dark:text-slate-100">
              {new Date(shift.startTime).toLocaleTimeString()}
            </Text>
          </View>

          <View className="mt-2 flex-row items-center gap-1.5">
            <View
              className={`h-2 w-2 rounded-full ${
                locationSharing.status === "watching" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <Text className="flex-1 text-xs text-slate-500 dark:text-slate-400">
              {locationSharing.status === "watching"
                ? t("responder.shift.locationWatching")
                : locationSharing.status === "denied"
                  ? t("responder.shift.locationDenied")
                  : t("responder.shift.locationError")}
            </Text>
          </View>
        </Card>

        <View className="mt-4">
          <CrewList unitId={shift.unitId} />
        </View>

        <View className="mt-6 gap-2">
          <Button
            label={t("responder.shift.leaveShift")}
            variant="secondary"
            loading={leaveShift.isPending}
            onPress={async () => {
              const confirmed = await confirmAsync(t("responder.shift.leaveConfirm"), undefined, {
                confirmLabel: t("common.confirm"),
                cancelLabel: t("common.cancel"),
              });
              if (confirmed) leaveShift.mutate();
            }}
          />
          {shift.roleInShift === "LEAD" ? (
            <Button
              label={t("responder.shift.endShift")}
              variant="danger"
              loading={endShift.isPending}
              onPress={async () => {
                const confirmed = await confirmAsync(t("responder.shift.endConfirm"), undefined, {
                  confirmLabel: t("common.confirm"),
                  cancelLabel: t("common.cancel"),
                  destructive: true,
                });
                if (confirmed) endShift.mutate();
              }}
            />
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View className="mb-6 mt-3">
        <Text className="text-[22px] font-bold text-slate-900 dark:text-slate-100">
          {t("responder.shift.notOnShift")}
        </Text>
        <Text className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
          {t("responder.shift.notOnShiftBody")}
        </Text>
      </View>

      <View className="mb-6 gap-2">
        <Text className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
          {t("responder.shift.selectUnit")}
        </Text>
        {availableUnits.map((unit) => {
          const selected = selectedUnitId === unit.id;
          return (
            <Pressable
              key={unit.id}
              onPress={() => setSelectedUnitId(unit.id)}
              className={`rounded-xl border-[1.5px] p-3 ${
                selected
                  ? "border-blue-600 bg-slate-100 dark:bg-slate-800"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <Text className="font-semibold text-slate-900 dark:text-slate-100">
                {unit.plateNumber ?? `#${unit.id}`} · {t(`enums.unitType.${unit.unitType}`)}
              </Text>
              {unit.currentLeadName ? (
                <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t("enums.roleInShift.LEAD")}: {unit.currentLeadName}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View className="gap-2">
        <Button
          label={t("responder.shift.startShift")}
          disabled={!selectedUnitId}
          loading={startShift.isPending}
          onPress={() => selectedUnitId && startShift.mutate({ unitId: selectedUnitId })}
        />
        <Button
          label={t("responder.shift.joinShift")}
          variant="secondary"
          disabled={!selectedUnitId}
          loading={joinShift.isPending}
          onPress={() => selectedUnitId && joinShift.mutate({ unitId: selectedUnitId })}
        />
      </View>
    </Screen>
  );
}
