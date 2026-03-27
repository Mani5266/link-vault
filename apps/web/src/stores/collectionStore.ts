import { create } from "zustand";
import type { Collection } from "@linkvault/shared";

interface CollectionState {
  collections: Collection[];
  activeCollectionId: string | null;
  isLoading: boolean;

  // Actions
  setCollections: (collections: Collection[]) => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  removeCollection: (id: string) => void;
  setActiveCollection: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useCollectionStore = create<CollectionState>((set) => ({
  collections: [],
  activeCollectionId: null,
  isLoading: false,

  setCollections: (collections) => set({ collections }),

  addCollection: (collection) =>
    set((state) => ({
      collections: [...state.collections, collection],
    })),

  updateCollection: (id, updates) =>
    set((state) => ({
      collections: state.collections.map((col) =>
        col.id === id ? { ...col, ...updates } : col
      ),
    })),

  removeCollection: (id) =>
    set((state) => ({
      collections: state.collections.filter((col) => col.id !== id),
      activeCollectionId:
        state.activeCollectionId === id ? null : state.activeCollectionId,
    })),

  setActiveCollection: (id) => set({ activeCollectionId: id }),
  setLoading: (isLoading) => set({ isLoading }),
}));
