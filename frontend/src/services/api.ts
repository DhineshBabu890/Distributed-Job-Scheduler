import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  getMe: () => api.get('/auth/me'),
};

// Jobs API
export const jobsApi = {
  create: (data: any) => api.post('/jobs', data),

  list: (params?: {
    queueId?: string;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => api.get('/jobs', { params }),

  getById: (id: string) => api.get(`/jobs/${id}`),

  retry: (id: string) => api.post(`/jobs/${id}/retry`),

  cancel: (id: string) => api.post(`/jobs/${id}/cancel`),

  createBatch: (jobs: any[]) => api.post('/jobs/batch', { jobs }),
};

// Queues API
export const queuesApi = {
  create: (data: any) => api.post('/queues', data),

  list: (projectId?: string) =>
    api.get('/queues', { params: { projectId } }),

  getById: (id: string) => api.get(`/queues/${id}`),

  update: (id: string, data: any) => api.patch(`/queues/${id}`, data),

  delete: (id: string) => api.delete(`/queues/${id}`),

  pause: (id: string) => api.post(`/queues/${id}/pause`),

  resume: (id: string) => api.post(`/queues/${id}/resume`),

  getStats: (id: string) => api.get(`/queues/${id}/stats`),
};

// Projects API
export const projectsApi = {
  list: () => api.get('/projects'),
};

// Workers API
export const workersApi = {
  list: () => api.get('/workers'),
};

export default api;
