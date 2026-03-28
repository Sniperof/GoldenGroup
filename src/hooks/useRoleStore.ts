import { create } from 'zustand';
import { authFetch } from '../lib/authFetch';

export interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  permissionCount: number;
  createdAt: string;
}

export interface Permission {
  id: number;
  key: string;
  module: string;
  subModule: string;
  action: string;
  displayName: string;
  displayOrder: number;
}

export interface HrUser {
  id: number;
  name: string;
  username: string;
  isActive: boolean;
  roleId: number | null;
  roleDisplayName: string | null;
  createdAt: string;
}

// ── Normalizers: API returns snake_case, interface expects camelCase ──────────
function normalizeRole(raw: any): Role {
  return {
    id: raw.id,
    name: raw.name,
    displayName: raw.display_name ?? raw.displayName ?? '',
    description: raw.description ?? null,
    isSystem: raw.is_system ?? raw.isSystem ?? false,
    isActive: raw.is_active ?? raw.isActive ?? true,
    userCount: Number(raw.user_count ?? raw.userCount ?? 0),
    permissionCount: Number(raw.permission_count ?? raw.permissionCount ?? 0),
    createdAt: raw.created_at ?? raw.createdAt ?? '',
  };
}

function normalizeHrUser(raw: any): HrUser {
  return {
    id: raw.id,
    name: raw.name,
    username: raw.username,
    isActive: raw.is_active ?? raw.isActive ?? true,
    roleId: raw.role_id ?? raw.roleId ?? null,
    roleDisplayName: raw.role_display_name ?? raw.roleDisplayName ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? '',
  };
}

interface RoleStore {
  roles: Role[];
  allPermissions: Permission[];
  hrUsers: HrUser[];
  loading: boolean;
  error: string | null;

  fetchRoles: () => Promise<void>;
  fetchPermissions: () => Promise<void>;
  fetchHrUsers: () => Promise<void>;

  createRole: (data: { name: string; displayName: string; description?: string }) => Promise<Role>;
  updateRole: (id: number, data: { displayName?: string; description?: string; isActive?: boolean }) => Promise<void>;
  deleteRole: (id: number) => Promise<void>;
  updateRolePermissions: (roleId: number, permissionIds: number[]) => Promise<void>;

  createHrUser: (data: { name: string; username: string; password: string; roleId: number }) => Promise<void>;
  updateHrUser: (id: number, data: { name?: string; username?: string; password?: string; roleId?: number; isActive?: boolean }) => Promise<void>;
}

export const useRoleStore = create<RoleStore>((set) => ({
  roles: [],
  allPermissions: [],
  hrUsers: [],
  loading: false,
  error: null,

  async fetchRoles() {
    set({ loading: true, error: null });
    try {
      const res = await authFetch('/api/admin/roles');
      if (!res.ok) throw new Error((await res.json()).error);
      const raw = await res.json();
      set({ roles: raw.map(normalizeRole), loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  async fetchPermissions() {
    try {
      const res = await authFetch('/api/admin/permissions');
      if (!res.ok) throw new Error((await res.json()).error);
      const raw = await res.json();
      set({
        allPermissions: raw.map((p: any): Permission => ({
          id: p.id,
          key: p.key,
          module: p.module,
          subModule: p.sub_module ?? p.subModule ?? '',
          action: p.action,
          displayName: p.display_name ?? p.displayName ?? '',
          displayOrder: p.display_order ?? p.displayOrder ?? 0,
        })),
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  async fetchHrUsers() {
    try {
      const res = await authFetch('/api/admin/hr-users');
      if (!res.ok) throw new Error((await res.json()).error);
      const raw = await res.json();
      set({ hrUsers: raw.map(normalizeHrUser) });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  async createRole(data) {
    const res = await authFetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const role = normalizeRole(await res.json());
    set(s => ({ roles: [...s.roles, role] }));
    return role;
  },

  async updateRole(id, data) {
    const res = await authFetch(`/api/admin/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const updated = normalizeRole(await res.json());
    set(s => ({ roles: s.roles.map(r => r.id === id ? { ...r, ...updated } : r) }));
  },

  async deleteRole(id) {
    const res = await authFetch(`/api/admin/roles/${id}`, { method: 'DELETE' });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    set(s => ({ roles: s.roles.filter(r => r.id !== id) }));
  },

  async updateRolePermissions(roleId, permissionIds) {
    const res = await authFetch(`/api/admin/roles/${roleId}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionIds }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    // Update permission count in roles list
    set(s => ({
      roles: s.roles.map(r => r.id === roleId ? { ...r, permissionCount: permissionIds.length } : r),
    }));
  },

  async createHrUser(data) {
    const res = await authFetch('/api/admin/hr-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const user = normalizeHrUser(await res.json());
    set(s => ({ hrUsers: [...s.hrUsers, user] }));
  },

  async updateHrUser(id, data) {
    const res = await authFetch(`/api/admin/hr-users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const updated = normalizeHrUser(await res.json());
    set(s => ({ hrUsers: s.hrUsers.map(u => u.id === id ? { ...u, ...updated } : u) }));
  },
}));
