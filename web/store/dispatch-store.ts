import { create } from "zustand";

type DispatchTab = "queue" | "active";

type DispatchStoreState = {
  selectedIncidentId: number | null;
  tab: DispatchTab;
  searchQuery: string;
  setSelectedIncidentId: (id: number | null) => void;
  setTab: (tab: DispatchTab) => void;
  setSearchQuery: (q: string) => void;
};

export const useDispatchStore = create<DispatchStoreState>((set) => ({
  selectedIncidentId: null,
  tab: "queue",
  searchQuery: "",
  setSelectedIncidentId: (selectedIncidentId) => set({ selectedIncidentId }),
  setTab: (tab) => set({ tab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));