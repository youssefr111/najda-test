"use client";

import KycBadge from "@/components/Kyc/KycBadge";
import { useAdminSetKyc } from "@/hooks/kyc/useKyc";
import AddressFields from "@/components/Shared/AddressFields";
import { EMPTY_ADDRESS, addressFromUser, isAddressValid, toAddressPayload, type AddressValue } from "@/lib/address/address";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X, Send, Check, ShieldAlert, Lock, Unlock } from "lucide-react";
import { useUsers } from "@/hooks/users/useUsers";
import { useAdminUsersStore } from "@/store/admin-users-store";
import { useSendPasswordReset } from "@/hooks/users/useSendPasswordReset";
import { useUpdateProfile } from "@/hooks/users/useUpdateProfile";
import { useAdminOverrideEmail } from "@/hooks/users/useAdminOverrideEmail";
import { useAdminOverridePhone } from "@/hooks/users/useAdminOverridePhone";
import { useAdminSetPhoneVerified } from "@/hooks/users/useAdminSetPhoneVerified";
import { useToggleUserEnabled } from "@/hooks/users/useToggleUserEnabled";
import { useUpdateUserRole } from "@/hooks/users/useUpdateUserRole";
import { useUpdateUserFacility } from "@/hooks/users/useUpdateUserFacility";
import { useFacilities } from "@/hooks/facilities/useFacilities";
import useAuth from "@/hooks/auth/useAuth";
import { UserRole, ROLE_CONFIG } from "@/lib/auth/roles";
import { ROLE_FACILITY_TYPES, allowsFacility } from "@/lib/facility/policy";
import type { Gender } from "@/types/user";
import GeneratedLinkBox from "./GeneratedLinkBox";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PhoneField, { isValidEgyptianMobile, toE164EgyptianPhone } from "@/components/Auth/PhoneField";

type VerificationTarget = "identity" | "phone";
type PendingAction = { kind: "verification"; target: VerificationTarget; verified: boolean } | { kind: "disable" };

// Stored in the audit log, so deliberately not localized.
const AUDIT_NOTE = { set: "Set by an administrator", reset: "Reset by an administrator" } as const;

