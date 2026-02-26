import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight, User, Phone, MapPin, Share2,
    FileText, History, TrendingUp, DollarSign,
    CheckCircle2, Clock, Mail, MessageCircle, ArrowLeft
} from 'lucide-react';
import { StorageManager } from '../lib/storage';
import { useCandidateStore } from '../hooks/useCandidateStore';
import type { Client, Contract, Visit, Task, Candidate } from '../lib/types';

export default function ClientProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'network' | 'history'>('overview');

    // Load Data
    const clients = StorageManager.load<Client[]>('clients', []);
    const allContracts = StorageManager.load<Contract[]>('contracts', []);
    const { candidates } = useCandidateStore();

    const client = useMemo(() => clients.find(c => c.id === parseInt(id || '0')), [clients, id]);
    const clientContracts = useMemo(() => allContracts.filter(c => c.customerId === client?.id), [allContracts, client]);

    // Metrics
    const metrics = useMemo(() => {
        if (!client) return { contracts: 0, dues: 0, referrals: 0 };
        const dues = clientContracts.reduce((acc, c) => acc + (c.finalPrice - c.downPayment), 0);
        const referrals = [...clients, ...candidates].filter(c =>
            (c as any).referralEntityId === client.id && (c as any).referrerType === 'Client'
        ).length;

        return {
            contracts: clientContracts.length,
            dues: dues.toLocaleString(),
            referrals
        };
    }, [client, clientContracts, clients, candidates]);

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p className="text-lg font-medium">العميل غير موجود</p>
                <button onClick={() => navigate('/clients')} className="mt-4 text-sky-600 font-bold flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> العودة للقائمة
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header / Breadcrumbs */}
            <div className="px-8 py-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => navigate('/clients')} className="text-slate-400 hover:text-sky-600 transition-colors">سجل العملاء</button>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <span className="text-slate-900 font-bold">{client.name}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-gray-50 transition-all">تعديل البيانات</button>
                    <button className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-sky-500/20 hover:bg-sky-500 transition-all">إجراء جديد</button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex" style={{ direction: 'rtl' }}>

                {/* --- Left Column: Sticky Sidebar --- */}
                <aside className="w-[320px] border-l border-gray-200 bg-white p-6 overflow-y-auto hidden lg:block shrink-0">
                    <div className="space-y-8">
                        {/* Client Identity Card */}
                        <div className="text-center">
                            <div className="relative inline-block mb-4">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=0ea5e9&color=fff&size=128`}
                                    alt=""
                                    className="w-24 h-24 rounded-2xl shadow-xl border-4 border-white object-cover"
                                />
                                <span className={`absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border-2 border-white shadow-sm ${client.isCandidate ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                                    }`}>
                                    {client.isCandidate ? 'LEAD' : 'OP'}
                                </span>
                            </div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight mb-1">{client.name}</h2>
                            <p className="text-slate-400 text-xs font-mono mb-4">{client.mobile}</p>

                            <div className="flex items-center justify-center gap-2">
                                <button className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all border border-green-100"><MessageCircle className="w-4 h-4" /></button>
                                <button className="p-2 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-100 transition-all border border-sky-100"><Phone className="w-4 h-4" /></button>
                                <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all border border-slate-100"><Mail className="w-4 h-4" /></button>
                            </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 gap-3">
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group hover:border-sky-200 transition-all">
                                <div className="flex items-center justify-between mb-1">
                                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-sky-500" />
                                    <span className="text-[10px] font-bold text-slate-400">العقود</span>
                                </div>
                                <div className="text-xl font-black text-slate-800">{metrics.contracts}</div>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group hover:border-amber-200 transition-all">
                                <div className="flex items-center justify-between mb-1">
                                    <DollarSign className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
                                    <span className="text-[10px] font-bold text-slate-400">إجمالي المديونية</span>
                                </div>
                                <div className="text-xl font-black text-slate-800">{metrics.dues} <span className="text-[10px] text-slate-400 uppercase">IQD</span></div>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group hover:border-emerald-200 transition-all">
                                <div className="flex items-center justify-between mb-1">
                                    <Share2 className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                                    <span className="text-[10px] font-bold text-slate-400">الترشيحات</span>
                                </div>
                                <div className="text-xl font-black text-slate-800">{metrics.referrals}</div>
                            </div>
                        </div>

                        {/* Tab Navigation */}
                        <nav className="space-y-1">
                            {[
                                { id: 'overview', label: 'نظرة عامة', icon: TrendingUp },
                                { id: 'contracts', label: 'العقود والمالية', icon: FileText },
                                { id: 'network', label: 'الشبكة والإنتاج', icon: Share2 },
                                { id: 'history', label: 'سجل الزيارات', icon: History },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                                        ? 'bg-sky-50 text-sky-700 shadow-sm border border-sky-100'
                                        : 'text-slate-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <tab.icon className="w-4 h-4" />
                                        <span>{tab.label}</span>
                                    </div>
                                    {activeTab === tab.id && <motion.div layoutId="activeDot" className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* --- Right Column: Scrollable Content --- */}
                <main className="flex-1 overflow-y-auto p-8 custom-scroll">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'overview' && <OverviewTab client={client} />}
                            {activeTab === 'network' && <NetworkTab client={client} metrics={metrics} allClients={clients} candidates={candidates} />}
                            {activeTab === 'contracts' && <ContractsTab contracts={clientContracts} />}
                            {activeTab === 'history' && (
                                <div className="text-center py-20 text-slate-400">
                                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-bold">قريباً: سجل الزيارات والصيانة</p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

{/* ============ TABS COMPONENTS ============ */ }

function OverviewTab({ client }: { client: Client }) {
    const activities = [
        { type: 'call', date: 'منذ ساعتين', title: 'مكالمة متابعة سريعة', desc: 'تأكيد رضا العميل بعد الصيانة الأخيرة.', status: 'completed' },
        { type: 'visit', date: 'أمس، 10:00 ص', title: 'زيارة دورية فنية', desc: 'تم تبديل الفلاتر الأساسية والتأكد من TDS.', status: 'completed' },
        { type: 'referral', date: '15 فبراير', title: 'ترشيح عميل جديد', desc: 'قام بترشيح صديقه "محمد الجاسم" بنجاح.', status: 'new' },
    ];

    return (
        <div className="space-y-6 max-w-3xl">
            <h3 className="text-lg font-black text-slate-800 mb-6">آخر النشاطات</h3>
            <div className="space-y-0 relative before:absolute before:right-6 before:top-2 before:bottom-0 before:w-px before:bg-slate-200">
                {activities.map((act, i) => (
                    <div key={i} className="relative pr-12 pb-8 group last:pb-0">
                        <div className="absolute right-4 top-1.5 w-4 h-4 rounded-full border-2 border-white bg-sky-500 shadow-sm z-10" />
                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm group-hover:border-sky-200 group-hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">{act.type}</span>
                                <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{act.date}</span>
                            </div>
                            <h4 className="font-bold text-slate-800 mb-1">{act.title}</h4>
                            <p className="text-sm text-slate-500 leading-relaxed">{act.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function NetworkTab({ client, metrics, allClients, candidates }: any) {
    const referralsList = useMemo(() => {
        const cid = client.id;
        const clientRefs: any[] = [];
        allClients.forEach((c: any) => {
            const referrersToCheck = c.referrers && c.referrers.length > 0
                ? c.referrers
                : [{
                    referralEntityId: c.referralEntityId,
                    referrerType: c.referrerType,
                    referralSheetId: c.referralSheetId,
                    referralDate: c.referralDate
                }];

            referrersToCheck.forEach((r: any) => {
                if (r.referralEntityId === cid && r.referrerType === 'Client') {
                    if (!clientRefs.some(ref => ref.id === c.id && ref.date === (r.referralDate || c.createdAt))) {
                        clientRefs.push({
                            id: c.id,
                            name: c.name,
                            status: c.isCandidate ? 'Candidate' : (c.candidateStatus || 'Client'),
                            method: r.referralSheetId ? `ورقة #${r.referralSheetId}` : 'مباشر',
                            date: r.referralDate || c.createdAt,
                            type: 'client'
                        });
                    }
                }
            });
        });

        const candRefs = candidates
            .filter((c: any) => c.referralEntityId === cid && c.referralType === 'Client')
            .map((c: any) => ({
                id: c.id,
                name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.nickname || 'غير مسمى',
                status: c.status,
                method: c.referralSheetId ? `ورقة #${c.referralSheetId}` : 'مباشر',
                date: c.referralDate,
                type: 'candidate'
            }));

        return [...clientRefs, ...candRefs].sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
    }, [client, allClients, candidates]);

    const originTouchpoints = useMemo(() => {
        // Find all candidate records for this client's mobile
        const relatedCandidates = candidates.filter((c: any) => c.mobile === client.mobile);

        type Touchpoint = {
            id: string | number;
            date: string;
            type: string;
            channel: string;
            entityId: number | null;
            nameSnapshot: string;
            isConversion: boolean;
        };

        const points: Touchpoint[] = relatedCandidates.map((c: any) => ({
            id: `cand-${c.id}`,
            date: c.referralDate || c.createdAt,
            type: c.referralType || 'Unknown',
            channel: c.referralOriginChannel || 'Unknown',
            entityId: c.referralEntityId,
            nameSnapshot: c.referralNameSnapshot || 'غير محدد',
            isConversion: false
        }));

        // Check if client has multiple or single referrers
        const clientReferrers = client.referrers && client.referrers.length > 0
            ? client.referrers
            : [{
                id: `client-${client.id}`,
                referrerType: client.referrerType || 'Unknown',
                sourceChannel: client.sourceChannel || 'Unknown',
                referralEntityId: client.referralEntityId || null,
                referrerName: client.referrerName || 'غير محدد',
                referralDate: client.referralDate || client.createdAt
            }];

        clientReferrers.forEach((r: any, idx: number) => {
            points.push({
                id: r.id || `client-${client.id}-${idx}`,
                date: r.referralDate || client.createdAt,
                type: r.referrerType || 'Unknown',
                channel: r.sourceChannel || 'Unknown',
                entityId: r.referralEntityId || null,
                nameSnapshot: r.referrerName || 'غير محدد',
                isConversion: true // Mark client referrers as true to highlight
            });
        });

        // Sort chronologically ascending
        return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [client, candidates]);

    return (
        <div className="space-y-8">
            {/* Section 1: Origin Story (Timeline) */}
            <div className="max-w-2xl">
                <h3 className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-widest">قصة المصدر (Origin Story)</h3>

                <div className="space-y-0 relative before:absolute before:right-6 before:top-2 before:bottom-0 before:w-px before:bg-sky-100">
                    {originTouchpoints.map((tp, idx) => {
                        const isLast = idx === originTouchpoints.length - 1;
                        // Resolve Employee Name if type is Employee
                        // Ideally we'd use useEmployeeStore, but fallback to storage/defaults or snapshot
                        const isEmployee = tp.type === 'Employee';
                        const displayName = isEmployee
                            ? (tp.nameSnapshot !== 'غير محدد' ? tp.nameSnapshot : `موظف #${tp.entityId}`)
                            : tp.nameSnapshot;

                        return (
                            <div key={tp.id} className="relative pr-14 pb-8 group last:pb-0">
                                {/* Timeline Dot */}
                                <div className={`absolute right-[20px] top-2 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 transition-colors ${tp.isConversion ? 'bg-emerald-500 w-4 h-4 right-[18px] top-1.5' : 'bg-sky-400 group-hover:bg-sky-500'
                                    }`} />

                                <div className={`bg-white rounded-2xl p-4 border shadow-sm transition-all ${tp.isConversion
                                    ? 'border-emerald-200 bg-emerald-50/30 hover:shadow-md'
                                    : 'border-slate-100 hover:border-sky-200 hover:shadow-md'
                                    }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${tp.isConversion ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                                                }`}>
                                                {tp.channel}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                                                {tp.type}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono tracking-tighter">
                                            {tp.date.split('T')[0]}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-black text-slate-800 mb-1">
                                        {tp.isConversion ? 'تحويل إلى عميل فعلي' : 'استقطاب مبدئي'}
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        بواسطة: <span className="font-bold text-slate-700">{displayName}</span>
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Section 2: Network Growth Table */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">نمو الشبكة (Network Growth)</h3>
                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-black border border-emerald-100 shadow-sm">إجمالي الترشيحات: {referralsList.length}</span>
                </div>

                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">الاسم</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">الحالة</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">الطريقة</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">التاريخ</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {referralsList.map((ref: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{ref.name}</div>
                                        <div className="text-[10px] text-slate-400 uppercase">{ref.type}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${ref.status === 'Qualified' || ref.status === 'Client'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            : 'bg-amber-50 text-amber-700 border-amber-100'
                                            }`}>
                                            {ref.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">{ref.method}</td>
                                    <td className="px-6 py-4 text-xs text-slate-400 font-mono tracking-tighter">{ref.date?.split('T')[0] || '--'}</td>
                                    <td className="px-6 py-4 text-left">
                                        <button className="p-2 text-slate-300 hover:text-sky-600 transition-colors"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                                    </td>
                                </tr>
                            ))}
                            {referralsList.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">هذا العميل لم يقم بأي ترشيح بعد.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function ContractsTab({ contracts }: { contracts: Contract[] }) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-800">العقود والديون</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contracts.map(c => (
                    <div key={c.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-xl hover:border-sky-100 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-sky-50 transition-colors">
                                <FileText className="w-6 h-6 text-slate-400 group-hover:text-sky-600" />
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${c.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-50 text-slate-500 border-gray-200'
                                }`}>
                                {c.status.toUpperCase()}
                            </span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 mb-1">{c.deviceModelName}</h4>
                        <p className="text-xs text-slate-400 font-mono mb-4">#{c.contractNumber} | {c.contractDate}</p>

                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-50">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">المبلغ الإجمالي</p>
                                <p className="text-sm font-black text-slate-800">{c.finalPrice.toLocaleString()} <span className="text-[10px]">IQD</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">المبلغ المتبقي</p>
                                <p className="text-sm font-black text-amber-600">{(c.finalPrice - c.downPayment).toLocaleString()} <span className="text-[10px]">IQD</span></p>
                            </div>
                        </div>
                    </div>
                ))}
                {contracts.length === 0 && (
                    <div className="col-span-2 py-20 bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <DollarSign className="w-10 h-10 mb-2 opacity-20" />
                        <p className="font-bold">لا يوجد عقود مرتبطة بهذا العميل حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
}

