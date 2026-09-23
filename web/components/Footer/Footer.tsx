"use client"

import { useTranslations } from "next-intl";
import Link from "next/link";
import LogoIcon from "../ui/LogoIcon";

export default function Footer() {
  const t = useTranslations("footer");
  const currentYear = new Date().getUTCFullYear();

  const links = [
    { label: t("about"), href: "/about" },
    { label: t("privacy"), href: "/privacy" },
    { label: t("terms"), href: "/terms" },
    { label: t("support"), href: "/support" },
  ];

  return (

    <footer className="w-full bg-(--color-bg) border-t border-[#e5e7eb] dark:border-slate-800 px-6 py-8">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between lg:gap-4 gap-6">
        <Link href="/">
          <LogoIcon />
        </Link>

        <div className="flex text-center gap-6 lg:mb-0">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors dark:text-white dark:hover:text-slate-300"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="lg:text-sm text-xs text-slate-500 text-text-muted">
          &copy; {currentYear} NAJDA Team. All rights reserved.
        </p>
      </div>
    </footer>
  );
}