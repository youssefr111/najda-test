import { create } from "zustand";
import { AuthState } from "@/types/authState";

// This store is for UI reactivity only (name in the top bar, instant
// sign-out across tabs, conditional rendering). It is NOT the security
// boundary — the httpOnly session cookie + middleware is. Never gate a
// route purely on this store's state.
export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  profile: null,
  status: "loading",
  setFirebaseUser: (firebaseUser) =>
    set({ firebaseUser, status: firebaseUser ? "authenticated" : "unauthenticated" }),
  setProfile: (profile) => set({ profile }),
  reset: () => set({ firebaseUser: null, profile: null, status: "unauthenticated" }),
}));
