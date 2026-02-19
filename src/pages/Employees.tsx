import { Users } from 'lucide-react';
import { defaultEmployees } from '../lib/defaultData';
import type { Employee } from '../lib/types';
import SmartTable from '../components/SmartTable';
import type { ColumnDef, FilterDef } from '../components/SmartTable';

export default function Employees() {
    const employees = defaultEmployees;

    const columns: ColumnDef<Employee>[] = [
        {
            key: 'name', label: 'الموظف', sortable: true,
            render: (e) => (
                <div className="flex items-center gap-3">
                    <img src={e.avatar} alt="" className="w-9 h-9 rounded-full border border-gray-100 object-cover" />
                    <span className="text-slate-700 font-semibold text-sm">{e.name}</span>
                </div>
            ),
        },
        {
            key: 'role', label: 'الدور', sortable: true,
            render: (e) => e.role === 'supervisor'
                ? <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">مشرف</span>
                : <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">فني</span>,
        },
        { key: 'mobile', label: 'الهاتف', sortable: true, render: (e) => <span className="text-sm text-slate-600 font-mono tracking-wide">{e.mobile}</span> },
        {
            key: 'status', label: 'الحالة', sortable: true,
            render: (e) => {
                if (e.status === 'active') return <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">نشط</span>;
                if (e.status === 'leave') return <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">إجازة</span>;
                return <span className="px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-600 text-xs font-medium border border-gray-100">غير فعّال</span>;
            },
        },
    ];

    const filters: FilterDef[] = [
        { key: 'role', label: 'جميع الأدوار', options: [{ value: 'supervisor', label: 'مشرف' }, { value: 'technician', label: 'فني' }] },
        { key: 'status', label: 'جميع الحالات', options: [{ value: 'active', label: 'نشط' }, { value: 'leave', label: 'إجازة' }, { value: 'inactive', label: 'غير فعّال' }] },
    ];

    return (
        <SmartTable<Employee>
            title="إدارة الفرق"
            icon={Users}
            data={employees}
            columns={columns}
            filters={filters}
            searchKeys={['name', 'mobile']}
            searchPlaceholder="بحث بالاسم أو الرقم..."
            getId={(e) => e.id}
            emptyIcon={Users}
            emptyMessage="لا يوجد موظفون"
        />
    );
}
