import { useState } from 'react';
import { RotateCcw, Eye } from 'lucide-react';
import { defaultTasks, defaultGeoUnits } from '../../lib/defaultData';
import type { Task } from '../../lib/types';
import SmartTable from '../../components/SmartTable';
import type { ColumnDef, FilterDef } from '../../components/SmartTable';
import Customer360Modal from '../../components/Customer360Modal';
import { LocationBadge, getLocationBadgeProps } from '../../components/GeoSmartSearch';

const statusConfig: Record<string, { label: string; style: string }> = {
    pending: { label: 'قيد الانتظار', style: 'bg-gray-50 text-slate-600 border-gray-200' },
    'in-progress': { label: 'قيد التنفيذ', style: 'bg-blue-50 text-blue-700 border-blue-200' },
    completed: { label: 'مكتمل', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('ar-SY', { month: 'short', day: 'numeric' });

export default function Returns() {
    const tasks = defaultTasks.filter(t => t.type === 'returns');
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

    const columns: ColumnDef<Task>[] = [
        { key: 'customerName', label: 'الزبون', sortable: true, render: (t) => <span className="text-sm font-semibold text-slate-800">{t.customerName}</span> },
        { key: 'context', label: 'التفاصيل', render: (t) => <span className="text-sm text-slate-600">{t.context}</span> },
        { key: 'location', label: 'الموقع', sortable: true, render: (t) => { const lp = getLocationBadgeProps(t.location, defaultGeoUnits); return <LocationBadge {...lp} />; } },
        { key: 'dueDate', label: 'التاريخ', sortable: true, render: (t) => <span className="text-sm text-slate-500">{formatDate(t.dueDate)}</span> },
        {
            key: 'status', label: 'الحالة', sortable: true,
            render: (t) => {
                const s = statusConfig[t.status];
                return <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${s.style}`}>{s.label}</span>;
            },
        },
    ];

    const filters: FilterDef[] = [
        { key: 'status', label: 'جميع الحالات', options: [{ value: 'pending', label: 'قيد الانتظار' }, { value: 'in-progress', label: 'قيد التنفيذ' }, { value: 'completed', label: 'مكتمل' }] },
    ];

    return (
        <div className="p-8 h-full flex flex-col overflow-hidden">
            <SmartTable<Task>
                title="المرتجعات"
                icon={RotateCcw}
                data={tasks}
                columns={columns}
                filters={filters}
                searchKeys={['customerName', 'context', 'location']}
                searchPlaceholder="بحث عن زبون..."
                getId={(t) => t.id}
                onRowClick={(t) => setSelectedCustomer(t.customerName)}
                actions={(t) => t.status === 'pending' ? (
                    <button onClick={(e) => { e.stopPropagation(); setSelectedCustomer(t.customerName); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors">
                        <Eye className="w-3.5 h-3.5" /><span>عرض</span>
                    </button>
                ) : null}
                emptyIcon={RotateCcw}
                emptyMessage="لا توجد مرتجعات"
            />
            <Customer360Modal
                isOpen={!!selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
                customerName={selectedCustomer}
            />
        </div>
    );
}
