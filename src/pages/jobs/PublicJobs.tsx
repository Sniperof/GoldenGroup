import { useEffect, useState } from 'react';
import type { JobVacancy } from '../../lib/types';
import {
  Briefcase, MapPin, Users, Calendar, GraduationCap, Car, Search,
  Send, ChevronDown, AlertTriangle, CheckCircle, X, User, Phone, Mail,
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ApplicantForm {
  firstName: string; lastName: string; dob: string; gender: string;
  maritalStatus: string; email: string; mobileNumber: string;
  governorate: string; city: string; subArea: string; neighborhood: string;
  detailedAddress: string; cvUrl: string; photoUrl: string;
}

interface ReferrerForm {
  type: 'Employee' | 'Customer'; employeeId: string; fullName: string;
  mobileNumber: string; governorate: string; city: string; profession: string; notes: string;
}

const emptyApplicant: ApplicantForm = {
  firstName: '', lastName: '', dob: '', gender: '', maritalStatus: '',
  email: '', mobileNumber: '', governorate: '', city: '', subArea: '',
  neighborhood: '', detailedAddress: '', cvUrl: '', photoUrl: '',
};

const emptyReferrer: ReferrerForm = {
  type: 'Customer', employeeId: '', fullName: '', mobileNumber: '',
  governorate: '', city: '', profession: '', notes: '',
};

export default function PublicJobs() {
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVacancy, setSelectedVacancy] = useState<JobVacancy | null>(null);
  const [submissionType, setSubmissionType] = useState<'Self' | 'On-Behalf'>('Self');
  const [applicant, setApplicant] = useState<ApplicantForm>({ ...emptyApplicant });
  const [referrer, setReferrer] = useState<ReferrerForm>({ ...emptyReferrer });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/public/vacancies')
      .then(r => r.json())
      .then(data => { setVacancies(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredVacancies = vacancies.filter(v =>
    v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.branch || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!applicant.firstName.trim()) e.firstName = 'الاسم الأول مطلوب';
    if (!applicant.mobileNumber.trim()) e.mobileNumber = 'رقم الهاتف مطلوب';
    else if (!/^\d{10,11}$/.test(applicant.mobileNumber)) e.mobileNumber = 'رقم الهاتف يجب أن يكون 10-11 رقم';
    if (applicant.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicant.email)) e.email = 'صيغة البريد الإلكتروني غير صحيحة';
    if (submissionType === 'On-Behalf' && !referrer.fullName.trim()) e.referrerName = 'اسم المُعرّف مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!selectedVacancy) return;
    if (!validate()) return;

    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/public/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobVacancyId: selectedVacancy.id,
          submissionType,
          source: 'Website',
          applicant,
          referrer: submissionType === 'On-Behalf' ? referrer : undefined,
        }),
      });
      if (res.ok) {
        setSubmitResult({ success: true, message: 'تم تقديم الطلب بنجاح! سيتم مراجعته من قبل فريق الموارد البشرية.' });
        setApplicant({ ...emptyApplicant });
        setReferrer({ ...emptyReferrer });
        setSelectedVacancy(null);
      } else {
        const err = await res.json();
        setSubmitResult({ success: false, message: err.error || 'حدث خطأ أثناء تقديم الطلب' });
      }
    } catch {
      setSubmitResult({ success: false, message: 'خطأ في الاتصال بالخادم' });
    } finally {
      setSubmitting(false);
    }
  };

  const setApplicantField = (key: keyof ApplicantForm, value: string) => {
    setApplicant(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };
  const setReferrerField = (key: keyof ReferrerForm, value: string) => {
    setReferrer(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-full overflow-y-auto p-6" dir="rtl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">الوظائف المتاحة</h1>
        <p className="text-slate-500">تصفح الشواغر الوظيفية المتاحة وقدّم طلبك الآن</p>
      </div>

      {/* Submit Result Toast */}
      <AnimatePresence>
        {submitResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${submitResult.success
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {submitResult.success ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium flex-1">{submitResult.message}</span>
            <button onClick={() => setSubmitResult(null)} className="p-1 rounded-lg hover:bg-black/5"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vacancy Selection or Application Form */}
      {!selectedVacancy ? (
        <>
          {/* Search */}
          <div className="max-w-xl mx-auto mb-6">
            <div className="relative">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pr-12 pl-4 py-3.5 text-sm shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="ابحث عن وظيفة..."
              />
            </div>
          </div>

          {/* Vacancy Cards */}
          {loading ? (
            <div className="text-center py-16 text-slate-400">
              <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
              جاري التحميل...
            </div>
          ) : filteredVacancies.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">لا توجد شواغر وظيفية متاحة حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
              {filteredVacancies.map(v => (
                <motion.div
                  key={v.id}
                  whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}
                  className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer transition-all hover:border-sky-300"
                  onClick={() => { setSelectedVacancy(v); setSubmitResult(null); }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-bold text-slate-800 leading-snug">{v.title}</h3>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold shrink-0 mr-2">
                      مفتوحة
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-500">
                    {v.branch && (
                      <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{v.branch}</div>
                    )}
                    {(v.requiredAgeMin || v.requiredAgeMax) && (
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" />
                        العمر: {v.requiredAgeMin || '—'} - {v.requiredAgeMax || '—'} سنة
                      </div>
                    )}
                    {v.requiredQualification && (
                      <div className="flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" />{v.requiredQualification}</div>
                    )}
                    {v.requiredSkills && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                        <span className="line-clamp-2">{v.requiredSkills}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{v.startDate ? new Date(v.startDate).toLocaleDateString('ar-IQ') : '—'}</span>
                    {v.drivingLicenseRequired && <span className="flex items-center gap-1 text-amber-500"><Car className="w-3 h-3" />رخصة قيادة</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Application Form */
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setSelectedVacancy(null)}
            className="mb-4 text-sm text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
          >
            ← العودة إلى قائمة الوظائف
          </button>

          {/* Selected Vacancy Summary */}
          <div className="bg-gradient-to-l from-sky-50 to-indigo-50 rounded-2xl border border-sky-200 p-5 mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">{selectedVacancy.title}</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              {selectedVacancy.branch && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{selectedVacancy.branch}</span>}
              {selectedVacancy.requiredQualification && <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{selectedVacancy.requiredQualification}</span>}
            </div>
          </div>

          {/* Single-Page Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-8">
            {/* Submission Type */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">نوع التقديم</label>
              <div className="flex gap-3">
                {(['Self', 'On-Behalf'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setSubmissionType(t)}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium border-2 transition-all ${
                      submissionType === t
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {t === 'Self' ? 'تقديم شخصي' : 'تقديم نيابة عن مرشح'}
                  </button>
                ))}
              </div>
            </div>

            {/* Personal Info */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-sky-500" /> المعلومات الشخصية
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">الاسم الأول *</label>
                  <input value={applicant.firstName} onChange={e => setApplicantField('firstName', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 ${errors.firstName ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">اسم العائلة</label>
                  <input value={applicant.lastName} onChange={e => setApplicantField('lastName', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">تاريخ الميلاد</label>
                  <input type="date" value={applicant.dob} onChange={e => setApplicantField('dob', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">الجنس</label>
                  <select value={applicant.gender} onChange={e => setApplicantField('gender', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">اختر</option>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">الحالة الاجتماعية</label>
                  <select value={applicant.maritalStatus} onChange={e => setApplicantField('maritalStatus', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">اختر</option>
                    <option value="أعزب">أعزب</option>
                    <option value="متزوج">متزوج</option>
                    <option value="مطلق">مطلق</option>
                    <option value="أرمل">أرمل</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4 text-sky-500" /> معلومات الاتصال
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">رقم الهاتف *</label>
                  <input value={applicant.mobileNumber} onChange={e => setApplicantField('mobileNumber', e.target.value)}
                    placeholder="07XXXXXXXXX"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 ${errors.mobileNumber ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  />
                  {errors.mobileNumber && <p className="text-xs text-red-500 mt-1">{errors.mobileNumber}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">البريد الإلكتروني</label>
                  <input value={applicant.email} onChange={e => setApplicantField('email', e.target.value)}
                    type="email" placeholder="example@email.com"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 ${errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Home className="w-4 h-4 text-sky-500" /> العنوان
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">المحافظة</label>
                  <input value={applicant.governorate} onChange={e => setApplicantField('governorate', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">المدينة</label>
                  <input value={applicant.city} onChange={e => setApplicantField('city', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">المنطقة الفرعية</label>
                  <input value={applicant.subArea} onChange={e => setApplicantField('subArea', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">الحي</label>
                  <input value={applicant.neighborhood} onChange={e => setApplicantField('neighborhood', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">العنوان التفصيلي</label>
                  <input value={applicant.detailedAddress} onChange={e => setApplicantField('detailedAddress', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-500" /> المرفقات
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">رابط السيرة الذاتية (CV)</label>
                  <input value={applicant.cvUrl} onChange={e => setApplicantField('cvUrl', e.target.value)}
                    placeholder="https://..." className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">رابط الصورة الشخصية</label>
                  <input value={applicant.photoUrl} onChange={e => setApplicantField('photoUrl', e.target.value)}
                    placeholder="https://..." className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Referrer Section (Conditional) */}
            <AnimatePresence>
              {submissionType === 'On-Behalf' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                    <h3 className="text-sm font-bold text-amber-800 mb-4">معلومات المُعرّف / الوسيط</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">نوع المُعرّف</label>
                        <select value={referrer.type} onChange={e => setReferrerField('type', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 bg-white"
                        >
                          <option value="Customer">زبون</option>
                          <option value="Employee">موظف</option>
                        </select>
                      </div>
                      {referrer.type === 'Employee' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">رقم الموظف</label>
                          <input value={referrer.employeeId} onChange={e => setReferrerField('employeeId', e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 bg-white"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">اسم المُعرّف *</label>
                        <input value={referrer.fullName} onChange={e => setReferrerField('fullName', e.target.value)}
                          className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 bg-white ${errors.referrerName ? 'border-red-300' : 'border-slate-200'}`}
                        />
                        {errors.referrerName && <p className="text-xs text-red-500 mt-1">{errors.referrerName}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">رقم هاتف المُعرّف</label>
                        <input value={referrer.mobileNumber} onChange={e => setReferrerField('mobileNumber', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">المهنة</label>
                        <input value={referrer.profession} onChange={e => setReferrerField('profession', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات</label>
                        <textarea value={referrer.notes} onChange={e => setReferrerField('notes', e.target.value)}
                          rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50 text-sm"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'جاري التقديم...' : 'تقديم الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
