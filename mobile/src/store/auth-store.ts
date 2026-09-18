import type { User as FirebaseUser } from "firebase/auth";
import { create } from "zustand";
import type { AuthStatus, User } from "@/types";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  profile: User | null;
  status: AuthStatus;
  setFirebaseUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: User | null) => void;
  reset: () => void;
}

// This store is for UI reactivity only (name in the header, instant
// sign-out everywhere, conditional rendering). The real security boundary
// is the backend verifying the Firebase ID token on every request -- never
// gate a screen purely on this store staying in sync.
export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  profile: null,
  status: "loading",
  setFirebaseUser: (firebaseUser) =>
    set({ firebaseUser, status: firebaseUser ? "authenticated" : "unauthenticated" }),
  setProfile: (profile) => set({ profile }),
  reset: () => set({ firebaseUser: null, profile: null, status: "unauthenticated" }),
}));
