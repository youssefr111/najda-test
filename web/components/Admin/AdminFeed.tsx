"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Users, ShieldCheck, Truck, Building2, UserPlus } from "lucide-react";
import { useUsers } from "@/hooks/users/useUsers";
import type { User } from "@/types/user";
import UsersTable from "./UsersTable";
import UserDetailModal from "./UserDetailModal";
import CreateEmployeeModal from "./CreateEmployeeModal";
import useAuth from "@/hooks/auth/useAuth";
import FirebaseSyncPanel from "./FirebaseSyncPanel";

function countByRole(users: User[] | undefined, match: (role: string) => boolean) {
  if (!Array.isArray(users)) return 0;
  return users.filter((u) => match(u.roleName)).length;
}

export default function AdminFeed() {
  const { user } = useAuth();
  const t = useTranslations("admin.users");
  const { data: users } = useUsers();
  const [creatingEmployee, setCreatingEmployee] = useState(false);

  const stats = useMemo(
    () => [
      { label: t("totalUsers"), value: users?.length ?? 0, icon: Users },
      { label: t("staff"), value: countByRole(users, (r) => r === "DISPATCHER" || r === "HOSPITAL_STAFF"), icon: Truck },
      { label: t("citizens"), value: countByRole(users, (r) => r === "CITIZEN"), icon: Building2 },
      { label: t("admins"), value: countByRole(users, (r) => r === "ADMIN" || r === "SUPER_ADMIN"), icon: ShieldCheck },
    ],
    [users, t]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setCreatingEmployee(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">{t("addEmployee")}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <stat.icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {user?.roleName === "SUPER_ADMIN" && <FirebaseSyncPanel />}

      <UsersTable />
      <UserDetailModal />
      {creatingEmployee && <CreateEmployeeModal onClose={() => setCreatingEmployee(false)} />}
    </div>
  );
}