"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { X, LayoutDashboard, UserPlus, LogIn, LogOut, User as UserIcon } from "lucide-react";
import type { User } from "@/types/user";
import { getRoleHome } from "@/lib/auth/roles";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import UserAvatar from "./UserAvatar";
import { ICON_BUTTON, MENU_ITEM, MENU_ITEM_DANGER } from "./styles";

const ICON = "h-4 w-4 text-blue-600 dark:text-blue-400";

export default function MobileMenu({
  open, onClose, user, logout,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  logout: () => void;
}) {
  const t = useTranslations("nav");
  const tRoleDashboard = useTranslations("roleDashboard");

  // While open: stop the page behind from scrolling (standard for a full-screen overlay) and close on Escape.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 md:hidden">
      <div className="absolute inset-0 bg-black/40 animate-fade" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={user ? `${user.firstName} ${user.lastName}`.trim() : t("home")}
        className="absolute inset-y-0 inset-e-0 flex w-full max-w-xs flex-col bg-white shadow-xl animate-slide-in dark:bg-slate-950"
      >
        <div className="flex h-16 items-center justify-between gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
          {user ? (
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar user={user} className="h-9 w-9 text-sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user.firstName} {user.lastName || user.email}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("home")}</span>
          )}
          <button type="button" onClick={onClose} aria-label={t("closeMenu")} className={ICON_BUTTON}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {/* role-specific nav links go here once routes exist -- same
              placeholder as the desktop <nav>, just rendered full-width
              for touch targets instead of a horizontal row */}

          {user && user.roleName !== "CITIZEN" && (
            <Link href={getRoleHome(user.roleName)} onClick={onClose} className={MENU_ITEM}>
              <LayoutDashboard className={ICON} />
              {tRoleDashboard(user.roleName)}
            </Link>
          )}

          {user && (
            <Link href="/account" onClick={onClose} className={MENU_ITEM}>
              <UserIcon className={ICON} />
              {t("account")}
            </Link>
          )}

          {!user && (
            <>
              <Link href="/login" onClick={onClose} className={MENU_ITEM}>
                <LogIn className={ICON} />
                {t("login")}
              </Link>
              <Link href="/register" onClick={onClose} className={MENU_ITEM}>
                <UserPlus className={ICON} />
                {t("register")}
              </Link>
            </>
          )}
        </nav>

        <div className="flex flex-col gap-0.5 border-t border-slate-200 p-2 dark:border-slate-800">
          <ThemeToggle />
          <LanguageSwitcher dropdownAbove={true} />
          {user && (
            <button type="button" onClick={() => { onClose(); logout(); }} className={MENU_ITEM_DANGER}>
              <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
              {t("logout")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}