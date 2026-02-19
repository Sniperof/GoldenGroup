import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, UserCheck, Plus, User, Copy, Save, X } from 'lucide-react';
import { StorageManager } from '../../lib/storage';
import { defaultEmployees } from '../../lib/defaultData';
import type { DaySchedule, Employee } from '../../lib/types';

const getToday = () => new Date().toISOString().split('T')[0];
const getYesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; };

export default function TeamScheduler() {
    const [schedules, setSchedules] = useState<Record<string, DaySchedule>>(() => StorageManager.load('schedules', {}));
    const [date, setDate] = useState(getToday);
    const [selectedSlot, setSelectedSlot] = useState<{ type: string; slotIdx: number; role: string } | null>(null);

    const employees = defaultEmployees;
    const current: DaySchedule = schedules[date] || { teams: [], solos: [] };

    const saveSchedules = useCallback((s: Record<string, DaySchedule>) => {
        setSchedules(s);
        StorageManager.save('schedules', s);
    }, []);

    const updateCurrent = useCallback((sched: DaySchedule) => {
        const next = { ...schedules, [date]: sched };
        saveSchedules(next);
    }, [schedules, date, saveSchedules]);

    const addTeamSlot = () => updateCurrent({ ...current, teams: [...current.teams, { supervisor: null, technician: null }] });
    const addSoloSlot = () => updateCurrent({ ...current, solos: [...current.solos, { technician: null }] });
    const removeTeamSlot = (idx: number) => updateCurrent({ ...current, teams: current.teams.filter((_, i) => i !== idx) });
    const removeSoloSlot = (idx: number) => updateCurrent({ ...current, solos: current.solos.filter((_, i) => i !== idx) });

    const assignedIds = [
        ...current.teams.flatMap(t => [t.supervisor, t.technician]),
        ...current.solos.map(s => s.technician),
    ].filter(Boolean) as number[];

    const availableSups = employees.filter(e => e.role === 'supervisor' && e.status === 'active' && !assignedIds.includes(e.id));
    const availableTechs = employees.filter(e => e.role === 'technician' && e.status === 'active' && !assignedIds.includes(e.id));
    const poolEmployees = [...availableSups, ...availableTechs];

    const selectSlot = (type: string, slotIdx: number, role: string) => {
        setSelectedSlot(s => s && s.type === type && s.slotIdx === slotIdx && s.role === role ? null : { type, slotIdx, role });
    };

    const assignEmployee = (empId: number) => {
        if (!selectedSlot) return;
        const emp = employees.find(e => e.id === empId);
        if (!emp) return;
        const { type, slotIdx, role } = selectedSlot;
        if (type === 'team') {
            if (role === 'supervisor' && emp.role !== 'supervisor') return;
            if (role === 'technician' && emp.role !== 'technician') return;
            const teams = [...current.teams];
            teams[slotIdx] = { ...teams[slotIdx], [role]: empId };
            updateCurrent({ ...current, teams });
        } else {
            if (emp.role !== 'technician') return;
            const solos = [...current.solos];
            solos[slotIdx] = { technician: empId };
            updateCurrent({ ...current, solos });
        }
        setSelectedSlot(null);
    };

    const unassign = (type: string, slotIdx: number, role: string) => {
        if (type === 'team') {
            const teams = [...current.teams];
            teams[slotIdx] = { ...teams[slotIdx], [role]: null };
            updateCurrent({ ...current, teams });
        } else {
            const solos = [...current.solos];
            solos[slotIdx] = { technician: null };
            updateCurrent({ ...current, solos });
        }
    };

    const copyFromYesterday = () => {
        const yest = getYesterday();
        if (!schedules[yest]) { alert('لا يوجد جدول محفوظ ليوم ' + yest); return; }
        if (current.teams.length > 0 || current.solos.length > 0) {
            if (!confirm('سيتم استبدال الجدول الحالي. متابعة؟')) return;
        }
        updateCurrent(JSON.parse(JSON.stringify(schedules[yest])));
    };

    const saveSchedule = () => {
        saveSchedules({ ...schedules, [date]: current });
        alert('تم حفظ الجدول!');
    };

    const getEmpName = (id: number | null) => { const e = employees.find(e => e.id === id); return e?.name || ''; };

    return (
        <div className="h-full overflow-y-auto p-8 custom-scroll">
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">جدولة الفرق</h1>
                    <p className="text-slate-500 text-sm">تعيين المشرفين والفنيين للفرق اليومية.</p>
                </div>
            </div>

            {/* Control Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-500" />
                    <input type="date" value={date} onChange={e => { setDate(e.target.value); setSelectedSlot(null); }} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none" />
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm"><UserCheck className="w-4 h-4 text-indigo-500" /><span className="text-slate-500">مشرفون:</span><span className="text-slate-900 font-bold">{availableSups.length}</span></div>
                    <div className="flex items-center gap-1.5 text-sm"><Users className="w-4 h-4 text-emerald-500" /><span className="text-slate-500">فنيون:</span><span className="text-slate-900 font-bold">{availableTechs.length}</span></div>
                </div>
                <div className="mr-auto flex items-center gap-2">
                    <button onClick={copyFromYesterday} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm transition-colors"><Copy className="w-4 h-4" /><span>نسخ من الأمس</span></button>
                    <button onClick={saveSchedule} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all"><Save className="w-4 h-4" /><span>حفظ الجدول</span></button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Staff Pool */}
                <div className="col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-0">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                            <h3 className="text-gray-500 font-semibold text-xs uppercase tracking-wider flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" />الموظفون المتاحون</h3>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto custom-scroll">
                            {poolEmployees.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-8">لا يوجد موظفون متاحون</p>
                            ) : poolEmployees.map(e => (
                                <motion.div
                                    key={e.id}
                                    onClick={() => assignEmployee(e.id)}
                                    className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${selectedSlot
                                        ? ((selectedSlot.role === 'supervisor' && e.role === 'supervisor') || ((selectedSlot.role === 'technician' || selectedSlot.type === 'solo') && e.role === 'technician'))
                                            ? 'hover:bg-sky-50'
                                            : 'opacity-40 grayscale cursor-not-allowed'
                                        : 'hover:bg-sky-50'
                                        }`}
                                >
                                    <div className="relative">
                                        <img src={e.avatar} alt="" className="w-9 h-9 rounded-full border border-gray-100 object-cover" />
                                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${e.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">{e.name}</p>
                                        <p className="text-xs text-gray-500">{e.role === 'supervisor' ? 'مشرف' : 'فني'}</p>
                                    </div>
                                    {e.role === 'supervisor' ? (
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold">مشرف</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold">فني</span>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Slots Area */}
                <div className="col-span-2 space-y-4">
                    <div className="flex gap-2">
                        <button onClick={addTeamSlot} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold transition-all"><Plus className="w-4 h-4" /><span>إضافة فريق</span></button>
                        <button onClick={addSoloSlot} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm transition-colors"><User className="w-4 h-4" /><span>وحدة فردية / طوارئ</span></button>
                    </div>

                    {current.teams.length === 0 && current.solos.length === 0 ? (
                        <div className="text-center text-slate-400 py-10"><Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>اضغط "إضافة فريق" أو "وحدة فردية" لبدء الجدولة</p></div>
                    ) : (
                        <div className="space-y-4">
                            {current.teams.map((t, idx) => {
                                const teamName = t.supervisor ? `فريق ${getEmpName(t.supervisor)}` : `فريق #${idx + 1}`;
                                const isSup = selectedSlot?.type === 'team' && selectedSlot.slotIdx === idx && selectedSlot.role === 'supervisor';
                                const isTech = selectedSlot?.type === 'team' && selectedSlot.slotIdx === idx && selectedSlot.role === 'technician';

                                return (
                                    <motion.div key={`team-${idx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600"><Users className="w-4 h-4" /></div>
                                                <span className="font-bold text-slate-800 text-sm">{teamName}</span>
                                                <span className="text-xs text-slate-500">فريق قياسي</span>
                                            </div>
                                            <button onClick={() => removeTeamSlot(idx)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                                        </div>
                                        <div className="p-4 grid grid-cols-2 gap-3">
                                            {/* Supervisor Slot */}
                                            <div onClick={() => selectSlot('team', idx, 'supervisor')} className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSup ? 'border-sky-500 bg-sky-50' : 'border-dashed border-slate-300 hover:border-sky-300'}`}>
                                                {t.supervisor ? (
                                                    <div className="flex items-center gap-2">
                                                        <img src={employees.find(e => e.id === t.supervisor)?.avatar || ''} alt="" className="w-8 h-8 rounded-full" />
                                                        <div className="flex-1"><p className="text-sm text-slate-900">{getEmpName(t.supervisor)}</p><p className="text-xs text-indigo-500">مشرف</p></div>
                                                        <button onClick={e => { e.stopPropagation(); unassign('team', idx, 'supervisor'); }} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-2"><UserCheck className="w-5 h-5 mx-auto text-slate-400 mb-1" /><p className="text-xs text-slate-400">مشرف</p></div>
                                                )}
                                            </div>
                                            {/* Technician Slot */}
                                            <div onClick={() => selectSlot('team', idx, 'technician')} className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isTech ? 'border-sky-500 bg-sky-50' : 'border-dashed border-slate-300 hover:border-sky-300'}`}>
                                                {t.technician ? (
                                                    <div className="flex items-center gap-2">
                                                        <img src={employees.find(e => e.id === t.technician)?.avatar || ''} alt="" className="w-8 h-8 rounded-full" />
                                                        <div className="flex-1"><p className="text-sm text-slate-900">{getEmpName(t.technician)}</p><p className="text-xs text-emerald-500">فني</p></div>
                                                        <button onClick={e => { e.stopPropagation(); unassign('team', idx, 'technician'); }} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-2"><User className="w-5 h-5 mx-auto text-slate-400 mb-1" /><p className="text-xs text-slate-400">فني</p></div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {current.solos.map((s, idx) => {
                                const isSolo = selectedSlot?.type === 'solo' && selectedSlot.slotIdx === idx;
                                return (
                                    <motion.div key={`solo-${idx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600"><User className="w-4 h-4" /></div>
                                                <span className="font-bold text-slate-800 text-sm">وحدة فردية / طوارئ</span>
                                            </div>
                                            <button onClick={() => removeSoloSlot(idx)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                                        </div>
                                        <div className="p-4">
                                            <div onClick={() => selectSlot('solo', idx, 'technician')} className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSolo ? 'border-sky-500 bg-sky-50' : 'border-dashed border-slate-300 hover:border-sky-300'}`}>
                                                {s.technician ? (
                                                    <div className="flex items-center gap-2">
                                                        <img src={employees.find(e => e.id === s.technician)?.avatar || ''} alt="" className="w-8 h-8 rounded-full" />
                                                        <div className="flex-1"><p className="text-sm text-slate-900">{getEmpName(s.technician)}</p><p className="text-xs text-emerald-500">فني</p></div>
                                                        <button onClick={e => { e.stopPropagation(); unassign('solo', idx, 'technician'); }} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-2"><User className="w-5 h-5 mx-auto text-slate-400 mb-1" /><p className="text-xs text-slate-400">فني</p></div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
