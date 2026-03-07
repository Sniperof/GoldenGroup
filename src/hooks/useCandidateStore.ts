import { create } from 'zustand';
import { Candidate, ReferralSheet, Client, ReferralSheetStats } from '../lib/types';
import { StorageManager } from '../lib/storage';

interface CandidateState {
    candidates: Candidate[];
    referralSheets: ReferralSheet[];

    // Sheet Actions
    addReferralSheet: (sheet: Omit<ReferralSheet, 'id' | 'createdAt' | 'stats'>) => number;
    closeReferralSheet: (sheetId: number) => void;

    // Candidate Actions
    addCandidate: (candidate: Omit<Candidate, 'id' | 'createdAt' | 'duplicateFlag' | 'duplicateType' | 'duplicateReferenceId' | 'status' | 'referralConfirmationStatus' | 'convertedToLeadId' | 'referralSheetId'> & { referralSheetId: number | null }) => void;
    qualifyCandidate: (candidateId: number, clientData?: Client) => void;
    linkCandidateToClient: (candidateId: number, clientId: number) => void;
    markJunk: (candidateId: number) => void;
    markForFollowUp: (candidateId: number) => void;
    updateCandidate: (candidateId: number, data: Partial<Candidate>) => void;

    // Stats Helpers
    updateSheetStats: (sheetId: number) => void;
}

const mockSheets: ReferralSheet[] = [
    {
        id: 1,
        referralType: 'Client',
        referralEntityId: 101, // Ahmed
        referralNameSnapshot: 'محمد حسين',
        referralAddressText: 'دمشق، المزة',
        referralOriginChannel: 'Acquaintance',
        referralNotes: 'أحمد صديق قديم من دمشق',
        referralDate: new Date().toISOString(),
        ownerUserId: 1,
        status: 'New',
        createdAt: new Date().toISOString(),
        createdBy: 1,
        stats: {
            totalCandidates: 1,
            qualityPercentage: 100,
            conversionPercentage: 0
        }
    }
];

const mockCandidates: Candidate[] = [
    {
        id: 1,
        firstName: 'خالد',
        lastName: 'الحمصي',
        nickname: 'أبو وليد',
        mobile: '0933999887',
        contacts: [
            { id: '1', type: 'mobile', number: '0933999887', label: 'الموبايل الشخصي', hasWhatsApp: true, isPrimary: true, status: 'active' },
            { id: '2', type: 'mobile', number: '0944111222', label: 'الزوجة', hasWhatsApp: false, isPrimary: false, status: 'active' }
        ],
        addressText: 'دمشق، المزة فيلات',
        ownerUserId: 1,
        status: 'Suggested',
        referralSheetId: 1, // Ahmed's sheet
        referralDate: new Date().toISOString(),
        referralReason: 'أحمد رشحه بالورقة',
        referralType: 'Client',
        referralOriginChannel: 'Acquaintance',
        referralNameSnapshot: 'محمد حسين',
        referralEntityId: 101,
        referralConfirmationStatus: 'Pending',
        geoUnitId: 6,
        candidateNotes: 'تواصل معه بخصوص الفلتر',
        duplicateFlag: false,
        duplicateType: null,
        duplicateReferenceId: null,
        convertedToLeadId: null,
        createdAt: new Date().toISOString(),
        createdBy: 1
    },
    {
        id: 2,
        firstName: 'ليلى',
        lastName: 'حسان',
        nickname: '',
        mobile: '0933555443',
        contacts: [
            { id: '3', type: 'mobile', number: '0933555443', label: 'الرقم الأساسي', hasWhatsApp: true, isPrimary: true, status: 'active' }
        ],
        addressText: 'دمشق، أبو رمانة',
        ownerUserId: 1,
        status: 'Suggested',
        referralSheetId: null, // Direct Entry
        referralDate: new Date().toISOString(),
        referralReason: 'تزكية مباشرة من فاطمة',
        referralType: 'Client',
        referralOriginChannel: 'Acquaintance',
        referralNameSnapshot: 'فاطمة الزهراء',
        referralEntityId: 102, // Fatima
        referralConfirmationStatus: 'Pending',
        geoUnitId: 7,
        candidateNotes: 'تزكية مباشرة',
        duplicateFlag: false,
        duplicateType: null,
        duplicateReferenceId: null,
        convertedToLeadId: null,
        createdAt: new Date().toISOString(),
        createdBy: 1
    }
];

