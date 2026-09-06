export interface User {
  id?: number;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  token: string;
  roles?: string[];
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Expense {
  id: number;
  title?: string;
  amount: number;
  category: number | string | null;
  category_name?: string;
  date: string;
  description?: string;
  user?: number;
}

export interface Category {
  id: number;
  name: string;
  user?: number;
}

export interface Income {
  id: number;
  amount: number;
  source: string;
  date: string;
  description: string;
  user: number;
}

export interface AnalyticsData {
  totalExpenses: number;
  topCategories: { category: string; amount: number }[];
  weeklyComparison: { week: string; amount: number }[];
  monthlyComparison: { month: string; amount: number }[];
  dailyAverage: number;
  savingsRate: number;
}

export interface GoalData {
  dream: string;
  targetAmount: number;
  currentAmount: number;
  monthlySavings: number;
  deadline: string;
  progress: number;
}

export interface Settings {
  theme: 'light' | 'dark' | 'green';
  currency: string;
  salary: number;
  notifications: boolean;
  spendingLimits: { [category: string]: number };
}
