import React from 'react';
import { useCandidateStore } from '../../hooks/useCandidateStore';
import { X, Calendar, User, FileText, CheckCircle, Clock } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    sheetId: number | null;
}

export default function ReferralSheetDetailsModal({ isOpen, onClose, sheetId }: Props) {
    const referralSheets = useCandidateStore(state => state.referralSheets);
    const closeReferralSheet = useCandidateStore(state => state.closeReferralSheet);
    const candidates = useCandidateStore(state => state.candidates);

    if (!isOpen || !sheetId) return null;

    const sheet = referralSheets.find(s => s.id === sheetId);
    if (!sheet) return null;

    const sheetCandidates = candidates.filter(c => c.referralSheetId === sheetId); // Updated

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-600" />
                            تفاصيل ورقة الترشيح #{sheet.id}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">الوسيط: {sheet.referralNameSnapshot}</p>
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-400 block mb-1">تاريخ الورقة</span>
                        <div className="font-bold text-slate-700 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-sky-500" />
                            {sheet.referralDate.split('T')[0]}
                        </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-400 block mb-1">عدد الأسماء</span>
                        <div className="font-bold text-slate-700 flex items-center gap-2">
                            <User className="w-4 h-4 text-emerald-500" />
                            {sheet.stats?.totalCandidates || 0}
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">قائمة الأسماء في هذه الورقة</h3>
                    <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                        {sheetCandidates.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
                                <span className="text-sm font-bold text-slate-700">{c.firstName} {c.lastName}</span>
                                <span className="text-xs font-mono text-slate-500">{c.mobile}</span>
                                {c.status === 'Qualified' ? 
                                    <CheckCircle className="w-4 h-4 text-emerald-500" /> : 
                                    <Clock className="w-4 h-4 text-amber-500" />
                                }
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    {sheet.status !== 'Completed' && (
                        <button 
                            onClick={() => { closeReferralSheet(sheet.id); onClose(); }}
                            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors"
                        >
                            إغلاق الورقة (أرشفة)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
