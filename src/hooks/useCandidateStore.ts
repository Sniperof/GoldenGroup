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
    qualifyCandidate: (candidateId: number) => void;
    markJunk: (candidateId: number) => void;

    // Stats Helpers
    updateSheetStats: (sheetId: number) => void;
}

const mockSheets: ReferralSheet[] = [
    {
        id: 1,
        referralType: 'Personal',
        referralEntityId: null,
        referralNameSnapshot: 'حملة المنصور الميدانية',
        referralAddressText: 'بغداد، الكرخ، حي المنصور',
        referralOriginChannel: 'Campaign',
        referralNotes: 'حملة ترويجية في المول',
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
        firstName: 'علي',
        lastName: 'محمد',
        nickname: 'ابو حسين',
        mobile: '07712345678',
        addressText: 'بغداد، الكرخ، حي المنصور',
        ownerUserId: 1,
        status: 'New',
        referralSheetId: 1,
        referralDate: new Date().toISOString(),
        referralReason: 'تسويق عام',
        referralType: 'Personal',
        referralOriginChannel: 'Campaign',
        referralNameSnapshot: 'حملة المنصور الميدانية',
        referralEntityId: null,
        referralConfirmationStatus: 'Pending',
        candidateNotes: 'يفضل الاتصال بعد العصر',
        duplicateFlag: false,
        duplicateType: null,
        duplicateReferenceId: null,
        convertedToLeadId: null,
        createdAt: new Date().toISOString(),
        createdBy: 1
    }
];

export const useCandidateStore = create<CandidateState>((set, get) => ({
    candidates: mockCandidates,
    referralSheets: mockSheets,

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
            return { referralSheets: [...state.referralSheets, newSheet] };
        });
        return newId;
    },

    closeReferralSheet: (sheetId) => set((state) => ({
        referralSheets: state.referralSheets.map(s => s.id === sheetId ? { ...s, status: 'Completed' } : s)
    })),

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

        return {
            referralSheets: state.referralSheets.map(s => s.id === sheetId ? { ...s, stats: newStats } : s)
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
                    throw new Error(`رقم الهاتف ${candidateData.mobile} أدخل مسبقاً اليوم لك كاستقطاب مباشر!`);
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
                status: 'Prospect',
                referralConfirmationStatus: 'Pending',
                duplicateFlag: isDupe,
                duplicateType: dupeType,
                duplicateReferenceId: refId,
                convertedToLeadId: null,
                id: state.candidates.length > 0 ? Math.max(...state.candidates.map(c => c.id)) + 1 : 1,
                createdAt: new Date().toISOString()
            };

            return { candidates: [...state.candidates, newCandidate] };
        });

        // Auto update stats if sheet exists
        if (candidateData.referralSheetId) {
            get().updateSheetStats(candidateData.referralSheetId);
        }
    },

    qualifyCandidate: (candidateId) => {
        set((state) => {
            const candidate = state.candidates.find(c => c.id === candidateId);
            if (!candidate) return state;

            if (!candidate.referralDate || !candidate.referralType) {
                throw new Error('خطأ خطير: لا يمكن تحويل مرشح يفتقر إلى بيانات وتاريخ الاستقطاب الأساسية.');
            }

            const clients = StorageManager.load<Client[]>('clients', []);

            if (clients.some(c => c.mobile === candidate.mobile)) {
                throw new Error('الرقم موجود بالفعل في قائمة العملاء. يرجى المراجعة.');
            }

            const newClient: Client = {
                id: clients.length > 0 ? Math.max(...clients.map(c => c.id)) + 1 : 1,
                name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.nickname || 'بدون اسم',
                mobile: candidate.mobile,
                governorate: '',
                district: '',
                neighborhood: candidate.addressText,
                detailedAddress: candidate.addressText,

                // Full Lineage Transfer Guarantee
                sourceChannel: candidate.referralOriginChannel,
                referrerType: candidate.referralType,
                referrerName: candidate.referralNameSnapshot,
                referralEntityId: candidate.referralEntityId,
                referralDate: candidate.referralDate,
                referralReason: candidate.referralReason,
                referralSheetId: candidate.referralSheetId, // Updated
                referralAddressText: candidate.addressText,

                createdAt: new Date().toISOString(),
                isCandidate: false,
                candidateStatus: 'New'
            };

            StorageManager.save('clients', [...clients, newClient]);

            const updatedCandidates = state.candidates.map(c =>
                c.id === candidateId ? {
                    ...c,
                    status: 'Qualified' as const,
                    convertedToLeadId: newClient.id
                } : c
            );

            return { candidates: updatedCandidates };
        });

        // Update stats
        const candidate = get().candidates.find(c => c.id === candidateId);
        if (candidate?.referralSheetId) {
            get().updateSheetStats(candidate.referralSheetId);
        }
    },

    markJunk: (candidateId) => {
        set((state) => ({
            candidates: state.candidates.map(c => c.id === candidateId ? { ...c, status: 'Junk' } : c)
        }));

        // Update stats
        const candidate = get().candidates.find(c => c.id === candidateId);
        if (candidate?.referralSheetId) {
            get().updateSheetStats(candidate.referralSheetId);
        }
    }
}));
