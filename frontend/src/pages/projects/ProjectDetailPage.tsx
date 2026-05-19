import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { projectsApi, usersApi } from '../../services/api';
import { Project, User } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge, RoleBadge } from '../../components/ui/Badge';
import { LoadingSpinner, Avatar } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', status: '' });
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'DEVELOPER' });
  const [saving, setSaving] = useState(false);

  const canManage = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const fetchProject = () => {
    if (!id) return;
    projectsApi.getById(id)
      .then(res => {
        setProject(res.data.project);
        setEditForm({ name: res.data.project.name, description: res.data.project.description || '', status: res.data.project.status });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProject(); }, [id]);
  useEffect(() => {
    if (canManage) {
      usersApi.getAll().then(res => setUsers(res.data.users));
    }
  }, [canManage]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await projectsApi.update(id!, editForm);
      toast.success('Project updated');
      setEditMode(false);
      fetchProject();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await projectsApi.addMember(id!, memberForm);
      toast.success('Member added');
      setShowAddMember(false);
      setMemberForm({ userId: '', role: 'DEVELOPER' });
      fetchProject();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await projectsApi.removeMember(id!, userId);
      toast.success('Member removed');
      fetchProject();
    } catch {
      toast.error('Failed to remove member');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!project) return <div className="text-center py-16 text-slate-500">Project not found</div>;

  const nonMembers = users.filter(u => !project.members.some(m => m.userId === u.id) && u.isActive);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-bold text-blue-700">{project.key}</span>
          </div>
          <div>
            {editMode ? (
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="text-xl font-bold" />
            ) : (
              <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-mono text-slate-400">{project.key}</span>
              <Badge variant={project.status === 'ACTIVE' ? 'success' : 'default'}>
                {project.status === 'ACTIVE' ? 'Active' : 'Archived'}
              </Badge>
            </div>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <Button variant="secondary" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button onClick={handleSave} loading={saving}>Save</Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setEditMode(true)}>Edit</Button>
            )}
          </div>
        )}
      </div>

      {/* Edit form */}
      {editMode && (
        <div className="card p-5 space-y-4">
          <Textarea label="Description" value={editForm.description}
            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          <Select label="Status" value={editForm.status}
            onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
            options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'ARCHIVED', label: 'Archived' }]} />
        </div>
      )}

      {/* Description */}
      {!editMode && project.description && (
        <div className="card p-5">
          <p className="text-sm text-slate-600">{project.description}</p>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tickets', value: project._count?.tickets ?? 0 },
          { label: 'Members', value: project.members.length },
          { label: 'Updated', value: formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true }) },
        ].map(stat => (
          <div key={stat.label} className="card p-4 text-center">
            <p className="text-xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Members */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Team Members</h3>
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)}>Add Member</Button>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {project.members.map(member => (
            <div key={member.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={member.user.name} size="md" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{member.user.name}</p>
                  <p className="text-xs text-slate-500">{member.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RoleBadge role={member.role} />
                {canManage && member.userId !== user?.id && (
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-2"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link to={`/tickets?projectId=${project.id}`}>
          <Button variant="secondary">View Tickets</Button>
        </Link>
        <Link to={`/board?projectId=${project.id}`}>
          <Button variant="secondary">Open Board</Button>
        </Link>
      </div>

      {/* Add Member Modal */}
      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button onClick={handleAddMember as any}>Add</Button>
          </>
        }
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <Select label="User" value={memberForm.userId}
            onChange={e => setMemberForm(f => ({ ...f, userId: e.target.value }))}
            placeholder="Select a user"
            options={nonMembers.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))}
          />
          <Select label="Project Role" value={memberForm.role}
            onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'MANAGER', label: 'Manager' },
              { value: 'DEVELOPER', label: 'Developer' },
              { value: 'VIEWER', label: 'Viewer' },
            ]}
          />
        </form>
      </Modal>
    </div>
  );
};
