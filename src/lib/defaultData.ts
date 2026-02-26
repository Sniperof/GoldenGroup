import type { GeoUnit, Employee, Task, DeviceModel, SparePart, MaintenanceRequest } from './types';

export const defaultGeoUnits: GeoUnit[] = [
    { id: 1, name: 'دمشق', level: 1, parentId: null },
    { id: 2, name: 'حلب', level: 1, parentId: null },
    { id: 3, name: 'حمص', level: 1, parentId: null },
    { id: 10, name: 'مركز دمشق', level: 2, parentId: 1 },
    { id: 11, name: 'ريف دمشق', level: 2, parentId: 1 },
    { id: 20, name: 'المزة', level: 3, parentId: 10 },
    { id: 21, name: 'كفرسوسة', level: 3, parentId: 10 },
    { id: 22, name: 'أبو رمانة', level: 3, parentId: 10 },
    { id: 30, name: 'المزة فيلات', level: 4, parentId: 20 },
    { id: 31, name: 'المزة جبل', level: 4, parentId: 20 },
    { id: 32, name: 'تنظيم كفرسوسة', level: 4, parentId: 21 },
    { id: 33, name: 'الروضة', level: 4, parentId: 22 },
];

export const defaultEmployees: Employee[] = [
    { id: 1, name: 'ليلى أحمد', role: 'supervisor', mobile: '0933123456', status: 'active', avatar: 'https://ui-avatars.com/api/?name=ليلى+أحمد&background=6366f1&color=fff' },
    { id: 2, name: 'عمر حسن', role: 'supervisor', mobile: '0933987654', status: 'active', avatar: 'https://ui-avatars.com/api/?name=عمر+حسن&background=6366f1&color=fff' },
    { id: 3, name: 'سارة محمود', role: 'supervisor', mobile: '0933555123', status: 'leave', avatar: 'https://ui-avatars.com/api/?name=سارة+محمود&background=6366f1&color=fff' },
    { id: 4, name: 'أحمد علي', role: 'technician', mobile: '0933111223', status: 'active', avatar: 'https://ui-avatars.com/api/?name=أحمد+علي&background=10b981&color=fff' },
    { id: 5, name: 'محمد جاسم', role: 'technician', mobile: '0933333445', status: 'active', avatar: 'https://ui-avatars.com/api/?name=محمد+جاسم&background=10b981&color=fff' },
    { id: 6, name: 'فاطمة نور', role: 'technician', mobile: '0933666778', status: 'active', avatar: 'https://ui-avatars.com/api/?name=فاطمة+نور&background=10b981&color=fff' },
    { id: 7, name: 'حسين كريم', role: 'technician', mobile: '0933888990', status: 'inactive', avatar: 'https://ui-avatars.com/api/?name=حسين+كريم&background=10b981&color=fff' },
    { id: 8, name: 'زينب عبد الله', role: 'technician', mobile: '0933222334', status: 'active', avatar: 'https://ui-avatars.com/api/?name=زينب+عبدالله&background=10b981&color=fff' },
    { id: 9, name: 'سها جميل', role: 'telemarketer', mobile: '0933344455', status: 'active', avatar: 'https://ui-avatars.com/api/?name=سها+جميل&background=f43f5e&color=fff' },
    { id: 10, name: 'نادية كمال', role: 'telemarketer', mobile: '0933777889', status: 'active', avatar: 'https://ui-avatars.com/api/?name=نادية+كمال&background=f43f5e&color=fff' },
];

export const levelNames: Record<number, string> = {
    1: 'المحافظة',
    2: 'المنطقة',
    3: 'الناحية',
    4: 'الحي',
};

