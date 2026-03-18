import { create } from 'zustand';
import type { Interview } from '../lib/types';
import { authFetch } from '../lib/authFetch';

const API_BASE = '/api/admin/interviews';

interface InterviewFilters {
  applicationId: string;
  jobVacancyId: string;
  interviewerName: string;
  date: string;
}

interface InterviewStore {
  interviews: (Interview & { applicantFirstName?: string; applicantLastName?: string; vacancyTitle?: string })[];
  filters: InterviewFilters;
  loading: boolean;
  error: string | null;

  setFilter: (key: keyof InterviewFilters, value: string) => void;
  resetFilters: () => void;
  fetchInterviews: () => Promise<void>;
  scheduleInterview: (data: Partial<Interview>) => Promise<Interview>;
  recordResult: (id: number, interviewStatus: string, internalNotes?: string) => Promise<Interview>;
}

const defaultFilters: InterviewFilters = {
  applicationId: '', jobVacancyId: '', interviewerName: '', date: '',
};

export const useInterviewStore = create<InterviewStore>((set, get) => ({
  interviews: [],
  filters: { ...defaultFilters },
  loading: false,
  error: null,

  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  fetchInterviews: async () => {
    set({ loading: true, error: null });
    try {
      const f = get().filters;
      const params = new URLSearchParams();
      if (f.applicationId) params.set('applicationId', f.applicationId);
      if (f.jobVacancyId) params.set('jobVacancyId', f.jobVacancyId);
      if (f.interviewerName) params.set('interviewerName', f.interviewerName);
      if (f.date) params.set('date', f.date);
      const qs = params.toString();
      const res = await authFetch(`${API_BASE}${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch interviews');
      set({ interviews: await res.json(), loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  scheduleInterview: async (data) => {
    const res = await authFetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to schedule interview');
    }
    const interview = await res.json();
    set((s) => ({ interviews: [interview, ...s.interviews] }));
    return interview;
  },

  recordResult: async (id, interviewStatus, internalNotes) => {
    const res = await authFetch(`${API_BASE}/${id}/result`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interviewStatus, internalNotes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record result');
    }
    const updated = await res.json();
    set((s) => ({
      interviews: s.interviews.map((i) => (i.id === id ? { ...i, ...updated } : i)),
    }));
    return updated;
  },
}));
