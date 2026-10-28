"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { LayoutDashboard, LogOut, User as UserIcon, UserPlus } from "lucide-react";
import type { User } from "@/types/user";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import UserAvatar from "./UserAvatar";
import { MENU_DIVIDER, MENU_ITEM, MENU_ITEM_DANGER, MENU_PANEL } from "./styles";
import { getRoleHome } from "@/lib/auth/roles";

interface Props {
  user: User | null;
  logout: () => void;
  onClose: () => void;
}

const ICON = "h-4 w-4 text-blue-600 dark:text-blue-400";

export default function Dropdown({ user, logout, onClose }: Props) {
  const t = useTranslations("nav");
  const tRoleDashboard = useTranslations("roleDashboard");

  return (
    <div className={`absolute inset-e-0 top-full z-50 mt-2 w-64 ${MENU_PANEL}`}>
      {user ? (
        <>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <UserAvatar user={user} className="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user.firstName} {user.lastName || user.email}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
          <div className={MENU_DIVIDER} />

          {user.roleName !== "CITIZEN" && (
            <Link href={getRoleHome(user.roleName)} onClick={onClose} className={MENU_ITEM}>
              <LayoutDashboard className={ICON} />
              {tRoleDashboard(user.roleName)}
            </Link>
          )}
          <Link href="/account" onClick={onClose} className={MENU_ITEM}>
            <UserIcon className={ICON} />
            {t("account")}
          </Link>
        </>
      ) : (
        <Link href="/register" onClick={onClose} className={MENU_ITEM}>
          <UserPlus className={ICON} />
          {t("register")}
        </Link>
      )}

      <div className={MENU_DIVIDER} />
      <ThemeToggle />
      <LanguageSwitcher />

      {user && (
        <>
          <div className={MENU_DIVIDER} />
          <button type="button" onClick={logout} className={MENU_ITEM_DANGER}>
            <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
            {t("logout")}
          </button>
        </>
      )}
    </div>
  );
}