import React, { useMemo } from 'react';
import { X, Building2, Calendar, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCandidateStore } from '../../hooks/useCandidateStore';

interface SessionDetailsModalProps {
    sessionId: number | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function SessionDetailsModal({ sessionId, isOpen, onClose }: SessionDetailsModalProps) {
    const referralSessions = useCandidateStore(state => state.referralSessions);
    const closeReferralSession = useCandidateStore(state => state.closeReferralSession);
    const allCandidates = useCandidateStore(state => state.candidates);

    const session = useMemo(() => referralSessions.find(s => s.id === sessionId), [referralSessions, sessionId]);

    const sessionCandidates = useMemo(() => {
        if (!sessionId) return [];
        return allCandidates.filter(c => c.referralSessionId === sessionId);
    }, [allCandidates, sessionId]);

    const metrics = useMemo(() => {
        const total = sessionCandidates.length;
        const qualified = sessionCandidates.filter(c => c.status === 'Qualified').length;
        const junk = sessionCandidates.filter(c => c.status === 'Junk').length;
        const duplicates = sessionCandidates.filter(c => c.duplicateFlag).length;
        const conversionRate = total > 0 ? Math.round((qualified / total) * 100) : 0;

        return { total, qualified, junk, duplicates, conversionRate };
    }, [sessionCandidates]);

    if (!isOpen || !session) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                            <Building2 className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">تفاصيل جلسة الاستقطاب</h2>
                            <p className="text-sm text-slate-500">الجلسة #{session.id} — {session.referralNameSnapshot}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">

                    {/* Session Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-500 mb-3 border-b pb-2 uppercase tracking-wider">البيانات الأساسية</h3>
                            <div className="space-y-2 text-sm text-slate-700">
                                <div className="flex justify-between"><span className="text-slate-500 text-xs">تاريخ الاستقطاب:</span> <span className="font-semibold flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(session.referralDate).toLocaleDateString('ar-IQ')}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500 text-xs">الحالة:</span> <span className={`font-semibold text-xs px-2 py-0.5 rounded ${session.status === 'Open' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>{session.status === 'Open' ? 'مفتوحة' : 'مغلقة'}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500 text-xs">نوع الجلسة:</span> <span className="font-semibold">{session.referralType}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500 text-xs">القناة:</span> <span className="font-semibold">{session.referralOriginChannel}</span></div>
                                <div className="flex flex-col mt-1"><span className="text-slate-500 text-xs">سبب الاستقطاب:</span> <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded inline-block mt-1">{session.referralReason}</span></div>
                            </div>
                        </div>

                        {/* Metrics */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-500 mb-3 border-b pb-2 uppercase tracking-wider">مؤشرات الأداء (KPIs)</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-3 rounded-lg border border-slate-100 flex flex-col justify-center items-center">
                                    <div className="text-2xl font-black text-slate-700">{metrics.total}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">إجمالي المرشحين</div>
                                </div>
                                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-center items-center">
                                    <div className="text-2xl font-black text-emerald-600">{metrics.qualified}</div>
                                    <div className="text-[10px] font-bold text-emerald-800 uppercase">مؤهلين (عملاء)</div>
                                </div>
                                <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex flex-col justify-center items-center">
                                    <div className="text-2xl font-black text-red-600">{metrics.junk}</div>
                                    <div className="text-[10px] font-bold text-red-800 uppercase">مرفوض/مهمل</div>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex flex-col justify-center items-center">
                                    <div className="text-2xl font-black text-amber-600">{metrics.conversionRate}%</div>
                                    <div className="text-[10px] font-bold text-amber-800 uppercase">معدل التحويل</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Candidates Table */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-500" /> مرشحي الجلسة
                        </h3>
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr className="text-slate-600 font-semibold text-xs">
                                        <th className="px-4 py-3">الاسم</th>
                                        <th className="px-4 py-3">رقم الهاتف</th>
                                        <th className="px-4 py-3">العنوان</th>
                                        <th className="px-4 py-3 text-center">الحالة</th>
                                        <th className="px-4 py-3 text-center">تكرار</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sessionCandidates.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">لا يوجد مرشحين في هذه الجلسة</td></tr>
                                    ) : (
                                        sessionCandidates.map(c => (
                                            <tr key={c.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                    {c.firstName} {c.lastName} {c.nickname ? `(${c.nickname})` : ''}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-600" dir="ltr">{c.mobile}</td>
                                                <td className="px-4 py-3 text-slate-600 text-xs truncate max-w-[200px]" title={c.addressText}>{c.addressText}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 text-[10px] font-bold rounded ${c.status === 'Qualified' ? 'bg-emerald-100 text-emerald-700' :
                                                        c.status === 'Junk' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {c.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {c.duplicateFlag ? (
                                                        <span title={`مكرر: ${c.duplicateType}`}><AlertCircle className="w-4 h-4 text-red-500 mx-auto" /></span>
                                                    ) : (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors">
                        رجوع
                    </button>
                    {session.status === 'Open' && (
                        <button
                            onClick={() => {
                                if (confirm('هل أنت متأكد من إغلاق هذه الجلسة؟ لن تتمكن من إضافة مرشحين إضافيين إليها بعد ذلك.')) {
                                    closeReferralSession(session.id);
                                }
                            }}
                            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-500/20 transition-all"
                        >
                            إغلاق الجلسة
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