export const useCandidateStore = create<CandidateState>((set, get) => ({
    candidates: StorageManager.load<Candidate[]>('candidates', mockCandidates),
    referralSheets: StorageManager.load<ReferralSheet[]>('referralSheets', mockSheets),

    addReferralSheet: (sheetData) => {
        let newId = 1;
        set((state) => {
            // DUPLICATE SHEET CHECK
            const existingSheet = state.referralSheets.find(s =>
                s.ownerUserId === sheetData.ownerUserId &&
                s.referralNameSnapshot === sheetData.referralNameSnapshot &&
                s.referralDate.split('T')[0] === sheetData.referralDate.split('T')[0]
            );

            if (existingSheet) {
                throw new Error('يوجد ورقة ترشيح مطابقة لنفس الوسيط والتاريخ والمشرفة!');
            }

            newId = state.referralSheets.length > 0 ? Math.max(...state.referralSheets.map(s => s.id)) + 1 : 1;

            const newSheet: ReferralSheet = {
                ...sheetData,
                id: newId,
                createdAt: new Date().toISOString(),
                status: 'New',
                stats: {
                    totalCandidates: 0,
                    qualityPercentage: 0,
                    conversionPercentage: 0
                }
            };
            const updatedSheets = [...state.referralSheets, newSheet];
            StorageManager.save('referralSheets', updatedSheets);
            return { referralSheets: updatedSheets };
        });
        return newId;
    },

    closeReferralSheet: (sheetId) => set((state) => {
        const updatedSheets = state.referralSheets.map(s => s.id === sheetId ? { ...s, status: 'Completed' as const } : s);
        StorageManager.save('referralSheets', updatedSheets);
        return { referralSheets: updatedSheets };
    }),

    updateSheetStats: (sheetId) => set((state) => {
        const sheetCandidates = state.candidates.filter(c => c.referralSheetId === sheetId);
        const total = sheetCandidates.length;
        if (total === 0) return state;

        const valid = sheetCandidates.filter(c => !c.duplicateFlag && c.status !== 'Junk').length;
        const converted = sheetCandidates.filter(c => c.convertedToLeadId !== null).length;

        const newStats: ReferralSheetStats = {
            totalCandidates: total,
            qualityPercentage: Math.round((valid / total) * 100),
            conversionPercentage: Math.round((converted / total) * 100)
        };

        const updatedSheets = state.referralSheets.map(s => s.id === sheetId ? { ...s, stats: newStats } : s);
        StorageManager.save('referralSheets', updatedSheets);
        return {
            referralSheets: updatedSheets
        };
    }),

    addCandidate: (candidateData) => {
        set((state) => {
            // MANDATORY DATA CHECK
            if (!candidateData.referralDate || !candidateData.referralReason) {
                throw new Error('بيانات الاستقطاب (التاريخ والسبب) إلزامية ولا يمكن الحفظ بدونها.');
            }

            const clients = StorageManager.load<Client[]>('clients', []);

            // 1. Internal Duplicate Check (BLOCKING)
            if (candidateData.referralSheetId) {
                // Mode B: Session-based blocking
                const sameSessionDupe = state.candidates.find(c =>
                    c.referralSheetId === candidateData.referralSheetId &&
                    c.mobile === candidateData.mobile
                );
                if (sameSessionDupe) {
                    throw new Error(`رقم الهاتف ${candidateData.mobile} موجود مسبقاً في نفس الجلسة!`);
                }
            } else {
                // Mode A: Direct Mode blocking (Mobile + Owner + Date)
                const sameContextDupe = state.candidates.find(c =>
                    c.referralSheetId === null &&
                    c.ownerUserId === candidateData.ownerUserId &&
                    c.referralDate.split('T')[0] === candidateData.referralDate.split('T')[0] &&
                    c.mobile === candidateData.mobile
                );
                if (sameContextDupe) {
                    throw new Error(`رقم الهاتف ${candidateData.mobile} أدخل مسبقاً اليوم لك ترشيح مباشر!`);
                }
            }

            // 2. System Duplicate Check (FLAGGING)
            let isDupe = false;
            let dupeType: Candidate['duplicateType'] = null;
            let refId: number | null = null;

            const clientDupe = clients.find(c => c.mobile === candidateData.mobile);
            const candidateDupe = state.candidates.find(c => c.mobile === candidateData.mobile);

            if (clientDupe) {
                isDupe = true;
                dupeType = 'Client';
                refId = clientDupe.id;
            } else if (candidateDupe) {
                isDupe = true;
                dupeType = 'Candidate';
                refId = candidateDupe.id;
            }

            const newCandidate: Candidate = {
                ...candidateData,
                status: 'Suggested',
                referralConfirmationStatus: 'Pending',
                duplicateFlag: isDupe,
                duplicateType: dupeType,
                duplicateReferenceId: refId,
                convertedToLeadId: null,
                id: state.candidates.length > 0 ? Math.max(...state.candidates.map(c => c.id)) + 1 : 1,
                createdAt: new Date().toISOString()
            };

            const updatedCandidates = [...state.candidates, newCandidate];
            StorageManager.save('candidates', updatedCandidates);
            return { candidates: updatedCandidates };
        });

        // Auto update stats if sheet exists
        if (candidateData.referralSheetId) {
            get().updateSheetStats(candidateData.referralSheetId);
        }
    },

    qualifyCandidate: (candidateId, clientData) => {
        set((state) => {
            const candidate = state.candidates.find(c => c.id === candidateId);
            if (!candidate) return state;

            const clients = StorageManager.load<Client[]>('clients', []);

            // If clientData is provided, it means it's already "new" and possibly edited.
            // But we need to ensure the candidate is linked to it.
            let savedClient: Client;
            if (clientData) {
                // We use the ID if provided, or generate a final one just in case
                const newId = clientData.id || (clients.length > 0 ? Math.max(1000, ...clients.map(c => c.id)) + 1 : 1001);
                savedClient = { ...clientData, id: newId };
                // Filter out the client from list if it was somehow added, though in our flow it shouldn't be yet
                const otherClients = clients.filter(c => c.id !== newId && c.mobile !== savedClient.mobile);
                StorageManager.save('clients', [...otherClients, savedClient]);
            } else {
                // Auto-generate based on candidate
                if (!candidate.referralDate || !candidate.referralType) {
                    throw new Error('خطأ خطير: لا يمكن تحويل مرشح يفتقر إلى بيانات وتاريخ الاستقطاب الأساسية.');
                }

                if (clients.some(c => c.mobile === candidate.mobile)) {
                    throw new Error('الرقم موجود بالفعل في قائمة الزبائن. يرجى المراجعة.');
                }

                savedClient = {
                    id: clients.length > 0 ? Math.max(1000, ...clients.map(c => c.id)) + 1 : 1001,
                    firstName: candidate.firstName || '',
                    fatherName: '',
                    lastName: candidate.lastName || '',
                    nickname: candidate.nickname || undefined,
                    name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.nickname || 'بدون اسم',
                    mobile: candidate.mobile,
                    contacts: candidate.contacts || [{
                        id: Date.now().toString(),
                        type: 'mobile',
                        number: candidate.mobile,
                        label: 'الرقم الأساسي',
                        hasWhatsApp: true,
                        isPrimary: true,
                        status: 'active'
                    }],
                    governorate: '',
                    district: '',
                    neighborhood: candidate.addressText,
                    detailedAddress: candidate.addressText,
                    sourceChannel: candidate.referralOriginChannel,
                    referrerType: candidate.referralType,
                    referrerName: candidate.referralNameSnapshot,
                    referralEntityId: candidate.referralEntityId,
                    referralDate: candidate.referralDate,
                    referralReason: candidate.referralReason,
                    referralSheetId: candidate.referralSheetId,
                    referralAddressText: candidate.addressText,
                    createdAt: new Date().toISOString(),
                    isCandidate: false,
                    candidateStatus: 'Suggested'
                };
                StorageManager.save('clients', [...clients, savedClient]);
            }

            const updatedCandidates = state.candidates.map(c =>
                c.id === candidateId ? {
                    ...c,
                    status: 'Qualified' as const,
                    convertedToLeadId: savedClient.id
                } : c
            );
            StorageManager.save('candidates', updatedCandidates);
            return { candidates: updatedCandidates };
        });

        // Update stats
        const candidate = get().candidates.find(c => c.id === candidateId);
        if (candidate?.referralSheetId) {
            get().updateSheetStats(candidate.referralSheetId);
        }
    },

    linkCandidateToClient: (candidateId, clientId) => {
        set((state) => {
            const candidate = state.candidates.find(c => c.id === candidateId);

            if (candidate) {
                // Fetch and update the linked client in StorageManager
                const clients = StorageManager.load<Client[]>('clients', []);
                const clientIndex = clients.findIndex(c => c.id === clientId);

                if (clientIndex !== -1) {
                    const client = clients[clientIndex];
                    const existingReferrers = client.referrers || [];

                    // Create new referrer record from candidate data
                    const newReferrer = {
                        id: Date.now().toString(),
                        referrerType: candidate.referralType,
                        referralEntityId: candidate.referralEntityId,
                        referrerName: candidate.referralNameSnapshot,
                        sourceChannel: candidate.referralOriginChannel,
                        referralDate: candidate.referralDate,
                        referralReason: candidate.referralReason,
                        referralSheetId: candidate.referralSheetId
                    };

                    // Push to referrers array and set primary legacy fields if null
                    client.referrers = [...existingReferrers, newReferrer];

                    if (!client.referrerName) {
                        client.referrerName = newReferrer.referrerName;
                        client.referrerType = newReferrer.referrerType;
                        client.sourceChannel = newReferrer.sourceChannel;
                        client.referralEntityId = newReferrer.referralEntityId;
                        client.referralDate = newReferrer.referralDate;
                        client.referralReason = newReferrer.referralReason;
                        client.referralSheetId = newReferrer.referralSheetId;
                    }

                    clients[clientIndex] = client;
                    StorageManager.save('clients', clients);
                }
            }

            const updatedCandidates = state.candidates.map(c =>
                c.id === candidateId ? {
                    ...c,
                    status: 'Qualified' as const,
                    convertedToLeadId: clientId,
                    duplicateFlag: true
                } : c
            );
            StorageManager.save('candidates', updatedCandidates);
            return { candidates: updatedCandidates };
        });

        const candidate = get().candidates.find(c => c.id === candidateId);
        if (candidate?.referralSheetId) {
            get().updateSheetStats(candidate.referralSheetId);
        }
    },

    markJunk: (candidateId) => {
        set((state) => {
            const updatedCandidates = state.candidates.map(c => c.id === candidateId ? { ...c, status: 'Junk' as const } : c);
            StorageManager.save('candidates', updatedCandidates);
            return { candidates: updatedCandidates };
        });

        // Update stats
        const candidate = get().candidates.find(c => c.id === candidateId);
        if (candidate?.referralSheetId) {
            get().updateSheetStats(candidate.referralSheetId);
        }
    },

    markForFollowUp: (candidateId) => {
        set((state) => {
            const updatedCandidates = state.candidates.map(c => c.id === candidateId ? { ...c, status: 'FollowUp' as const } : c);
            StorageManager.save('candidates', updatedCandidates);
            return { candidates: updatedCandidates };
        });

        // Update stats
        const candidate = get().candidates.find(c => c.id === candidateId);
        if (candidate?.referralSheetId) {
            get().updateSheetStats(candidate.referralSheetId);
        }
    },

    updateCandidate: (candidateId, data) => {
        set((state) => {
            const updatedCandidates = state.candidates.map(c =>
                c.id === candidateId ? { ...c, ...data } : c
            );

            // Re-check duplicates if mobile changed
            if (data.mobile) {
                const clients = StorageManager.load<Client[]>('clients', []);
                const finalCandidates = updatedCandidates.map(c => {
                    if (c.id === candidateId) {
                        const clientDupe = clients.find(cl => cl.mobile === c.mobile);
                        const otherCandidateDupe = updatedCandidates.find(oc => oc.id !== candidateId && oc.mobile === c.mobile);

                        let isDupe = false;
                        let dupeType: Candidate['duplicateType'] = null;
                        let refId: number | null = null;

                        if (clientDupe) {
                            isDupe = true;
                            dupeType = 'Client';
                            refId = clientDupe.id;
                        } else if (otherCandidateDupe) {
                            isDupe = true;
                            dupeType = 'Candidate';
                            refId = otherCandidateDupe.id;
                        }

                        return {
                            ...c,
                            duplicateFlag: isDupe,
                            duplicateType: dupeType,
                            duplicateReferenceId: refId
                        };
                    }
                    return c;
                });
                StorageManager.save('candidates', finalCandidates);
                return { candidates: finalCandidates };
            }

            StorageManager.save('candidates', updatedCandidates);
            return { candidates: updatedCandidates };
        });

        const candidate = get().candidates.find(c => c.id === candidateId);
        if (candidate?.referralSheetId) {
            get().updateSheetStats(candidate.referralSheetId);
        }
    }
}));
