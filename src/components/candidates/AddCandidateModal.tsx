import { useState, useMemo } from 'react';
import { X, UserPlus, Save, PlusCircle, Calendar } from 'lucide-react';
import GeoSmartSearch, { GeoSelection } from '../GeoSmartSearch';
import { defaultGeoUnits } from '../../lib/defaultData';
import { useCandidateStore } from '../../hooks/useCandidateStore';
import CreateReferralSheetModal from './CreateReferralSessionModal'; // Filename kept for now, component renamed
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
    const addCandidate = useCandidateStore((state: any) => state.addCandidate);
    const referralSheets = useCandidateStore((state: any) => state.referralSheets); // Updated

    // Filter only active sheets (New or In-Progress)
    const activeSheets = useMemo(() => referralSheets.filter((s: any) => s.status !== 'Archived' && s.status !== 'Completed'), [referralSheets]);

    // Mode Toggle
    const [isDirectMode, setIsDirectMode] = useState(false);

    // Section A: Mode B (Sheet-based)
    const [selectedSheetId, setSelectedSheetId] = useState<number | ''>('');
    const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

    // Section A: Mode A (Direct Referral)
    const [referralDate, setReferralDate] = useState(new Date().toISOString().split('T')[0]);
    const [referralReason, setReferralReason] = useState('');
    const [referralType, setReferralType] = useState<ReferralType>('Personal');
    const [originChannel, setOriginChannel] = useState<ReferralOriginChannel>('Visit');
    const [referralNameSnapshot, setReferralNameSnapshot] = useState('');

    // Section B: Candidate
    const [candidateData, setCandidateData] = useState(initialCandidateState);
    const [error, setError] = useState('');

    const validateForm = () => {
        if (!isDirectMode && !selectedSheetId) {
            setError('يجب اختيار ورقة ترشيح في وضع (ورقة الترشيح).');
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
                // Mode B: Sheet-based
                const sheet = activeSheets.find((s: any) => s.id === selectedSheetId);
                if (!sheet) throw new Error("الورقة المحددة غير صالحة");

                addCandidate({
                    firstName: candidateData.firstName || null,
                    nickname: candidateData.nickname || null,
                    lastName: candidateData.lastName,
                    mobile: candidateData.mobile,
                    addressText: candidateAddressText,

                    referralSheetId: sheet.id, // Updated
                    referralDate: sheet.referralDate,
                    referralReason: 'Part of Sheet', // Implicit
                    referralType: sheet.referralType,
                    referralOriginChannel: sheet.referralOriginChannel,
                    referralNameSnapshot: sheet.referralNameSnapshot,
                    referralEntityId: sheet.referralEntityId,

                    candidateNotes: candidateData.candidateNotes,
                    ownerUserId: 1,
                    createdBy: 1
                });
            } else {
                // Mode A: Direct
                // const contextUnitId = referralContextAddress.neighborhoodId || referralContextAddress.subId || referralContextAddress.regionId || referralContextAddress.govId;
                // const contextAddressText = defaultGeoUnits.find(u => u.id === Number(contextUnitId))?.name || 'غير محدد';

                addCandidate({
                    firstName: candidateData.firstName || null,
                    nickname: candidateData.nickname || null,
                    lastName: candidateData.lastName,
                    mobile: candidateData.mobile,
                    addressText: candidateAddressText,

                    referralSheetId: null, // Direct has no sheet
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
        setSelectedSheetId('');
        setCandidateData(initialCandidateState);
        setReferralDate(new Date().toISOString().split('T')[0]);
        setReferralReason('');
        setReferralNameSnapshot('');
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
                                <h2 className="text-xl font-bold text-slate-800">إضافة اسم جديد</h2>
                                <p className="text-sm text-slate-500"></p>
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
                                عبر ورقة ترشيح
                            </button>
                            <button
                                onClick={() => setIsDirectMode(true)}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isDirectMode ? 'bg-indigo-100 text-indigo-800 shadow-sm border border-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                استقطاب مباشر (بدون ورقة)
                            </button>
                        </div>

                        {/* SECTION A */}
                        <div className="space-y-4">
                            <div className="mb-2"></div>

                            {!isDirectMode ? (
                                /* MODE B: Sheet-based */
                                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex items-end gap-3 transition-all">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">اختر ورقة الترشيح المفتوحة <span className="text-red-500">*</span></label>
                                        <select
                                            value={selectedSheetId}
                                            onChange={(e) => setSelectedSheetId(e.target.value ? Number(e.target.value) : '')}
                                            className="w-full p-2.5 rounded-xl border border-amber-200 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm"
                                        >
                                            <option value="" disabled>-- اختر الورقة للإرتباط بها --</option>
                                            {activeSheets.map((sheet: any) => (
                                                <option key={sheet.id} value={sheet.id}>
                                                    [#{sheet.id}] {sheet.referralNameSnapshot} - {sheet.stats.totalCandidates} أسماء
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => setIsCreateSheetOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl text-sm font-bold shadow-sm transition-all h-[42px]"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        ورقة جديدة
                                    </button>
                                </div>
                            ) : (
                                /* MODE A: Direct Referral */
                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4 transition-all">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />التاريخ *</label>
                                            <input type="date" value={referralDate} onChange={e => setReferralDate(e.target.value)} className="w-full p-2.5 rounded-xl border border-indigo-200 bg-white text-sm" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">نوع الوسيط *</label>
                                            <select value={referralType} onChange={e => setReferralType(e.target.value as ReferralType)} className="w-full p-2.5 rounded-xl border border-indigo-200 bg-white text-sm">
                                                <option value="Personal">شخصي</option>
                                                <option value="Client">عميل</option>
                                                <option value="Employee">موظف</option>
                                                <option value="Unknown">مجهول</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">طريقة الوصول *</label>
                                            <select value={originChannel} onChange={e => setOriginChannel(e.target.value as ReferralOriginChannel)} className="w-full p-2.5 rounded-xl border border-indigo-200 bg-white text-sm">
                                                <option value="App">تطبيق</option>
                                                <option value="Visit">زيارة</option>
                                                <option value="Campaign">حملة</option>
                                                <option value="Acquaintance">معرفة</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">الوسيط *</label>
                                        <input type="text" value={referralNameSnapshot} onChange={e => setReferralNameSnapshot(e.target.value)} placeholder="اسم العميل أو الجهة..." className="w-full p-2.5 rounded-xl border border-indigo-200 bg-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">سبب الاستقطاب *</label>
                                        <input type="text" value={referralReason} onChange={e => setReferralReason(e.target.value)} placeholder="مثلاً: حملة فيسبوك، ترشيح صديق..." className="w-full p-2.5 rounded-xl border border-indigo-200 bg-white text-sm" />
                                    </div>
                                    {/* Geo Removed */}
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
                                <div className="flex gap-2">
                                    <input
                                        type="tel"
                                        value={candidateData.mobile}
                                        onChange={e => { setCandidateData({ ...candidateData, mobile: e.target.value }); setError(''); }}
                                        className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/10 text-sm"
                                        dir="ltr"
                                    />
                                </div>
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

                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                        <button onClick={resetAndClose} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors">إلغاء</button>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button onClick={() => handleSave(true)} className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 rounded-xl transition-colors w-full sm:w-auto">
                                <PlusCircle className="w-4 h-4" /> حفظ وإضافة آخر
                            </button>
                            <button onClick={() => handleSave(false)} className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-500/20 rounded-xl transition-colors w-full sm:w-auto">
                                <Save className="w-4 h-4" /> حفظ وإغلاق
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            <CreateReferralSheetModal
                isOpen={isCreateSheetOpen}
                onClose={() => setIsCreateSheetOpen(false)}
                onSheetCreated={(id) => { setSelectedSheetId(id); setIsDirectMode(false); }}
            />
        </>
    );
}
