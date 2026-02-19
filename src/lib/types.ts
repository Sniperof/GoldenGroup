export interface GeoUnit {
    id: number;
    name: string;
    level: number;
    parentId: number | null;
}

export interface RoutePoint {
    geoUnitId: number;
    level: number;
    order: number;
}

export interface Route {
    id: number;
    name: string;
    points: RoutePoint[];
    status: string;
}

export interface Employee {
    id: number;
    name: string;
    role: 'supervisor' | 'technician' | 'telemarketer';
    mobile: string;
    status: 'active' | 'leave' | 'inactive';
    avatar: string;
}

export type ContactType = 'mobile' | 'landline' | 'other';
export type ContactStatus = 'active' | 'preferred' | 'out-of-coverage' | 'unused';

export interface ContactEntry {
    id: string;
    type: ContactType;
    number: string;
    areaCode?: string;    // 3-digit province code for landlines
    label: string;        // e.g. "Personal", "Wife", "Son"
    hasWhatsApp: boolean;
    isPrimary: boolean;
    status: ContactStatus;
}

export interface Client {
    id: number;
    name: string;
    mobile: string;
    contacts?: ContactEntry[];
    governorate: string;
    district: string;
    neighborhood: string;
    detailedAddress: string;
    latitude?: number;
    longitude?: number;
    sourceChannel: string;
    referrerType: string;
    referrerName?: string;
    status: 'New' | 'Active' | 'Inactive';
    createdAt: string;
    isCandidate?: boolean;
}

export interface Visit {
    id: string;
    date: string;
    customerId: number;
    employeeId: number;
    employeeName: string;
    outcome: 'Pending' | 'Completed' | 'Cancelled';
    notes?: string;
}

export interface TeamSlot {
    supervisor: number | null;
    technician: number | null;
}

export interface SoloSlot {
    technician: number | null;
}

export interface DaySchedule {
    teams: TeamSlot[];
    solos: SoloSlot[];
}

export interface RouteComposition {
    routeId: number;
    startIdx: number;
    endIdx: number;
    direction: 'forward' | 'reverse';
}

export interface RouteAssignmentData {
    routes: RouteComposition[];
    extraZones: number[];
}

export interface Task {
    id: number;
    type: 'emergency' | 'dues' | 'periodic' | 'returns' | 'followup';
    customerName: string;
    context: string; // Device name, Contract #, etc.
    location: string;
    dueDate: string; // ISO date
    status: 'pending' | 'in-progress' | 'completed';
    priority?: 'high' | 'medium' | 'low';
}

export interface DeviceModel {
    id: number;
    name: string;
    brand: string;
    category: 'Residential' | 'Industrial' | 'Commercial';
    maintenanceInterval: '3 Months' | '6 Months' | '1 Year';
    basePrice: number;
    supportedVisitTypes: ('Installation' | 'Maintenance' | 'Delivery')[];
}

export type ContractStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type PaymentType = 'cash' | 'installment';
export type MaintenancePlan = '3' | '6' | '12';

export interface Installment {
    id: number;
    dueDate: string;
    amount: number;
    status: 'pending' | 'paid' | 'overdue';
}

export interface Contract {
    id: number;
    contractNumber: string;
    customerId: number;
    customerName: string;
    contractDate: string;
    sourceVisit?: string;
    deviceModelId: number;
    deviceModelName: string;
    serialNumber: string;
    maintenancePlan: MaintenancePlan;
    basePrice: number;
    finalPrice: number;
    paymentType: PaymentType;
    downPayment: number;
    installmentsCount: number;
    installments: Installment[];
    deliveryDate: string;
    installationDate: string;
    status: ContractStatus;
    createdAt: string;
}

export type MaintenancePartType = 'Periodic' | 'Emergency' | 'Accessory';

export interface SparePart {
    id: number;
    name: string;
    code: string;          // SKU
    basePrice: number;
    maintenanceType: MaintenancePartType;
    compatibleDeviceIds: number[];  // FK → DeviceModel.id
}

export interface DevicePartCompatibility {
    deviceModelId: number;
    sparePartId: number;
}

export interface MaintenanceRequest {
    id: number;
    requestDate: string;
    customerId: number;
    customerName: string; // denormalized for easier display
    contractId: number; // Represents DeviceID (Instance)
    deviceModelName: string; // denormalized
    priority: 'Critical' | 'High' | 'Normal';
    problemDescription: string;
    technicianId?: number;
    telemarketerId?: number;
    lastFollowUpDate?: string;
    resolutionStatus: 'Completed' | 'Pending' | 'Postponed' | 'Solved Remote';
    visitType: 'Periodic' | 'Emergency';
    location: string; // denormalized
    notes?: string;
    technicalReport?: {
        water: { sourceType: string; inputPressure: number; tdsBefore: number; tdsAfter: number };
        components: { pumpPressure: number; membraneOutput: 'Good' | 'Weak' | 'Dead'; flowRestrictor: number; tankPressure: number };
        electrical: { lowPressureSwitch: string; highPressureSwitch: string; solenoidValve: string; uvStatus: string };
        technicianNotes: string;
        recommendations: string;
    };
}

