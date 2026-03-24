import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { JobApplicationDetail, AuditLog, ApplicationStage } from '../../lib/types';
import { authFetch } from '../../lib/authFetch';
import {
  ArrowRight, User, Briefcase, MapPin, Phone, Mail, Calendar, Users, GraduationCap,
  FileText, Clock, CheckCircle, XCircle, UserPlus, AlertTriangle, Award,
  ChevronDown, ChevronUp, ArrowRightLeft, Car, Monitor, Globe, DollarSign, Archive,
  Eye, Minus, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STAGE_LABELS: Record<ApplicationStage, string> = {
  'Submitted': 'مقدّم', 'Shortlisted': 'القائمة القصيرة',
  'Interview': 'مقابلة', 'Training': 'تدريب', 'Final Decision': 'القرار النهائي',
};

const STATUS_LABELS: Record<string, string> = {
  'New': 'جديد', 'In Review': 'قيد المراجعة', 'Qualified': 'مؤهل', 'Rejected': 'مرفوض',
  'Interview Scheduled': 'مقابلة مجدولة', 'Interview Completed': 'مقابلة مكتملة',
  'Interview Failed': 'فشل المقابلة', 'Approved': 'موافق عليه',
  'Training Scheduled': 'تدريب مجدول', 'Training Started': 'تدريب بدأ',
  'Training Completed': 'تدريب مكتمل', 'Retraining': 'إعادة تدريب',
  'Passed': 'ناجح', 'Final Hired': 'تم التوظيف', 'Final Rejected': 'مرفوض نهائياً', 'Retreated': 'منسحب',
};

const STAGES_ORDER: ApplicationStage[] = ['Submitted', 'Shortlisted', 'Interview', 'Training', 'Final Decision'];

const TERMINAL_STATUSES = ['Rejected', 'Interview Failed', 'Final Hired', 'Final Rejected', 'Retreated'];

function getStageActions(stage: ApplicationStage, status: string): { label: string; newStage: string; newStatus: string; variant: 'primary' | 'success' | 'danger' | 'warning'; requiresReason?: boolean }[] {
  switch (stage) {
    case 'Submitted':
      if (status === 'New') return [
        { label: 'بدء المراجعة', newStage: 'Submitted', newStatus: 'In Review', variant: 'primary' },
      ];
      if (status === 'In Review') return [
        { label: 'تأهيل ونقل للقائمة القصيرة', newStage: 'Shortlisted', newStatus: 'Qualified', variant: 'success' },
        { label: 'رفض', newStage: 'Submitted', newStatus: 'Rejected', variant: 'danger', requiresReason: true },
      ];
      return [];
    case 'Shortlisted':
      if (status === 'Qualified') return [
        { label: 'جدولة المقابلة', newStage: 'Interview', newStatus: 'Interview Scheduled', variant: 'primary' },
        { label: 'رفض', newStage: 'Shortlisted', newStatus: 'Rejected', variant: 'danger', requiresReason: true },
      ];
      return [];
    case 'Interview':
      if (status === 'Interview Scheduled') return [
        { label: 'إكمال المقابلة', newStage: 'Interview', newStatus: 'Interview Completed', variant: 'primary' },
      ];
      if (status === 'Interview Completed') return [
        { label: 'موافقة وتحويل للتدريب', newStage: 'Training', newStatus: 'Approved', variant: 'success' },
        { label: 'فشل المقابلة', newStage: 'Interview', newStatus: 'Interview Failed', variant: 'danger', requiresReason: true },
      ];
      return [];
    case 'Training':
      if (status === 'Approved' || status === 'Retraining') return [
        { label: 'جدولة التدريب', newStage: 'Training', newStatus: 'Training Scheduled', variant: 'primary' },
      ];
      if (status === 'Training Scheduled') return [
        { label: 'بدء التدريب', newStage: 'Training', newStatus: 'Training Started', variant: 'primary' },
      ];
      if (status === 'Training Started') return [
        { label: 'إكمال التدريب', newStage: 'Training', newStatus: 'Training Completed', variant: 'success' },
        { label: 'إعادة تدريب', newStage: 'Training', newStatus: 'Retraining', variant: 'warning' },
      ];
      if (status === 'Training Completed') return [
        { label: 'ناجح - تحويل للقرار النهائي', newStage: 'Final Decision', newStatus: 'Passed', variant: 'success' },
      ];
      return [];
    case 'Final Decision':
      return []; // handled by dedicated hire/finalReject/retreat buttons
    default: return [];
  }
}

const VARIANT_STYLES = {
  primary: 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/25',
  success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25',
  danger: 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/25',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25',
};

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<JobApplicationDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'interviews' | 'audit'>('details');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReasonModal, setShowReasonModal] = useState<{ newStage: string; newStatus: string } | null>(null);
  const [showAuditExpanded, setShowAuditExpanded] = useState<number | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const fetchDetail = () => {
    setLoading(true);
    Promise.all([
      authFetch(`/api/admin/applications/${id}`).then(r => r.json()),
      authFetch(`/api/admin/applications/${id}/audit-logs`).then(r => r.json()),
    ]).then(([app, logs]) => {
      setDetail(app && !app.error ? app : null);
      setAuditLogs(Array.isArray(logs) ? logs : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleStageAction = async (newStage: string, newStatus: string, reason?: string) => {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await authFetch(`/api/admin/applications/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: newStage, status: newStatus,
          internalNotes: reason || null,
          performedByRole: 'HR_MANAGER',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      fetchDetail();
      setShowReasonModal(null);
      setRejectReason('');
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleHire = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await authFetch(`/api/admin/applications/${id}/hire`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performedByRole: 'HR_MANAGER' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      fetchDetail();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalReject = () => {
    setShowReasonModal({ newStage: 'Final Decision', newStatus: 'Final Rejected' });
  };

  const handleRetreat = () => {
    handleStageAction(detail!.currentStage, 'Retreated', 'انسحاب');
  };

  const ARCHIVABLE_STATUSES = ['Final Hired', 'Final Rejected', 'Retreated'];

  const handleArchive = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await authFetch(`/api/admin/applications/${id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performedByRole: 'HR_MANAGER' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      fetchDetail();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
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
        <p>الطلب غير موجود</p>
      </div>
    );
  }

  const currentStageIdx = STAGES_ORDER.indexOf(detail.currentStage);
  const actions = getStageActions(detail.currentStage, detail.applicationStatus);
  const isFinalDecision = detail.currentStage === 'Final Decision';
  const isTerminal = TERMINAL_STATUSES.includes(detail.applicationStatus);

  return (
    <div className="h-full overflow-y-auto p-6" dir="rtl">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/jobs/applications')}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">طلب التوظيف #{detail.id}</h1>
          <p className="text-sm text-slate-500">{detail.applicant?.firstName} {detail.applicant?.lastName} — {detail.vacancy?.title}</p>
        </div>
      </div>

      {/* Stage Progress Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between">
          {STAGES_ORDER.map((stage, idx) => (
            <div key={stage} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  idx < currentStageIdx ? 'bg-emerald-500 border-emerald-500 text-white'
                  : idx === currentStageIdx ? 'bg-sky-500 border-sky-500 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}>
                  {idx < currentStageIdx ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                </div>
                <span className={`text-xs mt-2 font-medium ${idx <= currentStageIdx ? 'text-slate-700' : 'text-slate-400'}`}>
                  {STAGE_LABELS[stage]}
                </span>
              </div>
              {idx < STAGES_ORDER.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 rounded ${idx < currentStageIdx ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {actionError}
          <button onClick={() => setActionError('')} className="mr-auto text-red-400 hover:text-red-600"><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'details' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> التفاصيل</span>
        </button>
        <button
          onClick={() => setActiveTab('interviews')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'interviews' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Users className="w-4 h-4" /> المقابلات ({detail.interviews?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'audit' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> سجل التدقيق ({auditLogs.length})</span>
        </button>
      </div>

      {activeTab === 'details' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Applicant Data */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-sky-500" /> بيانات المتقدم
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="الاسم" value={`${detail.applicant?.firstName || ''} ${detail.applicant?.lastName || ''}`} />
                <InfoRow label="تاريخ الميلاد" value={detail.applicant?.dob ? new Date(detail.applicant.dob).toLocaleDateString('ar-IQ') : '—'} />
                <InfoRow label="الجنس" value={detail.applicant?.gender || '—'} />
                <InfoRow label="الحالة الاجتماعية" value={detail.applicant?.maritalStatus || '—'} />
                <InfoRow label="الهاتف" value={detail.applicant?.mobileNumber || '—'} icon={<Phone className="w-3.5 h-3.5" />} />
                <InfoRow label="هاتف بديل" value={detail.applicant?.secondaryMobile || '—'} icon={<Phone className="w-3.5 h-3.5" />} />
                <InfoRow label="البريد الإلكتروني" value={detail.applicant?.email || '—'} icon={<Mail className="w-3.5 h-3.5" />} />
                <InfoRow label="المؤهل الدراسي" value={detail.applicant?.academicQualification || '—'} icon={<GraduationCap className="w-3.5 h-3.5" />} />
                <InfoRow label="سنوات الخبرة" value={detail.applicant?.yearsOfExperience?.toString() || '—'} />
                <InfoRow label="جهة العمل السابقة" value={detail.applicant?.previousEmployment || '—'} />
                <InfoRow label="مهارات الحاسب" value={detail.applicant?.computerSkills || '—'} icon={<Monitor className="w-3.5 h-3.5" />} />
                <InfoRow label="اللغات الأجنبية" value={detail.applicant?.foreignLanguages || '—'} icon={<Globe className="w-3.5 h-3.5" />} />
                <InfoRow label="رخصة القيادة" value={typeof detail.applicant?.drivingLicense === 'boolean' ? (detail.applicant.drivingLicense ? 'نعم' : 'لا') : String(detail.applicant?.drivingLicense || '—')} icon={<Car className="w-3.5 h-3.5" />} />
                <InfoRow label="الراتب المتوقع" value={detail.applicant?.expectedSalary ? `${detail.applicant.expectedSalary} د.ع` : '—'} icon={<DollarSign className="w-3.5 h-3.5" />} />
                <InfoRow label="المحافظة" value={detail.applicant?.governorate || '—'} />
                <InfoRow label="المدينة / المنطقة" value={detail.applicant?.cityOrArea || '—'} />
                <InfoRow label="العنوان التفصيلي" value={detail.applicant?.detailedAddress || '—'} icon={<MapPin className="w-3.5 h-3.5" />} className="col-span-2" />
              </div>
            </div>

            {/* Vacancy Data */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-sky-500" /> بيانات الشاغر الوظيفي
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="عنوان الوظيفة" value={detail.vacancy?.title || '—'} />
                <InfoRow label="الفرع" value={detail.vacancy?.branch || '—'} icon={<MapPin className="w-3.5 h-3.5" />} />
                <InfoRow label="الشهادة العلمية" value={detail.vacancy?.requiredCertificate || '—'} icon={<GraduationCap className="w-3.5 h-3.5" />} />
                <InfoRow label="الاختصاص" value={detail.vacancy?.requiredMajor || '—'} />
                <InfoRow label="سنوات الخبرة" value={detail.vacancy?.requiredExperienceYears?.toString() || '—'} />
                <InfoRow label="الشواغر المتبقية" value={detail.vacancy?.vacancyCount?.toString() || '—'} icon={<Users className="w-3.5 h-3.5" />} />

                <InfoRow label="الفترة"
                  value={`${detail.vacancy?.startDate ? new Date(detail.vacancy.startDate).toLocaleDateString('ar-IQ') : '—'} → ${detail.vacancy?.endDate ? new Date(detail.vacancy.endDate).toLocaleDateString('ar-IQ') : '—'}`}
                  icon={<Calendar className="w-3.5 h-3.5" />} />
              </div>
            </div>

            {/* Referrer Data */}
            {detail.referrer && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-500" /> بيانات المُعرّف
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <InfoRow label="النوع" value={detail.referrer.type === 'Employee' ? 'موظف' : 'زبون'} />
                  <InfoRow label="الاسم" value={`${detail.referrer.fullName || ''} ${detail.referrer.lastName || ''}`} />
                  <InfoRow label="الهاتف" value={detail.referrer.mobileNumber || '—'} icon={<Phone className="w-3.5 h-3.5" />} />
                  <InfoRow label="المهنة" value={detail.referrer.referrerWork || '—'} />
                  <InfoRow label="المحافظة" value={detail.referrer.governorate || '—'} />
                  <InfoRow label="المدينة / المنطقة" value={detail.referrer.cityOrArea || '—'} />
                  {detail.referrer.referrerNotes && (
                    <InfoRow label="ملاحظات" value={detail.referrer.referrerNotes} className="col-span-2" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Stage Management */}
          <div className="space-y-6">
            {/* Current Status */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-sky-500" /> إدارة المراحل
              </h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">المرحلة الحالية</span>
                  <span className="font-bold text-sky-600">{STAGE_LABELS[detail.currentStage]}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">الحالة</span>
                  <span className="font-bold text-slate-700">{STATUS_LABELS[detail.applicationStatus] || detail.applicationStatus}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">نوع التقديم</span>
                  <span className="text-slate-700">
                    {detail.submissionType === 'Apply' ? 'شخصي' : 'نيابة عن مرشح'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">مصدر الطلب</span>
                  <span className="text-slate-700">{detail.applicationSource || '—'}</span>
                </div>
                {detail.isEscalated && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-2">
                    <AlertTriangle className="w-4 h-4" />
                    مُصعَّد للإدارة العليا
                  </div>
                )}
                {detail.duplicateFlag && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 rounded-lg p-2">
                    <AlertTriangle className="w-4 h-4" />
                    تم الكشف عن تكرار سابق
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!isTerminal && (
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  {actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (action.newStatus === 'In Review') {
                          setShowReviewModal(true);
                        } else if (action.requiresReason) {
                          setShowReasonModal({ newStage: action.newStage, newStatus: action.newStatus });
                        } else {
                          handleStageAction(action.newStage, action.newStatus);
                        }
                      }}
                      disabled={actionLoading}
                      className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold shadow-lg transition-all disabled:opacity-50 ${VARIANT_STYLES[action.variant]}`}
                    >
                      {action.label}
                    </button>
                  ))}

                  {/* Final Decision Buttons */}
                  {isFinalDecision && (
                    <>
                      <button onClick={handleHire} disabled={actionLoading}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        <Award className="w-4 h-4" /> توظيف نهائي
                      </button>
                      <button onClick={handleFinalReject} disabled={actionLoading}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 transition-all disabled:opacity-50">
                        رفض نهائي
                      </button>
                      <button onClick={handleRetreat} disabled={actionLoading}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-slate-400 hover:bg-slate-500 text-white shadow-lg shadow-slate-400/25 transition-all disabled:opacity-50">
                        انسحاب
                      </button>
                    </>
                  )}

                  {/* Retreat button available from any non-terminal state */}
                  {!isFinalDecision && (
                    <button onClick={handleRetreat} disabled={actionLoading}
                      className="w-full py-2 px-4 rounded-xl text-xs font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50">
                      انسحاب المتقدم
                    </button>
                  )}
                </div>
              )}

              {isTerminal && (
                <div className={`mt-4 p-3 rounded-xl text-center text-sm font-bold ${
                  detail.applicationStatus === 'Final Hired' ? 'bg-emerald-50 text-emerald-700' :
                  detail.applicationStatus === 'Retreated' ? 'bg-slate-50 text-slate-500' :
                  'bg-red-50 text-red-700'
                }`}>
                  {STATUS_LABELS[detail.applicationStatus] || detail.applicationStatus}
                </div>
              )}

              {/* Archive button — only for archivable terminal statuses */}
              {ARCHIVABLE_STATUSES.includes(detail.applicationStatus) && !detail.isArchived && (
                <button
                  onClick={handleArchive}
                  disabled={actionLoading}
                  className="w-full mt-3 py-2 px-4 rounded-xl text-xs font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Archive className="w-3.5 h-3.5" />
                  أرشفة الطلب
                </button>
              )}
              {detail.isArchived && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl p-2.5 justify-center">
                  <Archive className="w-3.5 h-3.5" />
                  تمت الأرشفة{detail.archivedAt ? ` — ${new Date(detail.archivedAt).toLocaleDateString('ar-IQ')}` : ''}
                </div>
              )}
            </div>

            {/* Internal Notes */}
            {detail.internalNotes && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3">ملاحظات داخلية</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{detail.internalNotes}</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'interviews' ? (
        /* Interviews Tab */
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-500" /> المقابلات
          </h3>
          {!detail.interviews || detail.interviews.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">لا توجد مقابلات مسجلة</p>
          ) : (
            <div className="space-y-3">
              {detail.interviews.map((interview) => (
                <div key={interview.id} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-700">{interview.interviewerName}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      interview.interviewStatus === 'Interview Completed' ? 'bg-teal-100 text-teal-700' :
                      interview.interviewStatus === 'Interview Failed' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {interview.interviewStatus === 'Interview Scheduled' ? 'مجدولة' :
                       interview.interviewStatus === 'Interview Completed' ? 'مكتملة' : 'فشلت'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {interview.interviewDate ? new Date(interview.interviewDate).toLocaleDateString('ar-IQ') : '—'}
                      {interview.interviewTime && ` — ${interview.interviewTime}`}
                    </span>
                    <span>{interview.interviewType === 'HR Interview' ? 'مقابلة HR' : 'مقابلة تقنية'}</span>
                  </div>
                  {interview.internalNotes && (
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg p-2">{interview.internalNotes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Audit Log Tab */
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-500" /> سجل التدقيق
          </h3>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">لا توجد سجلات</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-700">{log.actionType}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleString('ar-IQ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {log.performedByRole && <span>الدور: {log.performedByRole}</span>}
                    {log.entityType && log.entityType !== 'application' && (
                      <span className="text-sky-600">النوع: {log.entityType} #{log.entityId}</span>
                    )}
                    {log.internalReason && <span>السبب: {log.internalReason}</span>}
                  </div>
                  {(log.oldValue || log.newValue) && (
                    <button
                      onClick={() => setShowAuditExpanded(showAuditExpanded === log.id ? null : log.id)}
                      className="mt-2 text-xs text-sky-500 hover:text-sky-600 flex items-center gap-1"
                    >
                      {showAuditExpanded === log.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showAuditExpanded === log.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                    </button>
                  )}
                  <AnimatePresence>
                    {showAuditExpanded === log.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {log.oldValue && (
                            <div className="bg-red-50 rounded-lg p-3">
                              <span className="text-xs font-bold text-red-600 block mb-1">القديم</span>
                              <pre className="text-xs text-red-700 whitespace-pre-wrap">{formatJsonDisplay(log.oldValue)}</pre>
                            </div>
                          )}
                          {log.newValue && (
                            <div className="bg-emerald-50 rounded-lg p-3">
                              <span className="text-xs font-bold text-emerald-600 block mb-1">الجديد</span>
                              <pre className="text-xs text-emerald-700 whitespace-pre-wrap">{formatJsonDisplay(log.newValue)}</pre>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Comparison Modal */}
      <AnimatePresence>
        {showReviewModal && detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            onClick={() => setShowReviewModal(false)}>
            <motion.div initial={{ scale: 0.96, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
              style={{ maxHeight: 'min(92vh, 800px)' }}
              onClick={e => e.stopPropagation()} dir="rtl">

              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-sky-500" /> مراجعة الطلب مقابل متطلبات الشاغر
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    طلب #{detail.id} — {detail.applicant?.firstName} {detail.applicant?.lastName}
                  </p>
                </div>
                <button onClick={() => setShowReviewModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {(() => {
                  const app = detail.applicant;
                  const vac = detail.vacancy;
                  if (!app || !vac) return <p className="text-center text-slate-400">لا توجد بيانات</p>;

                  /* helper to compare and show match icon */
                  type MatchLevel = 'match' | 'mismatch' | 'neutral';
                  const MatchIcon = ({ level }: { level: MatchLevel }) => (
                    level === 'match' ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> :
                    level === 'mismatch' ? <XCircle className="w-4 h-4 text-red-400 shrink-0" /> :
                    <Minus className="w-4 h-4 text-slate-300 shrink-0" />
                  );
                  const matchBorder = (l: MatchLevel) =>
                    l === 'match' ? 'border-emerald-200 bg-emerald-50/40' :
                    l === 'mismatch' ? 'border-red-200 bg-red-50/30' :
                    'border-slate-100 bg-slate-50/40';

                  /* determine match levels */
                  const genderMatch: MatchLevel = !vac.requiredGender ? 'neutral' :
                    app.gender === vac.requiredGender ? 'match' : 'mismatch';

                  const certMatch: MatchLevel = !vac.requiredCertificate ? 'neutral' :
                    app.academicQualification === vac.requiredCertificate ? 'match' : 'mismatch';

                  const expMatch: MatchLevel = vac.requiredExperienceYears == null ? 'neutral' :
                    (app.yearsOfExperience ?? 0) >= vac.requiredExperienceYears ? 'match' : 'mismatch';

                  const dlMatch: MatchLevel = !vac.drivingLicenseRequired ? 'neutral' :
                    app.drivingLicense ? 'match' : 'mismatch';

                  const appAge = app.dob
                    ? Math.floor((Date.now() - new Date(app.dob).getTime()) / 31557600000)
                    : null;
                  const ageMatch: MatchLevel = (!vac.requiredAgeMin && !vac.requiredAgeMax) || appAge == null ? 'neutral' :
                    ((!vac.requiredAgeMin || appAge >= vac.requiredAgeMin) && (!vac.requiredAgeMax || appAge <= vac.requiredAgeMax)) ? 'match' : 'mismatch';

                  const totalCriteria = [genderMatch, certMatch, expMatch, dlMatch, ageMatch];
                  const matchCount = totalCriteria.filter(m => m === 'match').length;
                  const mismatchCount = totalCriteria.filter(m => m === 'mismatch').length;
                  const neutralCount = totalCriteria.filter(m => m === 'neutral').length;

                  const rows: { label: string; applicant: string; vacancy: string; level: MatchLevel }[] = [
                    { label: 'الجنس', applicant: app.gender || '—', vacancy: vac.requiredGender || 'لا يهم', level: genderMatch },
                    { label: 'العمر', applicant: appAge != null ? `${appAge} سنة` : '—', vacancy: (vac.requiredAgeMin || vac.requiredAgeMax) ? `${vac.requiredAgeMin || '—'} – ${vac.requiredAgeMax || '—'} سنة` : 'لا يهم', level: ageMatch },
                    { label: 'المؤهل العلمي', applicant: app.academicQualification || '—', vacancy: vac.requiredCertificate || 'لا يهم', level: certMatch },
                    { label: 'سنوات الخبرة', applicant: app.yearsOfExperience?.toString() || '0', vacancy: vac.requiredExperienceYears != null ? `${vac.requiredExperienceYears}+` : 'لا يهم', level: expMatch },
                    { label: 'رخصة القيادة', applicant: app.drivingLicense ? 'نعم' : 'لا', vacancy: vac.drivingLicenseRequired ? 'مطلوبة' : 'غير مطلوبة', level: dlMatch },
                  ];

                  return (
                    <div className="space-y-5">
                      {/* Summary bar */}
                      <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-4">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-bold text-emerald-700">{matchCount} مطابق</span>
                        </div>
                        <div className="w-px h-5 bg-slate-200" />
                        <div className="flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-bold text-red-600">{mismatchCount} غير مطابق</span>
                        </div>
                        <div className="w-px h-5 bg-slate-200" />
                        <div className="flex items-center gap-1.5">
                          <Minus className="w-4 h-4 text-slate-300" />
                          <span className="text-sm font-bold text-slate-500">{neutralCount} غير محدد</span>
                        </div>
                        <div className="mr-auto">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            mismatchCount === 0 ? 'bg-emerald-100 text-emerald-700' :
                            mismatchCount <= 1 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {mismatchCount === 0 ? 'ملاءمة ممتازة' : mismatchCount <= 1 ? 'ملاءمة جزئية' : 'ملاءمة ضعيفة'}
                          </span>
                        </div>
                      </div>

                      {/* Comparison table */}
                      <div className="rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="grid grid-cols-[1fr_1fr_auto_1fr] bg-slate-50 border-b border-slate-200">
                          <div className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">المعيار</div>
                          <div className="px-4 py-3 text-xs font-bold text-sky-600 uppercase tracking-widest flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> المتقدم</div>
                          <div className="px-4 py-3"></div>
                          <div className="px-4 py-3 text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> الشاغر</div>
                        </div>
                        {rows.map((row, i) => (
                          <div key={row.label} className={`grid grid-cols-[1fr_1fr_auto_1fr] items-center border-b last:border-b-0 ${matchBorder(row.level)} ${i % 2 === 0 ? '' : 'bg-opacity-60'}`}>
                            <div className="px-4 py-3 text-sm font-semibold text-slate-700">{row.label}</div>
                            <div className="px-4 py-3 text-sm text-slate-600">{row.applicant}</div>
                            <div className="px-2 py-3"><MatchIcon level={row.level} /></div>
                            <div className="px-4 py-3 text-sm text-slate-600">{row.vacancy}</div>
                          </div>
                        ))}
                      </div>

                      {/* Extra applicant info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4">
                          <p className="text-[11px] font-bold text-sky-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> بيانات المتقدم الإضافية
                          </p>
                          <div className="space-y-2 text-sm">
                            <div><span className="text-xs text-slate-400">الهاتف:</span> <span className="text-slate-700 font-mono" dir="ltr">{app.mobileNumber || '—'}</span></div>
                            <div><span className="text-xs text-slate-400">البريد:</span> <span className="text-slate-700">{app.email || '—'}</span></div>
                            <div><span className="text-xs text-slate-400">مهارات الحاسب:</span> <span className="text-slate-700">{app.computerSkills || '—'}</span></div>
                            <div><span className="text-xs text-slate-400">اللغات:</span> <span className="text-slate-700">{app.foreignLanguages || '—'}</span></div>
                            <div><span className="text-xs text-slate-400">جهة العمل السابقة:</span> <span className="text-slate-700">{app.previousEmployment || '—'}</span></div>
                            <div><span className="text-xs text-slate-400">الموقع:</span> <span className="text-slate-700">{[app.governorate, app.cityOrArea].filter(Boolean).join(' / ') || '—'}</span></div>
                          </div>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" /> متطلبات الشاغر الإضافية
                          </p>
                          <div className="space-y-2 text-sm">
                            <div><span className="text-xs text-slate-400">نوع العمل:</span> <span className="text-slate-700">{vac.workType || '—'}</span></div>
                            <div><span className="text-xs text-slate-400">الاختصاص:</span> <span className="text-slate-700">{vac.requiredMajor || '—'}</span></div>
                            <div><span className="text-xs text-slate-400">المهارات:</span> <span className="text-slate-700">{vac.requiredSkills || '—'}</span></div>
                            <div><span className="text-xs text-slate-400">المسؤوليات:</span> <span className="text-slate-700">{vac.responsibilities || '—'}</span></div>
                            <div><span className="text-xs text-slate-400">الموقع:</span> <span className="text-slate-700">{[vac.governorate, vac.cityOrArea].filter(Boolean).join(' / ') || '—'}</span></div>
                            <div><span className="text-xs text-slate-400">الشواغر:</span> <span className="text-slate-700">{vac.vacancyCount}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center justify-between bg-white">
                <button onClick={() => setShowReviewModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  إغلاق
                </button>
                <div className="flex items-center gap-3">
                  <button onClick={() => {
                    setShowReviewModal(false);
                    setShowReasonModal({ newStage: 'Submitted', newStatus: 'Rejected' });
                  }} className="px-5 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                    رفض
                  </button>
                  <button onClick={() => {
                    setShowReviewModal(false);
                    handleStageAction('Submitted', 'In Review');
                  }} disabled={actionLoading}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50 flex items-center gap-2">
                    {actionLoading ? 'جاري...' : <><CheckCircle className="w-4 h-4" /> تأكيد بدء المراجعة</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reason Modal */}
      <AnimatePresence>
        {showReasonModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
            onClick={() => setShowReasonModal(null)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" dir="rtl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-800 mb-4">سبب القرار</h3>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="أدخل السبب (اختياري)..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500 mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowReasonModal(null); setRejectReason(''); }}
                  className="px-5 py-2.5 text-sm bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
                  إلغاء
                </button>
                <button
                  onClick={() => handleStageAction(showReasonModal.newStage, showReasonModal.newStatus, rejectReason)}
                  disabled={actionLoading}
                  className="px-5 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-bold shadow-lg shadow-red-500/25 transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'جاري...' : 'تأكيد'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ label, value, icon, className }: { label: string; value: string; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <span className="text-xs text-slate-400 block mb-0.5">{label}</span>
      <span className="text-slate-700 flex items-center gap-1.5">
        {icon && <span className="text-slate-400">{icon}</span>}
        {value}
      </span>
    </div>
  );
}

function formatJsonDisplay(str: string): string {
  try {
    const obj = JSON.parse(str);
    return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join('\n');
  } catch {
    return str;
  }
}
