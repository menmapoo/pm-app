import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import toast from 'react-hot-toast';
import { ganttApi, projectsApi, usersApi } from '../../services/api';
import { Project, User } from '../../types';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';

// ── types ──────────────────────────────────────────────────────────────────
interface GanttTicket {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  startDate: string;
  dueDate: string;
  progress: number;
  assignee?: { id: string; name: string } | null;
}

interface GanttProject {
  id: string;
  name: string;
  key: string;
  startDate: string;
  endDate: string;
  progress: number;
  tickets: GanttTicket[];
}

interface NoDateTicket {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  projectKey: string;
  projectName: string;
  assignee?: { id: string; name: string } | null;
}

// ── color helpers ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; progress: string }> = {
  BACKLOG:     { bg: '#94a3b8', progress: '#64748b' },
  TODO:        { bg: '#60a5fa', progress: '#3b82f6' },
  IN_PROGRESS: { bg: '#fb923c', progress: '#f97316' },
  IN_REVIEW:   { bg: '#c084fc', progress: '#a855f7' },
  DONE:        { bg: '#4ade80', progress: '#22c55e' },
};

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

// ── tooltip ────────────────────────────────────────────────────────────────
const TooltipContent: React.FC<{ task: Task }> = ({ task }) => {
  const meta = (task as any)._meta as GanttTicket | undefined;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[220px] text-xs">
      {meta ? (
        <>
          <p className="font-semibold text-slate-900 mb-1">{meta.key}: {meta.title}</p>
          <div className="space-y-1 text-slate-600">
            <p>Status: <span className="font-medium">{STATUS_LABELS[meta.status] ?? meta.status}</span></p>
            <p>Priority: <span className="font-medium">{meta.priority}</span></p>
            {meta.assignee && <p>Assignee: <span className="font-medium">{meta.assignee.name}</span></p>}
            <p>Start: <span className="font-medium">{new Date(meta.startDate).toLocaleDateString()}</span></p>
            <p>Due: <span className="font-medium">{new Date(meta.dueDate).toLocaleDateString()}</span></p>
            <p>Progress: <span className="font-medium">{meta.progress}%</span></p>
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold text-slate-900 mb-1">{task.name}</p>
          <p className="text-slate-600">Progress: {task.progress}%</p>
        </>
      )}
    </div>
  );
};

