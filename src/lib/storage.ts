const PREFIX = 'goldenCRM_';

export const StorageManager = {
    save<T>(key: string, data: T): void {
        try {
            localStorage.setItem(PREFIX + key, JSON.stringify(data));
        } catch (e) {
            console.error('Storage save error:', e);
        }
    },

    load<T>(key: string, fallback: T): T {
        try {
            const raw = localStorage.getItem(PREFIX + key);
            return raw ? (JSON.parse(raw) as T) : fallback;
        } catch {
            return fallback;
        }
    },

    remove(key: string): void {
        localStorage.removeItem(PREFIX + key);
    },

    clearAll(): void {
        Object.keys(localStorage)
            .filter(k => k.startsWith(PREFIX))
            .forEach(k => localStorage.removeItem(k));
    },
};
