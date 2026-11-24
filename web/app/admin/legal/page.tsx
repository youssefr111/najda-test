"use client";

import RoleProtectedRoute from "@/components/Auth/RoleProtectedRoute";
import LegalEditor from "@/components/Admin/Legal/LegalEditor";

/** Terms & Privacy editor: SUPER_ADMIN and ADMIN only. */
export default function AdminLegalPage() {
  return (
    <RoleProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <LegalEditor />
    </RoleProtectedRoute>
  );
}