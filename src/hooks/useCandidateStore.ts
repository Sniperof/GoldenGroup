import { create } from 'zustand';
import { Candidate, ReferralSession, Client } from '../lib/types';
import { StorageManager } from '../lib/storage';

interface CandidateState {
    candidates: Candidate[];
    referralSessions: ReferralSession[];

    // Session Actions
    addReferralSession: (session: Omit<ReferralSession, 'id' | 'createdAt'>) => number;
    closeReferralSession: (sessionId: number) => void;

    // Candidate Actions
    addCandidate: (candidate: Omit<Candidate, 'id' | 'createdAt' | 'duplicateFlag' | 'duplicateType' | 'duplicateReferenceId' | 'status' | 'referralConfirmationStatus' | 'convertedToLeadId'>) => void;
    qualifyCandidate: (candidateId: number) => void;
    markJunk: (candidateId: number) => void;
}

const mockSessions: ReferralSession[] = [
    {
        id: 1,
        referralType: 'Direct Call',
        referralEntityId: null,
        referralNameSnapshot: 'حملة المنصور الميدانية',
        referralAddressText: 'بغداد، الكرخ، حي المنصور',
        referralOriginChannel: 'Campaign',
        referralNotes: 'حملة ترويجية في المول',
        referralDate: new Date().toISOString(),
        referralReason: 'تسويق عام',
        ownerUserId: 1,
        status: 'Open',
        createdAt: new Date().toISOString(),
        createdBy: 1
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
        referralSessionId: 1,
        referralDate: new Date().toISOString(),
        referralReason: 'تسويق عام',
        referralType: 'Campaign',
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
    referralSessions: mockSessions,

    addReferralSession: (sessionData) => {
        let newId = 1;
        set((state) => {
            newId = state.referralSessions.length > 0 ? Math.max(...state.referralSessions.map(s => s.id)) + 1 : 1;
            const newSession: ReferralSession = {
                ...sessionData,
                id: newId,
                createdAt: new Date().toISOString(),
            };
            return { referralSessions: [...state.referralSessions, newSession] };
        });
        return newId;
    },

    closeReferralSession: (sessionId) => set((state) => ({
        referralSessions: state.referralSessions.map(s => s.id === sessionId ? { ...s, status: 'Closed' } : s)
    })),

    addCandidate: (candidateData) => set((state) => {
        // MANDATORY DATA CHECK
        if (!candidateData.referralDate || !candidateData.referralReason) {
            throw new Error('بيانات الاستقطاب (التاريخ والسبب) إلزامية ولا يمكن الحفظ بدونها.');
        }

        const clients = StorageManager.load<Client[]>('clients', []);

        // 1. Internal Duplicate Check (BLOCKING)
        if (candidateData.referralSessionId) {
            // Mode B: Session-based blocking
            const sameSessionDupe = state.candidates.find(c =>
                c.referralSessionId === candidateData.referralSessionId &&
                c.mobile === candidateData.mobile
            );
            if (sameSessionDupe) {
                throw new Error(`رقم الهاتف ${candidateData.mobile} موجود مسبقاً في نفس الجلسة!`);
            }
        } else {
            // Mode A: Direct Mode blocking (Mobile + Owner + Date)
            const sameContextDupe = state.candidates.find(c =>
                c.referralSessionId === null &&
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
            status: 'New',
            referralConfirmationStatus: 'Pending',
            duplicateFlag: isDupe,
            duplicateType: dupeType,
            duplicateReferenceId: refId,
            convertedToLeadId: null,
            id: state.candidates.length > 0 ? Math.max(...state.candidates.map(c => c.id)) + 1 : 1,
            createdAt: new Date().toISOString()
        };

        return { candidates: [...state.candidates, newCandidate] };
    }),

    qualifyCandidate: (candidateId) => set((state) => {
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
            referralSessionId: candidate.referralSessionId,
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
    }),

    markJunk: (candidateId) => set((state) => ({
        candidates: state.candidates.map(c => c.id === candidateId ? { ...c, status: 'Junk' } : c)
    }))
}));
