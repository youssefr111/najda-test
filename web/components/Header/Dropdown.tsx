"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { FaSignOutAlt, FaUser } from "react-icons/fa";
import { LayoutDashboard, UserPlus } from "lucide-react";
import type { User } from "@/types/user";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { getRoleHome } from "@/lib/auth/roles";

interface Props {
  user: User | null;
  logout: () => void;
}

export default function Dropdown({ user, logout }: Props) {
  const t = useTranslations("nav");
  const tRoleDashboard = useTranslations("roleDashboard");
  const router = useRouter();

  const hasDashboard = user && user.roleName !== "CITIZEN";

  return (
    <div className="absolute inset-e-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
      {user ? (
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {user.firstName} {user.lastName || user.email}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
        </div>
      ) : (
        <Link
          href="/register"
          className="flex w-full items-center gap-2 px-4 py-3 text-sm cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t("register")}
        </Link>
      )}

      {hasDashboard && (
        <button
          type="button"
          onClick={() => router.push(getRoleHome(user!.roleName))}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <LayoutDashboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {tRoleDashboard(user!.roleName)}
        </button>
      )}

      {user && (
        <button
          type="button"
          onClick={() => router.push("/account")}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <FaUser className="text-blue-600 dark:text-blue-400" />
          {t("account")}
        </button>
      )}

      <ThemeToggle />
      <LanguageSwitcher />

      {user && (
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors border-t border-slate-100 dark:border-slate-800"
        >
          <FaSignOutAlt className="text-red-600 dark:text-red-400" />
          {t("logout")}
        </button>
      )}
    </div>
  );
}