import { getCurrencySymbolByCode, readSettings } from './finance';

export interface GoalProfile {
  salary: number;
  currency: string;
  monthlySaving: number;
  dream: {
    label: string;
    amount: number;
    months: number;
  };
}

export interface GoalHistoryItem {
  month: string;
  saved: number;
}

const parseJSON = <T,>(key: string, fallback: T): T => {
  const value = localStorage.getItem(key);
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const getProfile = () => parseJSON<GoalProfile | null>('userProfile', null);

export const saveProfile = (profile: GoalProfile) => {
  localStorage.setItem('userProfile', JSON.stringify(profile));
};

export const getSavedAmount = () => Number(localStorage.getItem('savedAmount') || 0);

export const getHistory = () => parseJSON<GoalHistoryItem[]>('monthlyHistory', []);

export const saveHistory = (history: GoalHistoryItem[]) => {
  localStorage.setItem('monthlyHistory', JSON.stringify(history));
};

export const getSalaryFromSettings = () => {
  const settings = readSettings();
  return Number(settings?.form?.salary || 0);
};

export const getCurrencyFromSettings = () => {
  const settings = readSettings();
  const codeOrSymbol = settings?.form?.currency || 'KZT';
  return String(codeOrSymbol).length === 1 ? String(codeOrSymbol) : getCurrencySymbolByCode(codeOrSymbol);
};

export const syncProfileWithSettings = () => {
  const profile = getProfile();
  const settings = readSettings();
  if (!profile || !settings?.form) return profile;

  const updated = {
    ...profile,
    salary: Number(settings.form.salary || profile.salary || 0),
    currency: getCurrencyFromSettings(),
  };

  saveProfile(updated);
  return updated;
};

export const addSaving = (amount: number) => {
  const current = getSavedAmount();
  const next = current + amount;
  localStorage.setItem('savedAmount', String(next));

  const now = new Date();
  const month = now.toLocaleDateString('en-US', { month: 'short' });
  const history = getHistory();
  const existing = history.find((item) => item.month === month);

  if (existing) {
    existing.saved += amount;
  } else {
    history.push({ month, saved: amount });
  }

  saveHistory(history);
  return next;
};

export const resetGoal = () => {
  localStorage.removeItem('userProfile');
  localStorage.removeItem('savedAmount');
};
