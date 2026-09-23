import { create } from "zustand";

type AdminUsersState = {
  searchQuery: string;
  roleFilter: string | "all";
  selectedUserId: number | null;
  setSearchQuery: (q: string) => void;
  setRoleFilter: (r: string | "all") => void;
  setSelectedUserId: (id: number | null) => void;
};

export const useAdminUsersStore = create<AdminUsersState>((set) => ({
  searchQuery: "",
  roleFilter: "all",
  selectedUserId: null,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setRoleFilter: (roleFilter) => set({ roleFilter }),
  setSelectedUserId: (selectedUserId) => set({ selectedUserId }),
}));