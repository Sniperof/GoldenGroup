import { create } from 'zustand';
import type { JobVacancy, VacancyStatus } from '../lib/types';
import { authFetch } from '../lib/authFetch';

const API_BASE = '/api/admin/vacancies';

interface VacancyFilters {
  status: VacancyStatus | '';
  branch: string;
  search: string;
}

interface VacancyStore {
  vacancies: JobVacancy[];
  filters: VacancyFilters;
  loading: boolean;
  error: string | null;

  setFilter: (key: keyof VacancyFilters, value: string) => void;
  resetFilters: () => void;
  fetchVacancies: () => Promise<void>;
  createVacancy: (data: Partial<JobVacancy>) => Promise<JobVacancy>;
  updateVacancy: (id: number, data: Partial<JobVacancy>) => Promise<JobVacancy & { editTier: number }>;
  updateVacancyStatus: (id: number, status: 'Open' | 'Closed' | 'Archived') => Promise<void>;
}

const defaultFilters: VacancyFilters = { status: '', branch: '', search: '' };

export const useVacancyStore = create<VacancyStore>((set, get) => ({
  vacancies: [],
  filters: { ...defaultFilters },
  loading: false,
  error: null,

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value } }));
  },

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  fetchVacancies: async () => {
    set({ loading: true, error: null });
    try {
      const { status, branch, search } = get().filters;
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (branch) params.set('branch', branch);
      if (search) params.set('search', search);
      const qs = params.toString();
      const res = await authFetch(`${API_BASE}${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch vacancies');
      const data = await res.json();
      set({ vacancies: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createVacancy: async (data) => {
    const res = await authFetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create vacancy');
    }
    const vacancy = await res.json();
    set((s) => ({ vacancies: [vacancy, ...s.vacancies] }));
    return vacancy;
  },

  updateVacancy: async (id, data) => {
    const res = await authFetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update vacancy');
    }
    const updated = await res.json();
    set((s) => ({
      vacancies: s.vacancies.map((v) => (v.id === id ? { ...v, ...updated } : v)),
    }));
    return updated;
  },

  updateVacancyStatus: async (id, status) => {
    const res = await authFetch(`${API_BASE}/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update status');
    }
    set((s) => ({
      vacancies: s.vacancies.map((v) => (v.id === id ? { ...v, status } : v)),
    }));
  },
}));
