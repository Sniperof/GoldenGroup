import { useState, useCallback, useMemo, useEffect } from 'react';
import { Users, Trash2, UserPlus, CheckCircle2, AlertCircle, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Client, GeoUnit, Visit, Contract } from '../lib/types';
import ClientModal from '../components/ClientModal';
import SmartTable from '../components/SmartTable';
import type { ColumnDef, FilterDef } from '../components/SmartTable';

export default function Clients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [geoUnits, setGeoUnits] = useState<GeoUnit[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'clients' | 'candidates'>('clients');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const fetchClients = useCallback(async () => {
        const data = await api.clients.list();
        setClients(data);
    }, []);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                const [clientsData, visitsData, contractsData, geoUnitsData] = await Promise.all([
                    api.clients.list(),
                    api.visits.list(),
                    api.contracts.list(),
                    api.geoUnits.list(),
                ]);
                setClients(clientsData);
                setVisits(visitsData);
                setContracts(contractsData);
                setGeoUnits(geoUnitsData);
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const getLifecycleStage = useCallback((client: Client) => {
        if (contracts.some(c => c.customerId === client.id)) return 'OP';
        if (visits.some(v => v.customerId === client.id)) return 'FOP';
        return 'Lead';
    }, [contracts, visits]);

    const candidateList = useMemo(() => clients.filter(c => c.isCandidate), [clients]);
    const mainList = useMemo(() => clients.filter(c => !c.isCandidate).map(c => ({ ...c, lifecycleStage: getLifecycleStage(c) })), [clients, getLifecycleStage]);

    const convertToLead = async (id: number) => {
        if (!confirm('هل أنت متأكد من تحويل هذا المرشح إلى عميل محتمل؟')) return;
        const client = clients.find(c => c.id === id);
        if (!client) return;
        try {
            await api.clients.update(id, { ...client, isCandidate: false });
            await fetchClients();
        } catch (err) {
            console.error('Failed to convert candidate:', err);
        }
    };

    const deleteClient = async (id: number) => {
        if (!confirm('حذف هذا العميل؟')) return;
        try {
            await api.clients.delete(id);
            await fetchClients();
        } catch (err) {
            console.error('Failed to delete client:', err);
        }
    };

    const bulkDelete = async (items: { id: number }[]) => {
        const ids = items.map(i => i.id);
        try {
            await api.clients.bulkDelete(ids);
            await fetchClients();
        } catch (err) {
            console.error('Failed to bulk delete:', err);
        }
    };

    const handleSaveClient = async (clientData: Client) => {
        try {
            if (editingClient) {
                await api.clients.update(clientData.id, clientData);
            } else {
                await api.clients.create({
                    ...clientData,
                    createdAt: new Date().toISOString(),
                    status: 'New',
                    isCandidate: activeTab === 'candidates',
                });
            }
            await fetchClients();
        } catch (err) {
            console.error('Failed to save client:', err);
        }
        setIsModalOpen(false);
        setEditingClient(null);
    };

    const openEditModal = (client: Client) => { setEditingClient(client); setIsModalOpen(true); };
    const getNeighborhoodName = (id: string) => geoUnits.find(u => u.id === parseInt(id))?.name || '--';

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            </div>
        );
    }

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
                    onRowClick={openEditModal}
                    bulkActions={[
                        { label: 'حذف', icon: Trash2, variant: 'danger', onClick: (items) => { if (confirm(`حذف ${items.length} عملاء؟`)) bulkDelete(items); } },
                    ]}
                    actions={(c) => (
                        <button onClick={() => deleteClient(c.id)} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-gray-400 hover:text-red-500 transition-all border border-transparent hover:border-gray-100">
                            <Trash2 className="w-4 h-4" />
                        </button>
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
                        { label: 'حذف', icon: Trash2, variant: 'danger', onClick: (items) => { if (confirm(`حذف ${items.length} مرشحين؟`)) bulkDelete(items); } },
                    ]}
                    actions={(c) => (
                        <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); convertToLead(c.id); }} className="flex items-center gap-1 p-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all text-xs font-bold border border-emerald-100">
                                <ArrowRight className="w-3 h-3" /> تحويل لعميل
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
        </div>
    );
}
