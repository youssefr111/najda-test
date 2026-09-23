import { Redirect } from "expo-router";
import useAuth from "@/hooks/auth/useAuth";
import { getRoleHome } from "@/lib/auth/roles";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

/**
 * Reached only once (app)/_layout has already confirmed the user is
 * authenticated with a completed profile -- purely a role-based traffic
 * split between the two mobile-native experiences.
 */
export default function AppIndex() {
  const { user } = useAuth();
  if (!user) return <LoadingOverlay />;
  return <Redirect href={getRoleHome(user.roleName)} />;
}
