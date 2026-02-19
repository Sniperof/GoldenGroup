import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, MapPin, Share2, Save, Plus, Trash2, MessageCircle, MapPinned } from 'lucide-react';
import type { Client, GeoUnit, ContactEntry, ContactType, ContactStatus } from '../lib/types';
import MapPicker from './MapPicker';
import GeoSmartSearch from './GeoSmartSearch';
import type { GeoSelection } from './GeoSmartSearch';

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (client: Client) => void;
    initialData: Client | null;
    geoUnits: GeoUnit[];
}

type Tab = 'identity' | 'contact' | 'location' | 'referral';

const tabsDef: { id: Tab; label: string; icon: any }[] = [
    { id: 'identity', label: 'الهوية', icon: User },
    { id: 'contact', label: 'التواصل', icon: Phone },
    { id: 'location', label: 'الموقع', icon: MapPin },
    { id: 'referral', label: 'الوسيط', icon: Share2 },
];

const contactTypeConfig: Record<ContactType, { label: string; emoji: string }> = {
    mobile: { label: 'موبايل', emoji: '📱' },
    landline: { label: 'أرضي', emoji: '☎️' },
    other: { label: 'آخر', emoji: '📞' },
};

const contactStatusConfig: Record<ContactStatus, { label: string; style: string }> = {
    active: { label: 'فعّال', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    preferred: { label: 'مفضّل', style: 'bg-sky-50 text-sky-700 border-sky-200' },
    'out-of-coverage': { label: 'خارج التغطية', style: 'bg-amber-50 text-amber-700 border-amber-200' },
    unused: { label: 'غير مستخدم', style: 'bg-gray-50 text-gray-500 border-gray-200' },
};

const makeId = () => Math.random().toString(36).slice(2, 10);

const emptyContact = (isPrimary = false): ContactEntry => ({
    id: makeId(), type: 'mobile', number: '', areaCode: '', label: '',
    hasWhatsApp: false, isPrimary, status: 'active',
});

export default function ClientModal({ isOpen, onClose, onSave, initialData, geoUnits }: ClientModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('identity');
    const [formData, setFormData] = useState<Partial<Client>>({});

    // Identity fields
    const [firstName, setFirstName] = useState('');
    const [kunya, setKunya] = useState('');
    const [lastName, setLastName] = useState('');
    const [fatherName, setFatherName] = useState('');

    // Contacts
    const [contacts, setContacts] = useState<ContactEntry[]>([emptyContact(true)]);

    // Geo — single smart search
    const [geoSelection, setGeoSelection] = useState<GeoSelection>({ govId: '', regionId: '', subId: '', neighborhoodId: '' });

    // Map
    const [mapPosition, setMapPosition] = useState<[number, number] | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData(initialData);
                const nameParts = initialData.name.split(' ');
                setFirstName(nameParts[0] || '');
                setKunya(nameParts[1] || '');
                setLastName(nameParts[2] || '');
                setFatherName(nameParts[3] || '');
                if (initialData.contacts && initialData.contacts.length > 0) {
                    setContacts(initialData.contacts);
                } else if (initialData.mobile) {
                    setContacts([{ id: makeId(), type: 'mobile', number: initialData.mobile, label: 'شخصي', hasWhatsApp: false, isPrimary: true, status: 'active' }]);
                } else {
                    setContacts([emptyContact(true)]);
                }
                if (initialData.latitude && initialData.longitude) {
                    setMapPosition([initialData.latitude, initialData.longitude]);
                } else {
                    setMapPosition(null);
                }
            } else {
                setFormData({ status: 'New', sourceChannel: 'App', referrerType: 'Other', governorate: '1' });
                setFirstName(''); setKunya(''); setLastName(''); setFatherName('');
                setContacts([emptyContact(true)]);
                setMapPosition(null);
            }
            setActiveTab('identity');
            setGeoSelection({
                govId: initialData?.governorate?.toString() || '',
                regionId: '',
                subId: '',
                neighborhoodId: initialData?.neighborhood?.toString() || '',
            });
        }
    }, [isOpen, initialData]);

    const updateForm = useCallback((key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }, []);

    // -- Contact handlers --
    const updateContact = useCallback((id: string, field: keyof ContactEntry, value: any) => {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    }, []);

    const addContact = useCallback(() => setContacts(prev => [...prev, emptyContact()]), []);

    const removeContact = useCallback((id: string) => {
        setContacts(prev => {
            const updated = prev.filter(c => c.id !== id);
            if (updated.length > 0 && !updated.some(c => c.isPrimary)) updated[0].isPrimary = true;
            return updated.length === 0 ? [emptyContact(true)] : updated;
        });
    }, []);

    const setPrimary = useCallback((id: string) => {
        setContacts(prev => prev.map(c => ({ ...c, isPrimary: c.id === id })));
    }, []);

    // -- Geo --
    const handleGeoChange = useCallback((sel: GeoSelection) => {
        setGeoSelection(sel);
        updateForm('governorate', sel.govId);
        updateForm('neighborhood', sel.neighborhoodId);
    }, [updateForm]);

    // -- Map --
    const handleLocationSelect = useCallback((lat: number, lng: number) => {
        setMapPosition([lat, lng]);
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    }, []);

    // -- Save --
    const handleSave = () => {
        const fullName = [firstName, kunya, lastName, fatherName].filter(Boolean).join(' ').trim();
        const primaryContact = contacts.find(c => c.isPrimary);
        const primaryNumber = primaryContact?.number || contacts[0]?.number || '';

        if (!fullName || !primaryNumber) {
            alert('يرجى ملء الاسم ورقم هاتف رئيسي واحد على الأقل');
            return;
        }

        onSave({
            ...formData,
            name: fullName,
            mobile: primaryNumber,
            contacts: contacts.filter(c => c.number.trim()),
            latitude: mapPosition?.[0],
            longitude: mapPosition?.[1],
        } as Client);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
                        style={{ direction: 'rtl' }}
                    >
                        {/* Header */}
                        <div className="bg-white border-b border-gray-100 p-5 flex items-center justify-between shrink-0">
                            <h2 className="text-xl font-bold text-slate-800">
                                {initialData ? 'تعديل بيانات العميل' : 'إضافة زبون جديد'}
                            </h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="bg-gray-50 px-5 pt-4 border-b border-gray-200 flex gap-2 overflow-x-auto shrink-0">
                            {tabsDef.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-t-lg transition-all relative top-[1px] ${activeTab === tab.id
                                        ? 'bg-white text-sky-600 border border-gray-200 border-b-white z-10 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 overflow-y-auto custom-scroll bg-white">

                            {/* ============ IDENTITY TAB ============ */}
                            {activeTab === 'identity' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500">الاسم الأول <span className="text-red-500">*</span></label>
                                            <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none" placeholder="مثال: أحمد" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500">الكنية</label>
                                            <input value={kunya} onChange={e => setKunya(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none" placeholder="مثال: أبو محمد" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500">اللقب</label>
                                            <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none" placeholder="مثال: العلي" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500">اسم الأب</label>
                                            <input value={fatherName} onChange={e => setFatherName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none" placeholder="مثال: خالد" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ============ CONTACT TAB ============ */}
                            {activeTab === 'contact' && (
                                <div className="space-y-3">
                                    <AnimatePresence initial={false}>
                                        {contacts.map((c) => (
                                            <motion.div
                                                key={c.id}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2.5"
                                            >
                                                {/* Row 1: Type + Number + Area Code */}
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={c.type}
                                                        onChange={e => updateContact(c.id, 'type', e.target.value as ContactType)}
                                                        className="bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:border-sky-500 focus:outline-none min-w-[100px]"
                                                    >
                                                        {Object.entries(contactTypeConfig).map(([key, cfg]) => (
                                                            <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
                                                        ))}
                                                    </select>

                                                    {c.type === 'mobile' && (
                                                        <span className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 select-none shrink-0" dir="ltr">+963</span>
                                                    )}

                                                    {c.type === 'landline' && (
                                                        <input
                                                            type="text"
                                                            value={c.areaCode || ''}
                                                            onChange={e => {
                                                                const v = e.target.value.replace(/\D/g, '').slice(0, 3);
                                                                updateContact(c.id, 'areaCode', v);
                                                            }}
                                                            placeholder="011"
                                                            dir="ltr"
                                                            maxLength={3}
                                                            className="bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-800 placeholder:text-gray-300 focus:border-sky-500 focus:outline-none w-[60px] text-center"
                                                        />
                                                    )}

                                                    <input
                                                        type="text"
                                                        value={c.number}
                                                        onChange={e => {
                                                            let v = e.target.value.replace(/\D/g, '');
                                                            if (c.type === 'mobile') v = v.slice(0, 10);
                                                            updateContact(c.id, 'number', v);
                                                        }}
                                                        placeholder={c.type === 'mobile' ? '9XXXXXXXXX' : 'الرقم...'}
                                                        dir="ltr"
                                                        maxLength={c.type === 'mobile' ? 10 : 15}
                                                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 placeholder:text-gray-300 focus:border-sky-500 focus:outline-none"
                                                    />

                                                    <button type="button" onClick={() => removeContact(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100 shrink-0">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                {/* Row 2: Label + Status + WhatsApp + Primary */}
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={c.label}
                                                        onChange={e => updateContact(c.id, 'label', e.target.value)}
                                                        placeholder="العلاقة (شخصي، زوجة، ابن...)"
                                                        className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-gray-300 focus:border-sky-500 focus:outline-none"
                                                    />

                                                    <select
                                                        value={c.status}
                                                        onChange={e => updateContact(c.id, 'status', e.target.value as ContactStatus)}
                                                        className={`border rounded-lg px-2 py-1.5 text-[11px] font-medium focus:outline-none min-w-[110px] ${contactStatusConfig[c.status].style}`}
                                                    >
                                                        {Object.entries(contactStatusConfig).map(([key, cfg]) => (
                                                            <option key={key} value={key}>{cfg.label}</option>
                                                        ))}
                                                    </select>

                                                    <button
                                                        type="button"
                                                        onClick={() => updateContact(c.id, 'hasWhatsApp', !c.hasWhatsApp)}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border shrink-0 ${c.hasWhatsApp
                                                            ? 'bg-green-50 border-green-200 text-green-600'
                                                            : 'bg-white border-gray-200 text-gray-300 hover:text-gray-400'
                                                            }`}
                                                        title={c.hasWhatsApp ? 'يدعم واتساب' : 'بدون واتساب'}
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setPrimary(c.id)}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border shrink-0 ${c.isPrimary
                                                            ? 'bg-sky-50 border-sky-200'
                                                            : 'bg-white border-gray-200 hover:border-gray-300'
                                                            }`}
                                                        title="تعيين كرقم أساسي"
                                                    >
                                                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${c.isPrimary ? 'border-sky-500' : 'border-gray-300'}`}>
                                                            {c.isPrimary && <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
                                                        </div>
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    <button type="button" onClick={addContact} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-gray-200 text-slate-500 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50/50 transition-all text-sm font-medium">
                                        <Plus className="w-4 h-4" />
                                        <span>إضافة رقم</span>
                                    </button>
                                </div>
                            )}

                            {/* ============ LOCATION TAB ============ */}
                            {activeTab === 'location' && (
                                <div className="space-y-4">
                                    <GeoSmartSearch
                                        geoUnits={geoUnits}
                                        value={geoSelection}
                                        onChange={handleGeoChange}
                                        label="العنوان"
                                        required
                                        placeholder="ابحث عن محافظة، منطقة، حي..."
                                    />
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500">أقرب نقطة دالة / تفاصيل العنوان</label>
                                        <textarea value={formData.detailedAddress || ''} onChange={e => updateForm('detailedAddress', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-sky-500 focus:outline-none min-h-[60px] resize-none" />
                                    </div>

                                    {/* Map */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                                <MapPinned className="w-3.5 h-3.5" />
                                                <span>تحديد الموقع على الخريطة</span>
                                            </label>
                                            {mapPosition && (
                                                <span className="text-[10px] font-mono text-slate-400" dir="ltr">
                                                    {mapPosition[0].toFixed(5)}, {mapPosition[1].toFixed(5)}
                                                </span>
                                            )}
                                        </div>
                                        <MapPicker position={mapPosition} onLocationSelect={handleLocationSelect} />
                                    </div>
                                </div>
                            )}

                            {/* ============ REFERRAL TAB ============ */}
                            {activeTab === 'referral' && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500">المصدر</label>
                                        <select value={formData.sourceChannel || 'App'} onChange={e => updateForm('sourceChannel', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                                            <option value="App">تطبيق الموبايل</option>
                                            <option value="Marketing Visit">زيارة تسويقية</option>
                                            <option value="Call Center">مركز الاتصال</option>
                                            <option value="Social Media">وسائل التواصل</option>
                                            <option value="Referral">تزكية من عميل آخر</option>
                                            <option value="Walk-in">زيارة مباشرة</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500">النوع</label>
                                        <select value={formData.referrerType || 'Other'} onChange={e => updateForm('referrerType', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                                            <option value="Other">أخرى</option>
                                            <option value="Employee">موظف</option>
                                            <option value="Client">عميل حالي</option>
                                            <option value="Partner">شريك</option>
                                            <option value="Agency">وكالة تسويق</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500">اسم الوسيط</label>
                                        <input
                                            value={formData.referrerName || ''}
                                            onChange={e => updateForm('referrerName', e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                                            placeholder="اختياري"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                            <button onClick={onClose} className="px-5 py-2 rounded-lg text-slate-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 font-medium transition-all">
                                إلغاء
                            </button>
                            <button onClick={handleSave} className="px-5 py-2 rounded-lg text-white bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-500/20 font-bold transition-all flex items-center gap-2">
                                <Save className="w-4 h-4" />
                                <span>{initialData ? 'حفظ التعديلات' : 'حفظ العميل'}</span>
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
