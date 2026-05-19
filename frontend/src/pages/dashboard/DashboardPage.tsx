import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../services/api';
import { DashboardStats, ActivityLog } from '../../types';
import { LoadingSpinner, Avatar } from '../../components/ui/LoadingSpinner';
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge';
import { formatDistanceToNow } from 'date-fns';

const StatCard: React.FC<{ label: string; value: number; sub?: string; color: string; icon: React.ReactNode }> = ({
  label, value, sub, color, icon,
}) => (
  <div className="stat-card">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-slate-500 font-medium">{label}</span>
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
        {icon}
      </div>
    </div>
    <p className="text-3xl font-bold text-slate-900">{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

const activityLabel = (log: ActivityLog) => {
  const map: Record<string, string> = {
    TICKET_CREATED: 'created ticket',
    TICKET_UPDATED: 'updated ticket',
    TICKET_DELETED: 'deleted ticket',
    STATUS_CHANGED: 'changed status of',
    ASSIGNEE_CHANGED: 'changed assignee of',
    COMMENT_ADDED: 'commented on',
    PROJECT_CREATED: 'created project',
    PROJECT_UPDATED: 'updated project',
  };
  return map[log.action] || log.action;
};

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const { stats, ticketsByStatus, ticketsByPriority, myAssignedTickets, recentActivity } = data;

  const statusColors: Record<string, string> = {
    BACKLOG: 'bg-slate-200',
    TODO: 'bg-blue-400',
    IN_PROGRESS: 'bg-amber-400',
    IN_REVIEW: 'bg-purple-400',
    DONE: 'bg-green-400',
  };

  const priorityColors: Record<string, string> = {
    LOW: 'bg-slate-400',
    MEDIUM: 'bg-blue-500',
    HIGH: 'bg-amber-500',
    HIGHEST: 'bg-red-500',
  };

  const totalByStatus = ticketsByStatus.reduce((a, b) => a + b.count, 0);
  const totalByPriority = ticketsByPriority.reduce((a, b) => a + b.count, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Projects"
          value={stats.totalProjects}
          sub={`${stats.activeProjects} active`}
          color="bg-blue-50"
          icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        />
        <StatCard
          label="Total Tickets"
          value={stats.totalTickets}
          color="bg-purple-50"
          icon={<svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          label="My Tickets"
          value={stats.myTickets}
          sub="assigned to me"
          color="bg-amber-50"
          icon={<svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
        />
        <StatCard
          label="Done Tickets"
          value={ticketsByStatus.find(t => t.status === 'DONE')?.count ?? 0}
          sub="completed"
          color="bg-green-50"
          icon={<svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Status */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Tickets by Status</h3>
          <div className="space-y-3">
            {['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map(status => {
              const entry = ticketsByStatus.find(t => t.status === status);
              const count = entry?.count ?? 0;
              const pct = totalByStatus > 0 ? (count / totalByStatus) * 100 : 0;
              const labels: Record<string, string> = { BACKLOG: 'Backlog', TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done' };
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{labels[status]}</span>
                    <span className="font-semibold text-slate-800">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div className={`h-1.5 rounded-full ${statusColors[status]} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Priority */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Tickets by Priority</h3>
          <div className="space-y-3">
            {['HIGHEST', 'HIGH', 'MEDIUM', 'LOW'].map(priority => {
              const entry = ticketsByPriority.find(t => t.priority === priority);
              const count = entry?.count ?? 0;
              const pct = totalByPriority > 0 ? (count / totalByPriority) * 100 : 0;
              const labels: Record<string, string> = { HIGHEST: 'Highest', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
              return (
                <div key={priority}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{labels[priority]}</span>
                    <span className="font-semibold text-slate-800">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div className={`h-1.5 rounded-full ${priorityColors[priority]} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My Assigned Tickets */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">My Open Tickets</h3>
          {myAssignedTickets.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No tickets assigned to you</p>
          ) : (
            <div className="space-y-2">
              {myAssignedTickets.map(ticket => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="block p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-mono text-slate-400">{ticket.key}</span>
                      <p className="text-sm text-slate-800 font-medium truncate">{ticket.title}</p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <div className="mt-1">
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No recent activity</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentActivity.map(log => (
              <div key={log.id} className="flex items-start gap-3 py-3">
                <Avatar name={log.user.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{log.user.name}</span>{' '}
                    <span className="text-slate-500">{activityLabel(log)}</span>{' '}
                    {log.ticket && (
                      <Link to={`/tickets/${log.ticket.id}`} className="font-medium text-blue-600 hover:underline">
                        {log.ticket.key}
                      </Link>
                    )}
                    {log.project && !log.ticket && (
                      <Link to={`/projects/${log.project.id}`} className="font-medium text-blue-600 hover:underline">
                        {log.project.name}
                      </Link>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
