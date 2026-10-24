"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronDown, LogIn, Menu } from "lucide-react";
import useAuth from "@/hooks/auth/useAuth";
import { useLogout } from "@/hooks/auth/useLogout";
import { useDismissable } from "@/hooks/shared/useDismissable";
import Dropdown from "./Dropdown";
import MobileMenu from "./MobileMenu";
import UserAvatar from "./UserAvatar";
import { ICON_BUTTON } from "./styles";
import LogoHorizontal from "../ui/LogoHorizontal";
import NotificationBell from "../Notifications/NotificationBell";

export default function Header() {
  const t = useTranslations("nav");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownWrapperRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const logout = useLogout();

  const closeDropdown = () => setDropdownVisible(false);
  useDismissable(dropdownWrapperRef, dropdownVisible, closeDropdown);

  async function handleLogout() {
    closeDropdown();
    await logout();
  }

  const chevron = <ChevronDown className={`h-4 w-4 transition-transform ${dropdownVisible ? "rotate-180" : ""}`} />;

  return (
    <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#171717] sticky top-0 z-50">
      <div className="flex justify-between items-center px-4 md:px-8 py-2 max-w-7xl mx-auto h-16">
        <div className="flex items-center gap-6">
          <Link href="/">
            <LogoHorizontal />
          </Link>

          <nav className="hidden md:flex items-center gap-5">
            {/* role-specific nav links go here once routes exist */}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          {user && <NotificationBell />}

          {/* Desktop: account menu */}
          <div className="hidden md:block">
            <div className="relative" ref={dropdownWrapperRef}>
              {user ? (
                <button
                  type="button"
                  onClick={() => setDropdownVisible((open) => !open)}
                  aria-label={t("accountMenu")}
                  aria-haspopup="true"
                  aria-expanded={dropdownVisible}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-full ps-1 pe-3 text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 aria-expanded:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:aria-expanded:bg-slate-800"
                >
                  <UserAvatar user={user} />
                  <span className="max-w-40 truncate text-sm font-semibold">{user.firstName || user.email}</span>
                  <span className="text-slate-400">{chevron}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <Link
                    href="/login"
                    className="flex h-10 items-center gap-2 rounded-full bg-red-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:text-black dark:bg-white dark:hover:bg-slate-100 dark:focus-visible:ring-offset-[#171717]"
                  >
                    <LogIn className="h-4 w-4" />
                    {t("login")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDropdownVisible((open) => !open)}
                    aria-label={t("accountMenu")}
                    aria-haspopup="true"
                    aria-expanded={dropdownVisible}
                    className={ICON_BUTTON}
                  >
                    {chevron}
                  </button>
                </div>
              )}
              {dropdownVisible && <Dropdown user={user} logout={handleLogout} onClose={closeDropdown} />}
            </div>
          </div>

          {/* Mobile: hamburger trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={t("openMenu")}
            aria-haspopup="dialog"
            className={`${ICON_BUTTON} md:hidden`}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} user={user} logout={handleLogout} />
    </header>
  );
}