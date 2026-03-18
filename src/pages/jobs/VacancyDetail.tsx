import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { JobVacancy, JobApplicationListItem, ApplicationStage } from '../../lib/types';
import { authFetch } from '../../lib/authFetch';
import {
  ArrowRight, Briefcase, MapPin, Calendar, Users, GraduationCap, Edit,
  XCircle, RotateCcw, Archive, Lock, X, ChevronDown, AlertTriangle,
  CheckCircle, BarChart2, ClipboardList, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VacancyDetailData extends JobVacancy {
  applicationsCount: number;
  hiredCount: number;
  remainingSlots: number;
}

const BRANCHES = ['بغداد', 'البصرة', 'أربيل', 'الموصل', 'النجف', 'كربلاء'];

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-red-100 text-red-700',
  Archived: 'bg-slate-100 text-slate-500',
};
const STATUS_LABELS: Record<string, string> = {
  Open: 'مفتوحة', Closed: 'مغلقة', Archived: 'مؤرشفة',
};

const STAGE_LABELS: Record<ApplicationStage, string> = {
  Submitted: 'مقدّم', Shortlisted: 'القائمة القصيرة',
  Interview: 'مقابلة', Training: 'تدريب', 'Final Decision': 'القرار النهائي',
};
const STATUS_ROW_COLORS: Record<string, string> = {
  'New': 'bg-blue-50 text-blue-600', 'Final Hired': 'bg-emerald-100 text-emerald-700',
  'Final Rejected': 'bg-red-100 text-red-700', 'Retreated': 'bg-slate-100 text-slate-500',
};

const emptyForm: Partial<JobVacancy> = {
  title: '', branch: '', governorate: null, cityOrArea: null, subArea: null,
  neighborhood: null, detailedAddress: null, workType: null, requiredGender: null,
  requiredAgeMin: null, requiredAgeMax: null, email: null,
  requiredQualification: null, requiredSpecialization: null,
  requiredExperienceYears: null, requiredSkills: null, responsibilities: null,
  drivingLicenseRequired: false, vacancyCount: 1, maxRetrainingCount: 1,
  startDate: '', endDate: '',
};

