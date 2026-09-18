"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { X, LayoutDashboard, UserPlus, LogIn } from "lucide-react";
import { FaSignOutAlt, FaUser } from "react-icons/fa";
import type { User } from "@/types/user";
import { getRoleHome } from "@/lib/auth/roles";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

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

  // Prevents the page behind the menu from scrolling while it's open --
  // standard behavior for any full-screen mobile overlay.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  if (!open) return null;

  const hasDashboard = user && user.roleName !== "CITIZEN";

  return (
    <div className="fixed inset-0 z-60 md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-y-0 end-0 w-full max-w-xs bg-white dark:bg-slate-950 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-800">
          {user ? (
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user.firstName} {user.lastName || user.email}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("home")}</span>
          )}
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto flex flex-col py-2">
          {/* role-specific nav links go here once routes exist -- same
              placeholder as the desktop <nav>, just rendered full-width
              for touch targets instead of a horizontal row */}

          {hasDashboard && (
            <Link href={getRoleHome(user!.roleName)} onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <LayoutDashboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {tRoleDashboard(user!.roleName)}
            </Link>
          )}

          {user && (
            <Link href="/account" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <FaUser className="text-blue-600 dark:text-blue-400" />
              {t("account")}
            </Link>
          )}

          {!user && (
            <>
              <Link href="/login" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <LogIn className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {t("login")}
              </Link>
              <Link href="/register" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {t("register")}
              </Link>
            </>
          )}
        </nav>

        <div className="border-t border-slate-200 dark:border-slate-800">
          <ThemeToggle />
          <LanguageSwitcher />
          {user && (
            <button
              type="button"
              onClick={() => { onClose(); logout(); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <FaSignOutAlt className="text-red-600 dark:text-red-400" />
              {t("logout")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}