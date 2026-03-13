import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplicationListStore } from '../../hooks/useApplicationListStore';
import type { ApplicationStage, ApplicationStatus } from '../../lib/types';
import {
  ClipboardList, Search, Filter, ChevronDown, Eye, AlertTriangle, Calendar
} from 'lucide-react';

const STAGE_COLORS: Record<ApplicationStage, string> = {
  'Submitted': 'bg-blue-100 text-blue-700',
  'Shortlisted': 'bg-purple-100 text-purple-700',
  'Interview': 'bg-amber-100 text-amber-700',
  'Training': 'bg-cyan-100 text-cyan-700',
  'Final Decision': 'bg-emerald-100 text-emerald-700',
};
const STAGE_LABELS: Record<ApplicationStage, string> = {
  'Submitted': 'مقدّم',
  'Shortlisted': 'القائمة القصيرة',
  'Interview': 'مقابلة',
  'Training': 'تدريب',
  'Final Decision': 'القرار النهائي',
};

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-50 text-blue-600', 'In Review': 'bg-indigo-50 text-indigo-600',
  'Qualified': 'bg-emerald-50 text-emerald-600', 'Rejected': 'bg-red-50 text-red-600',
  'Interview Scheduled': 'bg-amber-50 text-amber-600', 'Interview Completed': 'bg-teal-50 text-teal-600',
  'Interview Failed': 'bg-red-50 text-red-600', 'Approved': 'bg-green-50 text-green-600',
  'Training Scheduled': 'bg-cyan-50 text-cyan-600', 'Training Started': 'bg-sky-50 text-sky-600',
  'Training Completed': 'bg-emerald-50 text-emerald-600', 'Retraining': 'bg-orange-50 text-orange-600',
  'Passed': 'bg-green-50 text-green-600',
  'Final Hired': 'bg-emerald-100 text-emerald-700',
  'Final Rejected': 'bg-red-100 text-red-700',
  'Retreated': 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS: Record<string, string> = {
  'New': 'جديد', 'In Review': 'قيد المراجعة', 'Qualified': 'مؤهل', 'Rejected': 'مرفوض',
  'Interview Scheduled': 'مقابلة مجدولة', 'Interview Completed': 'مقابلة مكتملة',
  'Interview Failed': 'فشل المقابلة', 'Approved': 'موافق عليه',
  'Training Scheduled': 'تدريب مجدول', 'Training Started': 'تدريب بدأ',
  'Training Completed': 'تدريب مكتمل', 'Retraining': 'إعادة تدريب',
  'Passed': 'ناجح', 'Final Hired': 'تم التوظيف', 'Final Rejected': 'مرفوض نهائياً', 'Retreated': 'منسحب',
};

const ALL_STAGES: ApplicationStage[] = ['Submitted', 'Shortlisted', 'Interview', 'Training', 'Final Decision'];
const ALL_STATUSES: ApplicationStatus[] = [
  'New', 'In Review', 'Qualified', 'Rejected', 'Interview Scheduled', 'Interview Completed',
  'Interview Failed', 'Approved', 'Training Scheduled', 'Training Started', 'Training Completed',
  'Retraining', 'Passed', 'Final Hired', 'Final Rejected', 'Retreated',
];

export default function Applications() {
  const {
    applications, filters, loading,
    fetchApplications, setFilter, resetFilters
  } = useApplicationListStore();
  const navigate = useNavigate();

  useEffect(() => { fetchApplications(); }, [
    filters.vacancyId, filters.branch, filters.gender,
    filters.stage, filters.status, filters.search,
  ]);

  return (
    <div className="h-full overflow-y-auto p-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-sky-500" />
          طلبات التوظيف
        </h1>
        <p className="text-sm text-slate-500 mt-1">عرض وإدارة جميع طلبات التوظيف المقدمة</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">تصفية:</span>
        </div>
        <div className="relative">
          <select
            value={filters.stage}
            onChange={e => setFilter('stage', e.target.value)}
            className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 focus:ring-2 focus:ring-sky-500"
          >
            <option value="">كل المراحل</option>
            {ALL_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filters.status}
            onChange={e => setFilter('status', e.target.value)}
            className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 focus:ring-2 focus:ring-sky-500"
          >
            <option value="">كل الحالات</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filters.gender}
            onChange={e => setFilter('gender', e.target.value)}
            className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 focus:ring-2 focus:ring-sky-500"
          >
            <option value="">كل الأجناس</option>
            <option value="ذكر">ذكر</option>
            <option value="أنثى">أنثى</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
            placeholder="بحث بالرقم أو الاسم أو رقم الهاتف..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-10 pl-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-sky-500"
          />
        </div>
        {(filters.stage || filters.status || filters.gender || filters.search || filters.branch || filters.vacancyId) && (
          <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-red-500 transition-colors">
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
            جاري التحميل...
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد طلبات توظيف</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">#</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">تاريخ التقديم</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الاسم الكامل</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الوظيفة</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الفرع</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">المرحلة</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">الحالة</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">تكرار</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">عرض</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, idx) => (
                  <tr
                    key={app.id}
                    className={`border-b border-slate-100 hover:bg-sky-50/40 transition-colors cursor-pointer ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}
                    onClick={() => navigate(`/jobs/applications/${app.id}`)}
                  >
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{app.id}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(app.createdAt).toLocaleDateString('ar-IQ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {app.applicantFirstName} {app.applicantLastName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{app.vacancyTitle}</td>
                    <td className="px-4 py-3 text-slate-600">{app.vacancyBranch || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STAGE_COLORS[app.currentStage]}`}>
                        {STAGE_LABELS[app.currentStage]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[app.applicationStatus] || 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABELS[app.applicationStatus] || app.applicationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {app.duplicateFlag && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          تكرار
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
