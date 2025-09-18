import axios from 'axios';
import { APP_ENV } from '../env';

const api = axios.create({
  baseURL: APP_ENV.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
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

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'member';
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantPlan: 'free' | 'pro';
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tenant_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
  limitReached?: boolean;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
};

export const notesApi = {
  getAll: async (): Promise<Note[]> => {
    const response = await api.get('/notes');
    return response.data;
  },
  
  getById: async (id: string): Promise<Note> => {
    const response = await api.get(`/notes/${id}`);
    return response.data;
  },
  
  create: async (title: string, content: string): Promise<Note> => {
    const response = await api.post('/notes', { title, content });
    return response.data;
  },
  
  update: async (id: string, title: string, content: string): Promise<Note> => {
    const response = await api.put(`/notes/${id}`, { title, content });
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/notes/${id}`);
  },
};

export const tenantApi = {
  upgrade: async (slug: string): Promise<{ message: string; tenant: any }> => {
    const response = await api.post(`/tenants/${slug}/upgrade`);
    return response.data;
  },
};

export const userApi = {
  getProfile: async (): Promise<{ user: User }> => {
    const response = await api.get('/me');
    return response.data;
  },
};

export default api;
