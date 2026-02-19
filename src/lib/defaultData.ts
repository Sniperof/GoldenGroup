import type { GeoUnit, Employee, Task, DeviceModel, SparePart, MaintenanceRequest } from './types';

export const defaultGeoUnits: GeoUnit[] = [
    { id: 1, name: 'بغداد', level: 1, parentId: null },
    { id: 2, name: 'البصرة', level: 1, parentId: null },
    { id: 10, name: 'الكرخ', level: 2, parentId: 1 },
    { id: 11, name: 'الرصافة', level: 2, parentId: 1 },
    { id: 20, name: 'المنصور', level: 3, parentId: 10 },
    { id: 21, name: 'الكاظمية', level: 3, parentId: 10 },
    { id: 22, name: 'الكرادة', level: 3, parentId: 11 },
    { id: 30, name: 'حي المنصور', level: 4, parentId: 20 },
    { id: 31, name: 'الداوودي', level: 4, parentId: 20 },
    { id: 32, name: 'حي العدل', level: 4, parentId: 20 },
    { id: 33, name: 'حي الكاظمية', level: 4, parentId: 21 },
    { id: 34, name: 'العطيفية', level: 4, parentId: 21 },
    { id: 35, name: 'حي الكرادة', level: 4, parentId: 22 },
    { id: 36, name: 'زيونة', level: 4, parentId: 22 },
];

export const defaultEmployees: Employee[] = [
    { id: 1, name: 'ليلى أحمد', role: 'supervisor', mobile: '07701234567', status: 'active', avatar: 'https://ui-avatars.com/api/?name=ليلى+أحمد&background=6366f1&color=fff' },
    { id: 2, name: 'عمر حسن', role: 'supervisor', mobile: '07709876543', status: 'active', avatar: 'https://ui-avatars.com/api/?name=عمر+حسن&background=6366f1&color=fff' },
    { id: 3, name: 'سارة محمود', role: 'supervisor', mobile: '07705551234', status: 'leave', avatar: 'https://ui-avatars.com/api/?name=سارة+محمود&background=6366f1&color=fff' },
    { id: 4, name: 'أحمد علي', role: 'technician', mobile: '07701112233', status: 'active', avatar: 'https://ui-avatars.com/api/?name=أحمد+علي&background=10b981&color=fff' },
    { id: 5, name: 'محمد جاسم', role: 'technician', mobile: '07703334455', status: 'active', avatar: 'https://ui-avatars.com/api/?name=محمد+جاسم&background=10b981&color=fff' },
    { id: 6, name: 'فاطمة نور', role: 'technician', mobile: '07706667788', status: 'active', avatar: 'https://ui-avatars.com/api/?name=فاطمة+نور&background=10b981&color=fff' },
    { id: 7, name: 'حسين كريم', role: 'technician', mobile: '07708889900', status: 'inactive', avatar: 'https://ui-avatars.com/api/?name=حسين+كريم&background=10b981&color=fff' },
    { id: 8, name: 'زينب عبد الله', role: 'technician', mobile: '07702223344', status: 'active', avatar: 'https://ui-avatars.com/api/?name=زينب+عبدالله&background=10b981&color=fff' },
    { id: 9, name: 'سها جميل', role: 'telemarketer', mobile: '07704445566', status: 'active', avatar: 'https://ui-avatars.com/api/?name=سها+جميل&background=f43f5e&color=fff' },
    { id: 10, name: 'نادية كمال', role: 'telemarketer', mobile: '07707778899', status: 'active', avatar: 'https://ui-avatars.com/api/?name=نادية+كمال&background=f43f5e&color=fff' },
];

export const levelNames: Record<number, string> = {
    1: 'المحافظة',
    2: 'المنطقة',
    3: 'الناحية',
    4: 'الحي',
};

