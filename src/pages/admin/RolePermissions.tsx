import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoleStore } from '../../hooks/useRoleStore';
import type { Permission } from '../../hooks/useRoleStore';
import { authFetch } from '../../lib/authFetch';
import {
  ShieldCheck, ChevronRight, Save, Loader2, AlertTriangle,
  CheckSquare, Square, Key, Eye, Plus, Pencil, Trash2,
  ToggleRight, Award, Users, BookOpen, ClipboardList,
  Briefcase, GraduationCap, Settings, ListChecks, CheckCheck,
  UserCheck, Calendar, FileText, AlertCircle, BarChart2
} from 'lucide-react';

// ── Human-readable labels & descriptions ─────────────────────────────────────
const PERM_LABELS: Record<string, { label: string; desc: string }> = {
  // Jobs - Vacancies
  'jobs.vacancies.view_list':       { label: 'عرض قائمة الشواغر',         desc: 'رؤية جميع الوظائف الشاغرة في النظام' },
  'jobs.vacancies.view_detail':     { label: 'عرض تفاصيل الشاغر',         desc: 'الدخول إلى صفحة تفاصيل أي شاغر وظيفي' },
  'jobs.vacancies.create':          { label: 'إنشاء شاغر وظيفي جديد',      desc: 'إضافة وظيفة شاغرة جديدة إلى النظام' },
  'jobs.vacancies.edit':            { label: 'تعديل بيانات الشاغر',        desc: 'تحديث معلومات الشاغر الوظيفي' },
  'jobs.vacancies.change_status':   { label: 'تغيير حالة الشاغر',          desc: 'فتح أو إغلاق أو تعليق الشاغر الوظيفي' },

  // Jobs - Applications
  'jobs.applications.view_list':        { label: 'عرض قائمة طلبات التوظيف',   desc: 'رؤية جميع الطلبات المقدمة في النظام' },
  'jobs.applications.view_detail':      { label: 'عرض تفاصيل الطلب',           desc: 'الدخول إلى ملف المتقدم والاطلاع على بياناته' },
  'jobs.applications.create':           { label: 'إضافة طلب يدوياً',            desc: 'إدخال طلب توظيف جديد بشكل يدوي' },
  'jobs.applications.change_stage':     { label: 'تحريك الطلب بين المراحل',     desc: 'نقل الطلب من مرحلة إلى أخرى في مسار التوظيف' },
  'jobs.applications.record_decision':  { label: 'تسجيل قرار على الطلب',        desc: 'قبول أو رفض أو تأجيل الطلب' },
  'jobs.applications.hire':             { label: 'تأكيد التعيين النهائي',        desc: 'إصدار قرار التعيين الرسمي للمتقدم' },
  'jobs.applications.escalate':         { label: 'تصعيد الطلب للإدارة',         desc: 'إحالة الطلب إلى جهة أعلى للبت فيه' },
  'jobs.applications.archive':          { label: 'أرشفة الطلبات',               desc: 'نقل الطلبات المنتهية إلى الأرشيف' },
  'jobs.applications.edit_notes':       { label: 'تعديل ملاحظات الطلب',         desc: 'إضافة أو تحديث الملاحظات الداخلية للطلب' },
  'jobs.applications.view_audit_logs':  { label: 'عرض سجل التغييرات',           desc: 'الاطلاع على تاريخ كامل التعديلات والإجراءات على الطلب' },

  // Jobs - Interviews
  'jobs.interviews.view_list':      { label: 'عرض قائمة المقابلات',        desc: 'رؤية جميع المقابلات المجدولة في النظام' },
  'jobs.interviews.view_detail':    { label: 'عرض تفاصيل المقابلة',        desc: 'الاطلاع على بيانات مقابلة محددة' },
  'jobs.interviews.view_eligible':  { label: 'عرض المرشحين للمقابلة',      desc: 'رؤية قائمة المتقدمين المؤهلين لإجراء المقابلة' },
  'jobs.interviews.schedule':       { label: 'جدولة موعد مقابلة',          desc: 'تحديد تاريخ ووقت إجراء المقابلة' },
  'jobs.interviews.edit':           { label: 'تعديل بيانات المقابلة',       desc: 'تحديث تفاصيل مقابلة مجدولة' },
  'jobs.interviews.record_result':  { label: 'تسجيل نتيجة المقابلة',       desc: 'إدخال تقييم ونتيجة المقابلة بعد إجرائها' },

  // Jobs - Training
  'jobs.training.view_list':          { label: 'عرض قائمة الدورات التدريبية', desc: 'رؤية جميع الدورات التدريبية في النظام' },
  'jobs.training.view_detail':        { label: 'عرض تفاصيل الدورة',           desc: 'الاطلاع على بيانات دورة تدريبية محددة' },
  'jobs.training.view_eligible':      { label: 'عرض المرشحين للتدريب',         desc: 'رؤية قائمة المتقدمين المؤهلين للالتحاق بالتدريب' },
  'jobs.training.create':             { label: 'إنشاء دورة تدريبية',            desc: 'إضافة برنامج تدريبي جديد' },
  'jobs.training.start':              { label: 'بدء تنفيذ الدورة',              desc: 'تغيير حالة الدورة إلى "جارية"' },
  'jobs.training.complete':           { label: 'إنهاء الدورة التدريبية',         desc: 'إغلاق الدورة وتسجيلها كمنتهية' },
  'jobs.training.record_attendance':  { label: 'تسجيل حضور المتدربين',          desc: 'إدخال سجل حضور وغياب المتدربين' },
  'jobs.training.record_result':      { label: 'تسجيل نتائج التدريب',           desc: 'رصد درجات ونتائج المتدربين بعد انتهاء الدورة' },
  'jobs.training.add_trainees':       { label: 'إضافة متدربين للدورة',          desc: 'إلحاق متقدمين جدد بدورة تدريبية قائمة' },

  // Admin
  'admin.roles.view':             { label: 'عرض الأدوار الوظيفية',         desc: 'الاطلاع على قائمة الأدوار وصلاحياتها' },
  'admin.roles.manage':           { label: 'إدارة الأدوار والصلاحيات',     desc: 'إنشاء وتعديل وحذف الأدوار وتعيين الصلاحيات' },
  'admin.system_lists.view':      { label: 'عرض القوائم النظامية',          desc: 'الاطلاع على القوائم والتصنيفات المستخدمة في النظام' },
  'admin.system_lists.manage':    { label: 'إدارة القوائم النظامية',        desc: 'إضافة وتعديل وحذف عناصر القوائم النظامية' },
};

