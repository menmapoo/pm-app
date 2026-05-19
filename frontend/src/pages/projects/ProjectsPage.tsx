import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { projectsApi } from '../../services/api';
import { Project } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Input';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { ProjectImportModal } from './ProjectImportModal';
import { projectImportApi } from '../../services/api';

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const ProjectsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', key: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canManage = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await projectImportApi.exportXlsx();
      triggerBlobDownload(
        new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `projects_export_${Date.now()}.xlsx`,
      );
      toast.success('Projects exported!');
    } catch {
      toast.error('Failed to export projects');
    } finally {
      setExporting(false);
    }
  };

  const fetchProjects = () => {
    setLoading(true);
    projectsApi.getAll()
      .then(res => setProjects(res.data.projects))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await projectsApi.create(form);
      toast.success('Project created!');
      setShowCreate(false);
      setForm({ name: '', description: '', key: '' });
      fetchProjects();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await projectsApi.delete(deleteTarget.id);
      toast.success('Project deleted');
      setDeleteTarget(null);
      fetchProjects();
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Projects</h2>
          <p className="text-sm text-slate-500 mt-0.5">{projects.length} total projects</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} loading={exporting} icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            }>
              Export
            </Button>
            <Button variant="outline" onClick={() => setShowImport(true)} icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            }>
              Import
            </Button>
            <Button onClick={() => setShowCreate(true)} icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }>
              New Project
            </Button>
          </div>
        )}
      </div>

      <Input
        placeholder="Search projects..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
      />

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState
          title="No projects found"
          description={canManage ? "Create your first project to get started." : "You are not assigned to any projects."}
          action={canManage ? <Button onClick={() => setShowCreate(true)}>Create Project</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => (
            <div key={project.id} className="card hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-700">{project.key}</span>
                    </div>
                    <div>
                      <Link to={`/projects/${project.id}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                        {project.name}
                      </Link>
                      <p className="text-xs text-slate-400 font-mono">{project.key}</p>
                    </div>
                  </div>
                  <Badge variant={project.status === 'ACTIVE' ? 'success' : 'default'}>
                    {project.status === 'ACTIVE' ? 'Active' : 'Archived'}
                  </Badge>
                </div>

                {project.description && (
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">{project.description}</p>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                    </svg>
                    <span>{project._count?.tickets ?? 0} tickets</span>
                    <span className="text-slate-300">•</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{project.members?.length ?? 0} members</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-xl">
                <Link to={`/projects/${project.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  View details →
                </Link>
                {canManage && (
                  <button
                    onClick={() => setDeleteTarget(project)}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create New Project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create Project</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Project Name" placeholder="e.g. Frontend Redesign" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Project Key" placeholder="e.g. FRD, AGW" value={form.key}
            onChange={e => setForm(f => ({ ...f, key: e.target.value.toUpperCase() }))}
            maxLength={6} required helperText="2-6 uppercase letters, used as ticket prefix" />
          <Textarea label="Description (optional)" placeholder="Brief description of this project..."
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will also delete all tickets, comments and activity logs associated with this project.`}
        isLoading={deleting}
      />

      <ProjectImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={fetchProjects}
      />
    </div>
  );
};
