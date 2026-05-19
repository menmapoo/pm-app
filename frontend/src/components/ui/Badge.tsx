import React from 'react';
import { TicketPriority, TicketStatus, TicketType } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
}

const variants = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'sm' }) => (
  <span className={`
    inline-flex items-center rounded-md font-medium
    ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}
    ${variants[variant]}
  `}>
    {children}
  </span>
);

export const PriorityBadge: React.FC<{ priority: TicketPriority }> = ({ priority }) => {
  const map: Record<TicketPriority, { variant: BadgeProps['variant']; label: string; dot: string }> = {
    LOW: { variant: 'default', label: 'Low', dot: 'bg-slate-400' },
    MEDIUM: { variant: 'info', label: 'Medium', dot: 'bg-blue-500' },
    HIGH: { variant: 'warning', label: 'High', dot: 'bg-amber-500' },
    HIGHEST: { variant: 'danger', label: 'Highest', dot: 'bg-red-500' },
  };
  const { variant, label, dot } = map[priority];
  return (
    <Badge variant={variant}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} mr-1.5`} />
      {label}
    </Badge>
  );
};

export const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const map: Record<TicketStatus, { variant: BadgeProps['variant']; label: string }> = {
    BACKLOG: { variant: 'default', label: 'Backlog' },
    TODO: { variant: 'info', label: 'To Do' },
    IN_PROGRESS: { variant: 'warning', label: 'In Progress' },
    IN_REVIEW: { variant: 'purple', label: 'In Review' },
    DONE: { variant: 'success', label: 'Done' },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
};

export const TypeBadge: React.FC<{ type: TicketType }> = ({ type }) => {
  const map: Record<TicketType, { icon: string; label: string; color: string }> = {
    BUG: { icon: '🐛', label: 'Bug', color: 'bg-red-50 text-red-700' },
    TASK: { icon: '✓', label: 'Task', color: 'bg-blue-50 text-blue-700' },
    STORY: { icon: '📖', label: 'Story', color: 'bg-green-50 text-green-700' },
    IMPROVEMENT: { icon: '↑', label: 'Improvement', color: 'bg-purple-50 text-purple-700' },
  };
  const { icon, label, color } = map[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md ${color}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
};

export const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const map: Record<string, BadgeProps['variant']> = {
    ADMIN: 'danger',
    PROJECT_MANAGER: 'purple',
    DEVELOPER: 'info',
    VIEWER: 'default',
  };
  const labels: Record<string, string> = {
    ADMIN: 'Admin',
    PROJECT_MANAGER: 'PM',
    DEVELOPER: 'Developer',
    VIEWER: 'Viewer',
  };
  return <Badge variant={map[role] || 'default'}>{labels[role] || role}</Badge>;
};
