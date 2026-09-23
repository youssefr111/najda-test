import { useState, type ReactNode } from "react";
import { Pressable, Text, View, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { firebaseAuth } from "@/firebase/client";
import useAuth from "@/hooks/auth/useAuth";
import { useLogout } from "@/hooks/auth/useLogout";
import { useUpdateProfile } from "@/hooks/users/useUpdateProfile";
import { useChangePassword } from "@/hooks/auth/useChangePassword";
import { useResendEmailVerification } from "@/hooks/auth/useResendEmailVerification";
import { confirmAsync } from "@/lib/confirm";
import { isResponderRole } from "@/types/role";
import { EmailChangeSection } from "@/components/account/EmailChangeSection";
import { PhoneChangeSection } from "@/components/account/PhoneChangeSection";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { Screen } from "@/components/ui/Screen";
import { AppVersionLabel } from "@/components/ui/AppVersionLabel";
import type { Gender, User } from "@/types/user";


function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 pb-4 pe-2">
      <Text className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</Text>
      <Text className="mt-0.5 text-[15px] text-slate-900 dark:text-slate-100">{value || "—"}</Text>
    </View>
  );
}

function SectionCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="mb-6 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      {title ? <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</Text> : null}
      {children}
    </View>
  );
}

function initials(user: User): string {
  return `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function EditForm({ user, onDone }: { user: User; onDone: () => void }) {
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile(user.id);

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [address, setAddress] = useState(user.address ?? "");
  const [gender, setGender] = useState<Gender>(user.gender ?? "MALE");

  async function handleSave() {
    await updateProfile.mutateAsync({ firstName, lastName, address, gender });
    onDone();
  }

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField label={t("auth.completeProfile.firstName")} value={firstName} onChangeText={setFirstName} />
        </View>
        <View className="flex-1">
          <TextField label={t("auth.completeProfile.lastName")} value={lastName} onChangeText={setLastName} />
        </View>
      </View>
      <TextField label={t("auth.completeProfile.address")} value={address} onChangeText={setAddress} />
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("auth.completeProfile.gender")}
        </Text>
        <View className="flex-row gap-2">
          {(["MALE", "FEMALE"] as Gender[]).map((option) => {
            const selected = gender === option;
            return (
              <Pressable
                key={option}
                onPress={() => setGender(option)}
                className={`flex-1 items-center rounded-md border py-2.5 ${
                  selected
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                    : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800"
                }`}
              >
                <Text className={`font-medium ${selected ? "text-blue-600" : "text-slate-700 dark:text-slate-300"}`}>
                  {t(`enums.gender.${option}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {updateProfile.isError ? (
        <Text className="text-[13px] text-red-600 dark:text-red-400">{t("common.error")}</Text>
      ) : null}
      <View className="flex-row gap-2">
        <Button label={t("common.cancel")} variant="secondary" onPress={onDone} className="flex-1" />
        <Button
          label={updateProfile.isPending ? t("common.saving") : t("account.saveChanges")}
          onPress={handleSave}
          loading={updateProfile.isPending}
          className="flex-1"
        />
      </View>
    </View>
  );
}

function PasswordSection() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const changePassword = useChangePassword();

  const hasPasswordProvider = firebaseAuth.currentUser?.providerData.some((p) => p.providerId === "password");
  if (!hasPasswordProvider) {
    return <Text className="text-[15px] text-slate-500 dark:text-slate-400">{t("account.googleOnlyNotice")}</Text>;
  }

  async function handleSubmit() {
    setLocalError(null);
    if (newPassword !== confirmPassword) {
      setLocalError(t("account.passwordsDontMatch"));
      return;
    }
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
      }
    );
  }

  return (
    <View>
      <Pressable onPress={() => setExpanded((v) => !v)}>
        <Text className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {expanded ? t("account.hidePasswordSettings") : t("account.changePassword")}
        </Text>
      </Pressable>

      {expanded ? (
        <View className="mt-4 gap-3">
          <TextField
            label={t("account.currentPassword")}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
          <TextField
            label={t("account.newPassword")}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TextField
            label={t("account.confirmNewPassword")}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          {(localError || changePassword.isError) && (
            <Text className="text-[13px] text-red-600 dark:text-red-400">{localError ?? t("common.error")}</Text>
          )}
          {changePassword.isSuccess ? (
            <Text className="text-[13px] text-emerald-600 dark:text-emerald-400">{t("account.passwordUpdated")}</Text>
          ) : null}
          <Button
            label={changePassword.isPending ? t("account.updating") : t("account.changePassword")}
            onPress={handleSubmit}
            loading={changePassword.isPending}
            disabled={!currentPassword || !newPassword || !confirmPassword}
          />
        </View>
      ) : null}
    </View>
  );
}