export default function VacancyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<VacancyDetailData | null>(null);
  const [applications, setApplications] = useState<JobApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<JobVacancy>>({ ...emptyForm });
  const [editTier, setEditTier] = useState<1 | 2 | 3>(1);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const [vacRes, appRes] = await Promise.all([
        authFetch(`/api/admin/vacancies/${id}`),
        authFetch(`/api/admin/applications?vacancyId=${id}&isArchived=false`),
      ]);
      if (vacRes.ok) setDetail(await vacRes.json());
      if (appRes.ok) setApplications(await appRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleStatusChange = async (newStatus: 'Open' | 'Closed' | 'Archived') => {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await authFetch(`/api/admin/vacancies/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      await fetchDetail();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = () => {
    if (!detail) return;
    setFormData({ ...detail });
    setEditTier(1);
    setFormError('');
    setShowModal(true);
  };

  const setField = (key: string, value: any) => setFormData(p => ({ ...p, [key]: value }));

  const isFieldLocked = (field: 'full' | 'partial') => {
    if (field === 'full') return editTier >= 2;
    if (field === 'partial') return editTier >= 3;
    return false;
  };

  const inputCls = (locked: boolean) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 ${
      locked ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-100' : 'border-slate-200'
    }`;

  const handleSave = async () => {
    setFormError('');
    if (!formData.title?.trim()) { setFormError('عنوان الوظيفة مطلوب'); return; }
    if (!formData.branch?.trim()) { setFormError('الفرع مطلوب'); return; }
    if (!formData.vacancyCount || formData.vacancyCount <= 0) { setFormError('عدد الشواغر يجب أن يكون أكبر من 0'); return; }
    if (!formData.startDate) { setFormError('تاريخ البداية مطلوب'); return; }
    if (!formData.endDate) { setFormError('تاريخ النهاية مطلوب'); return; }
    if (formData.startDate > formData.endDate) { setFormError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية'); return; }
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/vacancies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const result = await res.json();
      setEditTier(result.editTier as 1 | 2 | 3);
      setShowModal(false);
      await fetchDetail();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <p>الشاغر غير موجود</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6" dir="rtl">
      {/* Back + Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/jobs/vacancies')}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-sky-500" />
            {detail.title}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{detail.branch} — شاغر #{detail.id}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${STATUS_COLORS[detail.status]}`}>
          {STATUS_LABELS[detail.status]}
        </span>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {actionError}
          <button onClick={() => setActionError('')} className="mr-auto text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'إجمالي الطلبات', value: detail.applicationsCount, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'تم التوظيف', value: detail.hiredCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'الشواغر المتبقية', value: detail.remainingSlots, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 flex items-center gap-4`}>
            <BarChart2 className={`w-8 h-8 ${stat.color} opacity-60`} />
            <div>
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Info Sections */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-sky-500" /> المعلومات الأساسية
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <VRow label="عنوان الوظيفة" value={detail.title} />
              <VRow label="الفرع" value={detail.branch} />
              <VRow label="نوع العمل" value={detail.workType || '—'} />
              <VRow label="الجنس المطلوب" value={detail.requiredGender || 'لا يهم'} />
              <VRow label="البريد الإلكتروني" value={detail.email || '—'} />
              <VRow label="رخصة القيادة" value={detail.drivingLicenseRequired ? 'مطلوبة' : 'غير مطلوبة'} />
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sky-500" /> المتطلبات
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <VRow label="المؤهل المطلوب" value={detail.requiredQualification || '—'} />
              <VRow label="التخصص" value={detail.requiredSpecialization || '—'} />
              <VRow label="سنوات الخبرة" value={detail.requiredExperienceYears?.toString() || '—'} />
              <VRow label="العمر" value={detail.requiredAgeMin || detail.requiredAgeMax ? `${detail.requiredAgeMin || '—'} – ${detail.requiredAgeMax || '—'}` : '—'} />
              {detail.requiredSkills && <VRow label="المهارات المطلوبة" value={detail.requiredSkills} className="col-span-2" />}
              {detail.responsibilities && <VRow label="المسؤوليات" value={detail.responsibilities} className="col-span-2" />}
            </div>
          </div>

          {/* Location */}
          {(detail.governorate || detail.cityOrArea || detail.detailedAddress) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-500" /> الموقع
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <VRow label="المحافظة" value={detail.governorate || '—'} />
                <VRow label="المدينة / المنطقة" value={detail.cityOrArea || '—'} />
                <VRow label="المنطقة الفرعية" value={detail.subArea || '—'} />
                <VRow label="الحي" value={detail.neighborhood || '—'} />
                {detail.detailedAddress && <VRow label="العنوان" value={detail.detailedAddress} className="col-span-2" />}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Dates + Actions */}
        <div className="space-y-4">
          {/* Dates & Count */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500" /> التوقيت والعدد
            </h3>
            <div className="space-y-3 text-sm">
              <VRow label="تاريخ البداية" value={detail.startDate ? new Date(detail.startDate).toLocaleDateString('ar-IQ') : '—'} />
              <VRow label="تاريخ النهاية" value={detail.endDate ? new Date(detail.endDate).toLocaleDateString('ar-IQ') : '—'} />
              <VRow label="عدد الشواغر الأصلي" value={detail.vacancyCount.toString()} />
              <VRow label="حد إعادة التدريب" value={detail.maxRetrainingCount.toString()} />
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">الإجراءات</h3>
            <div className="space-y-2">
              {detail.status !== 'Archived' && (
                <button onClick={openEdit} disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50">
                  <Edit className="w-4 h-4" /> تعديل
                </button>
              )}
              {detail.status === 'Open' && (
                <button onClick={() => handleStatusChange('Closed')} disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 transition-all disabled:opacity-50">
                  <XCircle className="w-4 h-4" /> إغلاق
                </button>
              )}
              {detail.status === 'Closed' && (
                <>
                  <button onClick={() => handleStatusChange('Open')} disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50">
                    <RotateCcw className="w-4 h-4" /> إعادة فتح
                  </button>
                  <button onClick={() => handleStatusChange('Archived')} disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50">
                    <Archive className="w-4 h-4" /> أرشفة
                  </button>
                </>
              )}
              {detail.status === 'Archived' && (
                <button onClick={() => handleStatusChange('Open')} disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50">
                  <RotateCcw className="w-4 h-4" /> إعادة فتح (مدير HR)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Applications Mini Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-sky-500" />
          <h3 className="text-sm font-bold text-slate-700">الطلبات المرتبطة ({applications.length})</h3>
        </div>
        {applications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">لا توجد طلبات لهذا الشاغر</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">#</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الاسم الكامل</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">المرحلة</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">الحالة</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">عرض</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, idx) => (
                  <tr key={app.id} className={`border-b border-slate-100 hover:bg-sky-50/40 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{app.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{app.applicantFirstName} {app.applicantLastName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700">
                        {STAGE_LABELS[app.currentStage]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_ROW_COLORS[app.applicationStatus] || 'bg-slate-100 text-slate-600'}`}>
                        {app.applicationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => navigate(`/jobs/applications/${app.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors">
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

      {/* Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()} dir="rtl">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-bold text-slate-800">تعديل الشاغر الوظيفي</h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-6">
                {formError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{formError}</div>}
                {editTier > 1 && (
                  <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${editTier === 2 ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    <Lock className="w-4 h-4 shrink-0" />
                    {editTier === 2 ? 'تعديل مقيد (مستوى 2): يمكن تعديل تاريخ الانتهاء والمسؤوليات والمهارات والبريد وعدد إعادة التدريب فقط'
                      : 'تعديل مقيد (مستوى 3): يمكن تعديل تاريخ الانتهاء فقط'}
                  </div>
                )}
                {/* Basic */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-600 border-b border-slate-100 pb-2">المعلومات الأساسية</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">عنوان الوظيفة *</label>
                      <input value={formData.title || ''} onChange={e => setField('title', e.target.value)} disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">الفرع *</label>
                      <select value={formData.branch || ''} onChange={e => setField('branch', e.target.value)} disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))}>
                        <option value="">اختر الفرع</option>
                        {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">نوع العمل</label>
                      <select value={formData.workType || ''} onChange={e => setField('workType', e.target.value || null)} disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))}>
                        <option value="">اختر نوع العمل</option>
                        <option value="دوام كامل">دوام كامل</option>
                        <option value="دوام جزئي">دوام جزئي</option>
                        <option value="عقد مؤقت">عقد مؤقت</option>
                      </select>
                    </div>
                  </div>
                </div>
                {/* Requirements */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-600 border-b border-slate-100 pb-2">المتطلبات</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">المؤهل المطلوب</label>
                      <input value={formData.requiredQualification || ''} onChange={e => setField('requiredQualification', e.target.value || null)} disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">التخصص</label>
                      <input value={formData.requiredSpecialization || ''} onChange={e => setField('requiredSpecialization', e.target.value || null)} disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">سنوات الخبرة</label>
                      <input type="number" value={formData.requiredExperienceYears ?? ''} onChange={e => setField('requiredExperienceYears', e.target.value ? parseInt(e.target.value) : null)} disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">البريد الإلكتروني</label>
                      <input type="email" value={formData.email || ''} onChange={e => setField('email', e.target.value || null)} disabled={isFieldLocked('partial')} className={inputCls(isFieldLocked('partial'))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">المهارات المطلوبة</label>
                    <textarea value={formData.requiredSkills || ''} onChange={e => setField('requiredSkills', e.target.value || null)} rows={2} disabled={isFieldLocked('partial')} className={inputCls(isFieldLocked('partial'))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">المسؤوليات</label>
                    <textarea value={formData.responsibilities || ''} onChange={e => setField('responsibilities', e.target.value || null)} rows={2} disabled={isFieldLocked('partial')} className={inputCls(isFieldLocked('partial'))} />
                  </div>
                </div>
                {/* Dates */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-600 border-b border-slate-100 pb-2">التوقيت والعدد</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">تاريخ البداية *</label>
                      <input type="date" value={formData.startDate || ''} onChange={e => setField('startDate', e.target.value)} disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">تاريخ النهاية *</label>
                      <input type="date" value={formData.endDate || ''} onChange={e => setField('endDate', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">عدد الشواغر *</label>
                      <input type="number" min={1} value={formData.vacancyCount ?? 1} onChange={e => setField('vacancyCount', parseInt(e.target.value) || 1)} disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">حد إعادة التدريب</label>
                      <input type="number" min={1} value={formData.maxRetrainingCount ?? 1} onChange={e => setField('maxRetrainingCount', parseInt(e.target.value) || 1)} disabled={isFieldLocked('partial')} className={inputCls(isFieldLocked('partial'))} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">إلغاء</button>
                <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : 'تحديث'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <span className="text-xs text-slate-400 block mb-0.5">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}
