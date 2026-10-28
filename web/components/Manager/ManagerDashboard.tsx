"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Ambulance, Building2, Loader2, Plus, Users, X } from "lucide-react";
import GeneratedLinkBox from "@/components/Admin/GeneratedLinkBox";
import PhoneField, { isValidEgyptianMobile, toE164EgyptianPhone } from "@/components/Auth/PhoneField";
import AddressFields from "@/components/Shared/AddressFields";
import { FIELD_CLASS, LABEL_CLASS } from "@/components/Account/styles";
import {
  useCreateManagerStaff,
  useDeleteManagerUnit,
  useManagerMe,
  useManagerStaff,
  useManagerUnits,
  useSaveManagerUnit,
  useSetStaffEnabled,
  useUnitDeleteImpact,
  type ManagerMe,
} from "@/hooks/manager/useManager";
import { EMPTY_ADDRESS, isAddressValid, toAddressPayload, type AddressValue } from "@/lib/address/address";
import { resolveAuthError } from "@/lib/auth/errors";
import type { ResponseUnit } from "@/types/unit";
import type { Gender, User } from "@/types/user";

type Tab = "units" | "staff";

/**
 * A facility manager's workspace: the units and the staff of the ONE facility they run. What they may create is
 * fixed by the facility (a fire station runs fire trucks and employs firefighters...), and the server enforces it;
 * this screen only shows it.
 */