export default function UserDetailModal() {
  const t = useTranslations("admin.users");
  const tCommon = useTranslations("common");
  const tRole = useTranslations("enums.role");
  const tAccount = useTranslations("account");
  const tEnums = useTranslations("enums");
  const locale = useLocale();
  const { data: users } = useUsers();
  const { selectedUserId, setSelectedUserId } = useAdminUsersStore();
  const { user: viewer } = useAuth();
  const roles = Object.keys(ROLE_CONFIG) as Array<keyof typeof ROLE_CONFIG>;
  const targetUser = users?.find((u) => u.id === selectedUserId);

  const facilityTypes = allowsFacility(targetUser?.roleName as UserRole) ? ROLE_FACILITY_TYPES[targetUser?.roleName as UserRole] : undefined;
  const { data: facilityOptions } = useFacilities(facilityTypes);
  const updateUserFacility = useUpdateUserFacility();

  const updateProfile = useUpdateProfile(targetUser?.id ?? -1);
  const overrideEmail = useAdminOverrideEmail();
  const overridePhone = useAdminOverridePhone();
  const setPhoneVerified = useAdminSetPhoneVerified();
  const toggleEnabled = useToggleUserEnabled();
  const sendReset = useSendPasswordReset();
  const updateRole = useUpdateUserRole();
  const setKyc = useAdminSetKyc();
  const tKyc = useTranslations("kyc");

  const [form, setForm] = useState({ firstName: "", lastName: "", gender: "MALE" as Gender });
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);
  const [showAddressErrors, setShowAddressErrors] = useState(false);
  const [emailForm, setEmailForm] = useState({ open: false, value: "" });
  const [phoneForm, setPhoneForm] = useState({ open: false, local: "", invalid: false, error: null as string | null });
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    if (targetUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        gender: targetUser.gender ?? "MALE",
      });
      setAddress(addressFromUser(targetUser));
      setEmailForm({ open: false, value: targetUser.email });
      setPhoneForm({ open: false, local: targetUser.phone ? targetUser.phone.replace("+20", "") : "", invalid: false, error: null });
    }
  }, [targetUser]);

  if (!targetUser) return null;
  const targetUserId = targetUser.id;
  const targetUserPhone = targetUser.phone;

  const targetIsSuperAdmin = targetUser.roleName === "SUPER_ADMIN";
  const viewerIsSuperAdmin = viewer?.roleName === "SUPER_ADMIN";
  const isSelf = viewer?.id === targetUserId;
  const locked = targetIsSuperAdmin && !isSelf && !viewerIsSuperAdmin;
  const userName = `${targetUser.firstName} ${targetUser.lastName}`;
  const facilityTypeList = new Intl.ListFormat(locale, { type: "disjunction" });

  function handleClose() {
    setSelectedUserId(null);
    sendReset.reset();
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!isAddressValid(address)) {
      setShowAddressErrors(true);
      return;
    }
    updateProfile.mutate({ ...form, addressDetails: toAddressPayload(address) });
  }

  function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    overrideEmail.mutate(
      { userId: targetUserId, email: emailForm.value },
      { onSuccess: () => setEmailForm((f) => ({ ...f, open: false })) }
    );
  }

  function handleSavePhone(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEgyptianMobile(phoneForm.local)) {
      setPhoneForm((f) => ({ ...f, invalid: true, error: null }));
      return;
    }

    const e164Phone = toE164EgyptianPhone(phoneForm.local);
    if (e164Phone === targetUserPhone) {
      setPhoneForm((f) => ({ ...f, invalid: true, error: t("phoneMustDiffer") }));
      return;
    }

    overridePhone.mutate(
      { userId: targetUserId, phone: e164Phone },
      { onSuccess: () => setPhoneForm((f) => ({ ...f, open: false, invalid: false, error: null })) }
    );
  }

  function getConfirmCopy(action: PendingAction) {
    if (action.kind === "disable") {
      return {
        title: t("disableConfirm.title"),
        description: t("disableConfirm.description", { name: userName }),
        confirmLabel: t("disableAccount"),
        tone: "danger" as const,
      };
    }

    const key = `verifyConfirm.${action.target}.${action.verified ? "mark" : "reset"}`;
    return {
      title: t(`${key}.title`),
      description: t(`${key}.description`, { name: userName }),
      confirmLabel: action.verified ? tKyc("adminMarkVerified") : tKyc("adminReset"),
      tone: action.verified ? ("default" as const) : ("danger" as const),
    };
  }

  function handleConfirmAction() {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);

    if (action.kind === "disable") {
      toggleEnabled.mutate({ userId: targetUserId, enabled: false });
      return;
    }

    const note = action.verified ? AUDIT_NOTE.set : AUDIT_NOTE.reset;
    if (action.target === "identity") {
      setKyc.mutate({ userId: targetUserId, status: action.verified ? "VERIFIED" : "NOT_STARTED", note });
    } else {
      setPhoneVerified.mutate({ userId: targetUserId, verified: action.verified, note });
    }
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-xl shadow-xl max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <span
              title={`User ID: ${targetUser.id}`}
              className="shrink-0 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              #{targetUser.id}
            </span>
            <span className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {targetUser.firstName} {targetUser.lastName}
            </span>
          </div>
          <button type="button" onClick={handleClose} className="p-1.5 rounded-md cursor-pointer text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {locked && (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {t("lockedNotice")}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <EditInput label={tAccount("firstName")} value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} disabled={locked} />
              <EditInput label={tAccount("lastName")} value={form.lastName} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} disabled={locked} />
            </div>
            <AddressFields value={address} onChange={setAddress} showErrors={showAddressErrors} disabled={locked} />
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{tEnums("gender.label")}</span>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Gender }))}
                disabled={locked}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm disabled:opacity-50"
              >
                <option value="MALE">{tEnums("gender.MALE")}</option>
                <option value="FEMALE">{tEnums("gender.FEMALE")}</option>
              </select>
            </label>
            <button type="submit" disabled={locked || updateProfile.isPending} className="self-end px-4 py-2 text-sm rounded-md cursor-pointer bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
              {updateProfile.isPending ? tAccount("saving") : t("saveProfileFields")}
            </button>
            {updateProfile.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {updateProfile.error instanceof Error ? updateProfile.error.message : t("saveError")}
              </p>
            )}
          </form>

          <div className="border-t border-slate-200 dark:border-slate-800" />

          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{tAccount("email")}</p>
                <p className="text-sm text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
                  {targetUser.email}
                  {targetUser.emailVerified ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <span className="text-xs text-amber-600 dark:text-amber-400">({tAccount("unverified")})</span>
                  )}
                </p>
              </div>
              {!locked && (
                <button type="button" onClick={() => setEmailForm((f) => ({ ...f, open: !f.open }))} aria-expanded={emailForm.open} className="text-xs font-medium cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
                  {t("override")}
                </button>
              )}
            </div>
            {emailForm.open && (
              <form onSubmit={handleSaveEmail} className="flex gap-2 mt-2">
                <input
                  type="email"
                  value={emailForm.value}
                  onChange={(e) => setEmailForm((f) => ({ ...f, value: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm"
                />
                <button type="submit" disabled={overrideEmail.isPending} className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md cursor-pointer hover:bg-blue-700 disabled:opacity-50">
                  {overrideEmail.isPending ? "\u2026" : tCommon("save")}
                </button>
              </form>
            )}
            {overrideEmail.isError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {overrideEmail.error instanceof Error ? overrideEmail.error.message : t("overrideEmailError")}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{tAccount("phone")}</p>
                <p className="text-sm text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
                  {targetUser.phone ?? "—"}
                  {targetUser.phoneVerified ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <span className="text-xs text-amber-600 dark:text-amber-400">({tAccount("unverified")})</span>
                  )}
                </p>
              </div>
              {!locked && viewerIsSuperAdmin && (
                <button type="button" onClick={() => setPhoneForm((f) => ({ ...f, open: !f.open }))} aria-expanded={phoneForm.open} className="text-xs font-medium cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
                  {t("override")}
                </button>
              )}
            </div>
            {!viewerIsSuperAdmin && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t("phoneSuperAdminOnly")}</p>}
            {!locked && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={setPhoneVerified.isPending || !targetUser.phone || targetUser.phoneVerified}
                  onClick={() => setPendingAction({ kind: "verification", target: "phone", verified: true })}
                  className="cursor-pointer rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                >
                  {tKyc("adminMarkVerified")}
                </button>
                <button
                  type="button"
                  disabled={setPhoneVerified.isPending || !targetUser.phoneVerified}
                  onClick={() => setPendingAction({ kind: "verification", target: "phone", verified: false })}
                  className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {tKyc("adminReset")}
                </button>
              </div>
            )}
            {setPhoneVerified.isError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {setPhoneVerified.error instanceof Error ? setPhoneVerified.error.message : t("changeVerificationError")}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t("phoneAdminHint")}</p>
            {phoneForm.open && (
              <form onSubmit={handleSavePhone} className="flex flex-col gap-2 mt-2">
                <PhoneField
                  value={phoneForm.local}
                  onChange={(v) => setPhoneForm((f) => ({ ...f, local: v, invalid: false, error: null }))}
                  error={phoneForm.invalid}
                />
                {phoneForm.error && (
                  <p className="text-xs text-red-600 dark:text-red-400">{phoneForm.error}</p>
                )}
                <button type="submit" disabled={overridePhone.isPending} className="self-end px-3 py-2 bg-blue-600 cursor-pointer text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {overridePhone.isPending ? "\u2026" : tCommon("save")}
                </button>
              </form>
            )}
            {overridePhone.isError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {overridePhone.error instanceof Error ? overridePhone.error.message : t("overridePhoneError")}
              </p>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800" />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{tKyc("title")}</span>
              <KycBadge status={targetUser.kycStatus} />
            </div>
            {!locked && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={setKyc.isPending || targetUser.kycStatus === "VERIFIED"}
                  onClick={() => setPendingAction({ kind: "verification", target: "identity", verified: true })}
                  className="cursor-pointer rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                >
                  {tKyc("adminMarkVerified")}
                </button>
                <button
                  type="button"
                  disabled={setKyc.isPending || targetUser.kycStatus === "NOT_STARTED"}
                  onClick={() => setPendingAction({ kind: "verification", target: "identity", verified: false })}
                  className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {tKyc("adminReset")}
                </button>
              </div>
            )}
            {setKyc.isError && <p className="text-xs text-red-600 dark:text-red-400">{setKyc.error instanceof Error ? setKyc.error.message : t("changeVerificationError")}</p>}
            <p className="text-xs text-slate-400 dark:text-slate-500">{tKyc("adminHint")}</p>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800" />

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{tEnums("role.label")}</span>
            <select
              value={targetUser.roleName}
              disabled={locked || updateRole.isPending}
              onChange={(e) => updateRole.mutate({ userId: targetUserId, role: e.target.value as UserRole })}
              className="px-3 py-2 cursor-pointer  bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm disabled:opacity-50"
            >
              {roles.map((role) => (
                <option key={role} value={role}>{tRole(role)}</option>
              ))}
            </select>
            {updateRole.isError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {updateRole.error instanceof Error ? updateRole.error.message : t("changeRoleError")}
              </p>
            )}
          </label>

          {facilityTypes && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t("facilityLabel", { types: facilityTypeList.format(facilityTypes.map((type) => tEnums(`facilityType.${type}`))) })}
              </span>
              <SearchableSelect
                options={(facilityOptions ?? []).map((f) => ({ value: f.id, label: f.name, hint: tEnums(`facilityType.${f.facilityType}`) }))}
                value={targetUser.facilityId}
                disabled={locked || updateUserFacility.isPending}
                onChange={(facilityId) => updateUserFacility.mutate({ userId: targetUserId, facilityId })}
                placeholder={t("searchStations")}
              />
              {updateUserFacility.isError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {updateUserFacility.error instanceof Error ? updateUserFacility.error.message : t("updateFacilityError")}
                </p>
              )}
            </label>
          )}

          <button
            type="button"
            disabled={locked || toggleEnabled.isPending}
            onClick={() => (targetUser.enabled ? setPendingAction({ kind: "disable" }) : toggleEnabled.mutate({ userId: targetUserId, enabled: true }))}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md cursor-pointer transition-colors disabled:opacity-50 ${
              targetUser.enabled
                ? "border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                : "border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            }`}
          >
            {targetUser.enabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {toggleEnabled.isPending ? t("working") : targetUser.enabled ? t("disableAccount") : t("enableAccount")}
          </button>

          <div>
            <button
              type="button"
              onClick={() => sendReset.mutate(targetUserId)}
              disabled={locked || sendReset.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 cursor-pointer border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sendReset.isPending ? t("generatingLink") : t("generatePasswordResetLink")}
            </button>
            {sendReset.data && <GeneratedLinkBox link={sendReset.data.passwordResetLink} />}
            {sendReset.isError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {sendReset.error instanceof Error ? sendReset.error.message : t("generateLinkError")}
              </p>
            )}
          </div>
        </div>
      </div>

      {pendingAction && <ConfirmDialog {...getConfirmCopy(pendingAction)} onConfirm={handleConfirmAction} onCancel={() => setPendingAction(null)} />}
    </div>
  );
}

function EditInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm disabled:opacity-50"
      />
    </label>
  );
}