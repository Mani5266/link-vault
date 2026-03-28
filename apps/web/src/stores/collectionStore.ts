import { create } from "zustand";
import type { Collection } from "@linkvault/shared";

export interface CollectionTreeNode extends Collection {
  children: Collection[];
}

interface CollectionState {
  collections: Collection[];
  activeCollectionId: string | null;
  isLoading: boolean;
  expandedIds: string[];

  // Actions
  setCollections: (collections: Collection[]) => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  removeCollection: (id: string) => void;
  setActiveCollection: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  toggleExpanded: (id: string) => void;
}

/**
 * Build a tree from a flat list of collections.
 * Top-level = parent_id is null. Children grouped by parent_id.
 */
export function buildCollectionTree(collections: Collection[]): CollectionTreeNode[] {
  const childrenMap = new Map<string, Collection[]>();

  for (const col of collections) {
    if (col.parent_id) {
      const siblings = childrenMap.get(col.parent_id) || [];
      siblings.push(col);
      childrenMap.set(col.parent_id, siblings);
    }
  }

  return collections
    .filter((col) => !col.parent_id)
    .map((col) => ({
      ...col,
      children: (childrenMap.get(col.id) || []).sort((a, b) => a.position - b.position),
    }));
}

export const useCollectionStore = create<CollectionState>((set) => ({
  collections: [],
  activeCollectionId: null,
  isLoading: false,
  expandedIds: [],

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
      // Also remove children of the deleted collection
      collections: state.collections.filter(
        (col) => col.id !== id && col.parent_id !== id
      ),
      activeCollectionId:
        state.activeCollectionId === id ? null : state.activeCollectionId,
      expandedIds: state.expandedIds.filter((eid) => eid !== id),
    })),

  setActiveCollection: (id) => set({ activeCollectionId: id }),
  setLoading: (isLoading) => set({ isLoading }),

  toggleExpanded: (id) =>
    set((state) => ({
      expandedIds: state.expandedIds.includes(id)
        ? state.expandedIds.filter((eid) => eid !== id)
        : [...state.expandedIds, id],
    })),
}));
