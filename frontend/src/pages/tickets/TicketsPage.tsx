import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ticketsApi, projectsApi, usersApi, ticketImportApi } from '../../services/api';
import { Ticket, Project, User } from '../../types';
import { TicketImportModal } from './TicketImportModal';

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { PriorityBadge, StatusBadge, TypeBadge } from '../../components/ui/Badge';
import { LoadingSpinner, EmptyState, Avatar } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';

export const TicketsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    projectId: searchParams.get('projectId') || '',
    status: '',
    priority: '',
    assigneeId: '',
    type: '',
  });
  const [form, setForm] = useState({
    title: '', description: '', type: 'TASK', priority: 'MEDIUM',
    projectId: searchParams.get('projectId') || '', assigneeId: '', startDate: '', dueDate: '',
  });

  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canManage = user?.role !== 'VIEWER';
  const canImportExport = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await ticketImportApi.exportXlsx();
      triggerBlobDownload(
        new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `tickets_export_${Date.now()}.xlsx`,
      );
      toast.success('Tickets exported!');
    } catch {
      toast.error('Failed to export tickets');
    } finally {
      setExporting(false);
    }
  };

  const fetchTickets = () => {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    ticketsApi.getAll(params)
      .then(res => setTickets(res.data.tickets))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    projectsApi.getAll().then(res => setProjects(res.data.projects));
    usersApi.getAll().then(res => setUsers(res.data.users));
  }, []);

  useEffect(() => { fetchTickets(); }, [filters]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectId) { toast.error('Please select a project'); return; }
    setSaving(true);
    try {
      await ticketsApi.create({ ...form, assigneeId: form.assigneeId || undefined });
      toast.success('Ticket created!');
      setShowCreate(false);
      setForm({ title: '', description: '', type: 'TASK', priority: 'MEDIUM', projectId: '', assigneeId: '', startDate: '', dueDate: '' });
      fetchTickets();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ticketsApi.delete(deleteTarget.id);
      toast.success('Ticket deleted');
      setDeleteTarget(null);
      fetchTickets();
    } catch {
      toast.error('Failed to delete ticket');
    } finally {
      setDeleting(false);
    }
  };

  const projectMembers = form.projectId
    ? projects.find(p => p.id === form.projectId)?.members?.map(m => m.user) ?? []
    : users;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Tickets</h2>
          <p className="text-sm text-slate-500 mt-0.5">{tickets.length} tickets</p>
        </div>
        <div className="flex items-center gap-2">
          {canImportExport && (
            <>
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
            </>
          )}
          {canManage && (
            <Button onClick={() => setShowCreate(true)} icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }>
              New Ticket
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Input
            placeholder="Search tickets..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
          <Select
            placeholder="All Projects"
            value={filters.projectId}
            onChange={e => setFilters(f => ({ ...f, projectId: e.target.value }))}
            options={projects.map(p => ({ value: p.id, label: p.name }))}
          />
          <Select
            placeholder="All Statuses"
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            options={[
              { value: 'BACKLOG', label: 'Backlog' },
              { value: 'TODO', label: 'To Do' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'IN_REVIEW', label: 'In Review' },
              { value: 'DONE', label: 'Done' },
            ]}
          />
          <Select
            placeholder="All Priorities"
            value={filters.priority}
            onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
            options={[
              { value: 'HIGHEST', label: 'Highest' },
              { value: 'HIGH', label: 'High' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'LOW', label: 'Low' },
            ]}
          />
          <Select
            placeholder="All Types"
            value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
            options={[
              { value: 'BUG', label: 'Bug' },
              { value: 'TASK', label: 'Task' },
              { value: 'STORY', label: 'Story' },
              { value: 'IMPROVEMENT', label: 'Improvement' },
            ]}
          />
          <Button
            variant="ghost"
            onClick={() => setFilters({ search: '', projectId: '', status: '', priority: '', assigneeId: '', type: '' })}
          >
            Clear filters
          </Button>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : tickets.length === 0 ? (
        <EmptyState title="No tickets found" description="Try adjusting your filters or create a new ticket."
          action={canManage ? <Button onClick={() => setShowCreate(true)}>Create Ticket</Button> : undefined}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Key</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-slate-500">{ticket.key}</span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <Link to={`/tickets/${ticket.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600 line-clamp-1">
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><TypeBadge type={ticket.type} /></td>
                  <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                  <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                  <td className="px-4 py-3">
                    {ticket.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={ticket.assignee.name} size="sm" />
                        <span className="text-xs text-slate-600 hidden sm:block">{ticket.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-slate-500">{ticket.project.key}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canManage && (
                      <button onClick={() => setDeleteTarget(ticket)}
                        className="text-slate-400 hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Ticket" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate as any} loading={saving}>Create Ticket</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Title" placeholder="Brief description of the ticket" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Description" placeholder="Detailed description..." value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Project" value={form.projectId}
              onChange={e => setForm(f => ({ ...f, projectId: e.target.value, assigneeId: '' }))}
              placeholder="Select project" required
              options={projects.filter(p => p.status === 'ACTIVE').map(p => ({ value: p.id, label: p.name }))} />
            <Select label="Type" value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              options={[
                { value: 'TASK', label: 'Task' },
                { value: 'BUG', label: 'Bug' },
                { value: 'STORY', label: 'Story' },
                { value: 'IMPROVEMENT', label: 'Improvement' },
              ]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              options={[
                { value: 'HIGHEST', label: 'Highest' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]} />
            <Select label="Assignee (optional)" value={form.assigneeId}
              onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
              placeholder="Unassigned"
              options={projectMembers.map(u => ({ value: u.id, label: u.name }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date (optional)" type="date" value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            <Input label="Due Date (optional)" type="date" value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Ticket"
        message={`Delete "${deleteTarget?.key} - ${deleteTarget?.title}"? This action cannot be undone.`}
        isLoading={deleting}
      />

      <TicketImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={fetchTickets}
      />
    </div>
  );
};
