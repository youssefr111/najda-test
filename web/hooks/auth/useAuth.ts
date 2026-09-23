import { useAuthStore } from "@/store/auth-store";
import { useMe } from "@/hooks/auth/useMe";

export default function useAuth() {
  const status = useAuthStore((s) => s.status);
  const meQuery = useMe();

  return {
    user: meQuery.data ?? null,
    status,
    isProfileLoading: meQuery.isLoading,
    isProfilePending: meQuery.isPending,
    isProfileError: meQuery.isError,
    profileError: meQuery.error,
  };
}