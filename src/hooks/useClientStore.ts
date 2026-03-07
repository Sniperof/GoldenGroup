import { create } from 'zustand';
import { StorageManager } from '../lib/storage';
import { Client, Contract, Visit } from '../lib/types';

interface ClientStore {
    clients: Client[];
    loadClients: () => void;
    updateClient: (id: number, updates: Partial<Client>) => void;
    // getLeads is a selector function
    getLeads: (contracts: Contract[], visits: Visit[]) => Client[];
}

export const useClientStore = create<ClientStore>((set, get) => ({
    clients: StorageManager.load<Client[]>('clients', []),

    loadClients: () => {
        const loadedClients = StorageManager.load<Client[]>('clients', []);
        set({ clients: loadedClients });
    },

    updateClient: (id: number, updates: Partial<Client>) => {
        set((state) => {
            const updatedClients = state.clients.map((client) =>
                client.id === id ? { ...client, ...updates } : client
            );
            StorageManager.save('clients', updatedClients);
            return { clients: updatedClients };
        });
    },

    getLeads: (contracts: Contract[], visits: Visit[]) => {
        const { clients } = get();
        return clients.filter((c) => {
            const clientContracts = contracts.filter((contract) => contract.customerId === c.id);
            const clientVisits = visits.filter((v) => v.customerId === c.id);
            // Lifecycle 'Lead': no contracts and no visits. 
            // Based on existing logic in Clients.tsx:27-31
            return clientContracts.length === 0 && clientVisits.length === 0;
        });
    },
}));