export const defaultTasks: Task[] = [
    // Emergency
    { id: 1, type: 'emergency', customerName: 'خالد السامرائي', context: 'مكيف سبليت 2 طن', location: 'المزة فيلات', dueDate: '2026-02-18', status: 'pending', priority: 'high' },
    { id: 2, type: 'emergency', customerName: 'نور الدين', context: 'ثلاجة سامسونج', location: 'أبو رمانة', dueDate: '2026-02-18', status: 'in-progress', priority: 'high' },
    { id: 3, type: 'emergency', customerName: 'سلمى حسين', context: 'غسالة LG', location: 'كفرسوسة', dueDate: '2026-02-19', status: 'pending', priority: 'high' },

    // Dues
    { id: 4, type: 'dues', customerName: 'عبد الرحمن الجبوري', context: 'عقد #2401', location: 'المزة جبل', dueDate: '2026-02-18', status: 'pending' },
    { id: 5, type: 'dues', customerName: 'ريم عباس', context: 'عقد #2398', location: 'الروضة', dueDate: '2026-02-20', status: 'pending' },
    { id: 6, type: 'dues', customerName: 'طارق محمود', context: 'عقد #2387', location: 'تنظيم كفرسوسة', dueDate: '2026-02-22', status: 'pending' },
    { id: 7, type: 'dues', customerName: 'لينا الخطيب', context: 'عقد #2405', location: 'المزة فيلات', dueDate: '2026-02-18', status: 'completed' },

    // Periodic
    { id: 8, type: 'periodic', customerName: 'فادي الموصلي', context: 'صيانة شهرية - مكيف مركزي', location: 'أبو رمانة', dueDate: '2026-02-18', status: 'pending' },
    { id: 9, type: 'periodic', customerName: 'ياسمين كريم', context: 'فحص ربع سنوي', location: 'الروضة', dueDate: '2026-02-25', status: 'pending' },
    { id: 10, type: 'periodic', customerName: 'وليد البصري', context: 'صيانة دورية - نظام تبريد', location: 'المزة جبل', dueDate: '2026-02-28', status: 'pending' },

    // Returns
    { id: 11, type: 'returns', customerName: 'هدى الأنباري', context: 'إرجاع قطعة غيار', location: 'المزة فيلات', dueDate: '2026-02-18', status: 'pending' },
    { id: 12, type: 'returns', customerName: 'بشار النجار', context: 'استبدال ضاغط', location: 'تنظيم كفرسوسة', dueDate: '2026-02-21', status: 'in-progress' },
    { id: 13, type: 'returns', customerName: 'دينا الشمري', context: 'إرجاع فلتر', location: 'الروضة', dueDate: '2026-02-23', status: 'pending' },

    // Follow-up
    { id: 14, type: 'followup', customerName: 'أنس جابر', context: 'تأكيد موعد', location: 'المزة جبل', dueDate: '2026-02-18', status: 'pending' },
    { id: 15, type: 'followup', customerName: 'مروة عادل', context: 'استبيان رضا', location: 'أبو رمانة', dueDate: '2026-02-24', status: 'pending' },
    { id: 16, type: 'followup', customerName: 'جمال الدليمي', context: 'فحص ما بعد الصيانة', location: 'المزة فيلات', dueDate: '2026-02-24', status: 'pending' },
    { id: 17, type: 'followup', customerName: 'سهى العبيدي', context: 'استفسار عن الخدمة', location: 'تنظيم كفرسوسة', dueDate: '2026-02-18', status: 'completed' },
];

