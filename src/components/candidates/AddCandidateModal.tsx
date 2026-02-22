import React, { useState, useMemo } from 'react';
import { X, UserPlus, Save, PlusCircle, Building2, User, Search, MapPin, Calendar, FileText } from 'lucide-react';
import GeoSmartSearch, { GeoSelection } from '../GeoSmartSearch';
import { defaultGeoUnits } from '../../lib/defaultData';
import { useCandidateStore } from '../../hooks/useCandidateStore';
import CreateReferralSessionModal from './CreateReferralSessionModal';
import { ReferralType, ReferralOriginChannel } from '../../lib/types';

interface AddCandidateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const initialCandidateState = {
    firstName: '',
    nickname: '',
    lastName: '',
    mobile: '',
    locationSelection: { govId: '', regionId: '', subId: '', neighborhoodId: '' } as GeoSelection,
    candidateNotes: ''
};

export default function AddCandidateModal({ isOpen, onClose }: AddCandidateModalProps) {
    const addCandidate = useCandidateStore(state => state.addCandidate);
    const referralSessions = useCandidateStore(state => state.referralSessions);

    const activeSessions = useMemo(() => referralSessions.filter(s => s.status === 'Open'), [referralSessions]);

    // Mode Toggle
    const [isDirectMode, setIsDirectMode] = useState(false);

    // Section A: Mode B (Session-based)
    const [selectedSessionId, setSelectedSessionId] = useState<number | ''>('');
    const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);

    // Section A: Mode A (Direct Referral)
    const [referralDate, setReferralDate] = useState(new Date().toISOString().split('T')[0]);
    const [referralReason, setReferralReason] = useState('');
    const [referralType, setReferralType] = useState<ReferralType>('Existing Client');
    const [originChannel, setOriginChannel] = useState<ReferralOriginChannel>('Visit');
    const [referralNameSnapshot, setReferralNameSnapshot] = useState('');
    const [referralContextAddress, setReferralContextAddress] = useState<GeoSelection>({ govId: '', regionId: '', subId: '', neighborhoodId: '' });

    // Section B: Candidate
    const [candidateData, setCandidateData] = useState(initialCandidateState);
    const [error, setError] = useState('');

    const validateForm = () => {
        if (!isDirectMode && !selectedSessionId) {
            setError('يجب اختيار جلسة استقطاب في وضع (جلسة الاستقطاب).');
            return false;
        }
        if (isDirectMode && (!referralDate || !referralReason || !referralNameSnapshot)) {
            setError('الرجاء تعبئة جميع الحقول الإلزامية الخاصة بالاستقطاب المباشر.');
            return false;
        }
        if (!candidateData.firstName.trim() && !candidateData.nickname.trim()) {
            setError('يجب إدخال الاسم الأول أو اللقب للمرشح على الأقل.');
            return false;
        }
        if (!candidateData.mobile.trim()) {
            setError('رقم هاتف المرشح مطلوب.');
            return false;
        }
        setError('');
        return true;
    };

    const handleSave = (addAnother: boolean) => {
        if (!validateForm()) return;

        const candidateUnitId = candidateData.locationSelection.neighborhoodId || candidateData.locationSelection.subId || candidateData.locationSelection.regionId || candidateData.locationSelection.govId;
        const candidateAddressText = defaultGeoUnits.find(u => u.id === Number(candidateUnitId))?.name || 'غير محدد';

        try {
            if (!isDirectMode) {
                // Mode B: Session
                const session = activeSessions.find(s => s.id === selectedSessionId);
                if (!session) throw new Error("الجلسة المحددة غير صالحة");

                addCandidate({
                    firstName: candidateData.firstName || null,
                    nickname: candidateData.nickname || null,
                    lastName: candidateData.lastName,
                    mobile: candidateData.mobile,
                    addressText: candidateAddressText,

                    referralSessionId: session.id,
                    referralDate: session.referralDate,
                    referralReason: session.referralReason,
                    referralType: session.referralType,
                    referralOriginChannel: session.referralOriginChannel,
                    referralNameSnapshot: session.referralNameSnapshot,
                    referralEntityId: session.referralEntityId,

                    candidateNotes: candidateData.candidateNotes,
                    ownerUserId: 1,
                    createdBy: 1
                });
            } else {
                // Mode A: Direct
                const contextUnitId = referralContextAddress.neighborhoodId || referralContextAddress.subId || referralContextAddress.regionId || referralContextAddress.govId;
                const contextAddressText = defaultGeoUnits.find(u => u.id === Number(contextUnitId))?.name || 'غير محدد';

                addCandidate({
                    firstName: candidateData.firstName || null,
                    nickname: candidateData.nickname || null,
                    lastName: candidateData.lastName,
                    mobile: candidateData.mobile,
                    addressText: candidateAddressText,

                    referralSessionId: null,
                    referralDate: new Date(referralDate).toISOString(),
                    referralReason,
                    referralType,
                    referralOriginChannel: originChannel,
                    referralNameSnapshot,
                    referralEntityId: null,

                    candidateNotes: candidateData.candidateNotes,
                    ownerUserId: 1,
                    createdBy: 1
                });
            }

            if (addAnother) {
                setCandidateData(initialCandidateState);
                setError('');
            } else {
                resetAndClose();
            }
        } catch (err: any) {
            setError(err.message || 'حدث خطأ غير متوقع');
        }
    };

    const resetAndClose = () => {
        setIsDirectMode(false);
        setSelectedSessionId('');
        setCandidateData(initialCandidateState);
        setReferralDate(new Date().toISOString().split('T')[0]);
        setReferralReason('');
        setReferralNameSnapshot('');
        setReferralContextAddress({ govId: '', regionId: '', subId: '', neighborhoodId: '' });
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                                <UserPlus className="w-5 h-5 text-sky-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">إضافة مرشح جديد</h2>
                                <p className="text-sm text-slate-500">إدخال مرشح باختيار وضع الاستقطاب (مباشر / جلسة)</p>
                            </div>
                        </div>
                        <button onClick={resetAndClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
                        {error && (
                            <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                                {error}
                            </div>
                        )}

                        {/* MODE TOGGLE */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full">
                            <button
                                onClick={() => setIsDirectMode(false)}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isDirectMode ? 'bg-amber-100 text-amber-800 shadow-sm border border-amber-200' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                عبر جلسة استقطاب مفتوحة
                            </button>
                            <button
                                onClick={() => setIsDirectMode(true)}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isDirectMode ? 'bg-indigo-100 text-indigo-800 shadow-sm border border-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                استقطاب مباشر (بدون جلسة)
                            </button>
                        </div>

                        {/* SECTION A */}
                        <div className="space-y-4">
                            <h3 className={`text-sm font-bold text-slate-800 border-r-4 pr-2 ${!isDirectMode ? 'border-amber-500' : 'border-indigo-500'}`}>
                                أولاً: مصدر الاستقطاب {isDirectMode ? '(مباشر)' : '(جلسة)'}
                            </h3>

                            {!isDirectMode ? (
                                /* MODE B: Session-based */
                                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex items-end gap-3 transition-all">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">اختر الجلسة النشطة المفتوحة <span className="text-red-500">*</span></label>
                                        <select
                                            value={selectedSessionId}
                                            onChange={(e) => setSelectedSessionId(e.target.value ? Number(e.target.value) : '')}
                                            className="w-full p-2.5 rounded-xl border border-amber-200 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm"
                                        >
                                            <option value="" disabled>-- اختر الجلسة للإرتباط بها --</option>
                                            {activeSessions.map(session => (
                                                <option key={session.id} value={session.id}>
                                                    [#{session.id}] {session.referralNameSnapshot} - {session.referralOriginChannel} ({session.referralType})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => setIsCreateSessionOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl text-sm font-bold shadow-sm transition-all h-[42px]"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        جلسة جديدة
                                    </button>
                                </div>
                            ) : (
                                /* MODE A: Direct Referral */
                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4 transition-all">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />تاريخ الاستقطاب *</label>
                                            <input type="date" value={referralDate} onChange={e => setReferralDate(e.target.value)} className="w-full p-2.5 rounded-xl border border-indigo-200 bg-white text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />سبب الاستقطاب *</label>
                                            <select value={referralReason} onChange={e => setReferralReason(e.target.value)} className="w-full p-2.5 rounded-xl border border-indigo-200 bg-white text-sm">
                                                <option value="" disabled>-- إختر السبب --</option>
                                                <option value="توسيع الشبكة">توسيع الشبكة</option>
                                                <option value="ترشيح من عميل">ترشيح من عميل</option>
                                                <option value="أخرى">أخرى</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">نوع المصدر *</label>
                                            <select value={referralType} onChange={e => setReferralType(e.target.value as ReferralType)} className="w-full p-2.5 rounded-xl border border-indigo-200 bg-white text-sm">
                                                <option value="Existing Client">عميل حالي</option>
                                                <option value="Supervisor">مشرف</option>
                                                <option value="Technician">فني</option>
                                                <option value="Direct Call">اتصال مباشر</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">قناة الاستقطاب *</label>
                                            <select value={originChannel} onChange={e => setOriginChannel(e.target.value as ReferralOriginChannel)} className="w-full p-2.5 rounded-xl border border-indigo-200 bg-white text-sm">
                                                <option value="Visit">زيارة ميدانية</option>
                                                <option value="Call">اتصال هاتفي</option>
                                                <option value="Field Activity">نشاط ترويجي</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">اسم المصدر المطلق *</label>
                                        <input type="text" value={referralNameSnapshot} onChange={e => setReferralNameSnapshot(e.target.value)} placeholder="اسم العميل أو الجهة..." className="w-full p-2.5 rounded-xl border border-indigo-200 bg-white text-sm" />
                                    </div>
                                    <div>
                                        <GeoSmartSearch
                                            label="منطقة عمل المصدر"
                                            geoUnits={defaultGeoUnits}
                                            value={referralContextAddress}
                                            onChange={setReferralContextAddress}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SECTION B: Candidate */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 border-r-4 border-sky-500 pr-2">ثانياً: بيانات المرشح (Candidate)</h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">الاسم الأول</label>
                                    <input type="text" value={candidateData.firstName} onChange={e => setCandidateData({ ...candidateData, firstName: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/10 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">اسم العائلة</label>
                                    <input type="text" value={candidateData.lastName} onChange={e => setCandidateData({ ...candidateData, lastName: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/10 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">اللقب/الكنية</label>
                                    <input type="text" value={candidateData.nickname} onChange={e => setCandidateData({ ...candidateData, nickname: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/10 text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 text-red-500">رقم الهاتف *</label>
                                <input type="tel" value={candidateData.mobile} onChange={e => { setCandidateData({ ...candidateData, mobile: e.target.value }); setError(''); }} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/10 text-sm" dir="ltr" />
                            </div>

                            <div>
                                <GeoSmartSearch label="موقع سكن المرشح" geoUnits={defaultGeoUnits} value={candidateData.locationSelection} onChange={loc => setCandidateData({ ...candidateData, locationSelection: loc })} />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">ملاحظات عن المرشح</label>
                                <textarea value={candidateData.candidateNotes} onChange={e => setCandidateData({ ...candidateData, candidateNotes: e.target.value })} rows={3} className="w-full p-3 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/10 text-sm resize-none" />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                        <button onClick={resetAndClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors">إلغاء</button>
                        <div className="flex gap-3">
                            <button onClick={() => handleSave(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 rounded-xl transition-colors">
                                <PlusCircle className="w-4 h-4" /> حفظ وإضافة آخر
                            </button>
                            <button onClick={() => handleSave(false)} className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-500/20 rounded-xl transition-colors">
                                <Save className="w-4 h-4" /> حفظ وإغلاق
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            <CreateReferralSessionModal
                isOpen={isCreateSessionOpen}
                onClose={() => setIsCreateSessionOpen(false)}
                onSessionCreated={(id) => { setSelectedSessionId(id); setIsDirectMode(false); }}
            />
        </>
    );
}
