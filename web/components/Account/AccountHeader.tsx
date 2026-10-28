"use client";

import { useTranslations } from "next-intl";
import type { User } from "@/types/user";
import KycBadge from "@/components/Kyc/KycBadge";

export default function AccountHeader({ user }: { user: User }) {
  const tRole = useTranslations("enums.role");
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <header className="flex items-center gap-4">
      <div
        aria-hidden="true"
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-blue-700 text-lg font-semibold text-white shadow-sm sm:size-16 sm:text-xl"
      >
        {initials}
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">
          {user.firstName} {user.lastName}
        </h1>
        <p className="truncate text-sm text-slate-500 dark:text-slate-400">
          <bdi>{user.email}</bdi>
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
            {tRole(user.roleName)}
          </span>
          <KycBadge status={user.kycStatus} />
        </div>
      </div>
    </header>
  );
}