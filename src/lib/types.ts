

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

export type ReferralType = 'Personal' | 'Client' | 'Employee' | 'Unknown';
export type ReferralOriginChannel = 'App' | 'Visit' | 'Campaign' | 'Acquaintance';
export type ClientRating = 'Committed' | 'NotCommitted' | 'Undefined';

// --- Referral Sheet (Previously Session) ---
export interface ReferralSheetStats {
    totalCandidates: number;
    qualityPercentage: number; // e.g. 85% valid numbers
    conversionPercentage: number; // e.g. 10% became Leads
}

export interface ReferralSheet {
    id: number;
    referralType: ReferralType;
    referralEntityId: number | null;
    referralNameSnapshot: string; // "Mediator Name"
    referralAddressText: string;
    referralOriginChannel: ReferralOriginChannel;
    referralNotes?: string;

    // Core Timing
    referralDate: string; // The "Sheet Date" (Manual)

    // Ownership
    ownerUserId: number; // The Supervisor/User who owns this sheet

    status: 'New' | 'In-Progress' | 'Completed' | 'Archived';

    // Stats
    stats: ReferralSheetStats;

    createdAt: string; // System Timestamp
    createdBy: number;
}

export type CandidateStatus = 'Prospect' | 'Suggested' | 'FollowUp' | 'Contacted' | 'Qualified' | 'Junk';
export type ReferralConfirmationStatus = 'Pending' | 'Confirmed' | 'Rejected';
export type DuplicateType = 'Candidate' | 'Client' | 'Both';

export interface Candidate {
    id: number;
    // Constraint: At least one of firstName or nickname must be filled
    firstName: string | null;
    lastName?: string;
    nickname: string | null;
    mobile: string;
    occupation?: string;
    contacts?: ContactEntry[];
    addressText: string;
    geoUnitId: number | null;
    ownerUserId: number;
    status: CandidateStatus;

    // Referral Data (Lineage)
    referralSheetId: number | null; // Renamed from Session
    referralDate: string;
    referralReason: string;
    referralType: ReferralType;
    referralOriginChannel: ReferralOriginChannel;
    referralNameSnapshot: string;
    referralEntityId: number | null;

    referralConfirmationStatus: ReferralConfirmationStatus; // Deprecated but kept for compatibility
    candidateNotes?: string;

    // Duplication Tracking
    duplicateFlag: boolean;
    duplicateType: DuplicateType | null;
    duplicateReferenceId: number | null;

    convertedToLeadId: number | null;
    createdAt: string;
    createdBy: number;
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

export interface ClientReferrer {
    id: string;
    referrerType: string;
    referralEntityId: number | null;
    referrerName: string;
    sourceChannel: string;
    referralDate: string;
    referralReason: string;
    referralSheetId?: number | null;
}

export interface Client {

    id: number;
    firstName: string;
    fatherName: string;
    lastName: string;
    nickname?: string;
    name: string; // Computed or legacy? keeping for now
    mobile: string;
    contacts: ContactEntry[];
    governorate: string;
    district: string;
    neighborhood: string;
    detailedAddress?: string;
    gpsCoordinates?: { lat: number; lng: number };
    occupation?: string;
    waterSource?: string;
    notes?: string;
    rating?: ClientRating;

    // Lineage fields
    sourceChannel?: string;
    referrerType?: string;
    referrerId?: number; // legacy
    referrerName?: string;
    referralEntityId?: number | null;
    referralDate?: string;
    referralReason?: string;
    referralSheetId?: number | null; // Renamed
    referralAddressText?: string;

    referrers?: ClientReferrer[]; // To hold multiple brokers/referrers for this client

    createdAt: string;
    isCandidate?: boolean;
    targetClient?: string;
    candidateStatus?: string;
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
    telemarketers?: number[];
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
    category: 'منزلي' | 'صناعي';
    maintenanceInterval: ' 3 أشهر' | '6 أشهر' | '1 سنة';
    basePrice: number;
    supportedVisitTypes: ('تركيب' | 'صيانة' | 'توصيل')[];
}

export type ContractStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type PaymentType = 'cash' | 'installment';
export type MaintenancePlan = '3' | '6' | '12';

export type DueType = 'Installment' | 'Maintenance Fee' | 'Down Payment';
export type DueStatus = 'Pending' | 'Partial' | 'Paid' | 'Overdue';

export interface Due {
    id: number;
    contractId: number;
    type: DueType;
    scheduledDate: string; // Original legal date
    adjustedDate: string; // Active operational date
    originalAmount: number;
    remainingBalance: number;
    assignedTelemarketerId: number | null;
    status: DueStatus;
    escalated: boolean;
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
    finalPrice: number; // Represents TotalAmount
    paymentType: PaymentType;
    downPayment: number;
    installmentsCount: number;
    dues: Due[]; // Renamed from installments
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

// --- Telemarketing Engine ---
export type CallOutcome = 'no_answer' | 'busy' | 'rejected' | 'booked';

export interface TaskListItem {
    id: string;
    entityType: 'candidate' | 'client';
    entityId: number;
    name: string;
    mobile: string;
    contactNumber?: string;
    contactLabel?: string;
    addressText: string;
    geoUnitId: number | null;
    status: 'pending' | 'called' | 'booked';
    callOutcome?: CallOutcome;
}

export interface TaskList {
    id: string;
    teamKey: string;
    date: string;
    items: TaskListItem[];
    createdAt: string;
}

export interface CallLog {
    id: string;
    entityType: 'candidate' | 'client';
    entityId: number;
    taskListId: string;
    teamKey: string;
    outcome: CallOutcome;
    contactLabel?: string;
    contactNumber?: string;
    notes: string;
    timestamp: string;
    calledBy: number;
}

export interface Appointment {
    id: string;
    entityType: 'candidate' | 'client';
    entityId: number;
    customerName: string;
    customerAddress: string;
    customerMobile: string;
    teamKey: string;
    date: string;
    timeSlot: string;
    occupation: string;
    waterSource: string;
    notes: string;
    createdAt: string;
    createdBy: number;
}

export const WORKING_HOURS = { start: 9, end: 17, slotMinutes: 60 };

// --- Emergency Triage & Dispatch ---
export type EmergencyTicketStatus = 'New' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
export type EmergencyTicketPriority = 'Critical' | 'High' | 'Normal';

export interface EmergencyTicket {
    id: number;
    clientId: number;
    clientName: string;
    clientAddress: string;
    clientRating: ClientRating;
    contractId: number | null;
    deviceModelName: string | null;
    problemDescription: string;
    callNotes?: string;
    attachments: string[];
    callReceiver: string;
    priority: EmergencyTicketPriority;
    status: EmergencyTicketStatus;
    assignedTechnicianId: number | null;
    createdAt: string;
}