function LegalLinks() {
  const { t } = useTranslation();
  const router = useRouter();

  const links: { label: string; href: "/about" | "/privacy" | "/terms" | "/support" }[] = [
    { label: t("account.aboutLink"), href: "/about" },
    { label: t("account.privacyLink"), href: "/privacy" },
    { label: t("account.termsLink"), href: "/terms" },
    { label: t("account.supportLink"), href: "/support" },
  ];

  return (
    <View className="mb-6 gap-1">
      <Text className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {t("account.legal")}
      </Text>
      {links.map((link) => (
        <Pressable
          key={link.href}
          onPress={() => router.push(link.href)}
          className="flex-row items-center justify-between rounded-md py-2.5"
        >
          <Text className="text-[15px] text-slate-700 dark:text-slate-300">{link.label}</Text>
          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
        </Pressable>
      ))}
    </View>
  );
}

export function AccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isProfileLoading, refetchProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const logout = useLogout();
  const resendVerification = useResendEmailVerification();
  const [editing, setEditing] = useState(false);

  if (isProfileLoading || !user) return <LoadingOverlay label={t("common.loading")} />;

  async function handleLogout() {
    const confirmed = await confirmAsync(t("account.logoutConfirm"), undefined, {
      confirmLabel: t("account.logout"),
      cancelLabel: t("common.cancel"),
      destructive: true,
    });
    if (confirmed) logout();
  }

  function resetTransientState() {
    setEditing(false);
  }

  const [refreshResetKey, setRefreshResetKey] = useState(0);
  async function handleRefresh() {
    setRefreshResetKey((key) => key + 1);
    setEditing(false);
    setRefreshing(true);

    try {
      await refetchProfile();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#2563eb"
          colors={["#2563eb"]}
        />
      }
    >
      <View className="mb-6 mt-3 flex-row items-center gap-3">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-[#b7102a]">
          <Text className="text-xl font-bold text-white">{initials(user)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[19px] font-bold text-slate-900 dark:text-slate-100" numberOfLines={1}>
            {user.firstName} {user.lastName}
          </Text>
          {!user.emailVerified ? (
            <Pressable onPress={() => resendVerification.mutate()} disabled={resendVerification.isPending}>
              <Text className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
                {resendVerification.isPending ? t("account.sendingVerification") : t("account.sendVerificationEmail")}
              </Text>
            </Pressable>
          ) : null}
          {resendVerification.isSuccess ? (
            <Text className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">{t("account.verificationSent")}</Text>
          ) : null}
        </View>
        {!isResponderRole(user.roleName) ? (
          <Pressable
            onPress={() => router.push("/citizen/incidents")}
            className="items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
          >
            <Ionicons name="document-text-outline" size={18} color="#2563eb" />
            <Text className="text-[11px] font-medium text-blue-600">{t("account.myReports")}</Text>
          </Pressable>
        ) : null}
      </View>

      <SectionCard title={editing ? undefined : t("account.title")}>
        {!editing ? (
          <>
            <Pressable onPress={() => setEditing(true)} className="absolute right-4 top-4 flex-row items-center gap-1.5 sm:right-6 sm:top-6">
              <Ionicons name="create-outline" size={16} color="#2563eb" />
              <Text className="text-sm font-medium text-blue-600">{t("account.editProfile")}</Text>
            </Pressable>
            <View className="flex-row flex-wrap">
              <ReadField label={t("auth.completeProfile.firstName")} value={user.firstName} />
              <ReadField label={t("auth.completeProfile.lastName")} value={user.lastName} />
              <ReadField label={t("account.role")} value={t(`enums.role.${user.roleName}`)} />
              {user.facilityName ? <ReadField label={t("account.facility")} value={user.facilityName} /> : null}
              <ReadField label={t("auth.completeProfile.address")} value={user.address ?? "—"} />
            </View>
          </>
        ) : (
          <EditForm user={user} onDone={() => setEditing(false)} />
        )}
      </SectionCard>

      <SectionCard title={t("account.contact")}>
        <EmailChangeSection user={user} />
        <View className="h-px bg-slate-200 dark:bg-slate-800" />
        <PhoneChangeSection user={user} resetKey={refreshResetKey} />
      </SectionCard>

      <SectionCard>
        <PasswordSection />
      </SectionCard>

      <View className="mb-6 gap-4">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </View>

      <LegalLinks />

      <Button label={t("account.logout")} variant="danger" onPress={handleLogout} />
      <AppVersionLabel className="mt-6 items-center" />
    </Screen>
  );
}
