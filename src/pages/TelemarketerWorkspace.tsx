import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Headset, Phone, PhoneOff, CheckCircle2, XCircle, Clock,
    MapPin, User, AlertTriangle, Calendar, ChevronLeft,
    ChevronRight, MessageSquare, Send, Zap, Users, PhoneCall,
    PhoneMissed, Briefcase, FileText
} from 'lucide-react';
import { StorageManager } from '../lib/storage';
import { useCandidateStore } from '../hooks/useCandidateStore';
import { useClientStore } from '../hooks/useClientStore';
import { useTelemarketingStore } from '../hooks/useTelemarketingStore';
import TeamAgendaPanel from '../components/telemarketing/TeamAgendaPanel';
import type { DaySchedule, CallOutcome, TaskListItem, Contract, Visit } from '../lib/types';
import { WORKING_HOURS } from '../lib/types';
import { defaultEmployees, defaultGeoUnits } from '../lib/defaultData';
import { getEntityContacts, getPrimaryContact } from '../lib/contactUtils';

const getToday = () => new Date().toISOString().split('T')[0];

const outcomeConfig: Record<CallOutcome, { label: string; icon: any; color: string; bg: string; border: string; activeRing: string }> = {
    booked: { label: 'تم الحجز', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', activeRing: 'ring-emerald-200' },
    busy: { label: 'مشغول', icon: PhoneOff, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300', activeRing: 'ring-amber-200' },
    no_answer: { label: 'لا يرد', icon: PhoneMissed, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300', activeRing: 'ring-orange-200' },
    rejected: { label: 'مرفوض', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300', activeRing: 'ring-red-200' },
};

export default function TelemarketerWorkspace() {
    // Stores
    const candidates = useCandidateStore(state => state.candidates);
    const { clients, loadClients, updateClient } = useClientStore();
    const { taskLists, appointments, addCallLog, addAppointment, updateTaskListItemStatus, getTaskList, getAppointmentsForTeamDate } = useTelemarketingStore();

    const [contracts, setContracts] = useState<Contract[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [date] = useState(getToday());

    useEffect(() => {
        loadClients();
        setContracts(StorageManager.load('contracts', []));
        setVisits(StorageManager.load('visits', []));
    }, [loadClients]);

    // Schedule Parsing
    const schedules = useMemo<Record<string, DaySchedule>>(() => StorageManager.load('schedules', {}), []);
    const currentSchedule: DaySchedule = schedules[date] || { teams: [], solos: [] };

    const getEmp = (id: number | null) => defaultEmployees.find(e => e.id === id) || null;

    const availableTeams = useMemo(() => {
        const teams: { key: string; label: string; type: 'team' | 'solo' }[] = [];
        currentSchedule.teams.forEach((t, idx) => {
            const sup = getEmp(t.supervisor);
            const teles = (t.telemarketers || []).map(id => getEmp(id)?.name).filter(Boolean).join('، ');
            const label = sup ? `فريق ${sup.name}${teles ? ` (${teles})` : ''}` : `فريق #${idx + 1}${teles ? ` (${teles})` : ''}`;
            teams.push({ key: `team_${idx}`, label, type: 'team' });
        });
        currentSchedule.solos.forEach((s, idx) => {
            const tech = getEmp(s.technician);
            teams.push({ key: `solo_${idx}`, label: tech ? `فردي ${tech.name}` : `فردي #${idx + 1}`, type: 'solo' });
        });
        return teams;
    }, [currentSchedule]);

    const [selectedTeamKey, setSelectedTeamKey] = useState<string>(availableTeams[0]?.key || '');
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    // Call Actions
    const [selectedContactId, setSelectedContactId] = useState<string>('');
    const [outcome, setOutcome] = useState<CallOutcome | null>(null);
    const [visitTime, setVisitTime] = useState('');
    const [notes, setNotes] = useState('');
    const [occupation, setOccupation] = useState('');
    const [waterSource, setWaterSource] = useState('');

    // Active Task List
    const activeTaskList = useMemo(() => {
        if (!selectedTeamKey) return null;
        return getTaskList(selectedTeamKey, date);
    }, [getTaskList, selectedTeamKey, date, taskLists]); // taskLists is dependency for updates

    const tasks = activeTaskList?.items || [];
    const remainingCount = tasks.filter(t => t.status === 'pending').length;
    const completedCount = tasks.filter(t => t.status !== 'pending').length;

    // Reset task context when switching teams or choosing a new task
    useEffect(() => {
        setSelectedContactId('');
        setOutcome(null);
        setVisitTime('');
        setNotes('');
        setOccupation('');
        setWaterSource('');
    }, [selectedTeamKey, selectedTaskId]);

    // Auto-select first task
    useEffect(() => {
        if (!selectedTaskId && tasks.length > 0) {
            const firstPending = tasks.find(t => t.status === 'pending') || tasks[0];
            setSelectedTaskId(firstPending.id);
        }
    }, [tasks, selectedTaskId]);

    const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId), [tasks, selectedTaskId]);

    const handleSaveOutcome = () => {
        if (!selectedTask || !outcome || !selectedContactId) return;

        const entityContacts = getEntityContacts(entityDetails as any);
        const selectedContact = entityContacts.find(c => c.id === selectedContactId) || entityContacts[0];

        // Add Log
        addCallLog({
            entityType: selectedTask.entityType,
            entityId: selectedTask.entityId,
            taskListId: activeTaskList!.id,
            teamKey: selectedTeamKey,
            outcome,
            contactLabel: selectedContact.label,
            contactNumber: selectedContact.number,
            notes,
            calledBy: 1 // mock logged in user
        });

        // Update status
        const newStatus = outcome === 'booked' ? 'booked' : 'called';
        updateTaskListItemStatus(activeTaskList!.id, selectedTask.id, newStatus, outcome);

        if (outcome === 'booked' && visitTime) {
            addAppointment({
                entityType: selectedTask.entityType,
                entityId: selectedTask.entityId,
                customerName: selectedTask.name,
                customerAddress: selectedTask.addressText,
                customerMobile: selectedTask.mobile,
                teamKey: selectedTeamKey,
                date,
                timeSlot: visitTime,
                occupation,
                waterSource,
                notes,
                createdBy: 1
            });
            // Update Client profile with occupation/waterSource if it's a client
            if (selectedTask.entityType === 'client') {
                updateClient(selectedTask.entityId, { occupation, waterSource });
            }
        }

        // Auto move next
        const pendingTasks = tasks.filter(t => t.status === 'pending' && t.id !== selectedTask.id);
        if (pendingTasks.length > 0) {
            setSelectedTaskId(pendingTasks[0].id);
        } else {
            setSelectedTaskId(null);
        }
    };

    // Client/Candidate Details
    const entityDetails = useMemo(() => {
        if (!selectedTask) return null;
        if (selectedTask.entityType === 'candidate') {
            return candidates.find(c => c.id === selectedTask.entityId);
        }
        return clients.find(c => c.id === selectedTask.entityId);
    }, [selectedTask, candidates, clients]);

    const entityHistory = useMemo(() => {
        if (!selectedTask || selectedTask.entityType === 'candidate') return [];
        const clientVisits = visits.filter(v => v.customerId === selectedTask.entityId);
        const clientContracts = contracts.filter(c => c.customerId === selectedTask.entityId);

        const history: { date: string; type: string; note: string }[] = [];
        clientContracts.forEach(c => history.push({ date: c.contractDate, type: 'عقد', note: `${c.deviceModelName} - رقم العقد: ${c.contractNumber}` }));
        clientVisits.forEach(v => history.push({ date: v.date, type: 'زيارة', note: `النتيجة: ${v.outcome} ${v.notes ? '- ' + v.notes : ''}` }));
        return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedTask, visits, contracts]);

    const teamAppointments = useMemo(() => getAppointmentsForTeamDate(selectedTeamKey, date), [getAppointmentsForTeamDate, selectedTeamKey, date, appointments]);

    return (
        <div className="h-full flex flex-col overflow-hidden bg-slate-50">
            {/* ─── TOP BAR ─── */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-bl from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                        <Headset className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-slate-800">مساحة عمل المسوّق الهاتفي</h1>
                        <p className="text-[10px] text-slate-400">اليوم: {new Date(date).toLocaleDateString('ar-IQ')}</p>
                    </div>
                </div>

                {/* Team Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {availableTeams.map(team => (
                        <button
                            key={team.key}
                            onClick={() => setSelectedTeamKey(team.key)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${selectedTeamKey === team.key ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {team.label}
                        </button>
                    ))}
                    {availableTeams.length === 0 && <span className="text-xs text-slate-400 px-3 py-1">لا توجد فرق مجدولة اليوم</span>}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-violet-50 rounded-lg px-3 py-1.5 border border-violet-200">
                        <Zap className="w-3.5 h-3.5 text-violet-600" />
                        <span className="text-xs font-bold text-violet-700">{remainingCount} متبقي</span>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-1.5 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700">{completedCount} مُنجز</span>
                    </div>
                </div>
            </div>

            {/* ─── 4-COLUMN LAYOUT ─── */}
            <div className="flex-1 flex overflow-hidden">

                {/* Column 1: Team Agenda */}
                <TeamAgendaPanel appointments={teamAppointments} date={date} />

                {/* Column 2: Task Queue */}
                <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden shadow-sm z-10">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <PhoneCall className="w-3.5 h-3.5 text-violet-500" />
                            <span>قائمة الاتصال والتسويق</span>
                            <span className="mr-auto px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-600">{tasks.length}</span>
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scroll">
                        {tasks.length === 0 && (
                            <div className="text-center p-6 mt-10">
                                <AlertTriangle className="w-8 h-8 text-amber-300 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-600">لا توجد قائمة اتصال</p>
                                <p className="text-xs text-slate-400 mt-1">يجب توليد القائمة من خطة العمل أولاً</p>
                            </div>
                        )}
                        {tasks.map(task => {
                            const isActive = task.id === selectedTaskId;
                            const isProcessed = task.status !== 'pending';
                            return (
                                <button
                                    key={task.id}
                                    type="button"
                                    onClick={() => setSelectedTaskId(task.id)}
                                    className={`w-full text-right p-3 rounded-xl border-2 transition-all relative ${isProcessed
                                        ? 'bg-gray-50 border-gray-100 opacity-60'
                                        : isActive
                                            ? 'bg-white border-violet-300 shadow-sm shadow-violet-500/5'
                                            : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`absolute top-3 left-3 w-2.5 h-2.5 rounded-full ${!isProcessed ? 'bg-amber-400 animate-pulse' : task.status === 'booked' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                    <div className="flex items-start gap-2.5">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${task.entityType === 'candidate' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-sky-50 text-sky-600 border border-sky-200'}`}>
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold truncate ${isProcessed ? 'text-slate-500' : 'text-slate-800'}`}>{task.name}</p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${task.entityType === 'candidate' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                                                    {task.entityType === 'candidate' ? 'اسم مقترح' : 'عميل محتمل'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5 truncate">
                                                    <MapPin className="w-2.5 h-2.5" />{task.addressText}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Center Column: Customer Context */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                    {selectedTask && entityDetails ? (
                        <div className="max-w-2xl mx-auto space-y-5">
                            {/* Header Card */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-start gap-5">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${selectedTask.entityType === 'candidate' ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-gradient-to-br from-sky-400 to-blue-600 text-white'}`}>
                                    <User className="w-8 h-8" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h2 className="text-2xl font-black text-slate-800">{selectedTask.name}</h2>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${selectedTask.entityType === 'candidate' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                                            {selectedTask.entityType === 'candidate' ? 'Candidate (محتمل غير مؤكد)' : 'Lead (عميل مسجل)'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 mt-2">
                                        {getEntityContacts(entityDetails as any).map(contact => (
                                            <a key={contact.id} href={`tel:${contact.number}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm font-bold">
                                                <Phone className="w-4 h-4" />
                                                <span dir="ltr">{contact.number}</span>
                                                <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800">{contact.label}</span>
                                            </a>
                                        ))}
                                        <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-slate-600 font-medium w-full sm:w-auto mt-2 sm:mt-0">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />{selectedTask.addressText}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info / Notes */}
                            {selectedTask.entityType === 'candidate' && 'candidateNotes' in entityDetails && entityDetails.candidateNotes && (
                                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                                    <h3 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-2">
                                        <MessageSquare className="w-4 h-4" /> ملاحظات التزكية
                                    </h3>
                                    <p className="text-sm text-amber-900">{entityDetails.candidateNotes}</p>
                                </div>
                            )}

                            {/* History Timeline for Clients */}
                            {selectedTask.entityType === 'client' && (
                                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-sky-500" /> سجّل العميل
                                    </h3>
                                    {entityHistory.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-3 text-center bg-gray-50 rounded-lg">لا يوجد سجل سابق لهذا العميل</p>
                                    ) : (
                                        <div className="relative pr-4">
                                            <div className="absolute right-1.5 top-2 bottom-2 w-px bg-gray-200" />
                                            <div className="space-y-4">
                                                {entityHistory.map((h, idx) => (
                                                    <div key={idx} className="relative flex items-start gap-3">
                                                        <div className={`absolute -right-[21px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 ${idx === 0 ? 'bg-sky-500' : 'bg-gray-300'}`} />
                                                        <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.type === 'عقد' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{h.type}</span>
                                                                <span className="text-[10px] text-slate-500">{h.date}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-700">{h.note}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center text-slate-400">
                                <Headset className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">قم بتحديد عميل من القائمة لبدء الاتصال</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Action Panel */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden shadow-sm z-10">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5 text-violet-500" />
                            <span>تسجيل نتيجة المكالمة</span>
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scroll">
                        {selectedTask && selectedTask.status !== 'pending' && (
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                                <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-sm font-bold text-slate-600">تم معالجة هذه المكالمة</p>
                                <p className="text-xs text-slate-500 mt-1">النتيجة: {selectedTask.callOutcome}</p>
                            </div>
                        )}

                        {selectedTask && selectedTask.status === 'pending' && entityDetails && (
                            <>
                                {/* Contact Selection */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /><span>رقم الاتصال <span className="text-red-500">*</span></span>
                                    </label>
                                    <select
                                        value={selectedContactId}
                                        onChange={(e) => setSelectedContactId(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10 focus:outline-none transition-all"
                                    >
                                        <option value="" disabled>-- اختر الرقم الذي تم الاتصال به --</option>
                                        {getEntityContacts(entityDetails as any).map(contact => (
                                            <option key={contact.id} value={contact.id}>
                                                {contact.label} - {contact.number}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Outcomes */}
                                <div className="space-y-2 opacity-100 transition-opacity" style={{ opacity: selectedContactId ? 1 : 0.5 }}>
                                    {(Object.keys(outcomeConfig) as CallOutcome[]).map((key) => {
                                        const cfg = outcomeConfig[key];
                                        const isActive = outcome === key;
                                        return (
                                            <button key={key} type="button" onClick={() => setOutcome(key)} disabled={!selectedContactId}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-right ${isActive
                                                    ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-sm ring-2 ${cfg.activeRing}`
                                                    : 'bg-white border-gray-100 text-slate-600 hover:border-gray-200 hover:bg-gray-50'}`}>
                                                <div className={`w-8 h-8 rounded-lg ${isActive ? cfg.bg : 'bg-gray-100'} border ${isActive ? cfg.border : 'border-gray-200'} flex items-center justify-center`}>
                                                    <cfg.icon className={`w-4 h-4 ${isActive ? cfg.color : 'text-gray-400'}`} />
                                                </div>
                                                <span className="text-sm font-bold">{cfg.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Booking Form */}
                                <AnimatePresence>
                                    {outcome === 'booked' && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 space-y-4 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-emerald-600" />
                                                    <span className="text-xs font-bold text-emerald-800">حجز موعد الزيارة (لليوم {date})</span>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-emerald-700">ساعات العمل في المنطقة ({WORKING_HOURS.start}:00 - {WORKING_HOURS.end}:00)</label>
                                                    <input type="time" value={visitTime} onChange={e => setVisitTime(e.target.value)}
                                                        className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none font-mono" dir="ltr" />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-emerald-700">المهنة / طبيعة العمل</label>
                                                    <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="مثال: موظف حكومي، معلم..."
                                                        className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none placeholder:text-emerald-200" />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-emerald-700">مصدر المياه الحالي</label>
                                                    <select value={waterSource} onChange={e => setWaterSource(e.target.value)}
                                                        className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none text-emerald-900">
                                                        <option value="">-- اختر --</option>
                                                        <option value="الاسالة الحكومية">الاسالة الحكومية</option>
                                                        <option value="شراء قناني معبأة (RO)">شراء قناني معبأة (RO)</option>
                                                        <option value="ماء بئر / جوفي">ماء بئر / جوفي</option>
                                                        <option value="تناكر / حوضيات">تناكر / حوضيات</option>
                                                        <option value="غير معروف">غير معروف</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Notes */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" /><span>ملاحظات</span>
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="تفاصيل المكالمة..."
                                        className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-400 focus:bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10 focus:outline-none min-h-[80px] resize-none transition-all"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                        <button
                            type="button"
                            onClick={handleSaveOutcome}
                            disabled={!selectedTask || selectedTask.status !== 'pending' || !outcome || !selectedContactId || (outcome === 'booked' && (!visitTime || !occupation || !waterSource))}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-l from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white text-sm font-bold transition-all shadow-md shadow-violet-500/20 disabled:shadow-none"
                        >
                            <Send className="w-4 h-4" />
                            <span>حفظ النتيجة {outcome === 'booked' ? 'وحجز موعد' : ''}</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
