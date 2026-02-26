import React, { useState } from 'react';
import { useCandidateStore } from '../../hooks/useCandidateStore';
import { UserPlus, Search, Building2, MapPin, AlertCircle, ArrowRight, XCircle, FilePlus2, Download, Upload, Info, LayoutGrid, List, ShieldCheck } from 'lucide-react';
import AddCandidateModal from '../../components/candidates/AddCandidateModal';
import CreateReferralSheetModal from '../../components/candidates/CreateReferralSessionModal';
import ImportCSVModal from '../../components/candidates/ImportCSVModal';
import ReferralSheetDetailsModal from '../../components/candidates/SessionDetailsModal';
import QualificationModal from '../../components/candidates/QualificationModal';
import ClientModal from '../../components/ClientModal';
import { Client, Candidate } from '../../lib/types';
import { StorageManager } from '../../lib/storage';
import { defaultGeoUnits } from '../../lib/defaultData';

export default function CandidatesEntry() {
    // UI State
    const [activeTab, setActiveTab] = useState<'candidates' | 'sheets'>('candidates');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [sheetDetailsId, setSheetDetailsId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [errorModal, setErrorModal] = useState<string | null>(null);

    // Data Store
    const candidates = useCandidateStore(state => state.candidates);
    const referralSheets = useCandidateStore(state => state.referralSheets);
    const qualifyCandidate = useCandidateStore(state => state.qualifyCandidate);
    const linkCandidateToClient = useCandidateStore(state => state.linkCandidateToClient);
    const markJunk = useCandidateStore(state => state.markJunk);
    const markForFollowUp = useCandidateStore(state => state.markForFollowUp);

    // New Qualification & Client Modals
    const [isQualifyModalOpen, setIsQualifyModalOpen] = useState(false);
    const [activeCandidateForQualify, setActiveCandidateForQualify] = useState<Candidate | null>(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientInitialData, setClientInitialData] = useState<Client | null>(null);

    // Derived State
    const filteredCandidates = candidates.filter(c => {
        const fullStr = `${c.firstName || ''} ${c.nickname || ''} ${c.lastName || ''} ${c.mobile}`.toLowerCase();
        return fullStr.includes(searchQuery.toLowerCase());
    });

    const handleOpenQualify = (candidate: Candidate) => {
        setActiveCandidateForQualify(candidate);
        setIsQualifyModalOpen(true);
    };

    const handleQualificationConfirmed = (candidate: Candidate) => {
        // Prepare pre-filled Client data
        const prefilledClient: Partial<Client> = {
            name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.nickname || '',
            mobile: candidate.mobile,
            sourceChannel: candidate.referralOriginChannel,
            referrerType: candidate.referralType,
            referrerName: candidate.referralNameSnapshot,
            referralEntityId: candidate.referralEntityId,
            referralDate: candidate.referralDate,
            referralReason: candidate.referralReason,
            referralSheetId: candidate.referralSheetId,
            referralAddressText: candidate.addressText,
            isCandidate: false,
            candidateStatus: 'Lead'
        };

        setClientInitialData(prefilledClient as Client);
        setIsQualifyModalOpen(false);
        setIsClientModalOpen(true);
    };

    const handleSaveClient = (clientData: Client) => {
        if (!activeCandidateForQualify) return;

        // Perform the standard qualify action which saves to clients and updates candidate status
        try {
            qualifyCandidate(activeCandidateForQualify.id, clientData);
            setIsClientModalOpen(false);
            setClientInitialData(null);
            setActiveCandidateForQualify(null);
        } catch (err: any) {
            setErrorModal(err.message);
        }
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Error Message Modal */}
            {errorModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
                        <div className="w-12 h-12 mx-auto bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><AlertCircle className="w-6 h-6" /></div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">تنبيه النظام</h3>
                        <p className="text-sm text-slate-600 mb-6">{errorModal}</p>
                        <button onClick={() => setErrorModal(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all">إغلاق</button>
                    </div>
                </div>
            )}

            {/* Header & Tabs */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">إدارة الأسماء المقترحة (Suggested Names)</h1>
                        <p className="text-sm text-slate-500 mt-1">فلترة، تدقيق، وتوجيه الأسماء الجديدة</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsCreateSheetOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold shadow-sm transition-all text-sm">
                            <FilePlus2 className="w-4 h-4" /> ورقة جديدة
                        </button>
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl shadow-md shadow-sky-500/20 transition-all">
                            <UserPlus className="w-4 h-4" /> إضافة اسم
                        </button>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('candidates')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'candidates' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <List className="w-4 h-4" /> سجل الأسماء ({filteredCandidates.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('sheets')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'sheets' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <LayoutGrid className="w-4 h-4" /> أرشيف الأوراق ({referralSheets.length})
                    </button>
                </div>
            </div>

            {/* TAB CONTENT: Candidates List */}
            {activeTab === 'candidates' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Search Bar for Candidates */}
                    <div className="p-4 border-b border-slate-100">
                        <div className="relative max-w-md">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="بحث في السجل العام (اسم، رقم، وسيط)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-4 pr-10 py-2 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 text-sm"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                                    <th className="px-5 py-4">الاسم المقترح</th>
                                    <th className="px-5 py-4"> نوع الترشيح</th>
                                    <th className="px-5 py-4">الحالة</th>
                                    <th className="px-5 py-4 text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCandidates.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">لا توجد بيانات</td></tr>
                                ) : (
                                    filteredCandidates.map(c => {
                                        const sheet = c.referralSheetId ? referralSheets.find(s => s.id === c.referralSheetId) : null;
                                        return (
                                            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="font-bold text-slate-800">{c.firstName} {c.lastName} {c.nickname ? `(${c.nickname})` : ''}</div>
                                                    <div className="text-xs font-mono text-slate-500" dir="ltr">{c.mobile}</div>
                                                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.addressText}</div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {sheet ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded border border-amber-100 cursor-pointer hover:bg-amber-100" onClick={() => { setActiveTab('sheets'); setSheetDetailsId(sheet.id); }}>
                                                            <Building2 className="w-3 h-3" /> {sheet.referralNameSnapshot}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-100">
                                                            <UserPlus className="w-3 h-3" /> مباشر: {c.referralNameSnapshot}
                                                        </span>
                                                    )}
                                                    <div className="text-[10px] text-slate-400 mt-1">{c.referralOriginChannel} | {c.referralDate.split('T')[0]}</div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold border ${c.status === 'Suggested' ? 'bg-sky-50 text-sky-700 border-sky-200' : c.status === 'Qualified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                        {c.status === 'Suggested' ? 'مقترح' : c.status === 'FollowUp' ? 'متابعة' : c.status === 'Qualified' ? (c.duplicateFlag ? 'تم الربط' : 'تم التحويل') : 'مرفوض'}
                                                    </span>
                                                    {c.duplicateFlag && <div className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${c.status === 'Qualified' ? 'text-emerald-600' : 'text-amber-500'}`}><AlertCircle className="w-3 h-3" /> {c.status === 'Qualified' ? 'عميل حالي' : 'احتمال تكرار'}</div>}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    {(c.status === 'Suggested' || c.status === 'FollowUp') && (
                                                        <button
                                                            onClick={() => handleOpenQualify(c)}
                                                            className="flex flex-col flex-1 mx-auto items-center justify-center gap-1.5 w-10 h-10 bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white rounded-xl border border-sky-100 hover:border-sky-500 shadow-sm transition-all group"
                                                            title="تأهيل والتحقق الذكي"
                                                        >
                                                            <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: Sheets List */}
            {activeTab === 'sheets' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {referralSheets.map(sheet => (
                        <div key={sheet.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setSheetDetailsId(sheet.id)}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                                        {sheet.id}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm group-hover:text-amber-600 transition-colors">{sheet.referralNameSnapshot}</h3>
                                        <p className="text-xs text-slate-500">{sheet.referralType}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${sheet.status === 'New' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {sheet.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-slate-700 text-sm">{sheet.stats?.totalCandidates || 0}</span>
                                    <span>العدد</span>
                                </div>
                                <div className="w-px h-8 bg-slate-200"></div>
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-slate-700 text-sm">{sheet.stats?.qualityPercentage || 0}%</span>
                                    <span>الجودة</span>
                                </div>
                                <div className="w-px h-8 bg-slate-200"></div>
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-emerald-600 text-sm">{sheet.stats?.conversionPercentage || 0}%</span>
                                    <span>التحويل</span>
                                </div>
                            </div>
                            <div className="mt-3 text-[10px] text-slate-400 flex justify-between">
                                <span>{sheet.referralOriginChannel}</span>
                                <span>{sheet.referralDate.split('T')[0]}</span>
                            </div>
                        </div>
                    ))}
                    {referralSheets.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                            لا توجد أوراق ترشيح مضافة بعد
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            <AddCandidateModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            <CreateReferralSheetModal isOpen={isCreateSheetOpen} onClose={() => setIsCreateSheetOpen(false)} onSheetCreated={() => setActiveTab('sheets')} />
            <ImportCSVModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
            <ReferralSheetDetailsModal sheetId={sheetDetailsId} isOpen={sheetDetailsId !== null} onClose={() => setSheetDetailsId(null)} />

            <QualificationModal
                isOpen={isQualifyModalOpen}
                onClose={() => setIsQualifyModalOpen(false)}
                candidate={activeCandidateForQualify}
                onQualified={handleQualificationConfirmed}
                onJunk={(id) => { markJunk(id); setIsQualifyModalOpen(false); }}
                onFollowUp={(id) => { markForFollowUp(id); setIsQualifyModalOpen(false); }}
                onLink={(candidateId, client) => {
                    linkCandidateToClient(candidateId, client.id);
                    setIsQualifyModalOpen(false);
                    setActiveCandidateForQualify(null);
                }}
            />

            <ClientModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onSave={handleSaveClient}
                initialData={clientInitialData}
                geoUnits={defaultGeoUnits}
            />
        </div>
    );
}
