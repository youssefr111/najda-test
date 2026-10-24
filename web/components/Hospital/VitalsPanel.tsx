"use client";

import { useTranslations } from "next-intl";
import { useVitalsHistory } from "@/hooks/hospitals/useVitalsHistory";

export default function VitalsPanel({ hospitalTransferId }: { hospitalTransferId: number }) {
  const t = useTranslations("vitalsPanel");
  const tConsciousness = useTranslations("enums.consciousnessLevel");
  const { data: updates, isLoading } = useVitalsHistory(hospitalTransferId);

  if (isLoading) return <p className="text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>;
  if (!updates || updates.length === 0) return <p className="text-sm text-slate-500 dark:text-slate-400">{t("noVitals")}</p>;

  const latest = updates[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
          {t("latestVitals", { time: new Date(latest.recordedAt).toLocaleTimeString() })}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <VitalStat label={t("heartRate")} value={latest.heartRate} unit="bpm" />
          <VitalStat label={t("bloodPressure")} value={latest.bloodPressureSystolic && latest.bloodPressureDiastolic ? `${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic}` : null} unit="mmHg" />
          <VitalStat label={t("spo2")} value={latest.spo2} unit="%" />
          <VitalStat label={t("respiratoryRate")} value={latest.respiratoryRate} unit="/min" />
          <VitalStat label={t("temperature")} value={latest.temperatureCelsius} unit="°C" />
          <VitalStat label={t("consciousness")} value={latest.consciousnessLevel ? tConsciousness(latest.consciousnessLevel) : null} />
        </div>
        {latest.notes && (
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">{latest.notes}</p>
        )}
      </div>

      {updates.length > 1 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t("history")}</p>
          <div className="flex flex-col gap-2">
            {updates.slice(1).map((u) => (
              <div key={u.id} className="text-xs text-slate-500 dark:text-slate-400 p-2 border-b border-slate-100 dark:border-slate-800/60">
                {t("historyRow", { time: new Date(u.recordedAt).toLocaleTimeString(), hr: u.heartRate ?? "—", spo2: u.spo2 ?? "—" })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VitalStat({ label, value, unit }: { label: string; value: string | number | null; unit?: string }) {
  return (
    <div className="p-3 rounded-md border border-slate-200 dark:border-slate-700">
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {value ?? "—"} {value != null && unit && <span className="text-xs font-normal text-slate-400">{unit}</span>}
      </p>
    </div>
  );
}