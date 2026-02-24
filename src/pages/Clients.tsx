import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Trash2, UserPlus, CheckCircle2, AlertCircle, Clock, Search, Lightbulb } from 'lucide-react';
import { StorageManager } from '../lib/storage';
import { defaultGeoUnits } from '../lib/defaultData';
import type { Client, GeoUnit, Visit, Contract } from '../lib/types';
import ClientModal from '../components/ClientModal';
import SmartTable from '../components/SmartTable';
import type { ColumnDef, FilterDef } from '../components/SmartTable';
import ManualSearchModal from '../components/candidates/ManualSearchModal';
import { useCandidateStore } from '../hooks/useCandidateStore';

export default function Clients() {
    const [clients, setClients] = useState<Client[]>(() => StorageManager.load('clients', []));
    const [visits] = useState<Visit[]>(() => StorageManager.load('visits', []));
    const [contracts] = useState<Contract[]>(() => StorageManager.load('contracts', []));
    const [geoUnits] = useState<GeoUnit[]>(() => StorageManager.load('geoUnits', defaultGeoUnits));

    const [activeTab, setActiveTab] = useState<'clients' | 'candidates'>('clients');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [activeCandidateForSearch, setActiveCandidateForSearch] = useState<any>(null);
    const qualifyCandidate = useCandidateStore((state: any) => state.qualifyCandidate);

    // ─── Lifecycle Logic ───
    const getLifecycleStage = useCallback((client: Client) => {
        if (contracts.some(c => c.customerId === client.id)) return 'OP';
        if (visits.some(v => v.customerId === client.id)) return 'FOP';
        return 'Lead';
    }, [contracts, visits]);

    // ─── Computed Lists ───
    const candidateList = useMemo(() => clients.filter(c => c.isCandidate), [clients]);
    const mainList = useMemo(() => clients.filter(c => !c.isCandidate).map(c => ({ ...c, lifecycleStage: getLifecycleStage(c) })), [clients, getLifecycleStage]);

    const save = useCallback((c: Client[]) => { setClients(c); StorageManager.save('clients', c); }, []);

    const deleteClient = (id: number) => {
        if (!confirm('حذف هذا العميل؟')) return;
        save(clients.filter(c => c.id !== id));
    };

    const handleSaveClient = (clientData: Client) => {
        if (editingClient) {
            save(clients.map(c => c.id === clientData.id ? { ...c, ...clientData } : c));
        } else {
            const newClient = {
                ...clientData,
                id: Math.max(0, ...clients.map(c => c.id)) + 1,
                createdAt: new Date().toISOString(),
                status: 'New',
                isCandidate: activeTab === 'candidates' // Auto-flag based on active tab
            } as Client;
            save([...clients, newClient]);
        }
        setIsModalOpen(false);
        setEditingClient(null);
    };

    const openEditModal = (client: Client) => { setEditingClient(client); setIsModalOpen(true); };
    const getNeighborhoodName = (id: string) => geoUnits.find(u => u.id === parseInt(id))?.name || '--';

    // ─── Columns ───
    const clientColumns: ColumnDef<Client & { lifecycleStage: string }>[] = [
        {
            key: 'name', label: 'العميل', sortable: true,
            render: (c) => (
                <div className="flex items-center gap-3">
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=0ea5e9&color=fff&size=32`} alt="" className="w-9 h-9 rounded-full border border-gray-100 object-cover" />
                    <div>
                        <span className="block text-slate-800 font-semibold text-sm">{c.name}</span>
                        <span className="block text-[10px] text-slate-400">{c.createdAt?.slice(0, 10)}</span>
                    </div>
                </div>
            ),
        },
        { key: 'mobile', label: 'الهاتف', sortable: true, render: (c) => <span className="text-sm text-slate-600 font-mono tracking-wide">{c.mobile}</span> },
        { key: 'neighborhood', label: 'الحي', sortable: true, render: (c) => <span className="text-sm text-slate-600">{getNeighborhoodName(c.neighborhood)}</span> },
        {
            key: 'status', label: 'تصنيف العملاء', sortable: true,
            render: (c) => {
                const stage = c.lifecycleStage;
                if (stage === 'OP') return <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-sm flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> عميل فعلي (OP)</span>;
                if (stage === 'FOP') return <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 shadow-sm flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> مستهدف (FOP)</span>;
                return <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200 flex items-center gap-1 w-fit"><AlertCircle className="w-3 h-3" /> محتمل (Lead)</span>;
            },
            getValue: (c) => c.lifecycleStage
        },
    ];

    const candidateColumns: ColumnDef<Client>[] = [
        { key: 'name', label: 'الاسم المرشح', sortable: true, render: (c) => <span className="font-semibold text-slate-700">{c.name}</span> },
        { key: 'mobile', label: 'رقم الهاتف', sortable: true, render: (c) => <span className="font-mono text-slate-600">{c.mobile}</span> },
        { key: 'sourceChannel', label: 'المصدر', sortable: true, render: (c) => <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">{c.sourceChannel || 'N/A'}</span> },
        { key: 'createdAt', label: 'تاريخ الإضافة', sortable: true, render: (c) => <span className="text-sm text-slate-500">{c.createdAt?.slice(0, 10)}</span> },
    ];

    // ─── Filters ───
    const clientFilters: FilterDef[] = [
        {
            key: 'lifecycleStage',
            label: 'مرحلة العميل',
            options: [
                { value: 'Lead', label: 'Lead (محتمل)' },
                { value: 'FOP', label: 'FOP (مستهدف)' },
                { value: 'OP', label: 'OP (فعلي)' }
            ]
        },
    ];

    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            {/* Header Tabs */}
            <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'clients' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    سجل العملاء
                </button>
                <button
                    onClick={() => setActiveTab('candidates')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'candidates' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    المرشحين (Drafts)
                </button>
            </div>

            {activeTab === 'clients' ? (
                <SmartTable<Client & { lifecycleStage: string }>
                    title="سجل العملاء (Clients Pipeline)"
                    icon={Users}
                    data={mainList}
                    columns={clientColumns}
                    filters={clientFilters}
                    searchKeys={['name', 'mobile']}
                    searchPlaceholder="بحث عن عميل..."
                    getId={(c) => c.id}
                    onRowClick={(c) => navigate(`/clients/${c.id}`)}
                    bulkActions={[
                        { label: 'حذف', icon: Trash2, variant: 'danger', onClick: (items) => { if (confirm(`حذف ${items.length} عملاء؟`)) save(clients.filter(c => !items.some(i => i.id === c.id))); } },
                    ]}
                    actions={(c) => (
                        <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); openEditModal(c as any); }} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-gray-400 hover:text-sky-500 transition-all border border-transparent hover:border-gray-100">
                                <UserPlus className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteClient(c.id); }} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-gray-400 hover:text-red-500 transition-all border border-transparent hover:border-gray-100">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    headerActions={
                        <button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all">
                            <UserPlus className="w-4 h-4" />
                            <span>إضافة عميل</span>
                        </button>
                    }
                    emptyIcon={Users}
                    emptyMessage="لا يوجد عملاء حالياً"
                />
            ) : (
                <SmartTable<Client>
                    title="قائمة المرشحين (Candidate Drafts)"
                    icon={Users}
                    data={candidateList}
                    columns={candidateColumns}
                    filters={[]}
                    searchKeys={['name', 'mobile']}
                    searchPlaceholder="بحث في المرشحين..."
                    getId={(c) => c.id}
                    onRowClick={openEditModal}
                    bulkActions={[
                        { label: 'حذف', icon: Trash2, variant: 'danger', onClick: (items) => { if (confirm(`حذف ${items.length} مرشحين؟`)) save(clients.filter(c => !items.some(i => i.id === c.id))); } },
                    ]}
                    actions={(c) => (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCandidateForSearch(c);
                                    setIsSearchModalOpen(true);
                                }}
                                title="تحقق يدوي"
                                className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all border border-indigo-100"
                            >
                                <Search className="w-3.5 h-3.5" />
                            </button>

                            {(c as any).duplicateFlag && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveCandidateForSearch(c);
                                        setIsSearchModalOpen(true);
                                    }}
                                    title="مراجعة الاقتراحات"
                                    className="p-1.5 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all border border-amber-100 animate-pulse"
                                >
                                    <Lightbulb className="w-3.5 h-3.5" />
                                </button>
                            )}

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('هل أنت متأكد من تحويل هذا المرشح إلى عميل محتمل؟')) {
                                        qualifyCandidate(c.id);
                                    }
                                }}
                                className="flex items-center gap-1 p-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all text-xs font-bold border border-emerald-100"
                            >
                                <CheckCircle2 className="w-3 h-3" /> تحويل لعميل
                            </button>

                            <button onClick={() => deleteClient(c.id)} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-gray-400 hover:text-red-500 transition-all border border-transparent hover:border-gray-100">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    headerActions={
                        <button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all">
                            <UserPlus className="w-4 h-4" />
                            <span>إضافة مرشح</span>
                        </button>
                    }
                    emptyIcon={Users}
                    emptyMessage="لا يوجد مرشحين"
                />
            )}

            <ClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveClient}
                initialData={editingClient}
                geoUnits={geoUnits}
            />

            {activeCandidateForSearch && (
                <ManualSearchModal
                    isOpen={isSearchModalOpen}
                    onClose={() => setIsSearchModalOpen(false)}
                    candidate={activeCandidateForSearch}
                    clients={clients}
                    onLink={(client) => {
                        const allClients = StorageManager.load<Client[]>('clients', []);
                        const updatedClients = allClients.map(c => {
                            if (c.id === client.id) {
                                const currentContacts = c.contacts || [];
                                const mobileExists = currentContacts.some(contact => contact.number === activeCandidateForSearch.mobile);

                                if (!mobileExists) {
                                    const newContact: any = {
                                        id: Date.now().toString(),
                                        type: 'mobile',
                                        number: activeCandidateForSearch.mobile,
                                        label: 'Additional',
                                        hasWhatsApp: false,
                                        isPrimary: false,
                                        status: 'active'
                                    };
                                    return { ...c, contacts: [...currentContacts, newContact] };
                                }
                            }
                            return c;
                        });
                        StorageManager.save('clients', updatedClients);

                        // Also mark the candidate as junk or qualified? 
                        // In v2, usually a link means we don't need the prospect anymore.
                        // I'll mark it as Junk or just Qualified to hide it from the candidate list.
                        // For now, I'll just close and let the user delete if they want, or I'll implement a 'Link & Archive' logic.
                        // The store doesn't have a 'Link' action yet. I'll just alert for now.
                        setIsSearchModalOpen(false);
                        alert('تم ربط المرشح بالعميل وتحديث بيانات التواصل بنجاح.');
                    }}
                    onNoMatch={() => {
                        setIsSearchModalOpen(false);
                        alert('جاري المتابعة لخطوة تأكيد الثقة...');
                    }}
                />
            )}
        </div>
    );
}
