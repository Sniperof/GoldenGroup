import React, { useState } from 'react';
import { UserPlus, Search, Building2, MapPin, AlertCircle, ArrowRight, XCircle, FilePlus2, Download, Upload, Info } from 'lucide-react';
import AddCandidateModal from '../../components/candidates/AddCandidateModal';
import CreateReferralSessionModal from '../../components/candidates/CreateReferralSessionModal';
import ImportCSVModal from '../../components/candidates/ImportCSVModal';
import SessionDetailsModal from '../../components/candidates/SessionDetailsModal';
import { useCandidateStore } from '../../hooks/useCandidateStore';

export default function CandidatesEntry() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [sessionDetailsId, setSessionDetailsId] = useState<number | null>(null);

    const candidates = useCandidateStore(state => state.candidates);
    const referralSessions = useCandidateStore(state => state.referralSessions);
    const qualifyCandidate = useCandidateStore(state => state.qualifyCandidate);
    const markJunk = useCandidateStore(state => state.markJunk);

    const [searchQuery, setSearchQuery] = useState('');
    const [errorModal, setErrorModal] = useState<string | null>(null);

    const filteredCandidates = candidates.filter(c => {
        const fullStr = `${c.firstName || ''} ${c.nickname || ''} ${c.lastName || ''} ${c.mobile}`.toLowerCase();
        return fullStr.includes(searchQuery.toLowerCase());
    });

    const getSession = (id: number) => referralSessions.find(s => s.id === id);

    const handleQualify = (id: number) => {
        const candidate = candidates.find(c => c.id === id);
        if (!candidate) return;

        if (confirm(`هل أنت متأكد من تحويل ${candidate.firstName || candidate.nickname} إلى عميل (Lead) في النظام؟`)) {
            try {
                qualifyCandidate(id);
            } catch (err: any) {
                setErrorModal(err.message || 'حدث خطأ أثناء محاولة التحويل.');
            }
        }
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Error Message Modal */}
            {errorModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
                        <div className="w-12 h-12 mx-auto bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">تنبيه النظام</h3>
                        <p className="text-sm text-slate-600 mb-6">{errorModal}</p>
                        <button onClick={() => setErrorModal(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all">
                            إغلاق
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">إدارة المرشحين</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        إدخال وتحليل وتحويل المرشحين (Leads Buffer)
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ابحث بالاسم أو الرقم..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 text-sm transition-all"
                        />
                    </div>

                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 outline outline-1 outline-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-all shrink-0"
                    >
                        <Upload className="w-4 h-4" />
                        استيراد CSV
                    </button>

                    <button
                        onClick={() => setIsCreateSessionOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold shadow-sm transition-all shrink-0"
                    >
                        <FilePlus2 className="w-4 h-4" />
                        جلسة استقطاب
                    </button>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl shadow-md shadow-sky-500/20 transition-all shrink-0"
                    >
                        <UserPlus className="w-4 h-4" />
                        إضافة مرشح
                    </button>
                </div>
            </div>

            {/* Content / Data Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                                <th className="px-5 py-4">المرشح / الهاتف</th>
                                <th className="px-5 py-4">العنوان</th>
                                <th className="px-5 py-4">جلسة الاستقطاب (المصدر)</th>
                                <th className="px-5 py-4">الحالة والتكرار</th>
                                <th className="px-5 py-4 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCandidates.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                                        لا يوجد مرشحين مضافين بعد
                                    </td>
                                </tr>
                            ) : (
                                filteredCandidates.map(c => {
                                    const session = c.referralSessionId ? referralSessions.find(s => s.id === c.referralSessionId) : null;

                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">

                                            {/* Candidate Name & Mobile */}
                                            <td className="px-5 py-4 min-w-[200px]">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                                                        <span className="font-bold text-slate-600">
                                                            {(c.firstName || c.nickname || '?')[0]}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">
                                                            {c.firstName} {c.lastName} {c.nickname ? `(${c.nickname})` : ''}
                                                        </div>
                                                        <div className="text-xs font-mono text-slate-500 mt-0.5" dir="ltr">
                                                            {c.mobile}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Domain / Region Address */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    {c.addressText}
                                                </div>
                                            </td>

                                            {/* Referral Source (Session or Direct) */}
                                            <td className="px-5 py-4">
                                                {session ? (
                                                    <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2 inline-block w-full max-w-xs">
                                                        <div className="text-xs font-bold text-amber-800 flex items-center justify-between mb-1 border-b border-amber-100 pb-1">
                                                            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> جلسة: {session.referralNameSnapshot}</span>
                                                            <button onClick={() => setSessionDetailsId(session.id)} className="p-1 hover:bg-amber-200 rounded text-amber-600 transition-colors" title="عرض تفاصيل الجلسة وتحليلاتها">
                                                                <Info className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-amber-700">
                                                            <div className="flex justify-between"><span>القناة:</span> <span className="font-semibold">{session.referralOriginChannel}</span></div>
                                                            <div className="flex justify-between"><span>التاريخ:</span> <span>{new Date(session.referralDate).toLocaleDateString('ar-IQ')}</span></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-2 inline-block w-full max-w-xs">
                                                        <div className="text-xs font-bold text-indigo-800 flex items-center gap-1 mb-1 border-b border-indigo-100 pb-1">
                                                            <span className="flex items-center gap-1"><UserPlus className="w-3 h-3" /> استقطاب مباشر </span>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-indigo-700">
                                                            <div className="flex justify-between"><span>المصدر:</span> <span className="font-semibold truncate max-w-[100px]" title={c.referralNameSnapshot}>{c.referralNameSnapshot}</span></div>
                                                            <div className="flex justify-between"><span>القناة:</span> <span>{c.referralOriginChannel} ({c.referralType})</span></div>
                                                            <div className="flex justify-between"><span>التاريخ:</span> <span>{new Date(c.referralDate).toLocaleDateString('ar-IQ')}</span></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Status & Duplicates */}
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-2 items-start">
                                                    {/* Status Badge */}
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold border ${c.status === 'New' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                                        c.status === 'Qualified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            'bg-red-50 text-red-700 border-red-200'
                                                        }`}>
                                                        {c.status === 'New' && 'جديد'}
                                                        {c.status === 'Contacted' && 'تم التواصل'}
                                                        {c.status === 'Qualified' && 'تم التأهيل'}
                                                        {c.status === 'Junk' && 'مستبعد'}
                                                    </span>

                                                    {/* Duplicate Flag */}
                                                    {c.duplicateFlag && (
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100" title={`نسخة مكررة في: ${c.duplicateType}`}>
                                                            <AlertCircle className="w-3 h-3" />
                                                            مكرر ({c.duplicateType === 'Client' ? 'زبون' : 'مرشح'})
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-center gap-2 relative">
                                                    {c.status !== 'Qualified' && c.status !== 'Junk' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleQualify(c.id)}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 rounded-lg text-xs font-bold transition-all border border-emerald-200"
                                                                title="تحويل كعميل محتمل (Lead)"
                                                            >
                                                                <ArrowRight className="w-3.5 h-3.5" /> تأهيل
                                                            </button>
                                                            <button
                                                                onClick={() => { if (confirm('استبعاد المرشح؟')) markJunk(c.id); }}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg text-xs font-bold transition-all border border-slate-200 hover:border-rose-200"
                                                                title="مستبعد / غير صالح"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" /> رفض
                                                            </button>
                                                        </>
                                                    )}
                                                    {c.status === 'Qualified' && (
                                                        <span className="text-emerald-600 text-xs font-bold flex items-center gap-1 w-full justify-center">
                                                            <ArrowRight className="w-4 h-4" />
                                                            تم التحويل
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddCandidateModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            <CreateReferralSessionModal
                isOpen={isCreateSessionOpen}
                onClose={() => setIsCreateSessionOpen(false)}
            />

            <ImportCSVModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />

            <SessionDetailsModal
                sessionId={sessionDetailsId}
                isOpen={sessionDetailsId !== null}
                onClose={() => setSessionDetailsId(null)}
            />

        </div>
    );
}
