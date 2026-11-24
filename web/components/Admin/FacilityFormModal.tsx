"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useCreateFacility } from "@/hooks/facilities/useCreateFacility";
import { useUpdateFacility } from "@/hooks/facilities/useUpdateFacility";
import { useFacilityTypeChangeImpact } from "@/hooks/facilities/useFacilityTypeChangeImpact";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Facility, FacilityType } from "@/types/facility";
import FacilityCoordinateFields from "./FacilityCoordinateFields";
import FacilityLocationPicker, { type GeoPoint } from "./FacilityLocationPicker";
import FacilityTypeChangeNotice from "./FacilityTypeChangeNotice";

const FACILITY_TYPES: FacilityType[] = ["HOSPITAL", "AMBULANCE_STATION", "FIRE_STATION", "POLICE_STATION"];

const FIELD = "px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm";

export default function FacilityFormModal({ facility, onClose }: { facility: Facility | null; onClose: () => void }) {
  const t = useTranslations("admin.facilities.form");
  const tEnums = useTranslations("enums");
  const locale = useLocale();
  const isEditing = facility !== null;
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const mutation = isEditing ? updateFacility : createFacility;

  const savedLocation: GeoPoint | null = facility ? { latitude: facility.latitude, longitude: facility.longitude } : null;

  // Nothing here reaches the server until the form is submitted; closing the modal discards every change.
  const [name, setName] = useState(facility?.name ?? "");
  const [address, setAddress] = useState(facility?.address ?? "");
  const [facilityType, setFacilityType] = useState<FacilityType>(facility?.facilityType ?? "HOSPITAL");
  const [location, setLocation] = useState<GeoPoint | null>(savedLocation);
  const [confirmingConversion, setConfirmingConversion] = useState(false);
  const [coordinatesValid, setCoordinatesValid] = useState(true);
  // Bumped by "reset", to remount the coordinate fields so any half-typed or invalid text is dropped too.
  const [resetCount, setResetCount] = useState(0);

  const typeChanged = isEditing && facilityType !== facility.facilityType;
  const impactQuery = useFacilityTypeChangeImpact(typeChanged ? facility.id : null, typeChanged ? facilityType : null);
  const impact = typeChanged ? impactQuery.data : undefined;
  const unitConversions = impact?.unitConversions ?? [];
  const typeChangeBlocked = typeChanged && (impactQuery.isLoading || impact?.canProceed === false);

  const conversionSummary = new Intl.ListFormat(locale, { type: "conjunction" }).format(
    unitConversions.map(({ count, from, to }) => t("conversionLine", { count, from: tEnums(`unitType.${from}`), to: tEnums(`unitType.${to}`) })),
  );

  const isDirty =
    !isEditing ||
    name !== facility.name ||
    address !== (facility.address ?? "") ||
    typeChanged ||
    location?.latitude !== facility.latitude ||
    location?.longitude !== facility.longitude;

  function save(convertUnits: boolean) {
    if (!location) return;

    const payload = {
      name: name.trim(),
      address: address.trim() || null,
      latitude: location.latitude,
      longitude: location.longitude,
      facilityType,
    };
    if (isEditing) updateFacility.mutate({ facilityId: facility.id, payload: { ...payload, convertUnits } }, { onSuccess: onClose });
    else createFacility.mutate(payload, { onSuccess: onClose });
  }

  /** Back to exactly what is on file: every field, the type, and the pin. */
  function handleReset() {
    if (!facility) return;
    setName(facility.name);
    setAddress(facility.address ?? "");
    setFacilityType(facility.facilityType);
    setLocation(savedLocation);
    setResetCount((count) => count + 1);
    setConfirmingConversion(false);
    mutation.reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Relabelling units is not something to do on a plain "Save": ask first.
    if (unitConversions.length > 0) setConfirmingConversion(true);
    else save(false);
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{isEditing ? t("editTitle") : t("addTitle")}</h3>
          <button type="button" onClick={onClose} aria-label={t("close")} className="p-1.5 rounded-md cursor-pointer text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("type")}</span>
            <select value={facilityType} onChange={(e) => setFacilityType(e.target.value as FacilityType)} className={`${FIELD} cursor-pointer`}>
              {FACILITY_TYPES.map((type) => (
                <option key={type} value={type}>{tEnums(`facilityType.${type}`)}</option>
              ))}
            </select>
            {typeChanged && <FacilityTypeChangeNotice impact={impact} isLoading={impactQuery.isLoading} conversionSummary={conversionSummary} />}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("name")}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={FIELD} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("address")}</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={FIELD} />
            {!isEditing && <span className="text-xs text-slate-500 dark:text-slate-400">{t("addressHint")}</span>}
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("location")}</span>
            <FacilityLocationPicker value={location} savedLocation={savedLocation} facilityType={facilityType} onChange={setLocation} />
            <FacilityCoordinateFields key={resetCount} value={location} onChange={setLocation} onValidityChange={setCoordinatesValid} />
            <span className="text-xs text-slate-500 dark:text-slate-400">{t("mapHint")}</span>
          </div>

          {mutation.isError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {mutation.error instanceof Error ? mutation.error.message : t("saveError")}
            </p>
          )}

          <div className="flex gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleReset}
                disabled={mutation.isPending || (!isDirty && coordinatesValid)}
                className="px-4 py-2.5 cursor-pointer border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("resetAll")}
              </button>
            )}
            <button
              type="submit"
              disabled={mutation.isPending || !location || !coordinatesValid || !isDirty || typeChangeBlocked}
              className="flex-1 py-2.5 cursor-pointer bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? t("saving") : isEditing ? t("save") : t("create")}
            </button>
          </div>
        </form>
      </div>

      {confirmingConversion && (
        <ConfirmDialog
          title={t("confirmConvert.title")}
          description={t("confirmConvert.description", { summary: conversionSummary })}
          confirmLabel={t("confirmConvert.action")}
          onConfirm={() => {
            setConfirmingConversion(false);
            save(true);
          }}
          onCancel={() => setConfirmingConversion(false)}
        />
      )}
    </div>
  );
}
