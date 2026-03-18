import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVacancyStore } from '../../hooks/useVacancyStore';
import type { JobVacancy, VacancyStatus } from '../../lib/types';
import {
  Plus, Search, Filter, Edit, Archive, XCircle, Briefcase, Calendar,
  MapPin, GraduationCap, Users, ChevronDown, X, RotateCcw, Lock, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_COLORS: Record<VacancyStatus, string> = {
  Open: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-red-100 text-red-700',
  Archived: 'bg-slate-100 text-slate-500',
};
const STATUS_LABELS: Record<VacancyStatus, string> = {
  Open: 'مفتوحة', Closed: 'مغلقة', Archived: 'مؤرشفة',
};
const BRANCHES = ['بغداد', 'البصرة', 'أربيل', 'الموصل', 'النجف', 'كربلاء'];

const emptyVacancy: Partial<JobVacancy> = {
  title: '', branch: '', governorate: null, cityOrArea: null, subArea: null,
  neighborhood: null, detailedAddress: null, workType: null, requiredGender: null,
  requiredAgeMin: null, requiredAgeMax: null, email: null,
  requiredQualification: null, requiredSpecialization: null,
  requiredExperienceYears: null, requiredSkills: null, responsibilities: null,
  drivingLicenseRequired: false, vacancyCount: 1, maxRetrainingCount: 1,
  startDate: '', endDate: '',
};

export default function Vacancies() {
  const navigate = useNavigate();
  const {
    vacancies, filters, loading,
    fetchVacancies, setFilter, resetFilters,
    createVacancy, updateVacancy, updateVacancyStatus
  } = useVacancyStore();

  const [showModal, setShowModal] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<JobVacancy | null>(null);
  const [editTier, setEditTier] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<Partial<JobVacancy>>({ ...emptyVacancy });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchVacancies(); }, [filters.status, filters.branch, filters.search]);

  const openCreate = () => {
    setEditingVacancy(null);
    setEditTier(1);
    setFormData({ ...emptyVacancy });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (v: JobVacancy) => {
    setEditingVacancy(v);
    setEditTier(1); // will be updated on save response
    setFormData({ ...v });
    setFormError('');
    setShowModal(true);
  };

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
      if (editingVacancy) {
        const result = await updateVacancy(editingVacancy.id, formData);
        setEditTier(result.editTier as 1 | 2 | 3);
      } else {
        await createVacancy(formData);
      }
      setShowModal(false);
      fetchVacancies();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: number, status: 'Open' | 'Closed' | 'Archived') => {
    try {
      await updateVacancyStatus(id, status);
      fetchVacancies();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const setField = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

  const isFieldLocked = (field: 'full' | 'partial' | 'endOnly') => {
    if (!editingVacancy) return false;
    if (field === 'full') return editTier >= 2;
    if (field === 'partial') return editTier >= 3;
    return false;
  };

  const inputCls = (locked: boolean) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
      locked ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-100' : 'border-slate-200'
    }`;

  return (
    <div className="h-full overflow-y-auto p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-sky-500" />
            إدارة الشواغر الوظيفية
          </h1>
          <p className="text-sm text-slate-500 mt-1">إنشاء وإدارة فرص العمل المتاحة</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-semibold shadow-lg shadow-sky-500/25 transition-all">
          <Plus className="w-5 h-5" /> إنشاء شاغر جديد
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter className="w-4 h-4" /><span className="text-sm font-medium">تصفية:</span>
        </div>
        <div className="relative">
          <select value={filters.status} onChange={e => setFilter('status', e.target.value)}
            className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
            <option value="">كل الحالات</option>
            <option value="Open">مفتوحة</option>
            <option value="Closed">مغلقة</option>
            <option value="Archived">مؤرشفة</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filters.branch} onChange={e => setFilter('branch', e.target.value)}
            className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
            <option value="">كل الفروع</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="بحث بالرقم أو الإسم..." value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-10 pl-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
        </div>
        {(filters.status || filters.branch || filters.search) && (
          <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-red-500 transition-colors">مسح الفلاتر</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
            جاري التحميل...
          </div>
        ) : vacancies.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد شواغر وظيفية</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">#</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">عنوان الوظيفة</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الفرع</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الفترة</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">المؤهل المطلوب</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">الشواغر</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">الحالة</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">عرض</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {vacancies.map((v, idx) => (
                  <tr key={v.id} className={`border-b border-slate-100 hover:bg-sky-50/40 transition-colors cursor-pointer ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}
                    onClick={() => navigate(`/jobs/vacancies/${v.id}`)}>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{v.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{v.title}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{v.branch}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {v.startDate ? new Date(v.startDate).toLocaleDateString('ar-IQ') : '—'}
                        {' → '}
                        {v.endDate ? new Date(v.endDate).toLocaleDateString('ar-IQ') : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5 text-slate-400" />{v.requiredQualification || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                        <Users className="w-3 h-3" />{v.vacancyCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[v.status]}`}>{STATUS_LABELS[v.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/jobs/vacancies/${v.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors" title="عرض التفاصيل">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {v.status !== 'Archived' && (
                          <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors" title="تعديل">
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {v.status === 'Open' && (
                          <button onClick={() => handleStatusChange(v.id, 'Closed')} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="إغلاق">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {v.status === 'Closed' && (
                          <>
                            <button onClick={() => handleStatusChange(v.id, 'Open')} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="إعادة فتح">
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleStatusChange(v.id, 'Archived')} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="أرشفة">
                              <Archive className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()} dir="rtl">

              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-bold text-slate-800">
                  {editingVacancy ? 'تعديل الشاغر الوظيفي' : 'إنشاء شاغر وظيفي جديد'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-6">
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">{formError}</div>
                )}

                {editingVacancy && editTier > 1 && (
                  <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${
                    editTier === 2 ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    <Lock className="w-4 h-4 shrink-0" />
                    {editTier === 2
                      ? 'تعديل مقيد (مستوى 2): توجد طلبات — يمكن تعديل تاريخ الانتهاء والمسؤوليات والمهارات والبريد وعدد إعادة التدريب فقط'
                      : 'تعديل مقيد (مستوى 3): طلبات متقدمة — يمكن تعديل تاريخ الانتهاء فقط'
                    }
                  </div>
                )}

                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-600 border-b border-slate-100 pb-2">المعلومات الأساسية</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">عنوان الوظيفة *</label>
                      <input value={formData.title || ''} onChange={e => setField('title', e.target.value)}
                        disabled={isFieldLocked('full')}
                        className={inputCls(isFieldLocked('full'))} placeholder="مثال: فني صيانة أجهزة" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">الفرع *</label>
                      <select value={formData.branch || ''} onChange={e => setField('branch', e.target.value)}
                        disabled={isFieldLocked('full')}
                        className={inputCls(isFieldLocked('full'))}>
                        <option value="">اختر الفرع</option>
                        {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">نوع العمل</label>
                      <select value={formData.workType || ''} onChange={e => setField('workType', e.target.value || null)}
                        disabled={isFieldLocked('full')}
                        className={inputCls(isFieldLocked('full'))}>
                        <option value="">اختر نوع العمل</option>
                        <option value="دوام كامل">دوام كامل</option>
                        <option value="دوام جزئي">دوام جزئي</option>
                        <option value="عقد مؤقت">عقد مؤقت</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-600 border-b border-slate-100 pb-2">الموقع</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">المحافظة</label>
                      <input value={formData.governorate || ''} onChange={e => setField('governorate', e.target.value || null)}
                        disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">المدينة / المنطقة</label>
                      <input value={formData.cityOrArea || ''} onChange={e => setField('cityOrArea', e.target.value || null)}
                        disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">المنطقة الفرعية</label>
                      <input value={formData.subArea || ''} onChange={e => setField('subArea', e.target.value || null)}
                        disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">الحي</label>
                      <input value={formData.neighborhood || ''} onChange={e => setField('neighborhood', e.target.value || null)}
                        disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">العنوان التفصيلي</label>
                      <input value={formData.detailedAddress || ''} onChange={e => setField('detailedAddress', e.target.value || null)}
                        disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">البريد الإلكتروني للاستفسار</label>
                      <input type="email" value={formData.email || ''} onChange={e => setField('email', e.target.value || null)}
                        disabled={isFieldLocked('partial')} className={inputCls(isFieldLocked('partial'))} />
                    </div>
                  </div>
                </div>

                {/* Requirements */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-600 border-b border-slate-100 pb-2">المتطلبات</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">الجنس المطلوب</label>
                      <select value={formData.requiredGender || ''} onChange={e => setField('requiredGender', e.target.value || null)}
                        disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))}>
                        <option value="">لا يهم</option>
                        <option value="ذكر">ذكر</option>
                        <option value="أنثى">أنثى</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">المؤهل المطلوب</label>
                      <input value={formData.requiredQualification || ''} onChange={e => setField('requiredQualification', e.target.value || null)}
                        disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} placeholder="بكالوريوس هندسة" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">التخصص المطلوب</label>
                      <input value={formData.requiredSpecialization || ''} onChange={e => setField('requiredSpecialization', e.target.value || null)}
                        disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} placeholder="هندسة مدنية / حاسبات..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">سنوات الخبرة</label>
                      <input type="number" value={formData.requiredExperienceYears ?? ''} onChange={e => setField('requiredExperienceYears', e.target.value ? parseInt(e.target.value) : null)}
                        disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">العمر الأدنى</label>
                      <input type="number" value={formData.requiredAgeMin ?? ''} onChange={e => setField('requiredAgeMin', e.target.value ? parseInt(e.target.value) : null)}
                        disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">العمر الأقصى</label>
                      <input type="number" value={formData.requiredAgeMax ?? ''} onChange={e => setField('requiredAgeMax', e.target.value ? parseInt(e.target.value) : null)}
                        disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div className="flex items-center gap-3 pt-5">
                      <input type="checkbox" id="drivingLicense" checked={formData.drivingLicenseRequired || false}
                        onChange={e => setField('drivingLicenseRequired', e.target.checked)}
                        disabled={isFieldLocked('full')}
                        className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500" />
                      <label htmlFor="drivingLicense" className="text-sm text-slate-700">يتطلب رخصة قيادة</label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">المهارات المطلوبة</label>
                    <textarea value={formData.requiredSkills || ''} onChange={e => setField('requiredSkills', e.target.value || null)}
                      rows={2} disabled={isFieldLocked('partial')} className={inputCls(isFieldLocked('partial'))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">المسؤوليات</label>
                    <textarea value={formData.responsibilities || ''} onChange={e => setField('responsibilities', e.target.value || null)}
                      rows={2} disabled={isFieldLocked('partial')} className={inputCls(isFieldLocked('partial'))} />
                  </div>
                </div>

                {/* Dates & Count */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-600 border-b border-slate-100 pb-2">التوقيت والعدد</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">تاريخ البداية *</label>
                      <input type="date" value={formData.startDate || ''} onChange={e => setField('startDate', e.target.value)}
                        disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">تاريخ النهاية *</label>
                      <input type="date" value={formData.endDate || ''} onChange={e => setField('endDate', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">عدد الشواغر *</label>
                      <input type="number" min={1} value={formData.vacancyCount ?? 1}
                        onChange={e => setField('vacancyCount', parseInt(e.target.value) || 1)}
                        disabled={isFieldLocked('full')} className={inputCls(isFieldLocked('full'))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">حد إعادة التدريب</label>
                      <input type="number" min={1} value={formData.maxRetrainingCount ?? 1}
                        onChange={e => setField('maxRetrainingCount', parseInt(e.target.value) || 1)}
                        disabled={isFieldLocked('partial')} className={inputCls(isFieldLocked('partial'))} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">إلغاء</button>
                <button onClick={handleSave} disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : (editingVacancy ? 'تحديث' : 'إنشاء')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
