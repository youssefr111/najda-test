"use client";

import RoleProtectedRoute from "@/components/Auth/RoleProtectedRoute";
import LegalEditor from "@/components/Admin/Legal/LegalEditor";

/** Terms & Privacy editor: SUPER_ADMIN only (the admin layout alone also admits ADMIN). */
export default function AdminLegalPage() {
  return (
    <RoleProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
      <LegalEditor />
    </RoleProtectedRoute>
  );
}
