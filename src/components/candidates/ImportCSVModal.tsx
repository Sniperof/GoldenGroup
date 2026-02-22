import React, { useState, useRef, useMemo } from 'react';
import { X, Upload, FileType, CheckCircle2, AlertCircle, Save, Calendar, FileText } from 'lucide-react';
import { useCandidateStore } from '../../hooks/useCandidateStore';
import GeoSmartSearch, { GeoSelection } from '../GeoSmartSearch';
import { defaultGeoUnits } from '../../lib/defaultData';
import { ReferralType, ReferralOriginChannel } from '../../lib/types';

interface ImportCSVModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ImportCSVModal({ isOpen, onClose }: ImportCSVModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Mode Toggle
    const [isDirectMode, setIsDirectMode] = useState(false);

    // Mode B: Session
    const [selectedSessionId, setSelectedSessionId] = useState<number | ''>('');

    // Mode A: Direct
    const [referralDate, setReferralDate] = useState(new Date().toISOString().split('T')[0]);
    const [referralReason, setReferralReason] = useState('');
    const [referralType, setReferralType] = useState<ReferralType>('Existing Client');
    const [originChannel, setOriginChannel] = useState<ReferralOriginChannel>('Visit');
    const [referralNameSnapshot, setReferralNameSnapshot] = useState('');
    const [referralContextAddress, setReferralContextAddress] = useState<GeoSelection>({ govId: '', regionId: '', subId: '', neighborhoodId: '' });

    // Results
    const [results, setResults] = useState<{
        total: number;
        success: number;
        failed: number;
        errors: string[];
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const addCandidate = useCandidateStore(state => state.addCandidate);
    const referralSessions = useCandidateStore(state => state.referralSessions);

    const activeSessions = useMemo(() => referralSessions.filter(s => s.status === 'Open'), [referralSessions]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setResults(null);
        }
    };

    const processCSV = () => {
        if (!file) return;
        if (!isDirectMode && !selectedSessionId) return;
        if (isDirectMode && (!referralDate || !referralReason || !referralNameSnapshot)) return;

        setIsProcessing(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            const lines = text.split('\n').filter(line => line.trim().length > 0);
            const startIndex = lines[0].includes('First') || lines[0].includes('الاسم') ? 1 : 0;

            let successCount = 0;
            let failCount = 0;
            const errorMessages: string[] = [];

            let sessionContext: any = null;
            let directContext: any = null;

            if (!isDirectMode) {
                const session = activeSessions.find(s => s.id === selectedSessionId);
                if (session) {
                    sessionContext = session;
                }
            } else {
                const contextUnitId = referralContextAddress.neighborhoodId || referralContextAddress.subId || referralContextAddress.regionId || referralContextAddress.govId;
                const contextAddressText = defaultGeoUnits.find(u => u.id === Number(contextUnitId))?.name || 'غير محدد';
                directContext = {
                    referralDate: new Date(referralDate).toISOString(),
                    referralReason,
                    referralType,
                    referralOriginChannel: originChannel,
                    referralNameSnapshot,
                    referralAddressText: contextAddressText
                };
            }

            for (let i = startIndex; i < lines.length; i++) {
                const columns = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));

                if (columns.length >= 3) {
                    const firstName = columns[0];
                    const lastName = columns[1] || '';
                    const mobile = columns[2];
                    const notes = columns[3] || '';

                    if (!firstName && !mobile) {
                        failCount++;
                        errorMessages.push(`السطر ${i + 1}: بيانات غير مكتملة`);
                        continue;
                    }

                    try {
                        if (!isDirectMode && sessionContext) {
                            addCandidate({
                                firstName: firstName || null,
                                nickname: null,
                                lastName,
                                mobile,
                                addressText: 'مستورد من ملف',
                                referralSessionId: sessionContext.id,
                                referralDate: sessionContext.referralDate,
                                referralReason: sessionContext.referralReason,
                                referralType: sessionContext.referralType,
                                referralOriginChannel: sessionContext.referralOriginChannel,
                                referralNameSnapshot: sessionContext.referralNameSnapshot,
                                referralEntityId: sessionContext.referralEntityId,
                                candidateNotes: notes,
                                ownerUserId: 1,
                                createdBy: 1
                            });
                        } else if (isDirectMode && directContext) {
                            addCandidate({
                                firstName: firstName || null,
                                nickname: null,
                                lastName,
                                mobile,
                                addressText: 'مستورد من ملف',
                                referralSessionId: null,
                                referralDate: directContext.referralDate,
                                referralReason: directContext.referralReason,
                                referralType: directContext.referralType,
                                referralOriginChannel: directContext.referralOriginChannel,
                                referralNameSnapshot: directContext.referralNameSnapshot,
                                referralEntityId: null,
                                candidateNotes: notes,
                                ownerUserId: 1,
                                createdBy: 1
                            });
                        }
                        successCount++;
                    } catch (err: any) {
                        failCount++;
                        errorMessages.push(`السطر ${i + 1} (${mobile}): ${err.message}`);
                    }
                } else {
                    failCount++;
                    errorMessages.push(`السطر ${i + 1}: أعمدة غير كافية`);
                }
            }

            setResults({
                total: lines.length - startIndex,
                success: successCount,
                failed: failCount,
                errors: errorMessages
            });
            setIsProcessing(false);
        };

        reader.onerror = () => {
            setIsProcessing(false);
            setResults({ total: 0, success: 0, failed: 1, errors: ['خطأ في قراءة الملف'] });
        };

        reader.readAsText(file);
    };

    const resetAndClose = () => {
        setFile(null);
        setSelectedSessionId('');
        setIsDirectMode(false);
        setReferralDate(new Date().toISOString().split('T')[0]);
        setReferralReason('');
        setReferralNameSnapshot('');
        setReferralContextAddress({ govId: '', regionId: '', subId: '', neighborhoodId: '' });
        setResults(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center border border-teal-100">
                            <Upload className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">استيراد مرشحين (CSV)</h2>
                            <p className="text-sm text-slate-500">رفع قائمة مرشحين وربطهم بمصدر استقطاب</p>
                        </div>
                    </div>
                    <button onClick={resetAndClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">

                    {/* Mode Toggle */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full">
                        <button
                            onClick={() => setIsDirectMode(false)}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isDirectMode ? 'bg-amber-100 text-amber-800 shadow-sm border border-amber-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            جلسة استقطاب
                        </button>
                        <button
                            onClick={() => setIsDirectMode(true)}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isDirectMode ? 'bg-indigo-100 text-indigo-800 shadow-sm border border-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            استقطاب مباشر
                        </button>
                    </div>

                    {/* Context Selection */}
                    <div className="space-y-4">
                        <h3 className={`text-sm font-bold text-slate-800 border-r-4 pr-2 ${!isDirectMode ? 'border-amber-500' : 'border-indigo-500'}`}>
                            مصدر الاستقطاب
                        </h3>

                        {!isDirectMode ? (
                            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                                <label className="block text-sm font-bold text-slate-700 mb-2">جلسة الاستقطاب (المصدر) <span className="text-red-500">*</span></label>
                                <select
                                    value={selectedSessionId}
                                    onChange={(e) => setSelectedSessionId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm"
                                >
                                    <option value="" disabled>-- إختر الجلسة لربط المرشحين بها --</option>
                                    {activeSessions.map(session => (
                                        <option key={session.id} value={session.id}>
                                            [#{session.id}] {session.referralNameSnapshot}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
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

                    {/* File Upload Area */}
                    {!results && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ملف CSV <span className="text-red-500">*</span></label>

                            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 hover:border-teal-300 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FileType className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                                <h4 className="text-slate-700 font-bold mb-1">
                                    {file ? file.name : 'اضغط لاختيار ملف CSV'}
                                </h4>
                                <p className="text-xs text-slate-500">
                                    الترتيب المطلوب (الاسم الأول, اسم العائلة, رقم الهاتف, ملاحظات)
                                </p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>
                    )}

                    {/* Results Area */}
                    {results && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">نتائج الاستيراد</h3>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                        <div className="text-2xl font-black text-slate-700">{results.total}</div>
                                        <div className="text-xs font-semibold text-slate-500">إجمالي الصفوف</div>
                                    </div>
                                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 shadow-sm">
                                        <div className="text-2xl font-black text-emerald-600 flex items-center justify-center gap-1">
                                            {results.success} <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div className="text-xs font-semibold text-emerald-800">تم الإدخال</div>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 shadow-sm">
                                        <div className="text-2xl font-black text-red-600 flex items-center justify-center gap-1">
                                            {results.failed} <AlertCircle className="w-4 h-4" />
                                        </div>
                                        <div className="text-xs font-semibold text-red-800">فشل (تكرار داخلي/نقص)</div>
                                    </div>
                                </div>
                            </div>

                            {results.errors.length > 0 && (
                                <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar">
                                    <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> تقرير الأخطاء:
                                    </h4>
                                    <ul className="text-xs text-slate-600 space-y-1">
                                        {results.errors.map((err, idx) => (
                                            <li key={idx}>- {err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                    {results ? (
                        <button onClick={resetAndClose} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors">
                            إنهاء
                        </button>
                    ) : (
                        <>
                            <button onClick={resetAndClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">
                                إلغاء
                            </button>
                            <button
                                onClick={processCSV}
                                disabled={!file || (!isDirectMode && !selectedSessionId) || (isDirectMode && (!referralDate || !referralReason || !referralNameSnapshot)) || isProcessing}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 rounded-xl shadow-md shadow-teal-500/20 transition-all"
                            >
                                {isProcessing ? 'جاري المعالجة...' : 'ابدأ الاستيراد'}
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
