"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2 } from "lucide-react";
import { useCreateEmployee } from "@/hooks/users/useCreateEmployee";
import { useFacilities } from "@/hooks/facilities/useFacilities";
import useAuth from "@/hooks/auth/useAuth";
import { ROLE_CONFIG } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/roles";
import { ROLE_FACILITY_TYPES, allowsFacility, requiresFacility } from "@/lib/facility/policy";
import GeneratedLinkBox from "./GeneratedLinkBox";
import type { Gender } from "@/types/user";

const CITIZEN_ROLE: UserRole = "CITIZEN";

export default function CreateEmployeeModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("createEmployee");
  const tRole = useTranslations("enums.role");
  const tGender = useTranslations("enums.gender");
  const { user: viewer } = useAuth();
  const createEmployee = useCreateEmployee();
  const roles = Object.keys(ROLE_CONFIG) as Array<keyof typeof ROLE_CONFIG>;

  const assignableRoles = roles.filter((role) => {
    if (role === CITIZEN_ROLE) return false;
    if (role === "SUPER_ADMIN" && viewer?.roleName !== "SUPER_ADMIN") return false;
    return true;
  });

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    gender: "MALE" as Gender,
    roleName: assignableRoles[0],
    facilityId: null as number | null,
  });

  const facilityTypes = allowsFacility(form.roleName) ? ROLE_FACILITY_TYPES[form.roleName] : undefined;
  const { data: facilityOptions } = useFacilities(facilityTypes);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createEmployee.mutate({ ...form, facilityId: facilityTypes ? form.facilityId : null });
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {createEmployee.isSuccess ? (
          <div className="p-5 flex flex-col gap-3">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {t("accountCreated", { name: `${createEmployee.data.user.firstName} ${createEmployee.data.user.lastName}` })}
            </p>
            <GeneratedLinkBox link={createEmployee.data.passwordResetLink} />
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("notEmailed")}</p>
            <button type="button" onClick={onClose} className="mt-2 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
              {t("done")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label={t("firstName")} value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} required />
              <Input label={t("lastName")} value={form.lastName} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} required />
            </div>
            <Input label={t("email")} type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} required />
            <Input label={t("phone")} type="tel" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} required />
            <Input label={t("address")} value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} required />

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{tGender("label")}</span>
              <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Gender }))} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm">
                <option value="MALE">{tGender("MALE")}</option>
                <option value="FEMALE">{tGender("FEMALE")}</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{tRole("label")}</span>
              <select
                value={form.roleName}
                onChange={(e) => setForm((f) => ({ ...f, roleName: e.target.value as UserRole, facilityId: null }))}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm"
              >
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>{tRole(role)}</option>
                ))}
              </select>
            </label>

            {facilityTypes && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("facilityLabel", { type: facilityTypes.map((ft) => ft.replace("_", " ")).join(" / ") })}
                  {!requiresFacility(form.roleName) && t("optional")}
                </span>
                <select
                  value={form.facilityId ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, facilityId: e.target.value ? Number(e.target.value) : null }))}
                  required={requiresFacility(form.roleName)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm"
                >
                  <option value="">{requiresFacility(form.roleName) ? t("selectFacility") : t("unassigned")}</option>
                  {facilityOptions?.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.facilityType.replace("_", " ")}){!f.registered && t("unregistered")}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {createEmployee.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {createEmployee.error instanceof Error ? createEmployee.error.message : t("createError")}
              </p>
            )}

            <button type="submit" disabled={createEmployee.isPending} className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
              {createEmployee.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {createEmployee.isPending ? t("creating") : t("createAccount")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </label>
  );
}