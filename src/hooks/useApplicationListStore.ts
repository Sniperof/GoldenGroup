import { create } from 'zustand';
import type { JobApplicationListItem, ApplicationStage, ApplicationStatus } from '../lib/types';
import { authFetch } from '../lib/authFetch';

const API_BASE = '/api/admin/applications';

interface ApplicationFilters {
  vacancyId: string;
  branch: string;
  gender: string;
  stage: ApplicationStage | '';
  status: ApplicationStatus | '';
  search: string;
  applicationSource: string;
  isArchived: string;
}

interface ApplicationListStore {
  applications: JobApplicationListItem[];
  filters: ApplicationFilters;
  loading: boolean;
  error: string | null;

  setFilter: (key: keyof ApplicationFilters, value: string) => void;
  resetFilters: () => void;
  fetchApplications: () => Promise<void>;
}

const defaultFilters: ApplicationFilters = {
  vacancyId: '', branch: '', gender: '', stage: '', status: '', search: '',
  applicationSource: '', isArchived: 'false',
};

export const useApplicationListStore = create<ApplicationListStore>((set, get) => ({
  applications: [],
  filters: { ...defaultFilters },
  loading: false,
  error: null,

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value } }));
  },

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  fetchApplications: async () => {
    set({ loading: true, error: null });
    try {
      const f = get().filters;
      const params = new URLSearchParams();
      if (f.vacancyId) params.set('vacancyId', f.vacancyId);
      if (f.branch) params.set('branch', f.branch);
      if (f.gender) params.set('gender', f.gender);
      if (f.stage) params.set('stage', f.stage);
      if (f.status) params.set('status', f.status);
      if (f.search) params.set('search', f.search);
      if (f.applicationSource) params.set('applicationSource', f.applicationSource);
      params.set('isArchived', f.isArchived);
      const qs = params.toString();
      const res = await authFetch(`${API_BASE}${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch applications');
      const data = await res.json();
      set({ applications: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));
