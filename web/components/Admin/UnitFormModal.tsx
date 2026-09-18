"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useCreateUnit } from "@/hooks/units/useCreateUnit";
import { useUpdateUnit } from "@/hooks/units/useUpdateUnit";
import SearchableSelect from "@/components/ui/SearchableSelect";
import type { Facility, FacilityType } from "@/types/facility";
import type { ResponseUnit, UnitType } from "@/types/unit";


export default function UnitFormModal({ unit, facilities, onClose }: { unit: ResponseUnit | null; facilities: Facility[]; onClose: () => void }) {
  const isEditing = unit !== null;
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const mutation = isEditing ? updateUnit : createUnit;

  const [form, setForm] = useState({
    plateNumber: unit?.plateNumber ?? "",
    unitType: (unit?.unitType ?? "AMBULANCE") as UnitType,
    facilityId: unit?.facilityId ?? null,
  });
  const isFirstResponder = form.unitType === "FIRST_RESPONDER";

  const UNIT_TYPE_FACILITY_TYPES: Record<Exclude<UnitType, "FIRST_RESPONDER">, FacilityType[]> = {
    AMBULANCE: ["AMBULANCE_STATION", "HOSPITAL"], // the one deliberate exception
    FIRE_TRUCK: ["FIRE_STATION"],
    POLICE_CAR: ["POLICE_STATION"],
  };

  const allowedFacilityTypes = form.unitType !== "FIRST_RESPONDER" ? UNIT_TYPE_FACILITY_TYPES[form.unitType] : [];
  const filteredFacilities = facilities.filter((f) => allowedFacilityTypes.includes(f.facilityType));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { plateNumber: isFirstResponder ? "" : form.plateNumber, unitType: form.unitType, facilityId: isFirstResponder ? null : form.facilityId };
    if (isEditing) updateUnit.mutate({ unitId: unit.id, payload }, { onSuccess: onClose });
    else createUnit.mutate(payload, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{isEditing ? "Edit Unit" : "Add Unit"}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</span>
            <select value={form.unitType} onChange={(e) => setForm((f) => ({ ...f, unitType: e.target.value as UnitType }))} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm">
              <option value="AMBULANCE">Ambulance</option>
              <option value="FIRE_TRUCK">Fire Truck</option>
              <option value="POLICE_CAR">Police Car</option>
              <option value="FIRST_RESPONDER">First Responder</option>
            </select>
          </label>

          {!isFirstResponder && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Plate number</span>
                <input value={form.plateNumber} onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))} required className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Home station</span>
                <SearchableSelect
                  options={filteredFacilities.map((f) => ({ value: f.id, label: f.name, hint: f.facilityType.replace("_", " ") }))}
                  value={form.facilityId}
                  onChange={(v) => setForm((f) => ({ ...f, facilityId: v }))}
                  placeholder="Search stations…"
                />
              </label>
            </>
          )}

          {mutation.isError && <p className="text-sm text-red-600 dark:text-red-400">{mutation.error instanceof Error ? mutation.error.message : "Couldn't save unit."}</p>}
          <button type="submit" disabled={mutation.isPending} className="py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
            {mutation.isPending ? "Saving\u2026" : isEditing ? "Save changes" : "Create unit"}
          </button>
        </form>
      </div>
    </div>
  );
}