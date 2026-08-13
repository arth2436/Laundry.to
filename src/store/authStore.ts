import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '@/types';
import { usersDB } from '@/lib/db';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  hasAccess: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      login: (username: string, password: string) => {
        const user = usersDB.authenticate(username, password);
        if (user) {
          set({ currentUser: user, isAuthenticated: true });
          return true;
        }
        return false;
      },
      logout: () => set({ currentUser: null, isAuthenticated: false }),
      hasAccess: (roles: UserRole[]) => {
        const user = get().currentUser;
        return user ? roles.includes(user.role) : false;
      },
    }),
    { name: 'lms_auth' }
  )
);
