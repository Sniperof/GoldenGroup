import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoleStore } from '../../hooks/useRoleStore';
import type { Role } from '../../hooks/useRoleStore';
import {
  ShieldCheck, Plus, Edit2, Trash2, Users, Key,
  ToggleLeft, ToggleRight, X, Save, Loader2, AlertTriangle
} from 'lucide-react';

// ── Create / Edit Modal ───────────────────────────────────────────────────────
interface RoleModalProps {
  role?: Role | null;
  onClose: () => void;
}

function RoleModal({ role, onClose }: RoleModalProps) {
  const { createRole, updateRole } = useRoleStore();
  const [displayName, setDisplayName] = useState(role?.displayName ?? '');
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!role;

  async function handleSave() {
    if (!displayName.trim() || (!isEdit && !name.trim())) {
      setError('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await updateRole(role!.id, { displayName, description });
      } else {
        await createRole({ name, displayName, description });
      }
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">
            {isEdit ? 'تعديل الدور' : 'إنشاء دور جديد'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                المعرف الداخلي <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="مثال: branch_manager"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">حروف صغيرة وشرطة سفلية فقط</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              الاسم المعروض <span className="text-red-500">*</span>
            </label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="مثال: مدير الفرع"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">الوصف</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="وصف مختصر لصلاحيات هذا الدور..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'حفظ التعديلات' : 'إنشاء الدور'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Roles() {
  const navigate = useNavigate();
  const { roles, loading, error, fetchRoles, updateRole, deleteRole } = useRoleStore();
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  async function handleToggleActive(role: Role) {
    await updateRole(role.id, { isActive: !role.isActive });
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا الدور؟ لا يمكن التراجع.')) return;
    setDeleting(id);
    try { await deleteRole(id); } finally { setDeleting(null); }
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">الأدوار والصلاحيات</h1>
              <p className="text-xs text-slate-500">إدارة أدوار المستخدمين وتعيين الصلاحيات</p>
            </div>
          </div>
          <button
            onClick={() => { setEditRole(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            دور جديد
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-4">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          </div>
        )}

        {/* Roles Grid */}
        {!loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {roles.map(role => (
              <div key={role.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">

                {/* Role Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-800 text-sm">{role.displayName}</h3>
                      {role.isSystem && (
                        <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                          نظام
                        </span>
                      )}
                      <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium border ${
                        role.isActive
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        {role.isActive ? 'نشط' : 'معطّل'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{role.name}</p>
                    {role.description && (
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{role.description}</p>
                    )}
                  </div>

                  {/* Toggle Active */}
                  {!role.isSystem && (
                    <button onClick={() => handleToggleActive(role)} className="text-slate-400 hover:text-sky-500 transition-colors mt-0.5">
                      {role.isActive
                        ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                        : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{role.userCount} مستخدم</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    <span>{role.permissionCount} صلاحية</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-slate-50">
                  <button
                    onClick={() => navigate(`/admin/roles/${role.id}/permissions`)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 py-2 rounded-lg transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" />
                    إدارة الصلاحيات
                  </button>

                  {!role.isSystem && (
                    <>
                      <button
                        onClick={() => { setEditRole(role); setShowModal(true); }}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(role.id)}
                        disabled={deleting === role.id}
                        className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="حذف"
                      >
                        {deleting === role.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {roles.length === 0 && !loading && (
              <div className="sm:col-span-2 text-center py-16 text-slate-400">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا توجد أدوار بعد</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <RoleModal
          role={editRole}
          onClose={() => { setShowModal(false); setEditRole(null); }}
        />
      )}
    </div>
  );
}
