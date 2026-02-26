import { StorageManager } from './storage';
import { Client } from './types';

export function seedSystem() {
    const existingClients = StorageManager.load<Client[]>('clients', []);

    // Check if seeded already (using the specific IDs)
    if (existingClients.some(c => c.id === 101 || c.id === 102)) {
        return;
    }

    const mockClients: Client[] = [
        {
            id: 101,
            name: 'أحمد السوري',
            mobile: '0933111111',
            governorate: '1', // Damascus
            district: '10', // Markaz Dimashq
            neighborhood: '20', // Mezzeh
            createdAt: new Date().toISOString(),
            isCandidate: false
        },
        {
            id: 102,
            name: 'فاطمة الزهراء',
            mobile: '0933222222',
            governorate: '1',
            district: '10',
            neighborhood: '22', // Abu Rummaneh
            createdAt: new Date().toISOString(),
            isCandidate: false
        },
        {
            id: 103,
            name: 'زيد الحلبي',
            mobile: '0933333333',
            governorate: '2', // Aleppo
            district: '11', // Region? No, let's fix the IDs or just use names if it's string
            neighborhood: '34',
            createdAt: new Date().toISOString(),
            isCandidate: false
        }
    ];

    StorageManager.save('clients', [...existingClients, ...mockClients]);
    console.log('System Seeded with Mock Clients');
}
