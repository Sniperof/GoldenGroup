import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Headset, Phone, PhoneOff, CheckCircle2, XCircle, Clock,
    MapPin, User, AlertTriangle, Wrench, Calendar, ChevronLeft,
    ChevronRight, MessageSquare, Send, Zap, RefreshCw, RotateCcw,
    Star, ArrowRight, PhoneCall, PhoneMissed
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types & Mock Data                                                   */
/* ------------------------------------------------------------------ */

type TaskPriority = 'high' | 'medium' | 'low';
type TaskType = 'emergency' | 'maintenance' | 'followup' | 'dues' | 'return';
type CallOutcome = 'booked' | 'no_answer' | 'cancelled' | null;

interface TeleTask {
    id: number;
    customerName: string;
    mobile: string;
    address: string;
    zone: string;
    taskType: TaskType;
    taskDescription: string;
    priority: TaskPriority;
    deviceInfo: string;
    history: { date: string; type: string; note: string }[];
}

const taskTypeConfig: Record<TaskType, { label: string; icon: any; color: string; bg: string; border: string }> = {
    emergency: { label: 'طوارئ', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    maintenance: { label: 'صيانة دورية', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    followup: { label: 'متابعة', icon: PhoneCall, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    dues: { label: 'مستحقات', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    return: { label: 'إرجاع', icon: RotateCcw, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
};

const priorityConfig: Record<TaskPriority, { label: string; dot: string; sort: number }> = {
    high: { label: 'عالي', dot: 'bg-red-500', sort: 1 },
    medium: { label: 'متوسط', dot: 'bg-amber-400', sort: 2 },
    low: { label: 'عادي', dot: 'bg-emerald-400', sort: 3 },
};

const outcomeConfig: Record<string, { label: string; icon: any; color: string; bg: string; border: string; activeRing: string }> = {
    booked: { label: 'تم الحجز', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', activeRing: 'ring-emerald-200' },
    no_answer: { label: 'لا يرد', icon: PhoneMissed, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300', activeRing: 'ring-amber-200' },
    cancelled: { label: 'إلغاء', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300', activeRing: 'ring-red-200' },
};

const mockTasks: TeleTask[] = [
    {
        id: 1, customerName: 'خالد السامرائي', mobile: '07701234567', address: 'حي المنصور، شارع 14، بناية 7', zone: 'المنصور',
        taskType: 'emergency', taskDescription: 'عطل طارئ - مضخة الماء لا تعمل', priority: 'high', deviceInfo: 'RO-500 Pro — فلتر 7 مراحل',
        history: [
            { date: '2026-02-17', type: 'اتصال', note: 'تم الاتصال ولم يرد' },
            { date: '2026-02-10', type: 'زيارة', note: 'صيانة دورية - تم تبديل الفلاتر' },
            { date: '2025-12-05', type: 'زيارة', note: 'تركيب الجهاز' },
        ],
    },
    {
        id: 2, customerName: 'نور الدين', mobile: '07709876543', address: 'الكرادة، مقابل جامع الرحمن', zone: 'الكرادة',
        taskType: 'maintenance', taskDescription: 'صيانة دورية - تبديل فلتر PP و CTO', priority: 'medium', deviceInfo: 'AquaPure 300 — فلتر 5 مراحل',
        history: [
            { date: '2026-01-20', type: 'اتصال', note: 'تأكيد موعد الصيانة' },
            { date: '2025-11-15', type: 'زيارة', note: 'تركيب الجهاز' },
        ],
    },
    {
        id: 3, customerName: 'سلمى حسين', mobile: '07705551234', address: 'الكاظمية، حي العطيفية', zone: 'الكاظمية',
        taskType: 'followup', taskDescription: 'متابعة بعد صيانة طارئة - التأكد من عمل الجهاز', priority: 'medium', deviceInfo: 'CleanWater 200 — فلتر 3 مراحل',
        history: [
            { date: '2026-02-15', type: 'زيارة', note: 'صيانة طارئة - تبديل ممبرين RO' },
            { date: '2025-09-10', type: 'زيارة', note: 'تركيب الجهاز' },
        ],
    },
    {
        id: 4, customerName: 'عبد الرحمن الجبوري', mobile: '07701112233', address: 'الداوودي، شارع الأميرات', zone: 'الداوودي',
        taskType: 'dues', taskDescription: 'متأخر - قسط شهر فبراير غير مسدد', priority: 'high', deviceInfo: 'RO-500 Pro — فلتر 7 مراحل',
        history: [
            { date: '2026-02-01', type: 'اتصال', note: 'تذكير بالقسط - وعد بالدفع' },
            { date: '2026-01-15', type: 'زيارة', note: 'صيانة دورية' },
        ],
    },
    {
        id: 5, customerName: 'ريم عباس', mobile: '07703334455', address: 'حي العدل، مجاور مدرسة النور', zone: 'المنصور',
        taskType: 'maintenance', taskDescription: 'صيانة دورية - فحص شامل', priority: 'low', deviceInfo: 'AquaPure 300 — فلتر 5 مراحل',
        history: [
            { date: '2025-12-20', type: 'زيارة', note: 'تركيب الجهاز وتشغيله' },
        ],
    },
    {
        id: 6, customerName: 'فادي الموصلي', mobile: '07706667788', address: 'زيونة، شارع فلسطين', zone: 'الكرادة',
        taskType: 'emergency', taskDescription: 'تسريب مياه من الجهاز', priority: 'high', deviceInfo: 'CleanWater 200 — فلتر 3 مراحل',
        history: [
            { date: '2026-02-18', type: 'اتصال', note: 'اتصل العميل يشتكي من تسريب' },
            { date: '2026-01-05', type: 'زيارة', note: 'صيانة دورية' },
            { date: '2025-10-01', type: 'زيارة', note: 'تركيب الجهاز' },
        ],
    },
    {
        id: 7, customerName: 'ياسمين كريم', mobile: '07708889900', address: 'حي الكاظمية، سوق الاستربادي', zone: 'الكاظمية',
        taskType: 'return', taskDescription: 'طلب إرجاع الجهاز - انتهاء العقد', priority: 'low', deviceInfo: 'RO-500 Pro — فلتر 7 مراحل',
        history: [
            { date: '2026-02-16', type: 'اتصال', note: 'العميلة تريد إرجاع الجهاز' },
        ],
    },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function TelemarketerWorkspace() {
    const [selectedTaskId, setSelectedTaskId] = useState<number>(mockTasks[0].id);
    const [processedIds, setProcessedIds] = useState<Set<number>>(new Set());

    // Action state
    const [outcome, setOutcome] = useState<CallOutcome>(null);
    const [visitDate, setVisitDate] = useState('');
    const [visitTime, setVisitTime] = useState('');
    const [notes, setNotes] = useState('');

    // Sorted queue
    const sortedTasks = useMemo(
        () => [...mockTasks].sort((a, b) => priorityConfig[a.priority].sort - priorityConfig[b.priority].sort),
        []
    );

    const selectedTask = useMemo(
        () => sortedTasks.find(t => t.id === selectedTaskId) || sortedTasks[0],
        [selectedTaskId, sortedTasks]
    );

    const remainingCount = sortedTasks.length - processedIds.size;

    // Find next unprocessed task
    const getNextTask = useCallback(() => {
        const currentIdx = sortedTasks.findIndex(t => t.id === selectedTaskId);
        for (let i = 1; i <= sortedTasks.length; i++) {
            const nextIdx = (currentIdx + i) % sortedTasks.length;
            if (!processedIds.has(sortedTasks[nextIdx].id)) {
                return sortedTasks[nextIdx];
            }
        }
        return null;
    }, [sortedTasks, selectedTaskId, processedIds]);

    const handleSubmit = useCallback(() => {
        if (!outcome) return;
        setProcessedIds(prev => new Set(prev).add(selectedTaskId));

        // Move to next
        const next = getNextTask();
        if (next) {
            setSelectedTaskId(next.id);
        }

        // Reset action state
        setOutcome(null);
        setVisitDate('');
        setVisitTime('');
        setNotes('');
    }, [outcome, selectedTaskId, getNextTask]);

    const tc = taskTypeConfig[selectedTask.taskType];
    const TcIcon = tc.icon;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* ─── TOP BAR ─── */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-bl from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                        <Headset className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-slate-800">مساحة عمل المسوّق الهاتفي</h1>
                        <p className="text-[10px] text-slate-400">معالجة المكالمات بسرعة — بدون مغادرة الشاشة</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-violet-50 rounded-lg px-3 py-1.5 border border-violet-200">
                        <Zap className="w-3.5 h-3.5 text-violet-600" />
                        <span className="text-xs font-bold text-violet-700">{remainingCount} متبقي</span>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-1.5 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700">{processedIds.size} مُنجز</span>
                    </div>
                </div>
            </div>

            {/* ─── 3-COLUMN LAYOUT ─── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ══════════════════════════════════════════════ */}
                {/* LEFT COLUMN — Task Queue                       */}
                {/* ══════════════════════════════════════════════ */}
                <div className="w-72 bg-slate-50 border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-white">
                        <h2 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <ClipboardList className="w-3.5 h-3.5 text-violet-500" />
                            <span>قائمة المهام</span>
                            <span className="mr-auto px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-600">{sortedTasks.length}</span>
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                        {sortedTasks.map(task => {
                            const isActive = task.id === selectedTaskId;
                            const isProcessed = processedIds.has(task.id);
                            const ttc = taskTypeConfig[task.taskType];
                            const pc = priorityConfig[task.priority];
                            return (
                                <button
                                    key={task.id}
                                    type="button"
                                    onClick={() => { setSelectedTaskId(task.id); setOutcome(null); setVisitDate(''); setVisitTime(''); setNotes(''); }}
                                    className={`w-full text-right p-3 rounded-xl border-2 transition-all relative ${isProcessed
                                        ? 'bg-gray-50 border-gray-100 opacity-50'
                                        : isActive
                                            ? 'bg-white border-violet-300 shadow-md shadow-violet-500/10'
                                            : 'bg-white border-transparent hover:border-gray-200 hover:shadow-sm'
                                        }`}
                                >
                                    {/* Priority dot */}
                                    <div className={`absolute top-3 left-3 w-2.5 h-2.5 rounded-full ${pc.dot} ${!isProcessed ? 'animate-pulse' : ''}`} />
                                    {isProcessed && (
                                        <div className="absolute top-2.5 left-2.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        </div>
                                    )}

                                    <div className="flex items-start gap-2.5">
                                        <div className={`w-8 h-8 rounded-lg ${ttc.bg} ${ttc.border} border flex items-center justify-center shrink-0`}>
                                            <ttc.icon className={`w-3.5 h-3.5 ${ttc.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold truncate ${isProcessed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.customerName}</p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ttc.bg} ${ttc.color}`}>{ttc.label}</span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                                    <MapPin className="w-2.5 h-2.5" />{task.zone}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ══════════════════════════════════════════════ */}
                {/* CENTER COLUMN — Customer Context                */}
                {/* ══════════════════════════════════════════════ */}
                <div className="flex-1 overflow-y-auto bg-white border-l border-gray-200 p-6 space-y-5">
                    {/* Customer Header */}
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-bl from-sky-400 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
                            <User className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-slate-800">{selectedTask.customerName}</h2>
                            <div className="flex items-center gap-3 mt-1.5">
                                <a href={`tel:${selectedTask.mobile}`}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm font-bold">
                                    <Phone className="w-4 h-4" />
                                    <span dir="ltr">{selectedTask.mobile}</span>
                                </a>
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                    <MapPin className="w-3.5 h-3.5" />{selectedTask.address}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Task Details Card */}
                    <div className={`rounded-xl border-2 ${tc.border} ${tc.bg} p-4`}>
                        <div className="flex items-center gap-2 mb-2">
                            <TcIcon className={`w-5 h-5 ${tc.color}`} />
                            <span className={`text-sm font-bold ${tc.color}`}>{tc.label}</span>
                            <span className={`mr-auto px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityConfig[selectedTask.priority].dot === 'bg-red-500' ? 'bg-red-100 text-red-700 border-red-200' : priorityConfig[selectedTask.priority].dot === 'bg-amber-400' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                                {priorityConfig[selectedTask.priority].label}
                            </span>
                        </div>
                        <p className="text-sm text-slate-700 font-medium">{selectedTask.taskDescription}</p>
                        <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                            <Wrench className="w-3 h-3" />{selectedTask.deviceInfo}
                        </p>
                    </div>

                    {/* History Mini-log */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /><span>السجل السابق</span>
                        </h3>
                        <div className="relative pr-4">
                            {/* Timeline line */}
                            <div className="absolute right-1.5 top-1 bottom-1 w-0.5 bg-gray-200 rounded" />

                            <div className="space-y-3">
                                {selectedTask.history.map((h, idx) => (
                                    <div key={idx} className="relative flex items-start gap-3">
                                        {/* Dot */}
                                        <div className={`absolute -right-[11px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${idx === 0 ? 'bg-sky-500' : 'bg-gray-300'}`} />
                                        <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-gray-100 mr-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${h.type === 'زيارة' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>{h.type}</span>
                                                <span className="text-[10px] text-slate-400 font-mono" dir="ltr">{h.date}</span>
                                            </div>
                                            <p className="text-xs text-slate-600">{h.note}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════ */}
                {/* RIGHT COLUMN — Action Panel                    */}
                {/* ══════════════════════════════════════════════ */}
                <div className="w-80 bg-slate-50 border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-white">
                        <h2 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5 text-violet-500" />
                            <span>نتيجة المكالمة</span>
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Outcome Buttons */}
                        <div className="space-y-2">
                            {Object.entries(outcomeConfig).map(([key, cfg]) => {
                                const isActive = outcome === key;
                                return (
                                    <button key={key} type="button"
                                        onClick={() => setOutcome(key as CallOutcome)}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-right ${isActive
                                            ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-sm ring-2 ${cfg.activeRing}`
                                            : 'bg-white border-gray-200 text-slate-600 hover:border-gray-300'}`}>
                                        <div className={`w-8 h-8 rounded-lg ${isActive ? cfg.bg : 'bg-gray-50'} border ${isActive ? cfg.border : 'border-gray-200'} flex items-center justify-center`}>
                                            <cfg.icon className={`w-4 h-4 ${isActive ? cfg.color : 'text-gray-400'}`} />
                                        </div>
                                        <span className="text-sm font-bold">{cfg.label}</span>
                                        {isActive && (
                                            <div className="mr-auto w-5 h-5 rounded-full bg-white border-2 border-current flex items-center justify-center">
                                                <div className="w-2.5 h-2.5 rounded-full bg-current" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Conditional: Booking Time Picker */}
                        <AnimatePresence>
                            {outcome === 'booked' && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                    <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-emerald-600" />
                                            <span className="text-xs font-bold text-emerald-700">حجز موعد الزيارة</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-emerald-700">التاريخ</label>
                                                <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)}
                                                    className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-emerald-700">الوقت</label>
                                                <input type="time" value={visitTime} onChange={e => setVisitTime(e.target.value)}
                                                    className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none font-mono" dir="ltr" />
                                            </div>
                                        </div>
                                        {visitDate && visitTime && (
                                            <div className="flex items-center gap-2 text-[11px] text-emerald-600 bg-emerald-100/50 rounded-lg px-3 py-2 border border-emerald-200/50">
                                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                                <span>الموعد: <strong>{new Date(visitDate + 'T00:00:00').toLocaleDateString('ar-IQ', { weekday: 'long', month: 'long', day: 'numeric' })} - {visitTime}</strong></span>
                                            </div>
                                        )}
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
                                placeholder="ملاحظات حول المكالمة..."
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10 focus:outline-none min-h-[80px] resize-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="p-4 border-t border-gray-200 bg-white">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!outcome || (outcome === 'booked' && (!visitDate || !visitTime))}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-l from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white text-sm font-bold transition-all shadow-lg shadow-violet-500/20 disabled:shadow-none"
                        >
                            <Send className="w-4 h-4" />
                            <span>حفظ والتالي</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

/* ─── Lucide doesn't have ClipboardList, reuse from parent ─── */
function ClipboardList(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M12 11h4" /><path d="M12 16h4" />
            <path d="M8 11h.01" /><path d="M8 16h.01" />
        </svg>
    );
}
