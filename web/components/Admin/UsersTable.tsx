"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Search, RotateCcw, Check, X } from "lucide-react";
import { useUsers } from "@/hooks/users/useUsers";
import { useAdminUsersStore } from "@/store/admin-users-store";
import type { User } from "@/types/user";

function roleBadgeClasses(roleName: string) {
  switch (roleName) {
    case "ADMIN":
    case "SUPER_ADMIN":
      return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
    case "DISPATCHER":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
    case "HOSPITAL_STAFF":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

function VerifiedIcon({ verified, label }: { verified: boolean; label: string }) {
  return verified ? (
    <Check className="w-4 h-4 text-emerald-500" role="img">
      <title>{`${label} verified`}</title>
    </Check>
  ) : (
    <X className="w-4 h-4 text-slate-300 dark:text-slate-600" role="img">
      <title>{`${label} not verified`}</title>
    </X>
  );
}
export default function UsersTable() {
  const tRole = useTranslations("enums.role");
  const tCommon = useTranslations("common");
  const { data: users, isLoading, isError, error, refetch, isFetching } = useUsers();
  const { searchQuery, setSearchQuery, roleFilter, setRoleFilter, setSelectedUserId } =
    useAdminUsersStore();

  const roles = useMemo(() => {
    if (!users) return [];
    return Array.from(new Set(users.map((u) => u.roleName)));
  }, [users]);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = roleFilter === "all" || u.roleName === roleFilter;
      const matchesQuery =
        !q ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [users, searchQuery, roleFilter]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <FilterChip active={roleFilter === "all"} onClick={() => setRoleFilter("all")}>
            {tCommon("all")}
          </FilterChip>
          {roles.map((role) => (
            <FilterChip key={role} active={roleFilter === role} onClick={() => setRoleFilter(role)}>
              {tRole(role)}
            </FilterChip>
          ))}
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{tCommon("refresh")}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Users {tCommon("loading")}…</div>
      ) : isError ? (
        <div className="p-10 text-center text-sm text-red-600 dark:text-red-400">
          {error instanceof Error ? error.message : "Couldn't load users."}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">No users match your search.</div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <UserRow key={u.id} user={u} onView={() => setSelectedUserId(u.id)} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedUserId(u.id)}
                className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {u.firstName} {u.lastName}
                  </p>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeClasses(u.roleName)}`}>
                    {tRole(u.roleName)}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">{u.email}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function UserRow({ user, onView }: { user: User; onView: () => void }) {
  const tRole = useTranslations("enums.role");
  
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
        {user.firstName} {user.lastName}
      </td>
      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          {user.email}
          <VerifiedIcon verified={user.emailVerified} label="Email" />
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeClasses(user.roleName)}`}>
          {tRole(user.roleName)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            user.enabled
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          {user.enabled ? "Active" : "Disabled"}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
        {user.phone ? (
          <span className="inline-flex items-center gap-1.5">
            {user.phone}
            <VerifiedIcon verified={user.phoneVerified} label="Phone" />
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onView}
          className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-colors"
        >
          View
        </button>
      </td>
    </tr>
  );
}