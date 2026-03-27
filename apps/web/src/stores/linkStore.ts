import { create } from "zustand";
import type { Link, LinkFilters } from "@linkvault/shared";

interface PaginationMeta {
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface LinkState {
  links: Link[];
  selectedLinkId: string | null;
  selectedIds: string[];
  isSelectionMode: boolean;
  filters: LinkFilters;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  pagination: PaginationMeta;

  // Keyboard navigation
  focusedIndex: number;
  isShortcutsModalOpen: boolean;

  // Actions
  setLinks: (links: Link[]) => void;
  appendLinks: (links: Link[]) => void;
  addLink: (link: Link) => void;
  updateLink: (id: string, updates: Partial<Link>) => void;
  removeLink: (id: string) => void;
  removeLinks: (ids: string[]) => void;
  setSelectedLink: (id: string | null) => void;
  setFilters: (filters: Partial<LinkFilters>) => void;
  resetFilters: () => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (meta: PaginationMeta) => void;

  // Keyboard navigation actions
  setFocusedIndex: (index: number) => void;
  setShortcutsModalOpen: (open: boolean) => void;

  // Multi-select actions
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setSelectionMode: (active: boolean) => void;
}

const initialPagination: PaginationMeta = {
  total: 0,
  totalPages: 0,
  hasMore: false,
};

const initialFilters: LinkFilters = {
  sort_by: "created_at",
  sort_dir: "desc",
  page: 1,
  limit: 20,
};

export const useLinkStore = create<LinkState>((set) => ({
  links: [],
  selectedLinkId: null,
  selectedIds: [],
  isSelectionMode: false,
  filters: initialFilters,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  pagination: initialPagination,

  // Keyboard navigation
  focusedIndex: -1,
  isShortcutsModalOpen: false,

  setLinks: (links) => set({ links }),

  appendLinks: (newLinks) =>
    set((state) => {
      // Deduplicate — in case a link was added/removed while paginating
      const existingIds = new Set(state.links.map((l) => l.id));
      const uniqueNew = newLinks.filter((l) => !existingIds.has(l.id));
      return { links: [...state.links, ...uniqueNew] };
    }),

  addLink: (link) =>
    set((state) => ({ links: [link, ...state.links] })),

  updateLink: (id, updates) =>
    set((state) => ({
      links: state.links.map((link) =>
        link.id === id ? { ...link, ...updates } : link
      ),
    })),

  removeLink: (id) =>
    set((state) => ({
      links: state.links.filter((link) => link.id !== id),
      selectedLinkId:
        state.selectedLinkId === id ? null : state.selectedLinkId,
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    })),

  removeLinks: (ids) =>
    set((state) => {
      const idSet = new Set(ids);
      return {
        links: state.links.filter((link) => !idSet.has(link.id)),
        selectedLinkId:
          state.selectedLinkId && idSet.has(state.selectedLinkId)
            ? null
            : state.selectedLinkId,
        selectedIds: state.selectedIds.filter((sid) => !idSet.has(sid)),
        isSelectionMode: false,
      };
    }),

  setSelectedLink: (id) => set({ selectedLinkId: id }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  resetFilters: () => set({ filters: initialFilters, pagination: initialPagination }),

  setLoading: (isLoading) => set({ isLoading }),
  setLoadingMore: (isLoadingMore) => set({ isLoadingMore }),
  setError: (error) => set({ error }),
  setPagination: (pagination) => set({ pagination }),

  // Keyboard navigation
  setFocusedIndex: (focusedIndex) => set({ focusedIndex }),
  setShortcutsModalOpen: (isShortcutsModalOpen) => set({ isShortcutsModalOpen }),

  // Multi-select
  toggleSelection: (id) =>
    set((state) => {
      const exists = state.selectedIds.includes(id);
      const newIds = exists
        ? state.selectedIds.filter((sid) => sid !== id)
        : [...state.selectedIds, id];
      return {
        selectedIds: newIds,
        isSelectionMode: newIds.length > 0,
      };
    }),

  selectAll: (ids) =>
    set({ selectedIds: ids, isSelectionMode: ids.length > 0 }),

  clearSelection: () =>
    set({ selectedIds: [], isSelectionMode: false }),

  setSelectionMode: (active) =>
    set({ isSelectionMode: active, selectedIds: active ? [] : [] }),
}));
