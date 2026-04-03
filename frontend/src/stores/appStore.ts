import { create } from 'zustand';

interface AppState {
  selectedSiteId: number | null;
  sidebarCollapsed: boolean;
  setSelectedSite: (id: number | null) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedSiteId: null,
  sidebarCollapsed: false,
  setSelectedSite: (id) => set({ selectedSiteId: id }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
