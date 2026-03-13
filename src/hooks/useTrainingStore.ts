import { create } from 'zustand';
import type { TrainingCourseListItem, TrainingCourseDetail, CreateTrainingCourseRequest } from '../lib/types';

const API = '/api/admin/training-courses';

interface TrainingFilters {
  branch: string;
  start_date: string;
  end_date: string;
  trainer: string;
  device_name: string;
  training_status: string;
  job_vacancy_id: string;
  search: string;
}

const defaultFilters: TrainingFilters = {
  branch: '', start_date: '', end_date: '', trainer: '',
  device_name: '', training_status: '', job_vacancy_id: '', search: '',
};

interface TrainingStore {
  courses: TrainingCourseListItem[];
  totalCount: number;
  currentPage: number;
  perPage: number;
  filters: TrainingFilters;
  loading: boolean;
  error: string | null;

  selectedCourse: TrainingCourseDetail | null;
  detailLoading: boolean;
  detailError: string | null;

  fetchCourses: () => Promise<void>;
  fetchCourseDetail: (id: number) => Promise<void>;
  setFilter: (key: keyof TrainingFilters, value: string) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;

  createCourse: (data: CreateTrainingCourseRequest & { performedByRole?: string; performedByUserId?: number }) => Promise<TrainingCourseDetail>;
  startCourse: (id: number, opts?: { performedByRole?: string; performedByUserId?: number }) => Promise<void>;
  completeCourse: (id: number, opts?: { performedByRole?: string; performedByUserId?: number }) => Promise<void>;
  recordAttendance: (
    courseId: number,
    attendance_date: string,
    attendance: Array<{ application_id: number; status: 'Present' | 'Absent' }>,
    opts?: { performedByRole?: string; performedByUserId?: number }
  ) => Promise<void>;
  recordTraineeResult: (
    courseId: number,
    applicationId: number,
    result: 'Passed' | 'Retraining' | 'Rejected' | 'Retreated',
    opts?: { performedByRole?: string; performedByUserId?: number }
  ) => Promise<void>;
  addTrainees: (
    courseId: number,
    application_ids: number[],
    opts?: { performedByRole?: string; performedByUserId?: number }
  ) => Promise<void>;
  fetchEligibleTrainees: (jobVacancyId: number) => Promise<Array<{
    applicationId: number; firstName: string; lastName: string;
    mobileNumber: string; applicationStatus: string;
  }>>;
}

export const useTrainingStore = create<TrainingStore>((set, get) => ({
  courses: [],
  totalCount: 0,
  currentPage: 1,
  perPage: 25,
  filters: { ...defaultFilters },
  loading: false,
  error: null,
  selectedCourse: null,
  detailLoading: false,
  detailError: null,

  setFilter: (key, value) => set(s => ({ filters: { ...s.filters, [key]: value }, currentPage: 1 })),
  resetFilters: () => set({ filters: { ...defaultFilters }, currentPage: 1 }),
  setPage: (page) => set({ currentPage: page }),

  fetchCourses: async () => {
    set({ loading: true, error: null });
    try {
      const { filters, currentPage, perPage } = get();
      const params = new URLSearchParams({ page: String(currentPage), per_page: String(perPage) });
      if (filters.branch) params.set('branch', filters.branch);
      if (filters.start_date) params.set('start_date', filters.start_date);
      if (filters.end_date) params.set('end_date', filters.end_date);
      if (filters.trainer) params.set('trainer', filters.trainer);
      if (filters.device_name) params.set('device_name', filters.device_name);
      if (filters.training_status) params.set('training_status', filters.training_status);
      if (filters.job_vacancy_id) params.set('job_vacancy_id', filters.job_vacancy_id);
      if (filters.search) params.set('search', filters.search);

      const res = await fetch(`${API}?${params}`);
      if (!res.ok) throw new Error('فشل تحميل الدورات التدريبية');
      const data = await res.json();
      set({ courses: data.courses, totalCount: data.totalCount, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchCourseDetail: async (id) => {
    set({ detailLoading: true, detailError: null });
    try {
      const res = await fetch(`${API}/${id}`);
      if (!res.ok) throw new Error('فشل تحميل تفاصيل الدورة');
      const data = await res.json();
      set({ selectedCourse: data, detailLoading: false });
    } catch (err: any) {
      set({ detailError: err.message, detailLoading: false });
    }
  },

  createCourse: async (data) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل إنشاء الدورة');
    await get().fetchCourses();
    return json;
  },

  startCourse: async (id, opts = {}) => {
    const res = await fetch(`${API}/${id}/start`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل بدء الدورة');
    await get().fetchCourseDetail(id);
    await get().fetchCourses();
  },

  completeCourse: async (id, opts = {}) => {
    const res = await fetch(`${API}/${id}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل إكمال الدورة');
    await get().fetchCourseDetail(id);
    await get().fetchCourses();
  },

  recordAttendance: async (courseId, attendance_date, attendance, opts = {}) => {
    const res = await fetch(`${API}/${courseId}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendance_date, attendance, ...opts }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل تسجيل الحضور');
    await get().fetchCourseDetail(courseId);
  },

  recordTraineeResult: async (courseId, applicationId, result, opts = {}) => {
    const res = await fetch(`${API}/${courseId}/trainees/${applicationId}/result`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result, ...opts }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل تسجيل النتيجة');
    await get().fetchCourseDetail(courseId);
  },

  addTrainees: async (courseId, application_ids, opts = {}) => {
    const res = await fetch(`${API}/${courseId}/trainees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_ids, ...opts }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل إضافة المتدربين');
    await get().fetchCourseDetail(courseId);
  },

  fetchEligibleTrainees: async (jobVacancyId) => {
    const res = await fetch(`${API}/eligible/${jobVacancyId}`);
    if (!res.ok) throw new Error('فشل تحميل المرشحين المؤهلين');
    return res.json();
  },
}));
