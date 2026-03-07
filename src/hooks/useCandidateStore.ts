import { create } from 'zustand';
import { Candidate, ReferralSheet, ReferralSheetStats } from '../lib/types';
import { api } from '../lib/api';

interface CandidateState {
    candidates: Candidate[];
    referralSheets: ReferralSheet[];

    fetchData: () => Promise<void>;

    addReferralSheet: (sheet: Omit<ReferralSheet, 'id' | 'createdAt' | 'stats'>) => Promise<number>;
    closeReferralSheet: (sheetId: number) => Promise<void>;

    addCandidate: (candidate: Omit<Candidate, 'id' | 'createdAt' | 'duplicateFlag' | 'duplicateType' | 'duplicateReferenceId' | 'status' | 'referralConfirmationStatus' | 'convertedToLeadId' | 'referralSheetId'> & { referralSheetId: number | null }) => Promise<void>;
    qualifyCandidate: (candidateId: number) => Promise<void>;
    markJunk: (candidateId: number) => Promise<void>;
    
    updateSheetStats: (sheetId: number) => Promise<void>;
}

export const useCandidateStore = create<CandidateState>((set, get) => ({
    candidates: [],
    referralSheets: [],

    fetchData: async () => {
        const [candidates, referralSheets] = await Promise.all([
            api.candidates.list(),
            api.referralSheets.list()
        ]);
        set({ candidates, referralSheets });
    },

    addReferralSheet: async (sheetData) => {
        const state = get();
        const existingSheet = state.referralSheets.find(s => 
            s.ownerUserId === sheetData.ownerUserId &&
            s.referralNameSnapshot === sheetData.referralNameSnapshot &&
            s.referralDate.split('T')[0] === sheetData.referralDate.split('T')[0]
        );

        if (existingSheet) {
            throw new Error('يوجد ورقة ترشيح مطابقة لنفس الوسيط والتاريخ والمشرفة!');
        }

        const newSheet = await api.referralSheets.create({
            ...sheetData,
            stats: {
                totalCandidates: 0,
                qualityPercentage: 0,
                conversionPercentage: 0
            }
        });
        await get().fetchData();
        return newSheet.id;
    },

    closeReferralSheet: async (sheetId) => {
        await api.referralSheets.update(sheetId, { status: 'Completed' });
        await get().fetchData();
    },

    updateSheetStats: async (sheetId) => {
        const state = get();
        const sheetCandidates = state.candidates.filter(c => c.referralSheetId === sheetId);
        const total = sheetCandidates.length;
        if (total === 0) return;

        const valid = sheetCandidates.filter(c => !c.duplicateFlag && c.status !== 'Junk').length;
        const converted = sheetCandidates.filter(c => c.convertedToLeadId !== null).length;

        const newStats: ReferralSheetStats = {
            totalCandidates: total,
            qualityPercentage: Math.round((valid / total) * 100),
            conversionPercentage: Math.round((converted / total) * 100)
        };

        await api.referralSheets.update(sheetId, { stats: newStats });
        await get().fetchData();
    },

    addCandidate: async (candidateData) => {
        if (!candidateData.referralDate || !candidateData.referralReason) {
            throw new Error('بيانات الاستقطاب (التاريخ والسبب) إلزامية ولا يمكن الحفظ بدونها.');
        }

        const state = get();

        if (candidateData.referralSheetId) {
            const sameSessionDupe = state.candidates.find(c =>
                c.referralSheetId === candidateData.referralSheetId &&
                c.mobile === candidateData.mobile
            );
            if (sameSessionDupe) {
                throw new Error(`رقم الهاتف ${candidateData.mobile} موجود مسبقاً في نفس الجلسة!`);
            }
        } else {
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

        const clients = await api.clients.list();

        let isDupe = false;
        let dupeType: Candidate['duplicateType'] = null;
        let refId: number | null = null;

        const clientDupe = clients.find((c: any) => c.mobile === candidateData.mobile);
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

        await api.candidates.create({
            ...candidateData,
            status: 'New',
            referralConfirmationStatus: 'Pending',
            duplicateFlag: isDupe,
            duplicateType: dupeType,
            duplicateReferenceId: refId,
            convertedToLeadId: null
        });

        await get().fetchData();

        if (candidateData.referralSheetId) {
            await get().updateSheetStats(candidateData.referralSheetId);
        }
    },

    qualifyCandidate: async (candidateId) => {
        const state = get();
        const candidate = state.candidates.find(c => c.id === candidateId);
        if (!candidate) return;

        if (!candidate.referralDate || !candidate.referralType) {
            throw new Error('خطأ خطير: لا يمكن تحويل مرشح يفتقر إلى بيانات وتاريخ الاستقطاب الأساسية.');
        }

        const clients = await api.clients.list();

        if (clients.some((c: any) => c.mobile === candidate.mobile)) {
            throw new Error('الرقم موجود بالفعل في قائمة العملاء. يرجى المراجعة.');
        }

        const newClient = await api.clients.create({
            name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.nickname || 'بدون اسم',
            mobile: candidate.mobile,
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
            isCandidate: false,
            candidateStatus: 'New'
        });

        await api.candidates.update(candidateId, {
            ...candidate,
            status: 'Qualified',
            convertedToLeadId: newClient.id
        });

        await get().fetchData();

        if (candidate.referralSheetId) {
            await get().updateSheetStats(candidate.referralSheetId);
        }
    },

    markJunk: async (candidateId) => {
        const state = get();
        const candidate = state.candidates.find(c => c.id === candidateId);
        if (!candidate) return;

        await api.candidates.update(candidateId, {
            ...candidate,
            status: 'Junk'
        });

        await get().fetchData();

        if (candidate.referralSheetId) {
            await get().updateSheetStats(candidate.referralSheetId);
        }
    }
}));
