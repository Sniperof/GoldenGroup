import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { JobVacancy } from '../../lib/types';
import { authFetch } from '../../lib/authFetch';
import { useAuthStore } from '../../hooks/useAuthStore';
import {
  ArrowRight, ClipboardList, Send, AlertTriangle, CheckCircle, UserPlus
} from 'lucide-react';

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

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1';
const sectionCls = 'bg-white rounded-2xl border border-slate-200 p-5 space-y-4';

export default function ManualApplicationEntry() {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const [openVacancies, setOpenVacancies] = useState<JobVacancy[]>([]);
  const [vacanciesLoading, setVacanciesLoading] = useState(true);

  const [jobVacancyId, setJobVacancyId] = useState('');
  const [submissionType, setSubmissionType] = useState<'Apply' | 'Refer a Candidate'>('Apply');
  const [applicationSource, setApplicationSource] = useState<'Internal' | 'External Platforms'>('Internal');
  const [enteredByName, setEnteredByName] = useState('');

  const [applicant, setApplicant] = useState<ApplicantForm>({ ...emptyApplicant });
  const [referrer, setReferrer] = useState<ReferrerForm>({ ...emptyReferrer });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ id: number } | null>(null);

  useEffect(() => {
    authFetch('/api/admin/vacancies?status=Open')
      .then(r => r.json())
      .then(data => { setOpenVacancies(data); setVacanciesLoading(false); })
      .catch(() => setVacanciesLoading(false));
  }, []);

  const setA = (key: keyof ApplicantForm, val: string) => setApplicant(p => ({ ...p, [key]: val }));
  const setR = (key: keyof ReferrerForm, val: string) => setReferrer(p => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    setError('');

    if (!jobVacancyId) { setError('يرجى اختيار الشاغر الوظيفي'); return; }
    if (!applicant.firstName.trim()) { setError('الاسم الأول مطلوب'); return; }
    if (!applicant.lastName.trim()) { setError('اسم العائلة مطلوب'); return; }
    if (!applicant.mobileNumber.trim()) { setError('رقم الهاتف مطلوب'); return; }
    if (!/^\d{10,11}$/.test(applicant.mobileNumber)) { setError('رقم الهاتف يجب أن يكون 10-11 رقم'); return; }
    if (!applicant.dob) { setError('تاريخ الميلاد مطلوب'); return; }
    if (!applicant.gender) { setError('الجنس مطلوب'); return; }
    if (!applicant.maritalStatus) { setError('الحالة الاجتماعية مطلوبة'); return; }
    if (!applicant.governorate.trim()) { setError('المحافظة مطلوبة'); return; }
    if (submissionType === 'Refer a Candidate' && !referrer.fullName.trim()) {
      setError('اسم المُعرّف مطلوب عند التقديم نيابة عن مرشح'); return;
    }

    setSubmitting(true);
    try {
      const body: any = {
        jobVacancyId: parseInt(jobVacancyId),
        submissionType,
        applicationSource,
        enteredByName: enteredByName.trim() || authUser?.name || null,
        applicant: {
          firstName: applicant.firstName.trim(),
          lastName: applicant.lastName.trim(),
          dob: applicant.dob,
          gender: applicant.gender,
          maritalStatus: applicant.maritalStatus,
          email: applicant.email.trim() || null,
          mobileNumber: applicant.mobileNumber.trim(),
          secondaryMobile: applicant.secondaryMobile.trim() || null,
          governorate: applicant.governorate.trim(),
          cityOrArea: applicant.cityOrArea.trim() || null,
          subArea: applicant.subArea.trim() || null,
          neighborhood: applicant.neighborhood.trim() || null,
          detailedAddress: applicant.detailedAddress.trim() || null,
          cvUrl: applicant.cvUrl.trim() || null,
          photoUrl: applicant.photoUrl.trim() || null,
          academicQualification: applicant.academicQualification.trim() || null,
          previousEmployment: applicant.previousEmployment.trim() || null,
          drivingLicense: applicant.drivingLicense.trim() || null,
          expectedSalary: applicant.expectedSalary ? applicant.expectedSalary : null,
          computerSkills: applicant.computerSkills.trim() || null,
          foreignLanguages: applicant.foreignLanguages.trim() || null,
          yearsOfExperience: applicant.yearsOfExperience ? applicant.yearsOfExperience : null,
          applicantSegment: applicant.applicantSegment || null,
        },
      };
      if (submissionType === 'Refer a Candidate') {
        body.referrer = {
          type: referrer.type,
          employeeId: referrer.employeeId ? parseInt(referrer.employeeId) : null,
          fullName: referrer.fullName.trim(),
          lastName: referrer.lastName.trim() || null,
          mobileNumber: referrer.mobileNumber.trim() || null,
          governorate: referrer.governorate.trim() || null,
          cityOrArea: referrer.cityOrArea.trim() || null,
          subArea: referrer.subArea.trim() || null,
          neighborhood: referrer.neighborhood.trim() || null,
          detailedAddress: referrer.detailedAddress.trim() || null,
          referrerWork: referrer.referrerWork.trim() || null,
          referrerNotes: referrer.referrerNotes.trim() || null,
        };
      }

      const res = await authFetch('/api/admin/applications', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const result = await res.json();
      setSuccess({ id: result.id });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="h-full flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-md shadow-lg">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">تم تسجيل الطلب بنجاح</h2>
          <p className="text-slate-500 text-sm mb-6">رقم الطلب: <span className="font-bold text-sky-600">#{success.id}</span></p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate(`/jobs/applications/${success.id}`)}
              className="px-5 py-2.5 text-sm font-bold bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors">
              عرض الطلب
            </button>
            <button onClick={() => { setSuccess(null); setApplicant({ ...emptyApplicant }); setReferrer({ ...emptyReferrer }); setJobVacancyId(''); }}
              className="px-5 py-2.5 text-sm font-medium bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
              إدخال طلب جديد
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/jobs/applications')}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-sky-500" /> إدخال طلب توظيف يدوي
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">تسجيل طلب من المصادر الداخلية أو المنصات الخارجية</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError('')} className="mr-auto text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      <div className="space-y-5 max-w-3xl">
        {/* Step 1: Admin fields + Vacancy */}
        <div className={sectionCls}>
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">إعدادات الطلب</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>الشاغر الوظيفي *</label>
              <select value={jobVacancyId} onChange={e => setJobVacancyId(e.target.value)} className={inputCls} disabled={vacanciesLoading}>
                <option value="">{vacanciesLoading ? 'جاري التحميل...' : 'اختر شاغراً مفتوحاً'}</option>
                {openVacancies.map(v => (
                  <option key={v.id} value={v.id}>{v.title} — {v.branch}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>نوع التقديم</label>
              <select value={submissionType} onChange={e => setSubmissionType(e.target.value as any)} className={inputCls}>
                <option value="Apply">شخصي (Apply)</option>
                <option value="Refer a Candidate">نيابة عن مرشح (Refer a Candidate)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>مصدر الطلب *</label>
              <select value={applicationSource} onChange={e => setApplicationSource(e.target.value as any)} className={inputCls}>
                <option value="Internal">Internal (داخلي)</option>
                <option value="External Platforms">External Platforms (منصات خارجية)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>اسم الموظف المُدخِل</label>
              <input value={enteredByName} onChange={e => setEnteredByName(e.target.value)} placeholder="اسم الشخص الذي يسجل الطلب" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Applicant Data */}
        <div className={sectionCls}>
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">بيانات المتقدم</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>الاسم الأول *</label>
              <input value={applicant.firstName} onChange={e => setA('firstName', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>اسم العائلة *</label>
              <input value={applicant.lastName} onChange={e => setA('lastName', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>رقم الهاتف *</label>
              <input value={applicant.mobileNumber} onChange={e => setA('mobileNumber', e.target.value)} className={inputCls} placeholder="07xxxxxxxxx" />
            </div>
            <div>
              <label className={labelCls}>رقم هاتف بديل</label>
              <input value={applicant.secondaryMobile} onChange={e => setA('secondaryMobile', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>تاريخ الميلاد *</label>
              <input type="date" value={applicant.dob} onChange={e => setA('dob', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>الجنس *</label>
              <select value={applicant.gender} onChange={e => setA('gender', e.target.value)} className={inputCls}>
                <option value="">اختر</option>
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>الحالة الاجتماعية *</label>
              <select value={applicant.maritalStatus} onChange={e => setA('maritalStatus', e.target.value)} className={inputCls}>
                <option value="">اختر</option>
                <option value="أعزب">أعزب</option>
                <option value="متزوج">متزوج</option>
                <option value="مطلق">مطلق</option>
                <option value="أرمل">أرمل</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>البريد الإلكتروني</label>
              <input type="email" value={applicant.email} onChange={e => setA('email', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>المحافظة *</label>
              <input value={applicant.governorate} onChange={e => setA('governorate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>المدينة / المنطقة</label>
              <input value={applicant.cityOrArea} onChange={e => setA('cityOrArea', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>المنطقة الفرعية</label>
              <input value={applicant.subArea} onChange={e => setA('subArea', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>الحي</label>
              <input value={applicant.neighborhood} onChange={e => setA('neighborhood', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>العنوان التفصيلي</label>
              <input value={applicant.detailedAddress} onChange={e => setA('detailedAddress', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Qualifications */}
        <div className={sectionCls}>
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">المؤهلات والخبرة</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>المؤهل الدراسي</label>
              <select value={applicant.academicQualification} onChange={e => setA('academicQualification', e.target.value)} className={inputCls}>
                <option value="">اختر</option>
                <option value="ابتدائية">ابتدائية</option>
                <option value="متوسطة">متوسطة</option>
                <option value="إعدادية">إعدادية</option>
                <option value="دبلوم">دبلوم</option>
                <option value="بكالوريوس">بكالوريوس</option>
                <option value="ماجستير">ماجستير</option>
                <option value="دكتوراه">دكتوراه</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>سنوات الخبرة</label>
              <input type="number" min="0" value={applicant.yearsOfExperience} onChange={e => setA('yearsOfExperience', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>جهة العمل السابقة</label>
              <input value={applicant.previousEmployment} onChange={e => setA('previousEmployment', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>الراتب المتوقع (د.ع)</label>
              <input type="number" min="0" value={applicant.expectedSalary} onChange={e => setA('expectedSalary', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>مهارات الحاسب</label>
              <input value={applicant.computerSkills} onChange={e => setA('computerSkills', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>اللغات الأجنبية</label>
              <input value={applicant.foreignLanguages} onChange={e => setA('foreignLanguages', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>رخصة القيادة</label>
              <input value={applicant.drivingLicense} onChange={e => setA('drivingLicense', e.target.value)} placeholder="نوع الرخصة..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>فئة المتقدم</label>
              <select value={applicant.applicantSegment} onChange={e => setA('applicantSegment', e.target.value)} className={inputCls}>
                <option value="">اختر</option>
                <option value="OP">OP</option>
                <option value="FOP">FOP</option>
                <option value="Lead">Lead</option>
                <option value="Visitor">Visitor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Referrer Section — conditional */}
        {submissionType === 'Refer a Candidate' && (
          <div className={sectionCls}>
            <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-500" /> بيانات المُعرّف
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>نوع المُعرّف</label>
                <select value={referrer.type} onChange={e => setR('type', e.target.value)} className={inputCls}>
                  <option value="Customer">زبون</option>
                  <option value="Employee">موظف</option>
                </select>
              </div>
              {referrer.type === 'Employee' && (
                <div>
                  <label className={labelCls}>رقم الموظف</label>
                  <input value={referrer.employeeId} onChange={e => setR('employeeId', e.target.value)} className={inputCls} />
                </div>
              )}
              <div>
                <label className={labelCls}>الاسم الأول *</label>
                <input value={referrer.fullName} onChange={e => setR('fullName', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>اسم العائلة</label>
                <input value={referrer.lastName} onChange={e => setR('lastName', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>رقم الهاتف</label>
                <input value={referrer.mobileNumber} onChange={e => setR('mobileNumber', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>المحافظة</label>
                <input value={referrer.governorate} onChange={e => setR('governorate', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>المدينة / المنطقة</label>
                <input value={referrer.cityOrArea} onChange={e => setR('cityOrArea', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>المهنة</label>
                <input value={referrer.referrerWork} onChange={e => setR('referrerWork', e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>ملاحظات</label>
                <textarea value={referrer.referrerNotes} onChange={e => setR('referrerNotes', e.target.value)} rows={2} className={inputCls} />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-6">
          <button onClick={() => navigate('/jobs/applications')}
            className="px-6 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            إلغاء
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50">
            <Send className="w-4 h-4" />
            {submitting ? 'جاري التسجيل...' : 'تسجيل الطلب'}
          </button>
        </div>
      </div>
    </div>
  );
}