export default function ManagerDashboard() {
  const t = useTranslations("manager");
  const tFacility = useTranslations("enums.facilityType");
  const { data: me, isLoading, isError } = useManagerMe();
  const [tab, setTab] = useState<Tab>("units");

  if (isLoading) return <p className="p-8 text-sm text-slate-500">{t("loading")}</p>;
  if (isError || !me) return <p className="p-8 text-sm text-red-600">{t("noFacility")}</p>;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">{me.facilityName}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {tFacility(me.facilityType)} · {t("subtitle")}
          </p>
        </div>
        {me.facilityType === "HOSPITAL" && (
          <Link
            href="/hospital"
            className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Building2 className="h-4 w-4" /> {t("openTransfers")}
          </Link>
        )}
      </header>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800" role="tablist">
        <TabButton active={tab === "units"} onClick={() => setTab("units")} icon={<Ambulance className="h-4 w-4" />}>
          {t("units")}
        </TabButton>
        <TabButton active={tab === "staff"} onClick={() => setTab("staff")} icon={<Users className="h-4 w-4" />}>
          {t("staff")}
        </TabButton>
      </div>

      {tab === "units" ? <UnitsPanel me={me} /> : <StaffPanel me={me} />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px flex cursor-pointer items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-blue-600 text-blue-600 dark:text-blue-400"
          : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg sm:rounded-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ units ---

function UnitsPanel({ me }: { me: ManagerMe }) {
  const t = useTranslations("manager");
  const tUnitType = useTranslations("enums.unitType");
  const tStatus = useTranslations("enums.unitStatus");
  const { data: units, isLoading } = useManagerUnits();
  const [editing, setEditing] = useState<ResponseUnit | "new" | null>(null);
  const [deleting, setDeleting] = useState<ResponseUnit | null>(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("unitsHint", { type: tUnitType(me.unitType) })}</p>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> {t("addUnit")}
        </button>
      </div>

      {isLoading ? (
        <p className="p-6 text-sm text-slate-500">{t("loading")}</p>
      ) : !units || units.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">{t("noUnits")}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {units.map((unit) => (
            <li key={unit.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{unit.plateNumber}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tUnitType(unit.unitType)} · {tStatus(unit.status)}
                  {unit.currentLeadName ? ` · ${unit.currentLeadName}` : ""}
                </p>
              </div>
              <div className="flex gap-3 text-xs font-medium">
                <button type="button" onClick={() => setEditing(unit)} className="cursor-pointer text-blue-600 hover:underline dark:text-blue-400">
                  {t("edit")}
                </button>
                <button type="button" onClick={() => setDeleting(unit)} className="cursor-pointer text-red-600 hover:underline dark:text-red-400">
                  {t("delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <PlateModal unit={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteUnitModal unit={deleting} onClose={() => setDeleting(null)} />}
    </section>
  );
}

function PlateModal({ unit, onClose }: { unit: ResponseUnit | null; onClose: () => void }) {
  const t = useTranslations("manager");
  const tErrors = useTranslations("auth.errors");
  const save = useSaveManagerUnit();
  const [plate, setPlate] = useState(unit?.plateNumber ?? "");

  return (
    <Modal title={unit ? t("editUnit") : t("addUnit")} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({ unitId: unit?.id ?? null, plateNumber: plate.trim() }, { onSuccess: onClose });
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>{t("plate")}</span>
          <input value={plate} onChange={(e) => setPlate(e.target.value)} required maxLength={30} className={FIELD_CLASS} autoFocus />
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("plateHint")}</p>
        {save.isError && <p role="alert" className="text-sm text-red-600">{resolveAuthError(save.error, tErrors)}</p>}
        <button
          type="submit"
          disabled={!plate.trim() || save.isPending}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t("save")}
        </button>
      </form>
    </Modal>
  );
}

/** Deleting is allowed even for a unit with history -- after a clear warning, and without erasing that history. */
function DeleteUnitModal({ unit, onClose }: { unit: ResponseUnit; onClose: () => void }) {
  const t = useTranslations("manager");
  const tErrors = useTranslations("auth.errors");
  const { data: impact, isLoading } = useUnitDeleteImpact(unit.id);
  const remove = useDeleteManagerUnit();

  return (
    <Modal title={t("deleteUnitTitle", { plate: unit.plateNumber ?? "" })} onClose={onClose}>
      {isLoading || !impact ? (
        <p className="text-sm text-slate-500">{t("loading")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {impact.blocked ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
              {impact.activeMissionCount > 0 ? t("blockedMission") : t("blockedShift")}
            </p>
          ) : impact.outcome === "ARCHIVE" ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {t("archiveWarning", { count: impact.missionCount })}
            </p>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">{t("deleteSimple")}</p>
          )}

          {remove.isError && <p role="alert" className="text-sm text-red-600">{resolveAuthError(remove.error, tErrors)}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 cursor-pointer rounded-md border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={impact.blocked || remove.isPending}
              onClick={() => remove.mutate(unit.id, { onSuccess: onClose })}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {impact.outcome === "ARCHIVE" ? t("confirmArchive") : t("confirmDelete")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ staff ---

function StaffPanel({ me }: { me: ManagerMe }) {
  const t = useTranslations("manager");
  const tRole = useTranslations("enums.role");
  const { data: staff, isLoading } = useManagerStaff();
  const setEnabled = useSetStaffEnabled();
  const [creating, setCreating] = useState(false);

  return (
    <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("staffHint", { roles: me.staffRoles.map((role) => tRole(role)).join(", ") })}
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> {t("addStaff")}
        </button>
      </div>

      {isLoading ? (
        <p className="p-6 text-sm text-slate-500">{t("loading")}</p>
      ) : !staff || staff.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">{t("noStaff")}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {staff.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {person.firstName} {person.lastName}
                  {!person.enabled && (
                    <span className="ms-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800">{t("disabled")}</span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tRole(person.roleName)} · {person.email}
                </p>
              </div>
              <button
                type="button"
                disabled={setEnabled.isPending}
                onClick={() => setEnabled.mutate({ userId: person.id, enabled: !person.enabled })}
                className={`cursor-pointer text-xs font-medium hover:underline disabled:opacity-50 ${person.enabled ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
              >
                {person.enabled ? t("disable") : t("enable")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && <StaffModal me={me} onClose={() => setCreating(false)} />}
    </section>
  );
}

function StaffModal({ me, onClose }: { me: ManagerMe; onClose: () => void }) {
  const t = useTranslations("manager");
  const tRole = useTranslations("enums.role");
  const tGender = useTranslations("enums.gender");
  const tErrors = useTranslations("auth.errors");
  const create = useCreateManagerStaff();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", gender: "MALE" as Gender, roleName: me.staffRoles[0],
  });
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);
  const [showAddressErrors, setShowAddressErrors] = useState(false);
  const [phoneInvalid, setPhoneInvalid] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEgyptianMobile(form.phone)) return setPhoneInvalid(true);
    if (!isAddressValid(address)) return setShowAddressErrors(true);
    create.mutate({
      ...form,
      email: form.email.trim(),
      phone: toE164EgyptianPhone(form.phone),
      addressDetails: toAddressPayload(address),
      roleName: form.roleName as never,
    });
  }

  const input = (label: string, key: "firstName" | "lastName" | "email", type = "text") => (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL_CLASS}>{label}</span>
      <input type={type} required value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className={FIELD_CLASS} />
    </label>
  );

  return (
    <Modal title={t("addStaff")} onClose={onClose}>
      {create.isSuccess ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {t("staffCreated", { name: `${create.data.user.firstName} ${create.data.user.lastName}` })}
          </p>
          <GeneratedLinkBox link={create.data.passwordResetLink} />
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("notEmailed")}</p>
          <button type="button" onClick={onClose} className="mt-2 cursor-pointer rounded-md bg-slate-900 py-2.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">
            {t("done")}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {input(t("firstName"), "firstName")}
            {input(t("lastName"), "lastName")}
          </div>
          {input(t("email"), "email", "email")}
          <PhoneField
            value={form.phone}
            onChange={(v) => {
              setForm((f) => ({ ...f, phone: v }));
              setPhoneInvalid(false);
            }}
            error={phoneInvalid}
          />
          <AddressFields value={address} onChange={setAddress} showErrors={showAddressErrors} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL_CLASS}>{tGender("label")}</span>
              <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Gender }))} className={`${FIELD_CLASS} cursor-pointer`}>
                <option value="MALE">{tGender("MALE")}</option>
                <option value="FEMALE">{tGender("FEMALE")}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL_CLASS}>{t("role")}</span>
              <select value={form.roleName} onChange={(e) => setForm((f) => ({ ...f, roleName: e.target.value }))} className={`${FIELD_CLASS} cursor-pointer`}>
                {me.staffRoles.map((role) => (
                  <option key={role} value={role}>{tRole(role)}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("staffFacilityHint", { facility: me.facilityName })}</p>
          {create.isError && <p role="alert" className="text-sm text-red-600">{resolveAuthError(create.error, tErrors)}</p>}
          <button
            type="submit"
            disabled={create.isPending}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t("createAccount")}
          </button>
        </form>
      )}
    </Modal>
  );
}

// `User` is imported for the staff list's row type.
export type ManagerStaffRow = User;
