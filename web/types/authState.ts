import type { User } from "firebase/auth";
import { User as appUser } from "./user";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  firebaseUser: User | null;
  initialized: boolean;
  profile: appUser | null;
  status: AuthStatus;
  setFirebaseUser: (user: User | null) => void;
  setProfile: (profile: appUser | null) => void;
  reset: () => void;
}