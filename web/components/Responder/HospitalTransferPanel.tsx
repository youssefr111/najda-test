"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useHospitalTransferForMission } from "@/hooks/hospitals/useHospitalTransferForMission";
import { useRecommendedHospitals } from "@/hooks/hospitals/useRecommendedHospitals";
import { useFacilities } from "@/hooks/facilities/useFacilities";
import { useSelectHospital } from "@/hooks/hospitals/useSelectHospital";
import { useMarkTransferEnRoute, useMarkTransferArrived, useSubmitVitals } from "@/hooks/hospitals/useTransferActions";
import { useAvailableUnits } from "@/hooks/units/useAvailableUnits";
import { useIncident } from "@/hooks/incidents/useIncident";
import { haversineKm } from "@/lib/dispatch/haversine";
import HospitalSelectionMap from "./HospitalSelectionMap";
import MissionRouteMap from "./MissionRouteMap";
import VitalsPanel from "@/components/Hospital/VitalsPanel";
import type { ConsciousnessLevel } from "@/types/vitals";
import type { Mission } from "@/types/mission";

export default function HospitalTransferPanel({ mission }: { mission: Mission }) {
  const t = useTranslations("hospitalTransferPanel");
  const tCommon = useTranslations("common");
  const tHospital = useTranslations("hospitalLabels");
  const tTransferStatus = useTranslations("enums.transferStatus");
  const tConsciousness = useTranslations("enums.consciousnessLevel");

  const { data: transfer, isLoading } = useHospitalTransferForMission(mission.id);
  const { data: candidates } = useRecommendedHospitals(mission.id);
  const { data: allHospitals } = useFacilities("HOSPITAL");
  const { data: units } = useAvailableUnits();
  // The incident's own location, independent of transfer -- transfer is
  // null before selection happens, but the map needs to show incident
  // location BEFORE that. Sourcing it from transfer.incidentLatitude
  // (only populated once a transfer exists) was the actual bug here.
  const { data: incident } = useIncident(mission.incidentId);
  const selectHospital = useSelectHospital();
  const markEnRoute = useMarkTransferEnRoute();
  const markArrived = useMarkTransferArrived();
  const submitVitals = useSubmitVitals();

  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [freetext, setFreetext] = useState("");
  const [showFreetext, setShowFreetext] = useState(false);
  const [vitals, setVitals] = useState({
    heartRate: "", bloodPressureSystolic: "", bloodPressureDiastolic: "",
    spo2: "", respiratoryRate: "", temperatureCelsius: "",
    consciousnessLevel: "ALERT" as ConsciousnessLevel, notes: "",
  });

  const unit = units?.find((u) => u.id === mission.unitId);
  const incidentLat = incident?.latitude;
  const incidentLon = incident?.longitude;

  const sortedHospitals = useMemo(() => {
    const recommendedMap = new Map((candidates ?? []).map((c) => [c.id, c]));
    return (allHospitals ?? [])
      .map((h) => {
        const candidate = recommendedMap.get(h.id);
        const distanceKm = candidate?.distanceKm ?? (incidentLat != null && incidentLon != null ? haversineKm(incidentLat, incidentLon, h.latitude, h.longitude) : null);
        return { ...h, distanceKm, recommended: candidate?.recommended ?? false, isOwnFacility: unit?.facilityId === h.id };
      })
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [allHospitals, candidates, incidentLat, incidentLon, unit?.facilityId]);

  const filteredHospitals = query.trim()
    ? sortedHospitals.filter((h) => h.name.toLowerCase().includes(query.toLowerCase()))
    : sortedHospitals;

  const pendingHospital = sortedHospitals.find((h) => h.id === pendingId) ?? null;

  if (isLoading) return <p className="text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>;

  function handleSubmitVitals(e: React.FormEvent) {
    e.preventDefault();
    if (!transfer) return;
    submitVitals.mutate({
      hospitalTransferId: transfer.id,
      heartRate: vitals.heartRate ? Number(vitals.heartRate) : undefined,
      bloodPressureSystolic: vitals.bloodPressureSystolic ? Number(vitals.bloodPressureSystolic) : undefined,
      bloodPressureDiastolic: vitals.bloodPressureDiastolic ? Number(vitals.bloodPressureDiastolic) : undefined,
      spo2: vitals.spo2 ? Number(vitals.spo2) : undefined,
      respiratoryRate: vitals.respiratoryRate ? Number(vitals.respiratoryRate) : undefined,
      temperatureCelsius: vitals.temperatureCelsius ? Number(vitals.temperatureCelsius) : undefined,
      consciousnessLevel: vitals.consciousnessLevel,
      notes: vitals.notes || undefined,
    });
  }

  if (!transfer) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("selectDestination")}</p>

        {incidentLat != null && incidentLon != null && (
          <HospitalSelectionMap
            incidentLatitude={incidentLat}
            incidentLongitude={incidentLon}
            hospitals={sortedHospitals.map((h) => ({ id: h.id, name: h.name, latitude: h.latitude, longitude: h.longitude, recommended: h.recommended, isOwnFacility: h.isOwnFacility }))}
            hoveredId={hoveredId}
            selectedId={pendingId}
            onHover={setHoveredId}
            onSelect={setPendingId}
          />
        )}

        {pendingHospital && (
          <div className="flex items-center justify-between gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md">
            <span className="text-sm text-blue-900 dark:text-blue-200">{pendingHospital.name}</span>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => selectHospital.mutate({ missionId: mission.id, hospitalId: pendingHospital.id })}
                disabled={selectHospital.isPending}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md disabled:opacity-50"
              >
                {selectHospital.isPending ? "…" : t("confirmSelection")}
              </button>
              <button type="button" onClick={() => setPendingId(null)} className="text-xs text-slate-500 dark:text-slate-400">{tCommon("cancel")}</button>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-8 pr-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          {filteredHospitals.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 p-2">{t("noHospitalsMatch")}</p>
          ) : (
            filteredHospitals.map((h) => (
              <button
                key={h.id}
                type="button"
                onMouseEnter={() => setHoveredId(h.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setPendingId(h.id)}
                className={`flex items-center justify-between gap-2 p-2.5 border rounded-md text-left transition-colors ${
                  pendingId === h.id
                    ? "border-blue-400 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30"
                    : hoveredId === h.id
                    ? "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <span className="text-sm text-slate-900 dark:text-slate-100">
                  {h.name}
                  {h.recommended && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {tHospital("recommended")}
                    </span>
                  )}
                  {h.isOwnFacility && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                      {tHospital("yourBase")}
                    </span>
                  )}
                </span>
                {h.distanceKm != null && <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{h.distanceKm.toFixed(1)} km</span>}
              </button>
            ))
          )}
        </div>

        {showFreetext ? (
          <div className="flex gap-2">
            <input
              value={freetext}
              onChange={(e) => setFreetext(e.target.value)}
              placeholder={t("hospitalNamePlaceholder")}
              className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              disabled={!freetext.trim() || selectHospital.isPending}
              onClick={() => selectHospital.mutate({ missionId: mission.id, destinationNameFreetext: freetext.trim() })}
              className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md disabled:opacity-50"
            >
              {tCommon("confirm")}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowFreetext(true)} className="text-xs text-blue-600 dark:text-blue-400 self-start">
            {t("stillNotThere")}
          </button>
        )}

        {selectHospital.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {selectHospital.error instanceof Error ? selectHospital.error.message : t("selectError")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{transfer.hospitalName ?? transfer.destinationNameFreetext}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{tTransferStatus(transfer.status)}</p>
        </div>
        {transfer.status === "SELECTED" && (
          <button type="button" onClick={() => markEnRoute.mutate(transfer.id)} disabled={markEnRoute.isPending} className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-md disabled:opacity-50">
            {markEnRoute.isPending ? "…" : t("markEnRoute")}
          </button>
        )}
        {transfer.status === "EN_ROUTE" && (
          <button type="button" onClick={() => markArrived.mutate(transfer.id)} disabled={markArrived.isPending} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md disabled:opacity-50">
            {markArrived.isPending ? "…" : t("markArrived")}
          </button>
        )}
      </div>

      {transfer.hospitalId && transfer.status !== "ARRIVED" && (
        <MissionRouteMap
          unitType={mission.unitType}
          unitLatitude={unit?.latitude ?? null} unitLongitude={unit?.longitude ?? null}
          facilityLatitude={unit?.facilityLatitude ?? null} facilityLongitude={unit?.facilityLongitude ?? null}
          destinationLatitude={sortedHospitals.find((h) => h.id === transfer.hospitalId)?.latitude ?? incidentLat ?? 0}
          destinationLongitude={sortedHospitals.find((h) => h.id === transfer.hospitalId)?.longitude ?? incidentLon ?? 0}
        />
      )}

      {transfer.status === "EN_ROUTE" && (
        <>
          <form onSubmit={handleSubmitVitals} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <VitalInput label={t("heartRate")} value={vitals.heartRate} onChange={(v) => setVitals((s) => ({ ...s, heartRate: v }))} />
            <VitalInput label={t("bpSystolic")} value={vitals.bloodPressureSystolic} onChange={(v) => setVitals((s) => ({ ...s, bloodPressureSystolic: v }))} />
            <VitalInput label={t("bpDiastolic")} value={vitals.bloodPressureDiastolic} onChange={(v) => setVitals((s) => ({ ...s, bloodPressureDiastolic: v }))} />
            <VitalInput label={t("spo2")} value={vitals.spo2} onChange={(v) => setVitals((s) => ({ ...s, spo2: v }))} />
            <VitalInput label={t("respRate")} value={vitals.respiratoryRate} onChange={(v) => setVitals((s) => ({ ...s, respiratoryRate: v }))} />
            <VitalInput label={t("temp")} value={vitals.temperatureCelsius} onChange={(v) => setVitals((s) => ({ ...s, temperatureCelsius: v }))} />
            <label className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t("consciousness")}</span>
              <select value={vitals.consciousnessLevel} onChange={(e) => setVitals((s) => ({ ...s, consciousnessLevel: e.target.value as ConsciousnessLevel }))} className="px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100">
                <option value="ALERT">{tConsciousness("ALERT")}</option>
                <option value="VERBAL">{tConsciousness("VERBAL")}</option>
                <option value="PAIN">{tConsciousness("PAIN")}</option>
                <option value="UNRESPONSIVE">{tConsciousness("UNRESPONSIVE")}</option>
              </select>
            </label>
            <input value={vitals.notes} onChange={(e) => setVitals((s) => ({ ...s, notes: e.target.value }))} placeholder={t("notesPlaceholder")} className="col-span-2 sm:col-span-3 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100" />
            <button type="submit" disabled={submitVitals.isPending} className="col-span-2 sm:col-span-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md disabled:opacity-50">
              {submitVitals.isPending ? t("sendingVitals") : t("sendVitals")}
            </button>
            {submitVitals.isError && (
              <p className="col-span-2 sm:col-span-3 text-xs text-red-600 dark:text-red-400">
                {submitVitals.error instanceof Error ? submitVitals.error.message : t("vitalsError")}
              </p>
            )}
          </form>
          <VitalsPanel hospitalTransferId={transfer.id} />
        </>
      )}

      {transfer.status === "ARRIVED" && <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("transferComplete")}</p>}
    </div>
  );
}

function VitalInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100" />
    </label>
  );
}