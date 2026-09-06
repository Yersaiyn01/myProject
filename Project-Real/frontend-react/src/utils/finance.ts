import type { Category, Expense } from '../types';

export const DEFAULT_CATEGORY_NAMES = [
  'Food',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health',
  'Bills',
  'Education',
  'Other',
];

export const CURRENCY_RATES: Record<string, number> = {
  USD: 1,
  KZT: 515,
  RUB: 93,
  EUR: 0.88,
};

export interface StoredSettings {
  form?: {
    name?: string;
    email?: string;
    phone?: string;
    salary?: number | string;
    currency?: string;
    theme?: string;
  };
  notifications?: Record<string, boolean>;
  limits?: Record<string, number>;
}

export const getCurrencySymbolByCode = (code: string) => {
  switch (String(code || '').toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'RUB':
      return '₽';
    default:
      return '₸';
  }
};

export const readSettings = (): StoredSettings | null => {
  const settingsRaw = localStorage.getItem('settings');
  if (!settingsRaw) return null;

  try {
    return JSON.parse(settingsRaw) as StoredSettings;
  } catch {
    return null;
  }
};

export const currentCurrencyCode = () => {
  const settings = readSettings();
  const code = String(settings?.form?.currency || 'KZT').toUpperCase().trim();
  return CURRENCY_RATES[code] ? code : 'KZT';
};

export const currentCurrencySymbol = () => getCurrencySymbolByCode(currentCurrencyCode());

export const convertAmount = (
  amount: number | string | null | undefined,
  targetCode = currentCurrencyCode(),
  baseCode = 'KZT',
) => {
  const value = Number(amount || 0);
  const baseRate = CURRENCY_RATES[baseCode];
  const targetRate = CURRENCY_RATES[targetCode];

  if (!baseRate || !targetRate) return value;
  return (value / baseRate) * targetRate;
};

export const formatAmount = (amount: number | string | null | undefined, targetCode = currentCurrencyCode()) =>
  convertAmount(amount, targetCode).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const money = (amount: number | string | null | undefined, symbol = currentCurrencySymbol()) =>
  `${symbol}${formatAmount(amount)}`;

export const expenseMoney = (amount: number | string | null | undefined, symbol = currentCurrencySymbol()) =>
  `-${symbol}${formatAmount(amount)}`;

export const todayString = () => new Date().toISOString().split('T')[0];

export const expenseTitle = (expense: Expense) =>
  String(expense.title || expense.description || 'Untitled transaction');

export const normalizedCategory = (expense: Expense, categories: Category[] = []) => {
  if (expense.category_name) return String(expense.category_name);

  const categoryValue = expense.category;
  if (typeof categoryValue === 'number') {
    return categories.find((category) => category.id === categoryValue)?.name || 'Other';
  }

  if (typeof categoryValue === 'string' && categoryValue.trim()) return categoryValue;
  return 'Other';
};

export const categoryIdByName = async (
  name: string,
  categories: Category[],
  createCategory: (data: { name: string }) => Promise<{ data: Category }>,
) => {
  const existing = categories.find((category) => category.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;

  const response = await createCategory({ name });
  return response.data.id;
};

export const categoryColor = (name: string | null) => {
  const colors: Record<string, string> = {
    Food: '#00c853',
    Transport: '#1e88e5',
    Shopping: '#fb8c00',
    Entertainment: '#8e24aa',
    Health: '#e53935',
    Bills: '#3949ab',
    Education: '#00897b',
    Other: '#546e7a',
  };

  if (!name) return '#00c853';
  return colors[name] || '#00c853';
};

export const categoryTint = (name: string | null, alpha = 0.12) => {
  const hex = categoryColor(name).replace('#', '');
  const fullHex = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