// ── Action icon map ───────────────────────────────────────────────────────────
function ActionBadge({ action }: { action: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string; text: string }> = {
    view_list:        { icon: <Eye className="w-3 h-3" />,          color: 'bg-blue-50 text-blue-600',     text: 'عرض' },
    view_detail:      { icon: <Eye className="w-3 h-3" />,          color: 'bg-blue-50 text-blue-600',     text: 'تفاصيل' },
    view_eligible:    { icon: <Users className="w-3 h-3" />,        color: 'bg-blue-50 text-blue-600',     text: 'استعراض' },
    view_audit_logs:  { icon: <BookOpen className="w-3 h-3" />,     color: 'bg-slate-100 text-slate-600',  text: 'سجلات' },
    create:           { icon: <Plus className="w-3 h-3" />,         color: 'bg-emerald-50 text-emerald-600', text: 'إنشاء' },
    add_trainees:     { icon: <Plus className="w-3 h-3" />,         color: 'bg-emerald-50 text-emerald-600', text: 'إضافة' },
    edit:             { icon: <Pencil className="w-3 h-3" />,       color: 'bg-amber-50 text-amber-600',   text: 'تعديل' },
    edit_notes:       { icon: <Pencil className="w-3 h-3" />,       color: 'bg-amber-50 text-amber-600',   text: 'تعديل' },
    change_status:    { icon: <ToggleRight className="w-3 h-3" />,  color: 'bg-amber-50 text-amber-600',   text: 'تغيير' },
    change_stage:     { icon: <ToggleRight className="w-3 h-3" />,  color: 'bg-amber-50 text-amber-600',   text: 'تحريك' },
    record_decision:  { icon: <CheckCheck className="w-3 h-3" />,   color: 'bg-purple-50 text-purple-600', text: 'قرار' },
    record_result:    { icon: <Award className="w-3 h-3" />,        color: 'bg-purple-50 text-purple-600', text: 'نتيجة' },
    record_attendance:{ icon: <UserCheck className="w-3 h-3" />,    color: 'bg-purple-50 text-purple-600', text: 'حضور' },
    hire:             { icon: <CheckCheck className="w-3 h-3" />,   color: 'bg-emerald-100 text-emerald-700', text: 'تعيين' },
    schedule:         { icon: <Calendar className="w-3 h-3" />,     color: 'bg-sky-50 text-sky-600',       text: 'جدولة' },
    escalate:         { icon: <AlertCircle className="w-3 h-3" />,  color: 'bg-rose-50 text-rose-600',     text: 'تصعيد' },
    archive:          { icon: <FileText className="w-3 h-3" />,     color: 'bg-slate-100 text-slate-500',  text: 'أرشفة' },
    start:            { icon: <ToggleRight className="w-3 h-3" />,  color: 'bg-emerald-50 text-emerald-600', text: 'بدء' },
    complete:         { icon: <CheckCheck className="w-3 h-3" />,   color: 'bg-emerald-100 text-emerald-700', text: 'إتمام' },
    view:             { icon: <Eye className="w-3 h-3" />,          color: 'bg-blue-50 text-blue-600',     text: 'عرض' },
    manage:           { icon: <Settings className="w-3 h-3" />,     color: 'bg-rose-50 text-rose-600',     text: 'إدارة' },
  };
  const cfg = map[action] ?? { icon: <Key className="w-3 h-3" />, color: 'bg-slate-100 text-slate-500', text: action };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.icon}{cfg.text}
    </span>
  );
}

