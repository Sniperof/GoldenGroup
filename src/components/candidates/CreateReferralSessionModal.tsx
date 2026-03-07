import React, { useState, useEffect } from 'react';
import { X, Save, PlusCircle, Building2, User, PhoneCall, Handshake, Search } from 'lucide-react';
import { ReferralType, ReferralOriginChannel } from '../../lib/types';
import { useCandidateStore } from '../../hooks/useCandidateStore';
import GeoSmartSearch, { GeoSelection } from '../GeoSmartSearch';
import { api } from '../../lib/api';
import type { GeoUnit } from '../../lib/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSheetCreated?: (sheetId: number) => void;
}

const referralTypes: { value: ReferralType; label: string; icon: any }[] = [
    { value: 'Existing Client', label: 'عميل حالي', icon: User },
    { value: 'Supervisor', label: 'مشرف (شخصي)', icon: Building2 },
    { value: 'Technician', label: 'فني / موظف', icon: Building2 },
    { value: 'App', label: 'تطبيق', icon: PhoneCall },
    { value: 'Marketing Visit', label: 'زيارة تسويق', icon: Handshake },
    { value: 'Maintenance Visit', label: 'زيارة صيانة', icon: Handshake },
    { value: 'Campaign', label: 'حملة ترويجية', icon: User },
    { value: 'Direct Call', label: 'اتصال مباشر', icon: PhoneCall },
    { value: 'Other', label: 'طرف خارجي', icon: User },
];

const channels: { value: ReferralOriginChannel; label: string }[] = [
    { value: 'Visit', label: 'زيارة ميدانية' },
    { value: 'Call', label: 'اتصال هاتفي' },
    { value: 'App', label: 'تطبيق الجوال' },
    { value: 'Maintenance', label: 'أثناء الصيانة' },
    { value: 'Campaign', label: 'حملة خارجية' },
    { value: 'Field Activity', label: 'نشاط ترويجي' }
];

export default function CreateReferralSheetModal({ isOpen, onClose, onSheetCreated }: Props) {
    const addReferralSheet = useCandidateStore(state => state.addReferralSheet); // Updated hook

    const [geoUnits, setGeoUnits] = useState<GeoUnit[]>([]);
    useEffect(() => {
        api.geoUnits.list().then(setGeoUnits).catch(console.error);
    }, []);

    const [referralType, setReferralType] = useState<ReferralType>('Existing Client');
    const [originChannel, setOriginChannel] = useState<ReferralOriginChannel>('Visit');
    const [nameSnapshot, setNameSnapshot] = useState('');
    const [addressSelection, setAddressSelection] = useState<GeoSelection>({ govId: '', regionId: '', subId: '', neighborhoodId: '' });
    const [referralDate, setReferralDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!nameSnapshot.trim() || !referralDate) {
            setError('الرجاء تعبئة جميع الحقول الإلزامية (اسم الوسيط، وتاريخ الورقة).');
            return;
        }

        const unitId = addressSelection.neighborhoodId || addressSelection.subId || addressSelection.regionId || addressSelection.govId;
        const matchingUnit = geoUnits.find(u => u.id === Number(unitId));
        const addressText = matchingUnit ? matchingUnit.name : 'غير محدد';

        try {
            const newId = await addReferralSheet({
                referralType,
                referralOriginChannel: originChannel,
                referralNameSnapshot: nameSnapshot,
                referralAddressText: addressText,
                referralEntityId: null, 
                referralDate: new Date(referralDate).toISOString(),
                referralNotes: notes,
                ownerUserId: 1,
                status: 'New',
                createdBy: 1
            });

            if (onSheetCreated) onSheetCreated(newId);
            resetState();
            onClose();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const resetState = () => {
        setReferralType('Existing Client');
        setOriginChannel('Visit');
        setNameSnapshot('');
        setAddressSelection({ govId: '', regionId: '', subId: '', neighborhoodId: '' });
        setReferralDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setError('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <PlusCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">إضافة ورقة ترشيح جديدة (New Referral Sheet)</h2>
                            <p className="text-sm text-slate-500">تسجيل قائمة أسماء جديدة تحت وسيط محدد</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">نوع الوسيط (Mediator Type)</label>
                            <select
                                value={referralType}
                                onChange={(e) => setReferralType(e.target.value as ReferralType)}
                                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm"
                            >
                                {referralTypes.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">طريقة الوصول (Method)</label>
                            <select
                                value={originChannel}
                                onChange={(e) => setOriginChannel(e.target.value as ReferralOriginChannel)}
                                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm"
                            >
                                {channels.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">اسم الوسيط / المصدر (Mediator Name) <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={nameSnapshot}
                            onChange={(e) => setNameSnapshot(e.target.value)}
                            placeholder="مثال: أبو محمد الناطور، أو اسم العميل..."
                            className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">تاريخ الورقة (Sheet Date) <span className="text-red-500">*</span></label>
                        <input
                            type="date"
                            value={referralDate}
                            onChange={(e) => setReferralDate(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm"
                        />
                    </div>

                    <div>
                        <GeoSmartSearch
                            label="النطاق الجغرافي / منطقة العمل"
                            geoUnits={geoUnits}
                            value={addressSelection}
                            onChange={setAddressSelection}
                            placeholder="ابحث عن المنطقة المستهدفة..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات عامة (Notes)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="تفاصيل إضافية حول هذه الورقة..."
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">
                        إلغاء
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 rounded-xl transition-all">
                        <Save className="w-4 h-4" />
                        حفظ الورقة
                    </button>
                </div>

            </div>
        </div>
    );
}
