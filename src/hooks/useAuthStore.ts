import { create } from 'zustand';

export interface AuthUser {
  id: number;
  name: string;
  role: 'HR_MANAGER' | 'HR_ASSISTANT';
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const storedToken = localStorage.getItem('hr_token');
const storedUser = (() => {
  try {
    const raw = localStorage.getItem('hr_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
})();

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  user: storedUser,
  login(token, user) {
    localStorage.setItem('hr_token', token);
    localStorage.setItem('hr_user', JSON.stringify(user));
    set({ token, user });
  },
  logout() {
    localStorage.removeItem('hr_token');
    localStorage.removeItem('hr_user');
    set({ token: null, user: null });
  },
}));