export const defaultMaintenanceRequests: MaintenanceRequest[] = [
    {
        id: 101, requestDate: '2026-02-18T09:30:00',
        customerId: 1, customerName: 'خالد السامرائي', location: 'المزة فيلات',
        contractId: 2401, deviceModelName: 'مكيف سبليت 2 طن (Samsung)',
        priority: 'Critical', problemDescription: 'الجهاز لا يعمل والجو حار جداً',
        telemarketerId: 9, technicianId: 4,
        resolutionStatus: 'Pending', visitType: 'Emergency',
        technicalReport: {
            water: { sourceType: 'نهر بردى', inputPressure: 3.5, tdsBefore: 450, tdsAfter: 120 },
            components: { pumpPressure: 8.2, membraneOutput: 'Good', flowRestrictor: 400, tankPressure: 0.5 },
            electrical: { lowPressureSwitch: 'Working', highPressureSwitch: 'Working', solenoidValve: 'Working', uvStatus: 'Faulty' },
            technicianNotes: 'UV Lamp needs replacement immediately.',
            recommendations: 'Suggest installing a voltage stabilizer.'
        }
    },
    {
        id: 102, requestDate: '2026-02-18T10:15:00',
        customerId: 2, customerName: 'نور الدين', location: 'أبو رمانة',
        contractId: 2398, deviceModelName: 'ثلاجة 20 قدم (LG)',
        priority: 'High', problemDescription: 'تسريب مياه من الخلف',
        telemarketerId: 10, technicianId: 5,
        resolutionStatus: 'Pending', visitType: 'Emergency'
    },
    {
        id: 103, requestDate: '2026-02-17T14:00:00',
        customerId: 3, customerName: 'سلمى حسين', location: 'كفرسوسة',
        contractId: 2387, deviceModelName: 'غسالة 7 كغم (Beko)',
        priority: 'Normal', problemDescription: 'صوت غريب أثناء التشغيل',
        telemarketerId: 9,
        resolutionStatus: 'Pending', visitType: 'Emergency'
    },
    {
        id: 104, requestDate: '2026-02-16T11:30:00',
        customerId: 5, customerName: 'ريم عباس', location: 'الروضة',
        contractId: 2405, deviceModelName: 'مكيف شباك (General)',
        priority: 'Critical', problemDescription: 'توقف مفاجئ عن العمل',
        telemarketerId: 10, technicianId: 4,
        resolutionStatus: 'Completed', visitType: 'Emergency',
        lastFollowUpDate: '2026-02-17T09:00:00', notes: 'تم استبدال الكابستور',
        technicalReport: {
            water: { sourceType: 'مياه شبكة المدينة', inputPressure: 4.0, tdsBefore: 200, tdsAfter: 30 },
            components: { pumpPressure: 7.5, membraneOutput: 'Weak', flowRestrictor: 300, tankPressure: 0.6 },
            electrical: { lowPressureSwitch: 'Working', highPressureSwitch: 'Faulty', solenoidValve: 'Working', uvStatus: 'NotInstalled' },
            technicianNotes: 'Membrane efficiency dropped to 60%.',
            recommendations: 'Monitor TDS levels weekly.'
        }
    }
];

export const defaultDeviceModels: DeviceModel[] = [
    {
        id: 1,
        name: 'Golden 7 Stages',
        brand: 'Golden',
        category: 'Residential',
        maintenanceInterval: '6 Months',
        basePrice: 250000,
        supportedVisitTypes: ['Installation', 'Maintenance', 'Delivery']
    },
    {
        id: 2,
        name: 'Industrial RO System 5000GPD',
        brand: 'PureTech',
        category: 'Industrial',
        maintenanceInterval: '3 Months',
        basePrice: 4500000,
        supportedVisitTypes: ['Installation', 'Maintenance']
    },
    {
        id: 3,
        name: 'Office Dispenser Pro',
        brand: 'AquaCool',
        category: 'Commercial',
        maintenanceInterval: '6 Months',
        basePrice: 650000,
        supportedVisitTypes: ['Installation', 'Maintenance', 'Delivery']
    }
];

export const defaultSpareParts: SparePart[] = [
    { id: 1, name: 'فلتر PP 5 مايكرون', code: 'SP-PP5', basePrice: 5000, maintenanceType: 'Periodic', compatibleDeviceIds: [1, 3] },
    { id: 2, name: 'فلتر كربون CTO', code: 'SP-CTO', basePrice: 7500, maintenanceType: 'Periodic', compatibleDeviceIds: [1, 3] },
    { id: 3, name: 'غشاء RO 75GPD', code: 'SP-RO75', basePrice: 35000, maintenanceType: 'Periodic', compatibleDeviceIds: [1] },
    { id: 4, name: 'غشاء RO 5000GPD صناعي', code: 'SP-RO5K', basePrice: 850000, maintenanceType: 'Periodic', compatibleDeviceIds: [2] },
    { id: 5, name: 'مضخة ضغط عالي', code: 'SP-PUMP', basePrice: 120000, maintenanceType: 'Emergency', compatibleDeviceIds: [1, 2] },
    { id: 6, name: 'صمام كهربائي', code: 'SP-VALVE', basePrice: 25000, maintenanceType: 'Emergency', compatibleDeviceIds: [2, 3] },
    { id: 7, name: 'حنفية مياه نقية', code: 'SP-TAP', basePrice: 15000, maintenanceType: 'Accessory', compatibleDeviceIds: [1] },
    { id: 8, name: 'خزان ضغط 4 غالون', code: 'SP-TANK4', basePrice: 45000, maintenanceType: 'Accessory', compatibleDeviceIds: [1, 3] },
];