export const defaultTasks: Task[] = [
    // Emergency
    { id: 1, type: 'emergency', customerName: 'خالد السامرائي', context: 'مكيف سبليت 2 طن', location: 'حي المنصور', dueDate: '2026-02-18', status: 'pending', priority: 'high' },
    { id: 2, type: 'emergency', customerName: 'نور الدين', context: 'ثلاجة سامسونج', location: 'الكرادة', dueDate: '2026-02-18', status: 'in-progress', priority: 'high' },
    { id: 3, type: 'emergency', customerName: 'سلمى حسين', context: 'غسالة LG', location: 'الكاظمية', dueDate: '2026-02-19', status: 'pending', priority: 'high' },

    // Dues
    { id: 4, type: 'dues', customerName: 'عبد الرحمن الجبوري', context: 'عقد #2401', location: 'حي العدل', dueDate: '2026-02-18', status: 'pending' },
    { id: 5, type: 'dues', customerName: 'ريم عباس', context: 'عقد #2398', location: 'زيونة', dueDate: '2026-02-20', status: 'pending' },
    { id: 6, type: 'dues', customerName: 'طارق محمود', context: 'عقد #2387', location: 'الداوودي', dueDate: '2026-02-22', status: 'pending' },
    { id: 7, type: 'dues', customerName: 'لينا الخطيب', context: 'عقد #2405', location: 'حي المنصور', dueDate: '2026-02-18', status: 'completed' },

    // Periodic
    { id: 8, type: 'periodic', customerName: 'فادي الموصلي', context: 'صيانة شهرية - مكيف مركزي', location: 'حي الكرادة', dueDate: '2026-02-18', status: 'pending' },
    { id: 9, type: 'periodic', customerName: 'ياسمين كريم', context: 'فحص ربع سنوي', location: 'العطيفية', dueDate: '2026-02-25', status: 'pending' },
    { id: 10, type: 'periodic', customerName: 'وليد البصري', context: 'صيانة دورية - نظام تبريد', location: 'حي الكاظمية', dueDate: '2026-02-28', status: 'pending' },

    // Returns
    { id: 11, type: 'returns', customerName: 'هدى الأنباري', context: 'إرجاع قطعة غيار', location: 'حي المنصور', dueDate: '2026-02-18', status: 'pending' },
    { id: 12, type: 'returns', customerName: 'بشار النجار', context: 'استبدال ضاغط', location: 'الداوودي', dueDate: '2026-02-21', status: 'in-progress' },
    { id: 13, type: 'returns', customerName: 'دينا الشمري', context: 'إرجاع فلتر', location: 'زيونة', dueDate: '2026-02-23', status: 'pending' },

    // Follow-up
    { id: 14, type: 'followup', customerName: 'أنس جابر', context: 'تأكيد موعد', location: 'حي العدل', dueDate: '2026-02-18', status: 'pending' },
    { id: 15, type: 'followup', customerName: 'مروة عادل', context: 'استبيان رضا', location: 'الكرادة', dueDate: '2026-02-24', status: 'pending' },
    { id: 16, type: 'followup', customerName: 'جمال الدليمي', context: 'فحص ما بعد الصيانة', location: 'حي الكاظمية', dueDate: '2026-02-24', status: 'pending' },
    { id: 17, type: 'followup', customerName: 'سهى العبيدي', context: 'استفسار عن الخدمة', location: 'حي المنصور', dueDate: '2026-02-18', status: 'completed' },
];

export const defaultMaintenanceRequests: MaintenanceRequest[] = [
    {
        id: 101, requestDate: '2026-02-18T09:30:00',
        customerId: 1, customerName: 'خالد السامرائي', location: 'حي المنصور',
        contractId: 2401, deviceModelName: 'مكيف سبليت 2 طن (Samsung)',
        priority: 'Critical', problemDescription: 'الجهاز لا يعمل والجو حار جداً',
        telemarketerId: 9, technicianId: 4,
        resolutionStatus: 'Pending', visitType: 'Emergency',
        technicalReport: {
            water: { sourceType: 'Shatt al-Arab', inputPressure: 3.5, tdsBefore: 450, tdsAfter: 120 },
            components: { pumpPressure: 8.2, membraneOutput: 'Good', flowRestrictor: 400, tankPressure: 0.5 },
            electrical: { lowPressureSwitch: 'Working', highPressureSwitch: 'Working', solenoidValve: 'Working', uvStatus: 'Faulty' },
            technicianNotes: 'UV Lamp needs replacement immediately.',
            recommendations: 'Suggest installing a voltage stabilizer.'
        }
    },
    {
        id: 102, requestDate: '2026-02-18T10:15:00',
        customerId: 2, customerName: 'نور الدين', location: 'الكرادة',
        contractId: 2398, deviceModelName: 'ثلاجة 20 قدم (LG)',
        priority: 'High', problemDescription: 'تسريب مياه من الخلف',
        telemarketerId: 10, technicianId: 5,
        resolutionStatus: 'Pending', visitType: 'Emergency'
    },
    {
        id: 103, requestDate: '2026-02-17T14:00:00',
        customerId: 3, customerName: 'سلمى حسين', location: 'الكاظمية',
        contractId: 2387, deviceModelName: 'غسالة 7 كغم (Beko)',
        priority: 'Normal', problemDescription: 'صوت غريب أثناء التشغيل',
        telemarketerId: 9,
        resolutionStatus: 'Pending', visitType: 'Emergency'
    },
    {
        id: 104, requestDate: '2026-02-16T11:30:00',
        customerId: 5, customerName: 'ريم عباس', location: 'زيونة',
        contractId: 2405, deviceModelName: 'مكيف شباك (General)',
        priority: 'Critical', problemDescription: 'توقف مفاجئ عن العمل',
        telemarketerId: 10, technicianId: 4,
        resolutionStatus: 'Completed', visitType: 'Emergency',
        lastFollowUpDate: '2026-02-17T09:00:00', notes: 'تم استبدال الكابستور',
        technicalReport: {
            water: { sourceType: 'City Water', inputPressure: 4.0, tdsBefore: 200, tdsAfter: 30 },
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