// ── main page ──────────────────────────────────────────────────────────────
export const GanttPage: React.FC = () => {
  const navigate = useNavigate();

  const [ganttProjects, setGanttProjects] = useState<GanttProject[]>([]);
  const [noDateTickets, setNoDateTickets] = useState<NoDateTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState({
    projectId: '',
    status: '',
    priority: '',
    assigneeId: '',
    search: '',
  });

  const fetchGantt = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    ganttApi.getAll(params)
      .then(res => {
        setGanttProjects(res.data.projects);
        setNoDateTickets(res.data.noDateTickets);
      })
      .catch(() => toast.error('Failed to load Gantt data'))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchGantt(); }, [fetchGantt]);

  useEffect(() => {
    projectsApi.getAll().then(res => setProjects(res.data.projects));
    usersApi.getAll().then(res => setUsers(res.data.users));
  }, []);

  // Build gantt-task-react Task[] from ganttProjects
  const tasks: Task[] = [];
  for (const gp of ganttProjects) {
    const isHidden = hiddenProjects.has(gp.id);
    const projectStart = new Date(gp.startDate);
    const projectEnd = new Date(gp.endDate);
    // Ensure end > start to avoid library crash
    if (projectEnd <= projectStart) projectEnd.setDate(projectEnd.getDate() + 1);

    tasks.push({
      id: gp.id,
      name: `${gp.key} — ${gp.name}`,
      start: projectStart,
      end: projectEnd,
      progress: gp.progress,
      type: 'project',
      hideChildren: isHidden,
      styles: {
        backgroundColor: '#1e40af',
        backgroundSelectedColor: '#1d4ed8',
        progressColor: '#3b82f6',
        progressSelectedColor: '#60a5fa',
      },
    } as Task);

    if (!isHidden) {
      for (const t of gp.tickets) {
        const ticketStart = new Date(t.startDate);
        const ticketEnd = new Date(t.dueDate);
        if (ticketEnd <= ticketStart) ticketEnd.setDate(ticketEnd.getDate() + 1);
        const colors = STATUS_COLORS[t.status] ?? STATUS_COLORS.BACKLOG;

        const task: any = {
          id: t.id,
          name: `${t.key}: ${t.title}`,
          start: ticketStart,
          end: ticketEnd,
          progress: t.progress,
          type: 'task',
          project: gp.id,
          styles: {
            backgroundColor: colors.bg,
            backgroundSelectedColor: colors.bg,
            progressColor: colors.progress,
            progressSelectedColor: colors.progress,
          },
          _meta: t,
        };
        tasks.push(task as Task);
      }
    }
  }

  const handleExpanderClick = (task: Task) => {
    setHiddenProjects(prev => {
      const next = new Set(prev);
      if (next.has(task.id)) next.delete(task.id);
      else next.add(task.id);
      return next;
    });
  };

  const handleTaskClick = (task: Task) => {
    const meta = (task as any)._meta as GanttTicket | undefined;
    if (meta) navigate(`/tickets/${meta.id}`);
  };

  const columnWidth = viewMode === ViewMode.Month ? 160 : viewMode === ViewMode.Week ? 120 : 60;

  return (
    <div className="max-w-full mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gantt Chart</h2>
          <p className="text-sm text-slate-500 mt-0.5">Timeline view of all project tickets</p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {([ViewMode.Day, ViewMode.Week, ViewMode.Month] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === mode
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
            placeholder="All Assignees"
            value={filters.assigneeId}
            onChange={e => setFilters(f => ({ ...f, assigneeId: e.target.value }))}
            options={users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name }))}
          />
        </div>
        {Object.values(filters).some(Boolean) && (
          <div className="mt-3">
            <Button
              variant="ghost"
              onClick={() => setFilters({ projectId: '', status: '', priority: '', assigneeId: '', search: '' })}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: STATUS_COLORS[key].bg }} />
            <span className="text-xs text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <LoadingSpinner />
      ) : tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-slate-500 font-medium">No tickets with dates found</p>
          <p className="text-sm text-slate-400 mt-1">Assign start and due dates to tickets to see them here.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <Gantt
            tasks={tasks}
            viewMode={viewMode}
            onExpanderClick={handleExpanderClick}
            onClick={handleTaskClick}
            columnWidth={columnWidth}
            listCellWidth="220px"
            rowHeight={40}
            fontSize="12px"
            TooltipContent={({ task }) => <TooltipContent task={task} />}
          />
        </div>
      )}

      {/* No-date warning section */}
      {noDateTickets.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="font-semibold text-slate-900">
              {noDateTickets.length} ticket{noDateTickets.length !== 1 ? 's' : ''} without dates
            </h3>
            <span className="text-sm text-slate-500">— not shown on chart</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase">Key</th>
                  <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase">Title</th>
                  <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase">Project</th>
                  <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase">Priority</th>
                  <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {noDateTickets.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-2 pr-4">
                      <Link to={`/tickets/${t.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                        {t.key}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 max-w-xs">
                      <Link to={`/tickets/${t.id}`} className="text-slate-700 hover:text-blue-600 line-clamp-1">
                        {t.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-xs font-mono text-slate-500">{t.projectKey}</span>
                    </td>
                    <td className="py-2 pr-4"><StatusBadge status={t.status as any} /></td>
                    <td className="py-2 pr-4"><PriorityBadge priority={t.priority as any} /></td>
                    <td className="py-2">
                      <span className="text-xs text-slate-500">{t.assignee?.name ?? '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
