import { useEffect, useState, useCallback } from 'react';
import type { JobVacancy } from '../../lib/types';
import {
  Briefcase, MapPin, Users, Calendar, GraduationCap, Car, Search,
  Send, AlertTriangle, CheckCircle, X, User, Phone, Home, BookOpen,
  Globe, DollarSign, Monitor, AlertCircle, WifiOff, PartyPopper,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ApplicantForm {
  firstName: string; lastName: string; dob: string; gender: string;
  maritalStatus: string; email: string; mobileNumber: string; secondaryMobile: string;
  governorate: string; cityOrArea: string; subArea: string; neighborhood: string;
  detailedAddress: string; cvUrl: string; photoUrl: string;
  academicQualification: string; previousEmployment: string;
  drivingLicense: string; expectedSalary: string;
  computerSkills: string; foreignLanguages: string;
  yearsOfExperience: string; applicantSegment: string;
}

interface ReferrerForm {
  type: 'Employee' | 'Customer'; employeeId: string;
  fullName: string; lastName: string; mobileNumber: string;
  governorate: string; cityOrArea: string; subArea: string;
  neighborhood: string; detailedAddress: string;
  referrerWork: string; referrerNotes: string;
}

const emptyApplicant: ApplicantForm = {
  firstName: '', lastName: '', dob: '', gender: '', maritalStatus: '',
  email: '', mobileNumber: '', secondaryMobile: '',
  governorate: '', cityOrArea: '', subArea: '', neighborhood: '',
  detailedAddress: '', cvUrl: '', photoUrl: '',
  academicQualification: '', previousEmployment: '',
  drivingLicense: '', expectedSalary: '',
  computerSkills: '', foreignLanguages: '',
  yearsOfExperience: '', applicantSegment: '',
};

const emptyReferrer: ReferrerForm = {
  type: 'Customer', employeeId: '', fullName: '', lastName: '',
  mobileNumber: '', governorate: '', cityOrArea: '', subArea: '',
  neighborhood: '', detailedAddress: '', referrerWork: '', referrerNotes: '',
};

// Required fields for submit validation
const REQUIRED_FIELDS: (keyof ApplicantForm)[] = ['firstName', 'mobileNumber'];

function FieldError({ message }: { message: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-1.5 text-xs text-red-600 mt-1.5 font-medium"
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {message}
    </motion.p>
  );
}

export default function PublicJobs() {
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVacancy, setSelectedVacancy] = useState<JobVacancy | null>(null);
  const [submissionType, setSubmissionType] = useState<'Apply' | 'Refer a Candidate'>('Apply');
  const [applicationSource, setApplicationSource] = useState<string>('Website');
  const [applicant, setApplicant] = useState<ApplicantForm>({ ...emptyApplicant });
  const [referrer, setReferrer] = useState<ReferrerForm>({ ...emptyReferrer });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    type: 'success' | 'error' | 'duplicate' | 'network';
    message: string;
    applicationId?: number;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
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

  // Compute all validation errors (always up to date)
  const computeErrors = useCallback((): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!applicant.firstName.trim()) {
      e.firstName = 'يرجى إدخال اسمك الأول';
    }
    if (!applicant.mobileNumber.trim()) {
      e.mobileNumber = 'يرجى إدخال رقم هاتفك المحمول';
    } else if (!/^\d{10,11}$/.test(applicant.mobileNumber.trim())) {
      e.mobileNumber = 'رقم الهاتف يجب أن يتكون من 10 أو 11 رقماً فقط (مثال: 07XXXXXXXXX)';
    }
    if (applicant.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicant.email.trim())) {
      e.email = 'البريد الإلكتروني غير صحيح — تأكد من الصيغة (مثال: name@domain.com)';
    }
    if (submissionType === 'Refer a Candidate' && !referrer.fullName.trim()) {
      e.referrerName = 'يرجى إدخال اسم المُعرّف';
    }
    return e;
  }, [applicant.firstName, applicant.mobileNumber, applicant.email, submissionType, referrer.fullName]);

  // Which errors are currently visible (touched or submitAttempted)
  const visibleErrors = useCallback((): Record<string, string> => {
    const all = computeErrors();
    if (submitAttempted) return all;
    const visible: Record<string, string> = {};
    for (const key of Object.keys(all)) {
      if (touched[key]) visible[key] = all[key];
    }
    return visible;
  }, [computeErrors, submitAttempted, touched]);

  const currentErrors = visibleErrors();
  const allErrors = computeErrors();
  const errorCount = Object.keys(allErrors).length;

  const touchField = (key: string) => {
    setTouched(prev => ({ ...prev, [key]: true }));
  };

  const setApplicantField = (key: keyof ApplicantForm, value: string) => {
    setApplicant(prev => ({ ...prev, [key]: value }));
  };
  const setReferrerField = (key: keyof ReferrerForm, value: string) => {
    setReferrer(prev => ({ ...prev, [key]: value }));
  };

  // Is a required field valid and touched?
  const isFieldValid = (key: string): boolean => {
    return touched[key] === true && !allErrors[key] && REQUIRED_FIELDS.includes(key as keyof ApplicantForm);
  };

  const fieldClass = (key: string, extra?: string) => {
    const hasError = !!currentErrors[key];
    const isValid = isFieldValid(key);
    return [
      'w-full border rounded-lg px-3 py-2.5 text-sm transition-all',
      'focus:outline-none focus:ring-2',
      hasError
        ? 'border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400'
        : isValid
        ? 'border-emerald-400 bg-emerald-50 focus:ring-emerald-300 focus:border-emerald-400'
        : 'border-slate-200 bg-white focus:ring-sky-400 focus:border-sky-400',
      extra || '',
    ].join(' ');
  };

  const translateServerError = (status: number, message: string): {
    type: 'error' | 'duplicate' | 'network'; text: string;
  } => {
    if (status === 409) {
      return {
        type: 'duplicate',
        text: 'لديك طلب توظيف نشط مسبقاً لهذه الوظيفة. لا يمكن التقديم مرتين لنفس الشاغر في الوقت ذاته. يمكنك متابعة طلبك الحالي مع فريق الموارد البشرية.',
      };
    }
    if (status === 404) {
      return { type: 'error', text: 'هذه الوظيفة لم تعد متاحة. يرجى العودة واختيار وظيفة أخرى.' };
    }
    if (status === 400) {
      // Map known Arabic backend messages
      const map: Record<string, string> = {
        'الاسم الأول مطلوب': 'يرجى إدخال الاسم الأول',
        'رقم الهاتف مطلوب': 'يرجى إدخال رقم الهاتف',
        'رقم الهاتف يجب أن يكون 10-11 رقم': 'رقم الهاتف يجب أن يتكون من 10 أو 11 رقماً',
        'صيغة البريد الإلكتروني غير صحيحة': 'البريد الإلكتروني المُدخَل غير صحيح',
        'الشاغر الوظيفي غير مفتوح للتقديم': 'هذه الوظيفة أُغلقت ولم تعد تقبل طلبات جديدة.',
      };
      return { type: 'error', text: map[message] || message || 'بيانات الطلب غير مكتملة. يرجى مراجعة الحقول والمحاولة مجدداً.' };
    }
    return { type: 'error', text: 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مجدداً بعد لحظات.' };
  };

  const handleSubmit = async () => {
    if (!selectedVacancy) return;

    setSubmitAttempted(true);
    const allE = computeErrors();
    if (Object.keys(allE).length > 0) {
      setErrors(allE);
      // Scroll to first error
      setTimeout(() => {
        document.getElementById('error-summary')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/public/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobVacancyId: selectedVacancy.id,
          submissionType,
          applicationSource,
          applicant,
          referrer: submissionType === 'Refer a Candidate' ? referrer : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSubmitResult({
          type: 'success',
          message: 'تم تقديم طلبك بنجاح! سيتم مراجعته من قبل فريق الموارد البشرية وسيتم التواصل معك قريباً.',
          applicationId: data.id,
        });
        setApplicant({ ...emptyApplicant });
        setReferrer({ ...emptyReferrer });
        setTouched({});
        setSubmitAttempted(false);
        setErrors({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const { type, text } = translateServerError(res.status, data.error || '');
        setSubmitResult({ type, message: text });
        setTimeout(() => {
          document.getElementById('submit-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } catch {
      setSubmitResult({
        type: 'network',
        message: 'تعذّر الوصول إلى الخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form state when selecting a vacancy
  const selectVacancy = (v: JobVacancy) => {
    setSelectedVacancy(v);
    setSubmitResult(null);
    setErrors({});
    setTouched({});
    setSubmitAttempted(false);
    setApplicant({ ...emptyApplicant });
    setReferrer({ ...emptyReferrer });
  };

  return (
    <div className="h-full overflow-y-auto p-6" dir="rtl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">الوظائف المتاحة</h1>
        <p className="text-slate-500">تصفح الشواغر الوظيفية المتاحة وقدّم طلبك الآن</p>
      </div>

      {/* Vacancy List or Application Form */}
      {!selectedVacancy ? (
        <>
          {/* Search */}
          <div className="max-w-xl mx-auto mb-6">
            <div className="relative">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pr-12 pl-4 py-3.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="ابحث عن وظيفة..."
              />
            </div>
          </div>

          {/* Vacancy Cards */}
          {loading ? (
            <div className="text-center py-16 text-slate-400">
              <div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
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
                  onClick={() => selectVacancy(v)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-bold text-slate-800 leading-snug">{v.title}</h3>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold shrink-0 mr-2">مفتوحة</span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-500">
                    {v.branch && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{v.branch}</div>}
                    {(v.requiredAgeMin || v.requiredAgeMax) && (
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" />
                        العمر: {v.requiredAgeMin || '—'} - {v.requiredAgeMax || '—'} سنة
                      </div>
                    )}
                    {v.requiredQualification && (
                      <div className="flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" />{v.requiredQualification}</div>
                    )}
                    {v.requiredSpecialization && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">{v.requiredSpecialization}</div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {v.startDate ? new Date(v.startDate).toLocaleDateString('ar-IQ') : '—'}
                    </span>
                    {v.drivingLicenseRequired && (
                      <span className="flex items-center gap-1 text-amber-500"><Car className="w-3 h-3" />رخصة قيادة</span>
                    )}
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
            <ChevronRight className="w-4 h-4" />
            العودة إلى قائمة الوظائف
          </button>

          {/* Success Screen */}
          <AnimatePresence>
            {submitResult?.type === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-10 text-center mb-6"
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PartyPopper className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-800 mb-2">تم تقديم طلبك بنجاح!</h2>
                <p className="text-emerald-700 text-sm mb-1">{submitResult.message}</p>
                {submitResult.applicationId && (
                  <p className="text-xs text-emerald-600 mt-2">رقم الطلب: <span className="font-bold">#{submitResult.applicationId}</span></p>
                )}
                <button
                  onClick={() => { setSelectedVacancy(null); setSubmitResult(null); }}
                  className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all"
                >
                  العودة إلى قائمة الوظائف
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {submitResult?.type !== 'success' && (
            <>
              {/* Selected Vacancy Summary */}
              <div className="bg-gradient-to-l from-sky-50 to-indigo-50 rounded-2xl border border-sky-200 p-5 mb-6">
                <h2 className="text-lg font-bold text-slate-800 mb-1">{selectedVacancy.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  {selectedVacancy.branch && (
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{selectedVacancy.branch}</span>
                  )}
                  {selectedVacancy.requiredQualification && (
                    <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{selectedVacancy.requiredQualification}</span>
                  )}
                </div>
              </div>

              {/* Server Error / Duplicate / Network banners */}
              <AnimatePresence>
                {submitResult && (
                  <motion.div
                    id="submit-result"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`mb-5 p-4 rounded-xl flex items-start gap-3 ${
                      submitResult.type === 'duplicate'
                        ? 'bg-amber-50 border border-amber-300'
                        : submitResult.type === 'network'
                        ? 'bg-slate-50 border border-slate-300'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {submitResult.type === 'duplicate' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      ) : submitResult.type === 'network' ? (
                        <WifiOff className="w-5 h-5 text-slate-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold mb-0.5 ${
                        submitResult.type === 'duplicate' ? 'text-amber-800' :
                        submitResult.type === 'network' ? 'text-slate-700' : 'text-red-700'
                      }`}>
                        {submitResult.type === 'duplicate' ? 'طلب مكرر' :
                         submitResult.type === 'network' ? 'خطأ في الاتصال' : 'تعذّر إرسال الطلب'}
                      </p>
                      <p className={`text-xs leading-relaxed ${
                        submitResult.type === 'duplicate' ? 'text-amber-700' :
                        submitResult.type === 'network' ? 'text-slate-600' : 'text-red-600'
                      }`}>
                        {submitResult.message}
                      </p>
                    </div>
                    <button onClick={() => setSubmitResult(null)} className="p-1 rounded-lg hover:bg-black/5 shrink-0">
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Validation Error Summary Banner */}
              <AnimatePresence>
                {submitAttempted && errorCount > 0 && (
                  <motion.div
                    id="error-summary"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-700 font-medium flex-1">
                      يوجد <span className="font-bold">{errorCount}</span> {errorCount === 1 ? 'حقل يحتاج' : 'حقول تحتاج'} إلى مراجعة — يرجى تصحيحها للمتابعة
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-8">

                {/* Required fields legend */}
                <p className="text-xs text-slate-400">الحقول المُشار إليها بـ <span className="text-red-500 font-bold">*</span> إلزامية</p>

                {/* Submission Type */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">نوع التقديم</label>
                  <div className="flex gap-3">
                    {(['Apply', 'Refer a Candidate'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSubmissionType(t)}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium border-2 transition-all ${
                          submissionType === t
                            ? 'border-sky-500 bg-sky-50 text-sky-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {t === 'Apply' ? 'تقديم شخصي' : 'تقديم نيابة عن مرشح'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Application Source */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">مصدر الطلب</label>
                  <select
                    value={applicationSource}
                    onChange={e => setApplicationSource(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="Website">الموقع الإلكتروني</option>
                    <option value="Mobile App">تطبيق الجوال</option>
                    <option value="External Platforms">منصات خارجية</option>
                    <option value="Internal">داخلي</option>
                  </select>
                </div>

                {/* Personal Info */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-sky-500" /> المعلومات الشخصية
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        الاسم الأول <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          value={applicant.firstName}
                          onChange={e => setApplicantField('firstName', e.target.value)}
                          onBlur={() => touchField('firstName')}
                          className={fieldClass('firstName')}
                          placeholder="أدخل اسمك الأول"
                        />
                        {isFieldValid('firstName') && (
                          <CheckCircle className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                      <AnimatePresence>
                        {currentErrors.firstName && <FieldError message={currentErrors.firstName} />}
                      </AnimatePresence>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">اسم العائلة</label>
                      <input
                        value={applicant.lastName}
                        onChange={e => setApplicantField('lastName', e.target.value)}
                        className={fieldClass('lastName')}
                        placeholder="أدخل اسم العائلة"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">تاريخ الميلاد</label>
                      <input
                        type="date"
                        value={applicant.dob}
                        onChange={e => setApplicantField('dob', e.target.value)}
                        className={fieldClass('dob')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">الجنس</label>
                      <select
                        value={applicant.gender}
                        onChange={e => setApplicantField('gender', e.target.value)}
                        className={fieldClass('gender')}
                      >
                        <option value="">اختر الجنس</option>
                        <option value="ذكر">ذكر</option>
                        <option value="أنثى">أنثى</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">الحالة الاجتماعية</label>
                      <select
                        value={applicant.maritalStatus}
                        onChange={e => setApplicantField('maritalStatus', e.target.value)}
                        className={fieldClass('maritalStatus')}
                      >
                        <option value="">اختر الحالة</option>
                        <option value="أعزب">أعزب</option>
                        <option value="متزوج">متزوج</option>
                        <option value="مطلق">مطلق</option>
                        <option value="أرمل">أرمل</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">شريحة المتقدم</label>
                      <select
                        value={applicant.applicantSegment}
                        onChange={e => setApplicantField('applicantSegment', e.target.value)}
                        className={fieldClass('applicantSegment')}
                      >
                        <option value="">اختر الشريحة</option>
                        <option value="طالب عمل">طالب عمل</option>
                        <option value="موظف حالي">موظف حالي</option>
                        <option value="خريج">خريج</option>
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
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        رقم الهاتف <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          value={applicant.mobileNumber}
                          onChange={e => setApplicantField('mobileNumber', e.target.value)}
                          onBlur={() => touchField('mobileNumber')}
                          placeholder="07XXXXXXXXX"
                          inputMode="numeric"
                          className={fieldClass('mobileNumber')}
                        />
                        {isFieldValid('mobileNumber') && (
                          <CheckCircle className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                      <AnimatePresence>
                        {currentErrors.mobileNumber && <FieldError message={currentErrors.mobileNumber} />}
                      </AnimatePresence>
                      {!currentErrors.mobileNumber && !touched.mobileNumber && (
                        <p className="text-xs text-slate-400 mt-1">مثال: 07XXXXXXXXX (10 أو 11 رقماً)</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">رقم هاتف بديل</label>
                      <input
                        value={applicant.secondaryMobile}
                        onChange={e => setApplicantField('secondaryMobile', e.target.value)}
                        placeholder="07XXXXXXXXX"
                        inputMode="numeric"
                        className={fieldClass('secondaryMobile')}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">البريد الإلكتروني</label>
                      <input
                        value={applicant.email}
                        onChange={e => setApplicantField('email', e.target.value)}
                        onBlur={() => { if (applicant.email.trim()) touchField('email'); }}
                        type="email"
                        placeholder="example@email.com"
                        className={fieldClass('email')}
                      />
                      <AnimatePresence>
                        {currentErrors.email && <FieldError message={currentErrors.email} />}
                      </AnimatePresence>
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
                      <input
                        value={applicant.governorate}
                        onChange={e => setApplicantField('governorate', e.target.value)}
                        className={fieldClass('governorate')}
                        placeholder="مثال: بغداد"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">المدينة / المنطقة</label>
                      <input
                        value={applicant.cityOrArea}
                        onChange={e => setApplicantField('cityOrArea', e.target.value)}
                        className={fieldClass('cityOrArea')}
                        placeholder="مثال: الكرادة"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">المنطقة الفرعية</label>
                      <input
                        value={applicant.subArea}
                        onChange={e => setApplicantField('subArea', e.target.value)}
                        className={fieldClass('subArea')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">الحي</label>
                      <input
                        value={applicant.neighborhood}
                        onChange={e => setApplicantField('neighborhood', e.target.value)}
                        className={fieldClass('neighborhood')}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">العنوان التفصيلي</label>
                      <input
                        value={applicant.detailedAddress}
                        onChange={e => setApplicantField('detailedAddress', e.target.value)}
                        className={fieldClass('detailedAddress')}
                        placeholder="رقم البيت، الشارع، ..."
                      />
                    </div>
                  </div>
                </div>

                {/* Qualifications */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-sky-500" /> المؤهلات والخبرة
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">المؤهل الدراسي</label>
                      <select
                        value={applicant.academicQualification}
                        onChange={e => setApplicantField('academicQualification', e.target.value)}
                        className={fieldClass('academicQualification')}
                      >
                        <option value="">اختر المؤهل</option>
                        <option value="ابتدائي">ابتدائي</option>
                        <option value="متوسط">متوسط</option>
                        <option value="إعدادي">إعدادي</option>
                        <option value="بكالوريوس">بكالوريوس</option>
                        <option value="دبلوم">دبلوم</option>
                        <option value="ماجستير">ماجستير</option>
                        <option value="دكتوراه">دكتوراه</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">سنوات الخبرة</label>
                      <input
                        type="number"
                        min="0"
                        value={applicant.yearsOfExperience}
                        onChange={e => setApplicantField('yearsOfExperience', e.target.value)}
                        className={fieldClass('yearsOfExperience')}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">جهة العمل السابقة</label>
                      <input
                        value={applicant.previousEmployment}
                        onChange={e => setApplicantField('previousEmployment', e.target.value)}
                        className={fieldClass('previousEmployment')}
                        placeholder="اسم جهة العمل السابقة (اتركه فارغاً إن لم يكن لديك خبرة)"
                      />
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-sky-500" /> المهارات
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">مهارات الحاسب</label>
                      <input
                        value={applicant.computerSkills}
                        onChange={e => setApplicantField('computerSkills', e.target.value)}
                        className={fieldClass('computerSkills')}
                        placeholder="Word, Excel, ..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> اللغات الأجنبية
                      </label>
                      <input
                        value={applicant.foreignLanguages}
                        onChange={e => setApplicantField('foreignLanguages', e.target.value)}
                        className={fieldClass('foreignLanguages')}
                        placeholder="الإنجليزية، الفرنسية..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                        <Car className="w-3 h-3" /> رخصة القيادة
                      </label>
                      <select
                        value={applicant.drivingLicense}
                        onChange={e => setApplicantField('drivingLicense', e.target.value)}
                        className={fieldClass('drivingLicense')}
                      >
                        <option value="">لا يوجد</option>
                        <option value="A">فئة A</option>
                        <option value="B">فئة B</option>
                        <option value="C">فئة C</option>
                        <option value="D">فئة D</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> الراتب المتوقع (دينار)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={applicant.expectedSalary}
                        onChange={e => setApplicantField('expectedSalary', e.target.value)}
                        className={fieldClass('expectedSalary')}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-sky-500" /> المرفقات
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">رابط السيرة الذاتية (CV)</label>
                      <input
                        value={applicant.cvUrl}
                        onChange={e => setApplicantField('cvUrl', e.target.value)}
                        placeholder="https://..."
                        className={fieldClass('cvUrl')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">رابط الصورة الشخصية</label>
                      <input
                        value={applicant.photoUrl}
                        onChange={e => setApplicantField('photoUrl', e.target.value)}
                        placeholder="https://..."
                        className={fieldClass('photoUrl')}
                      />
                    </div>
                  </div>
                </div>

                {/* Referrer Section (Conditional) */}
                <AnimatePresence>
                  {submissionType === 'Refer a Candidate' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                        <h3 className="text-sm font-bold text-amber-800 mb-4">معلومات المُعرّف / الوسيط</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">نوع المُعرّف</label>
                            <select
                              value={referrer.type}
                              onChange={e => setReferrerField('type', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                            >
                              <option value="Customer">زبون</option>
                              <option value="Employee">موظف</option>
                            </select>
                          </div>
                          {referrer.type === 'Employee' && (
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">رقم الموظف</label>
                              <input
                                value={referrer.employeeId}
                                onChange={e => setReferrerField('employeeId', e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              الاسم الأول <span className="text-red-500">*</span>
                            </label>
                            <input
                              value={referrer.fullName}
                              onChange={e => setReferrerField('fullName', e.target.value)}
                              onBlur={() => touchField('referrerName')}
                              placeholder="اسم المُعرّف"
                              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white transition-all ${
                                currentErrors.referrerName
                                  ? 'border-red-400 bg-red-50 focus:ring-red-300'
                                  : 'border-slate-200 focus:border-sky-400'
                              }`}
                            />
                            <AnimatePresence>
                              {currentErrors.referrerName && <FieldError message={currentErrors.referrerName} />}
                            </AnimatePresence>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">اسم العائلة</label>
                            <input
                              value={referrer.lastName}
                              onChange={e => setReferrerField('lastName', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">رقم الهاتف</label>
                            <input
                              value={referrer.mobileNumber}
                              onChange={e => setReferrerField('mobileNumber', e.target.value)}
                              inputMode="numeric"
                              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">المحافظة</label>
                            <input
                              value={referrer.governorate}
                              onChange={e => setReferrerField('governorate', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">المدينة / المنطقة</label>
                            <input
                              value={referrer.cityOrArea}
                              onChange={e => setReferrerField('cityOrArea', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">مهنة المُعرّف</label>
                            <input
                              value={referrer.referrerWork}
                              onChange={e => setReferrerField('referrerWork', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات</label>
                            <textarea
                              value={referrer.referrerNotes}
                              onChange={e => setReferrerField('referrerNotes', e.target.value)}
                              rows={2}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  {submitAttempted && errorCount > 0 ? (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      أكمل الحقول المطلوبة أولاً
                    </p>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-lg transition-all text-sm ${
                      submitting
                        ? 'bg-sky-400 text-white cursor-not-allowed'
                        : submitAttempted && errorCount > 0
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/25 hover:shadow-sky-500/40'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        تقديم الطلب
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
