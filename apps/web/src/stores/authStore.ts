import { create } from "zustand";
import type { UserProfile } from "@linkvault/shared";

interface AuthStoreState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;

  // Actions
  setAuth: (user: UserProfile | null, accessToken: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  setAccessToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,

  /**
   * Set user AND access token atomically in a single state update.
   * Prevents a render where isAuthenticated=true but accessToken=null.
   */
  setAuth: (user, accessToken) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      accessToken,
    }),

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setAccessToken: (accessToken) => set({ accessToken }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      isLoading: false,
    }),
}));
