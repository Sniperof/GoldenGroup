import { Contract, Due } from './types';

// Helper to generate dues
const generateDues = (contractId: number, count: number, startAmount: number, startDate: string): Due[] => {
    const dues: Due[] = [];
    const date = new Date(startDate);

    for (let i = 0; i < count; i++) {
        const scheduledDate = date.toISOString().split('T')[0];
        dues.push({
            id: contractId * 100 + i,
            contractId,
            type: 'Installment',
            scheduledDate,
            adjustedDate: scheduledDate,
            originalAmount: startAmount,
            remainingBalance: startAmount,
            assignedTelemarketerId: null,
            status: 'Pending',
            escalated: false,
        });
        date.setMonth(date.getMonth() + 1);
    }
    return dues;
};

export const mockContracts: Contract[] = [
    {
        id: 1, contractNumber: 'CNT-2026-001', customerId: 1, customerName: 'خالد السامرائي',
        contractDate: '2026-01-15', deviceModelId: 1, deviceModelName: 'Golden 7 Stages',
        serialNumber: 'SN-A1234', maintenancePlan: '6', basePrice: 250000, finalPrice: 250000,
        paymentType: 'installment', downPayment: 50000, installmentsCount: 6,
        dues: [
            {
                id: 101, contractId: 1, type: 'Down Payment', scheduledDate: '2026-01-15', adjustedDate: '2026-01-15',
                originalAmount: 50000, remainingBalance: 0, assignedTelemarketerId: null, status: 'Paid', escalated: false
            },
            ...generateDues(1, 4, 50000, '2026-02-15')
        ],
        deliveryDate: '2026-01-20', installationDate: '2026-01-22',
        status: 'active', createdAt: '2026-01-15',
    },
    {
        id: 2, contractNumber: 'CNT-2026-002', customerId: 4, customerName: 'عبد الرحمن الجبوري',
        contractDate: '2026-01-01', deviceModelId: 3, deviceModelName: 'Office Dispenser Pro',
        serialNumber: 'SN-B5678', maintenancePlan: '6', basePrice: 650000, finalPrice: 650000,
        paymentType: 'installment', downPayment: 150000, installmentsCount: 5,
        dues: [
            {
                id: 201, contractId: 2, type: 'Installment', scheduledDate: '2026-02-01', adjustedDate: '2026-02-01',
                originalAmount: 100000, remainingBalance: 100000, assignedTelemarketerId: null, status: 'Overdue', escalated: true
            },
            {
                id: 202, contractId: 2, type: 'Installment', scheduledDate: '2026-03-01', adjustedDate: '2026-03-01',
                originalAmount: 100000, remainingBalance: 100000, assignedTelemarketerId: null, status: 'Pending', escalated: false
            }
        ],
        deliveryDate: '2026-01-05', installationDate: '2026-01-06',
        status: 'active', createdAt: '2026-01-01',
    },
    {
        id: 3, contractNumber: 'CNT-2026-003', customerId: 6, customerName: 'سارة العلي',
        contractDate: '2025-12-15', deviceModelId: 2, deviceModelName: 'Industrial RO System',
        serialNumber: 'SN-C9988', maintenancePlan: '3', basePrice: 4500000, finalPrice: 4500000,
        paymentType: 'installment', downPayment: 1000000, installmentsCount: 12,
        dues: [
            {
                id: 301, contractId: 3, type: 'Installment', scheduledDate: '2026-01-15', adjustedDate: '2026-02-20', // Adjusted to today
                originalAmount: 291000, remainingBalance: 150000, assignedTelemarketerId: 9, status: 'Partial', escalated: false
            },
            {
                id: 302, contractId: 3, type: 'Installment', scheduledDate: '2026-02-15', adjustedDate: '2026-02-15',
                originalAmount: 291000, remainingBalance: 291000, assignedTelemarketerId: 9, status: 'Pending', escalated: false
            }
        ],
        deliveryDate: '2025-12-20', installationDate: '2025-12-25',
        status: 'active', createdAt: '2025-12-15',
    },
];