// ── Module config ─────────────────────────────────────────────────────────────
const MODULE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  jobs:  { label: 'إدارة التوظيف',         icon: <Briefcase className="w-4 h-4" />,    color: 'text-sky-600 bg-sky-50' },
  admin: { label: 'إدارة النظام',           icon: <Settings className="w-4 h-4" />,     color: 'text-rose-600 bg-rose-50' },
};

const SUB_MODULE_LABELS: Record<string, string> = {
  vacancies:    'الشواغر الوظيفية',
  applications: 'طلبات التوظيف',
  interviews:   'المقابلات',
  training:     'الدورات التدريبية',
  roles:        'الأدوار والصلاحيات',
  system_lists: 'القوائم النظامية',
};

// ── Helper to get display name safely (snake_case & camelCase) ────────────────
function getPermLabel(perm: Permission): string {
  const known = PERM_LABELS[perm.key];
  if (known) return known.label;
  // Fallback: API may return display_name (snake_case)
  const raw = (perm as any).display_name ?? perm.displayName ?? perm.key;
  return raw;
}

function getPermDesc(perm: Permission): string | null {
  return PERM_LABELS[perm.key]?.desc ?? null;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RolePermissions() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const roleId = Number(id);

  const { roles, allPermissions, fetchRoles, fetchPermissions } = useRoleStore();
  const role = roles.find(r => r.id === roleId);

  const [assigned, setAssigned] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([fetchRoles(), fetchPermissions()]).then(() => setLoading(false));
  }, [fetchRoles, fetchPermissions]);

  useEffect(() => {
    if (!roleId) return;
    authFetch(`/api/admin/roles/${roleId}/permissions`)
      .then(res => res.ok ? res.json() : [])
      .then((perms: Permission[]) => setAssigned(new Set(perms.map(p => p.id))))
      .catch(() => {});
  }, [roleId]);

  // Group by module → subModule
  const grouped = useMemo(() => {
    const map: Record<string, Record<string, Permission[]>> = {};
    for (const p of allPermissions) {
      const mod = (p as any).module ?? 'other';
      const sub = (p as any).sub_module ?? (p as any).subModule ?? 'general';
      if (!map[mod]) map[mod] = {};
      if (!map[mod][sub]) map[mod][sub] = [];
      map[mod][sub].push(p);
    }
    return map;
  }, [allPermissions]);

  function toggle(permId: number) {
    setAssigned(prev => {
      const next = new Set(prev);
      next.has(permId) ? next.delete(permId) : next.add(permId);
      return next;
    });
  }

  function toggleSubModule(perms: Permission[]) {
    const ids = perms.map(p => p.id);
    const allSelected = ids.every(id => assigned.has(id));
    setAssigned(prev => {
      const next = new Set(prev);
      allSelected ? ids.forEach(id => next.delete(id)) : ids.forEach(id => next.add(id));
      return next;
    });
  }

  function toggleModule(subGroups: Record<string, Permission[]>) {
    const allPerms = Object.values(subGroups).flat();
    const ids = allPerms.map(p => p.id);
    const allSelected = ids.every(id => assigned.has(id));
    setAssigned(prev => {
      const next = new Set(prev);
      allSelected ? ids.forEach(id => next.delete(id)) : ids.forEach(id => next.add(id));
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await authFetch(`/api/admin/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: [...assigned] }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    );
  }

  const totalPerms = allPermissions.length;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/admin/roles')}
            className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30 shrink-0">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-800 truncate">
              صلاحيات دور: <span className="text-sky-600">{role?.displayName ?? `#${roleId}`}</span>
            </h1>
            <p className="text-xs text-slate-500">
              {assigned.size} صلاحية مُفعَّلة من أصل {totalPerms}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-50 shrink-0"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التغييرات
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>نسبة الصلاحيات الممنوحة</span>
            <span className="font-bold text-slate-700">
              {totalPerms > 0 ? Math.round((assigned.size / totalPerms) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-sky-500 h-2 rounded-full transition-all duration-500"
              style={{ width: totalPerms > 0 ? `${(assigned.size / totalPerms) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-4">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-xl p-4">
            <ShieldCheck className="w-4 h-4 shrink-0" />تم حفظ الصلاحيات بنجاح
          </div>
        )}

        {/* Permissions grouped by module → subModule */}
        {Object.entries(grouped).map(([module, subGroups]) => {
          const modCfg = MODULE_CONFIG[module] ?? {
            label: module,
            icon: <ListChecks className="w-4 h-4" />,
            color: 'text-slate-600 bg-slate-100',
          };
          const allModulePerms = Object.values(subGroups).flat();
          const moduleSelected = allModulePerms.filter(p => assigned.has(p.id)).length;
          const moduleTotal = allModulePerms.length;
          const allModuleSelected = moduleSelected === moduleTotal;

          return (
            <div key={module} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Module Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${modCfg.color}`}>
                    {modCfg.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{modCfg.label}</h3>
                    <p className="text-[10px] text-slate-400">{moduleSelected} من {moduleTotal} صلاحية مُفعَّلة</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleModule(subGroups)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    allModuleSelected
                      ? 'bg-sky-100 text-sky-600 hover:bg-sky-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {allModuleSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
              </div>

              {/* SubModule Groups */}
              <div className="divide-y divide-slate-50">
                {Object.entries(subGroups).map(([sub, perms]) => {
                  const subLabel = SUB_MODULE_LABELS[sub] ?? sub;
                  const subSelected = perms.filter(p => assigned.has(p.id)).length;
                  const allSubSelected = subSelected === perms.length;

                  return (
                    <div key={sub}>
                      {/* SubModule header */}
                      <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/60">
                        <span className="text-xs font-semibold text-slate-500">{subLabel}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">{subSelected}/{perms.length}</span>
                          <button
                            onClick={() => toggleSubModule(perms)}
                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                              allSubSelected
                                ? 'bg-sky-100 text-sky-600 hover:bg-sky-200'
                                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {allSubSelected ? 'إلغاء' : 'تحديد الكل'}
                          </button>
                        </div>
                      </div>

                      {/* Permission rows */}
                      {perms
                        .sort((a, b) => ((a as any).display_order ?? 0) - ((b as any).display_order ?? 0))
                        .map(perm => {
                          const isOn = assigned.has(perm.id);
                          const desc = getPermDesc(perm);
                          const action = (perm as any).action ?? '';

                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors group ${
                                isOn ? 'bg-sky-50/40 hover:bg-sky-50/70' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={isOn}
                                onChange={() => toggle(perm.id)}
                              />
                              <div className="mt-0.5 shrink-0">
                                {isOn
                                  ? <CheckSquare className="w-4 h-4 text-sky-500" />
                                  : <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-sm font-semibold ${isOn ? 'text-slate-800' : 'text-slate-600'}`}>
                                    {getPermLabel(perm)}
                                  </span>
                                  <ActionBadge action={action} />
                                </div>
                                {desc && (
                                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد صلاحيات متاحة</p>
          </div>
        )}

        {/* Sticky Save */}
        <div className="sticky bottom-4 flex justify-center pb-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-8 py-3 rounded-2xl transition-colors shadow-lg disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التغييرات
          </button>
        </div>
      </div>
    </div>
  );
}
