import axios from 'axios';
import type { Expense, Category, Income, AnalyticsData } from '../types';
 const API_URL = 'https://myproject-2y95.onrender.com/api';
const TEST_API_URL = 'https://myproject-2y95.onrender.com/api/test';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const user = sessionStorage.getItem('auth-user');
  if (user) {
    try {
      const token = JSON.parse(user).token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      sessionStorage.removeItem('auth-user');
    }
  }
  return config;
});

export const authService = {
  login: (email: string, password: string) => api.post('/login/', { email, password }),
  register: (email: string, first_name: string, last_name: string, password: string) => 
    api.post('/register/', { email, first_name, last_name, password }),
};

export const expenseService = {
  getAll: () => api.get<Expense[]>('/expenses/'),
  create: (data: Partial<Expense>) => api.post<Expense>('/expenses/', data),
  update: (id: number, data: Partial<Expense>) => api.put<Expense>(`/expenses/${id}/`, data),
  delete: (id: number) => api.delete(`/expenses/${id}/`),
};

export const categoryService = {
  getAll: () => api.get<Category[]>('/categories/'),
  create: (data: Pick<Category, 'name'>) => api.post<Category>('/categories/', data),
};

export const incomeService = {
  getAll: () => api.get<Income[]>('/incomes/'),
  create: (data: Omit<Income, 'id' | 'user'>) => api.post<Income>('/incomes/', data),
};

export const analyticsService = {
  getAnalytics: () => api.get<AnalyticsData>('/analytics/'),
};

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatResponse {
  reply: string;
  aiEnabled: boolean;
  model: string;
  suggestions: string[];
}

export const aiAdvisorService = {
  chat: (message: string, history: AiChatMessage[]) =>
    api.post<AiChatResponse>('/ai/chat/', { message, history }, { timeout: 45000 }),
};

export const userService = {
  getUserBoard: () => axios.get(`${TEST_API_URL}/user`, { responseType: 'text' }),
  getModeratorBoard: () => axios.get(`${TEST_API_URL}/mod`, { responseType: 'text' }),
  getAdminBoard: () => axios.get(`${TEST_API_URL}/admin`, { responseType: 'text' }),
};

export default api;
