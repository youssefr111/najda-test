"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import AuthGuard from "@/components/Auth/AuthGuard";
import RoleProtectedRoute from "@/components/Auth/RoleProtectedRoute";
import { ADMIN_ROLES } from "@/lib/auth/roles";

const TAB_HREFS = ["/admin", "/admin/facilities", "/admin/units", "/admin/incidents", "/admin/applications"] as const;
const TAB_KEYS = ["users", "facilities", "units", "incidents", "applications"] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("adminTabs");

  return (
    <AuthGuard>
      <RoleProtectedRoute allowedRoles={ADMIN_ROLES}>
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6">
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-slate-100 dark:scrollbar-track-slate-900">
              {TAB_HREFS.map((href, i) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      active ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {t(TAB_KEYS[i])}
                  </Link>
                );
              })}
            </div>
          </div>
          {children}
        </main>
      </RoleProtectedRoute>
    </AuthGuard>
  );
}