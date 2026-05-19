import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: { email: string; password: string; name: string; role?: string }) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// Users
export const usersApi = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  toggleStatus: (id: string) => api.patch(`/users/${id}/toggle-status`),
};

// Projects
export const projectsApi = {
  getAll: () => api.get('/projects'),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  addMember: (projectId: string, data: any) => api.post(`/projects/${projectId}/members`, data),
  removeMember: (projectId: string, userId: string) => api.delete(`/projects/${projectId}/members/${userId}`),
  updateMemberRole: (projectId: string, userId: string, role: string) =>
    api.patch(`/projects/${projectId}/members/${userId}`, { role }),
};

// Tickets
export const ticketsApi = {
  getAll: (params?: Record<string, any>) => api.get('/tickets', { params }),
  getById: (id: string) => api.get(`/tickets/${id}`),
  create: (data: any) => api.post('/tickets', data),
  update: (id: string, data: any) => api.put(`/tickets/${id}`, data),
  delete: (id: string) => api.delete(`/tickets/${id}`),
  updateStatus: (id: string, data: { status: string; position?: number }) =>
    api.patch(`/tickets/${id}/status`, data),
  getKanban: (projectId: string) => api.get('/tickets/kanban', { params: { projectId } }),
};

// Comments
export const commentsApi = {
  getByTicket: (ticketId: string) => api.get(`/comments/ticket/${ticketId}`),
  create: (ticketId: string, content: string) => api.post(`/comments/ticket/${ticketId}`, { content }),
  update: (id: string, content: string) => api.put(`/comments/${id}`, { content }),
  delete: (id: string) => api.delete(`/comments/${id}`),
};

// Activity
export const activityApi = {
  getAll: (params?: Record<string, any>) => api.get('/activity', { params }),
};

// Dashboard
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

// Project Import + Export
export const projectImportApi = {
  preview: (file: File, onProgress?: (p: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/projects/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
  },
  confirm: (rows: any[]) => api.post('/projects/import/confirm', { rows }),
  downloadTemplate: () => api.get('/projects/import/template', { responseType: 'blob' }),
  exportXlsx: () => api.get('/projects/export', { responseType: 'blob' }),
};

// Ticket Import + Export
export const ticketImportApi = {
  preview: (file: File, onProgress?: (p: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/tickets/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
  },
  confirm: (rows: any[]) => api.post('/tickets/import/confirm', { rows }),
  downloadTemplate: () => api.get('/tickets/import/template', { responseType: 'blob' }),
  exportXlsx: () => api.get('/tickets/export', { responseType: 'blob' }),
};

// Gantt
export const ganttApi = {
  getAll: (params?: Record<string, any>) => api.get('/gantt', { params }),
};

// Profile
export const profileApi = {
  getMyProfile: () => api.get('/profile/me'),
  submitChangeRequest: (data: { name?: string; email?: string; bio?: string }) =>
    api.post('/profile/request', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/profile/change-password', data),
  getAllRequests: (status?: string) =>
    api.get('/profile/requests', { params: status ? { status } : {} }),
  getPendingCount: () => api.get('/profile/requests/pending-count'),
  approveRequest: (id: string, adminNote?: string) =>
    api.patch(`/profile/requests/${id}/approve`, { adminNote }),
  rejectRequest: (id: string, adminNote?: string) =>
    api.patch(`/profile/requests/${id}/reject`, { adminNote }),
};

export default api;
