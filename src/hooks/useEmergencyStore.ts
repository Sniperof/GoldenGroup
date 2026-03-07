import { create } from 'zustand';
import { StorageManager } from '../lib/storage';
import { EmergencyTicket } from '../lib/types';

const STORAGE_KEY = 'emergencyTickets';

interface EmergencyStore {
    tickets: EmergencyTicket[];
    loadTickets: () => void;
    addTicket: (ticket: EmergencyTicket) => void;
    updateTicket: (id: number, updates: Partial<EmergencyTicket>) => void;
}

export const useEmergencyStore = create<EmergencyStore>((set, get) => ({
    tickets: StorageManager.load<EmergencyTicket[]>(STORAGE_KEY, []),

    loadTickets: () => {
        set({ tickets: StorageManager.load<EmergencyTicket[]>(STORAGE_KEY, []) });
    },

    addTicket: (ticket: EmergencyTicket) => {
        const updated = [...get().tickets, ticket];
        StorageManager.save(STORAGE_KEY, updated);
        set({ tickets: updated });
    },

    updateTicket: (id: number, updates: Partial<EmergencyTicket>) => {
        const updated = get().tickets.map(t =>
            t.id === id ? { ...t, ...updates } : t
        );
        StorageManager.save(STORAGE_KEY, updated);
        set({ tickets: updated });
    },
}));
