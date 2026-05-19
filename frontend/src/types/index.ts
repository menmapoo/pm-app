export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER' | 'VIEWER';
export type ProjectRole = 'MANAGER' | 'DEVELOPER' | 'VIEWER';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';
export type TicketType = 'BUG' | 'TASK' | 'STORY' | 'IMPROVEMENT';
export type TicketStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'HIGHEST';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string;
  bio?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar' | 'role'>;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  key: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[];
  _count?: { tickets: number };
}

export interface Ticket {
  id: string;
  key: string;
  title: string;
  description?: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  startDate?: string;
  dueDate?: string;
  position: number;
  projectId: string;
  assigneeId?: string;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
  project: Pick<Project, 'id' | 'name' | 'key'>;
  assignee?: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
  reporter: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
  comments?: Comment[];
  activityLogs?: ActivityLog[];
  _count?: { comments: number };
}

export interface Comment {
  id: string;
  content: string;
  ticketId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
}

export interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, any>;
  userId: string;
  projectId?: string;
  ticketId?: string;
  createdAt: string;
  user: Pick<User, 'id' | 'name' | 'avatar'>;
  project?: Pick<Project, 'id' | 'name' | 'key'>;
  ticket?: Pick<Ticket, 'id' | 'key' | 'title'>;
}

export interface DashboardStats {
  stats: {
    totalProjects: number;
    activeProjects: number;
    totalTickets: number;
    myTickets: number;
  };
  ticketsByStatus: { status: TicketStatus; count: number }[];
  ticketsByPriority: { priority: TicketPriority; count: number }[];
  myAssignedTickets: Ticket[];
  recentActivity: ActivityLog[];
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ProfileChangeRequest {
  id: string;
  userId: string;
  requestedName?: string;
  requestedEmail?: string;
  requestedBio?: string;
  status: RequestStatus;
  adminNote?: string;
  reviewedById?: string;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'id' | 'name' | 'email' | 'avatar' | 'bio' | 'role'>;
  reviewedBy?: Pick<User, 'id' | 'name'>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface KanbanColumn {
  BACKLOG: Ticket[];
  TODO: Ticket[];
  IN_PROGRESS: Ticket[];
  IN_REVIEW: Ticket[];
  DONE: Ticket[];
}
