import { StorageManager } from './storage';
import {
    defaultGeoUnits,
    defaultEmployees,
    defaultTasks,
    defaultMaintenanceRequests,
    defaultDeviceModels,
    defaultSpareParts
} from './defaultData';
import { mockContracts } from './mockData';

/**
 * seedSystem checks if initial data has been populated in localStorage.
 * If not, it loads the default data to ensure the app has content on first run.
 */
export function seedSystem() {
    const PREFIX = 'goldenCRM_';

    const checkAndSeed = <T>(key: string, defaultData: T) => {
        if (!localStorage.getItem(PREFIX + key)) {
            StorageManager.save(key, defaultData);
        }
    };

    // Static/Core Data
    checkAndSeed('geoUnits', defaultGeoUnits);
    checkAndSeed('employees', defaultEmployees);
    checkAndSeed('deviceModels', defaultDeviceModels);
    checkAndSeed('spareParts', defaultSpareParts);

    // Activity/Transaction Data
    checkAndSeed('tasks', defaultTasks);
    checkAndSeed('maintenanceRequests', defaultMaintenanceRequests);
    checkAndSeed('contracts', mockContracts);

    // Initialize Collections
    checkAndSeed('clients', []);
    checkAndSeed('candidates', []);
    checkAndSeed('referralSheets', []);
    checkAndSeed('emergencyTickets', []);
    checkAndSeed('telemarketing_taskLists', []);
    checkAndSeed('telemarketing_appointments', []);
    checkAndSeed('telemarketing_callLogs', []);

    console.log('System seed check complete.');
}
