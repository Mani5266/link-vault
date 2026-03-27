import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ViewMode } from "@/lib/constants";
import type { Link } from "@linkvault/shared";

interface UIState {
  viewMode: ViewMode;
  isSidebarOpen: boolean;
  isAddLinkModalOpen: boolean;
  searchQuery: string;

  // AI search state
  isAISearchMode: boolean;
  aiSearchInterpretation: string | null;
  aiSearchLoading: boolean;

  // Modal state for CRUD actions
  editingLink: Link | null;
  deletingLink: Link | null;
  movingLink: Link | null;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setAddLinkModalOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setEditingLink: (link: Link | null) => void;
  setDeletingLink: (link: Link | null) => void;
  setMovingLink: (link: Link | null) => void;

  // AI search actions
  setAISearchMode: (enabled: boolean) => void;
  setAISearchInterpretation: (text: string | null) => void;
  setAISearchLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      viewMode: "grid" as ViewMode,
      isSidebarOpen: true,
      isAddLinkModalOpen: false,
      searchQuery: "",

      // AI search
      isAISearchMode: false,
      aiSearchInterpretation: null,
      aiSearchLoading: false,

      editingLink: null,
      deletingLink: null,
      movingLink: null,

      setViewMode: (viewMode) => set({ viewMode }),
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      setAddLinkModalOpen: (isAddLinkModalOpen) =>
        set({ isAddLinkModalOpen }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setEditingLink: (editingLink) => set({ editingLink }),
      setDeletingLink: (deletingLink) => set({ deletingLink }),
      setMovingLink: (movingLink) => set({ movingLink }),

      // AI search actions
      setAISearchMode: (isAISearchMode) =>
        set({ isAISearchMode, aiSearchInterpretation: null }),
      setAISearchInterpretation: (aiSearchInterpretation) =>
        set({ aiSearchInterpretation }),
      setAISearchLoading: (aiSearchLoading) => set({ aiSearchLoading }),
    }),
    {
      name: "linkvault-ui",
      partialize: (state) => ({
        viewMode: state.viewMode,
        isSidebarOpen: state.isSidebarOpen,
      }),
    }
  )
);
