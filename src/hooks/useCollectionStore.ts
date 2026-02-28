import { create } from 'zustand';
import { StorageManager } from '../lib/storage';
import { mockContracts } from '../lib/mockData';
import { Due, Contract } from '../lib/types';

interface CollectionState {
    contracts: Contract[];
    dues: (Due & { customerName: string; customerId: number; mobile: string })[]; // Flattened for grid

    // Actions
    updateDue: (dueId: number, updates: Partial<Due>) => void;
    assignAgent: (dueIds: number[], agentId: number) => void;
    logCollection: (dueId: number, updates: { remainingBalance?: number; adjustedDate?: string; status?: Due['status'] }) => void;

    // Selectors helper
    getKPIs: () => {
        totalRemaining: number;
        overdueRate: number;
        unassignedDues: number;
    };
}

// Helper to flatten dues from contracts
const flattenDues = (contracts: Contract[]) => {
    return contracts.flatMap(c =>
        c.dues.map(d => ({
            ...d,
            customerName: c.customerName,
            customerId: c.customerId,
            mobile: '07701234567' // Mock mobile for now, ideally joined from Customer table
        }))
    );
};

export const useCollectionStore = create<CollectionState>((set, get) => ({
    contracts: StorageManager.load<Contract[]>('contracts', mockContracts),
    dues: flattenDues(StorageManager.load<Contract[]>('contracts', mockContracts)),

    updateDue: (dueId, updates) => set((state) => {
        const newContracts = state.contracts.map(c => ({
            ...c,
            dues: c.dues.map(d => d.id === dueId ? { ...d, ...updates } : d)
        }));
        StorageManager.save('contracts', newContracts);
        return {
            contracts: newContracts,
            dues: flattenDues(newContracts)
        };
    }),

    assignAgent: (dueIds, agentId) => set((state) => {
        const newContracts = state.contracts.map(c => ({
            ...c,
            dues: c.dues.map(d => dueIds.includes(d.id) ? { ...d, assignedTelemarketerId: agentId } : d)
        }));
        StorageManager.save('contracts', newContracts);
        return {
            contracts: newContracts,
            dues: flattenDues(newContracts)
        };
    }),

    logCollection: (dueId, { remainingBalance, adjustedDate, status }) => set((state) => {
        const newContracts = state.contracts.map(c => ({
            ...c,
            dues: c.dues.map(d => {
                if (d.id !== dueId) return d;
                return {
                    ...d,
                    remainingBalance: remainingBalance ?? d.remainingBalance,
                    adjustedDate: adjustedDate ?? d.adjustedDate,
                    status: status ?? d.status
                };
            })
        }));
        StorageManager.save('contracts', newContracts);
        return {
            contracts: newContracts,
            dues: flattenDues(newContracts)
        };
    }),

    getKPIs: () => {
        const dues = get().dues;
        const totalRemaining = dues.reduce((acc, d) => acc + d.remainingBalance, 0);

        const overdueDues = dues.filter(d => {
            const diffTime = Math.abs(new Date().getTime() - new Date(d.adjustedDate).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return d.status !== 'Paid' && new Date() > new Date(d.adjustedDate) && diffDays > 30;
        });
        const overdueRate = dues.length > 0 ? (overdueDues.length / dues.length) * 100 : 0;

        const unassignedDues = dues.filter(d => d.assignedTelemarketerId === null && d.status !== 'Paid').length;

        return { totalRemaining, overdueRate, unassignedDues };
    }
}));
