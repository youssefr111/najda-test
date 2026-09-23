import { useAuthStore } from "@/store/auth-store";
import { useMe } from "./useMe";

/**
 * The single hook every screen should use to answer "who is this and are
 * they ready to see the app". `status` is Firebase-only (fast, local);
 * the profile fields layer the backend's view on top once it resolves.
 */
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
    refetchProfile: meQuery.refetch,
  };
}