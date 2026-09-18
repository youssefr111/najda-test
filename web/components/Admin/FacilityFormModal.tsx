"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useCreateFacility } from "@/hooks/facilities/useCreateFacility";
import { useUpdateFacility } from "@/hooks/facilities/useUpdateFacility";
import type { Facility, FacilityType } from "@/types/facility";

export default function FacilityFormModal({ facility, onClose }: { facility: Facility | null; onClose: () => void }) {
  const isEditing = facility !== null;
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const mutation = isEditing ? updateFacility : createFacility;

  const [form, setForm] = useState({
    name: facility?.name ?? "",
    address: facility?.address ?? "",
    latitude: facility?.latitude?.toString() ?? "",
    longitude: facility?.longitude?.toString() ?? "",
    facilityType: facility?.facilityType ?? ("HOSPITAL" as FacilityType),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      address: form.address || null,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      facilityType: form.facilityType,
    };
    if (isEditing) updateFacility.mutate({ facilityId: facility.id, payload }, { onSuccess: onClose });
    else createFacility.mutate(payload, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{isEditing ? "Edit Facility" : "Add Facility"}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</span>
            <select
              value={form.facilityType}
              onChange={(e) => setForm((f) => ({ ...f, facilityType: e.target.value as FacilityType }))}
              disabled={isEditing}
              title={isEditing ? "Not changeable once staff/units may already be linked" : undefined}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm disabled:opacity-50"
            >
              <option value="HOSPITAL">Hospital</option>
              <option value="AMBULANCE_STATION">Ambulance Station</option>
              <option value="FIRE_STATION">Fire Station</option>
              <option value="POLICE_STATION">Police Station</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Address (optional)</span>
            <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Latitude</span>
              <input type="number" value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} required className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Longitude</span>
              <input type="number" value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} required className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm" />
            </label>
          </div>
          {mutation.isError && <p className="text-sm text-red-600 dark:text-red-400">{mutation.error instanceof Error ? mutation.error.message : "Couldn't save facility."}</p>}
          <button type="submit" disabled={mutation.isPending} className="py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
            {mutation.isPending ? "Saving\u2026" : isEditing ? "Save changes" : "Create facility"}
          </button>
        </form>
      </div>
    </div>
  );
}