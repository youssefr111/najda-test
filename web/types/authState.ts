import type { User } from "firebase/auth";
import { User as appUser } from "./user";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  firebaseUser: User | null;
  initialized: boolean;
  profile: appUser | null;
  status: AuthStatus;
  medicalOnboardingPending: boolean;
  setFirebaseUser: (user: User | null) => void;
  setProfile: (profile: appUser | null) => void;
  setMedicalOnboardingPending: (pending: boolean) => void;
  reset: () => void;
}