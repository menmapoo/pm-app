import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usersApi } from '../../services/api';
import { User } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge, RoleBadge } from '../../components/ui/Badge';
import { LoadingSpinner, EmptyState, Avatar } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', email: '', password: '', role: 'DEVELOPER',
  });
  const [editForm, setEditForm] = useState({ name: '', role: '' });

  const fetchUsers = () => {
    usersApi.getAll()
      .then(res => setUsers(res.data.users))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersApi.create(createForm);
      toast.success('User created!');
      setShowCreate(false);
      setCreateForm({ name: '', email: '', password: '', role: 'DEVELOPER' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    try {
      await usersApi.update(editUser.id, editForm);
      toast.success('User updated!');
      setEditUser(null);
      fetchUsers();
    } catch {
      toast.error('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (userId: string) => {
    try {
      await usersApi.toggleStatus(userId);
      toast.success('User status updated');
      fetchUsers();
    } catch {
      toast.error('Failed to toggle status');
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} total users</p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }>
          Add User
        </Button>
      </div>

      <Input
        placeholder="Search users..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
      />

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState title="No users found" description="Add users to your organization." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(u => (
                <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size="md" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-4">
                    <Badge variant={u.isActive ? 'success' : 'default'}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-slate-500">{format(new Date(u.createdAt), 'MMM d, yyyy')}</span>
                  </td>
                  <td className="px-5 py-4">
                    {u.id !== currentUser?.id && (
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditUser(u); setEditForm({ name: u.name, role: u.role }); }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={u.isActive ? 'danger' : 'secondary'}
                          onClick={() => handleToggle(u.id)}
                        >
                          {u.isActive ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add New User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate as any} loading={saving}>Create User</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Full Name" placeholder="John Doe" value={createForm.name}
            onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Email" type="email" placeholder="john@example.com" value={createForm.email}
            onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} required />
          <Input label="Password" type="password" placeholder="Min. 6 characters" value={createForm.password}
            onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
          <Select label="Role" value={createForm.role}
            onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'ADMIN', label: 'Admin' },
              { value: 'PROJECT_MANAGER', label: 'Project Manager' },
              { value: 'DEVELOPER', label: 'Developer' },
              { value: 'VIEWER', label: 'Viewer' },
            ]} />
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleEdit as any} loading={saving}>Save Changes</Button>
          </>
        }
      >
        {editUser && (
          <form onSubmit={handleEdit} className="space-y-4">
            <Input label="Full Name" value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
            <Select label="Role" value={editForm.role}
              onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
              options={[
                { value: 'ADMIN', label: 'Admin' },
                { value: 'PROJECT_MANAGER', label: 'Project Manager' },
                { value: 'DEVELOPER', label: 'Developer' },
                { value: 'VIEWER', label: 'Viewer' },
              ]} />
          </form>
        )}
      </Modal>
    </div>
  );
};
