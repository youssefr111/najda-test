import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { User, Gender } from "@/types/user";
import type { UserRole } from "@/lib/auth/roles";

const CREATE_EMPLOYEE_PATH = "/api/auth/register/employee";

export type CreateEmployeeRequest = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  gender: Gender;
  roleName: UserRole;
  facilityId: number | null;
};

// Matches EmployeeRegistrationResponse(UserResponse user, String resetLink)
// exactly -- registerEmployee never returns a field called passwordResetLink,
// only resendPasswordReset (the separate, existing-user reset flow) does.
export type CreateEmployeeResponse = {
  user: User;
  passwordResetLink: string;
};

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEmployeeRequest) =>
      apiFetch<CreateEmployeeResponse>(CREATE_EMPLOYEE_PATH, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}