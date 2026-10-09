import { useAuthStore } from "@/store/auth-store";
import { useMe } from "@/hooks/auth/useMe";

export default function useAuth() {
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const initialized = useAuthStore((s) => s.initialized);
  const meQuery = useMe();

  let status: "loading" | "authenticated" | "unauthenticated";

  if (!initialized) {
    status = "loading";
  } else if (!firebaseUser) {
    status = "unauthenticated";
  } else if (meQuery.isPending) {
    status = "loading";
  } else if (meQuery.isSuccess) {
    status = "authenticated";
  } else {
    status = "unauthenticated";
  }

  return {
    user: meQuery.data ?? null,
    status,
    isProfileLoading: meQuery.isLoading,
    isProfilePending: meQuery.isPending,
    isProfileError: meQuery.isError,
    profileError: meQuery.error,
  };
}
