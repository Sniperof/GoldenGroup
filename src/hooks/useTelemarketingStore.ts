import { create } from 'zustand';
import { StorageManager } from '../lib/storage';
import { TaskList, TaskListItem, Appointment, CallLog, CallOutcome } from '../lib/types';

function simpleUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

interface TelemarketingStore {
    taskLists: TaskList[];
    appointments: Appointment[];
    callLogs: CallLog[];

    // Actions
    generateTaskList: (teamKey: string, date: string, items: Omit<TaskListItem, 'id' | 'status'>[]) => void;
    addCallLog: (log: Omit<CallLog, 'id' | 'timestamp'>) => void;
    addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => void;
    updateTaskListItemStatus: (taskListId: string, itemId: string, status: TaskListItem['status'], outcome?: CallOutcome) => void;

    // Selectors
    getTaskList: (teamKey: string, date: string) => TaskList | undefined;
    getAppointmentsForTeamDate: (teamKey: string, date: string) => Appointment[];
    getBookedSlots: (teamKey: string, date: string) => Set<string>;
    getCallHistory: (entityType: 'candidate' | 'client', entityId: number) => CallLog[];
}

export const useTelemarketingStore = create<TelemarketingStore>((set, get) => ({
    taskLists: StorageManager.load<TaskList[]>('telemarketing_taskLists', []),
    appointments: StorageManager.load<Appointment[]>('telemarketing_appointments', []),
    callLogs: StorageManager.load<CallLog[]>('telemarketing_callLogs', []),

    generateTaskList: (teamKey, date, newItems) => {
        set((state) => {
            // Remove existing task list for this team/date if it exists
            const filteredLists = state.taskLists.filter(list => !(list.teamKey === teamKey && list.date === date));

            const itemsWithIdAndStatus = newItems.map(item => ({
                ...item,
                id: simpleUUID(),
                status: 'pending' as const
            }));

            const newList: TaskList = {
                id: simpleUUID(),
                teamKey,
                date,
                items: itemsWithIdAndStatus,
                createdAt: new Date().toISOString()
            };

            const updatedTaskLists = [...filteredLists, newList];
            StorageManager.save('telemarketing_taskLists', updatedTaskLists);
            return { taskLists: updatedTaskLists };
        });
    },

    addCallLog: (logInput) => {
        set((state) => {
            const newLog: CallLog = {
                ...logInput,
                id: simpleUUID(),
                timestamp: new Date().toISOString()
            };
            const updatedLogs = [...state.callLogs, newLog];
            StorageManager.save('telemarketing_callLogs', updatedLogs);
            return { callLogs: updatedLogs };
        });
    },

    addAppointment: (appointmentInput) => {
        set((state) => {
            // Check for double booking
            const isBooked = state.appointments.some(
                a => a.teamKey === appointmentInput.teamKey &&
                    a.date === appointmentInput.date &&
                    a.timeSlot === appointmentInput.timeSlot
            );

            if (isBooked) {
                throw new Error('هذا الموعد محجوز مسبقاً للفريق في نفس الوقت.');
            }

            const newAppointment: Appointment = {
                ...appointmentInput,
                id: simpleUUID(),
                createdAt: new Date().toISOString()
            };

            const updatedAppointments = [...state.appointments, newAppointment];
            StorageManager.save('telemarketing_appointments', updatedAppointments);
            return { appointments: updatedAppointments };
        });
    },

    updateTaskListItemStatus: (taskListId, itemId, status, outcome) => {
        set((state) => {
            const updatedLists = state.taskLists.map(list => {
                if (list.id !== taskListId) return list;

                return {
                    ...list,
                    items: list.items.map(item => {
                        if (item.id !== itemId) return item;
                        return {
                            ...item,
                            status,
                            ...(outcome ? { callOutcome: outcome } : {})
                        };
                    })
                };
            });

            StorageManager.save('telemarketing_taskLists', updatedLists);
            return { taskLists: updatedLists };
        });
    },

    getTaskList: (teamKey, date) => {
        return get().taskLists.find(list => list.teamKey === teamKey && list.date === date);
    },

    getAppointmentsForTeamDate: (teamKey, date) => {
        return get().appointments.filter(a => a.teamKey === teamKey && a.date === date);
    },

    getBookedSlots: (teamKey, date) => {
        const slots = get().appointments
            .filter(a => a.teamKey === teamKey && a.date === date)
            .map(a => a.timeSlot);
        return new Set(slots);
    },

    getCallHistory: (entityType, entityId) => {
        return get().callLogs
            .filter(log => log.entityType === entityType && log.entityId === entityId)
            // Sort by timestamp descending (newest first)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
}));
