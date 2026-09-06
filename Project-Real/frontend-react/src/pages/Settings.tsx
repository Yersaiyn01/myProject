import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { syncProfileWithSettings } from '../utils/goalStorage';
import './Settings.css';

type Theme = 'light' | 'dark' | 'green';

const currencies = [
  { code: 'KZT', symbol: '₸', name: 'Tenge' },
  { code: 'USD', symbol: '$', name: 'Dollar' },
  { code: 'RUB', symbol: '₽', name: 'Ruble' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

const categories = [
  { name: 'Food' },
  { name: 'Transport' },
  { name: 'Entertainment' },
  { name: 'Shopping' },
  { name: 'Health' },
  { name: 'Other' },
];

const exchangeRates: Record<string, Record<string, number>> = {
  KZT: { KZT: 1, USD: 0.00194, RUB: 0.18, EUR: 0.0017 },
  USD: { KZT: 515, USD: 1, RUB: 93, EUR: 0.88 },
  RUB: { KZT: 5.54, USD: 0.0108, RUB: 1, EUR: 0.0095 },
  EUR: { KZT: 585, USD: 1.14, RUB: 106, EUR: 1 },
};

const defaultForm = {
  name: '',
  email: '',
  phone: '',
  salary: 0,
  currency: 'KZT',
  theme: 'light' as Theme,
};

const defaultNotifications = {
  budget: true,
  monthly: false,
  goal: true,
};

const defaultLimits: Record<string, number> = {
  Food: 0,
  Transport: 0,
  Entertainment: 0,
  Shopping: 0,
  Health: 0,
  Other: 0,
};

const readStoredSettings = (theme: Theme) => {
  const settingsRaw = localStorage.getItem('settings');
  if (!settingsRaw) {
    return {
      form: { ...defaultForm, theme },
      notifications: defaultNotifications,
      limits: defaultLimits,
    };
  }

  try {
    const parsed = JSON.parse(settingsRaw) as {
      form?: Partial<typeof defaultForm>;
      notifications?: Partial<typeof defaultNotifications>;
      limits?: Record<string, number>;
    };

    return {
      form: { ...defaultForm, ...(parsed.form || {}), theme },
      notifications: { ...defaultNotifications, ...(parsed.notifications || {}) },
      limits: { ...defaultLimits, ...(parsed.limits || {}) },
    };
  } catch (error) {
    console.error('Settings parse error', error);
    return {
      form: { ...defaultForm, theme },
      notifications: defaultNotifications,
      limits: defaultLimits,
    };
  }
};

export const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(() => readStoredSettings(theme).form);
  const [notifications, setNotifications] = useState(() => readStoredSettings(theme).notifications);
  const [limits, setLimits] = useState<Record<string, number>>(() => readStoredSettings(theme).limits);

  const normalizeCurrency = (code: string) => {
    const normalized = String(code || '').trim().toUpperCase();
    return exchangeRates[normalized] ? normalized : 'KZT';
  };

  const getInitials = () => {
    if (!form.name.trim()) return '?';
    return form.name
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const persistSettings = (nextForm = form, nextNotifications = notifications, nextLimits = limits, showSaved = false) => {
    localStorage.setItem('settings', JSON.stringify({
      form: nextForm,
      notifications: nextNotifications,
      limits: nextLimits,
    }));
    syncProfileWithSettings();
    if (showSaved) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const updateForm = (field: keyof typeof form, value: string | number) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    persistSettings(nextForm);
  };

  const updateLimit = (category: string, value: number) => {
    const nextLimits = { ...limits, [category]: value };
    setLimits(nextLimits);
    persistSettings(form, notifications, nextLimits);
  };

  const selectCurrency = (newCodeRaw: string) => {
    const oldCode = normalizeCurrency(form.currency);
    const newCode = normalizeCurrency(newCodeRaw);
    if (oldCode === newCode) return;

    const rate = exchangeRates[oldCode]?.[newCode];
    if (rate == null) {
      alert('Курс не найден');
      return;
    }

    const nextLimits = Object.fromEntries(
      Object.entries(limits).map(([key, value]) => [key, Number(((Number(value) || 0) * rate).toFixed(2))]),
    );
    const nextForm = {
      ...form,
      salary: Number(((Number(form.salary) || 0) * rate).toFixed(2)),
      currency: newCode,
    };

    setForm(nextForm);
    setLimits(nextLimits);
    persistSettings(nextForm, notifications, nextLimits, true);
  };

  const getCurrencySymbol = () => currencies.find((currency) => currency.code === form.currency)?.symbol || '₸';

  const selectTheme = (nextTheme: Theme) => {
    const nextForm = { ...form, theme: nextTheme };
    setForm(nextForm);
    setTheme(nextTheme);
    persistSettings(nextForm);
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    const nextNotifications = { ...notifications, [key]: !notifications[key] };
    setNotifications(nextNotifications);
    persistSettings(form, nextNotifications);
  };

  const saveSettings = () => {
    setTheme(form.theme);
    persistSettings(form, notifications, limits, true);
  };

  const clearExpenses = () => {
    if (confirm('Clear all expenses?')) {
      localStorage.removeItem('expenses');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const resetGoal = () => {
    if (confirm('Reset your savings goal?')) {
      localStorage.removeItem('userProfile');
      localStorage.removeItem('savedAmount');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const exitAccount = () => {
    logout();
    navigate('/home?modal=login');
  };

  return (
    <div className="settings-page">
      <main className="settings-main">
        <div className="settings-header">
          <div>
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">Manage your profile, theme and account</p>
          </div>
          {saved && <div className="saved-badge">Saved</div>}
        </div>

        <section className="settings-card">
          <h2 className="section-title">Profile</h2>
          <div className="avatar-row">
            <div className="avatar-circle">{getInitials()}</div>
            <div>
              <p className="avatar-name">{form.name || 'Your Name'}</p>
              <p className="avatar-email">{form.email || 'your@email.com'}</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="John Doe" className="settings-input" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} placeholder="john@example.com" className="settings-input" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} placeholder="+7 777 000 00 00" className="settings-input" />
            </div>
            <div className="form-group">
              <label>Monthly Salary</label>
              <div className="input-with-prefix">
                <span className="prefix">{getCurrencySymbol()}</span>
                <input type="number" value={form.salary} onChange={(event) => updateForm('salary', Number(event.target.value) || 0)} placeholder="500000" className="settings-input prefix-input" />
              </div>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <h2 className="section-title">Currency</h2>
          <div className="currency-grid">
            {currencies.map((currency) => (
              <div key={currency.code} className={`currency-card ${form.currency === currency.code ? 'active' : ''}`} onClick={() => selectCurrency(currency.code)}>
                <span className="cur-symbol">{currency.symbol}</span>
                <span className="cur-name">{currency.name}</span>
                <span className="cur-code">{currency.code}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <h2 className="section-title">Budget Limits</h2>
          <p className="section-desc">Set monthly spending limits per category.</p>
          <div className="limits-list">
            {categories.map((category) => (
              <div className="limit-row" key={category.name}>
                <div className="limit-left">
                  <span className="limit-name">{category.name}</span>
                </div>
                <div className="input-with-prefix small">
                  <span className="prefix">{getCurrencySymbol()}</span>
                  <input type="number" value={limits[category.name]} onChange={(event) => updateLimit(category.name, Number(event.target.value) || 0)} placeholder="0" className="settings-input prefix-input" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <h2 className="section-title">Notifications</h2>
          <div className="toggle-list">
            <div className="toggle-row">
              <div><p className="toggle-title">Budget exceeded</p><p className="toggle-sub">Get notified when you exceed a category limit</p></div>
              <div className={`toggle-switch ${notifications.budget ? 'on' : ''}`} onClick={() => toggleNotification('budget')}><div className="toggle-thumb" /></div>
            </div>
            <div className="toggle-row">
              <div><p className="toggle-title">Monthly report</p><p className="toggle-sub">Receive a summary at the end of each month</p></div>
              <div className={`toggle-switch ${notifications.monthly ? 'on' : ''}`} onClick={() => toggleNotification('monthly')}><div className="toggle-thumb" /></div>
            </div>
            <div className="toggle-row">
              <div><p className="toggle-title">Goal progress</p><p className="toggle-sub">Updates on your savings goal progress</p></div>
              <div className={`toggle-switch ${notifications.goal ? 'on' : ''}`} onClick={() => toggleNotification('goal')}><div className="toggle-thumb" /></div>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <h2 className="section-title">Theme</h2>
          <div className="theme-grid">
            {(['light', 'dark', 'green'] as Theme[]).map((themeName) => (
              <div key={themeName} className={`theme-card ${form.theme === themeName ? 'active' : ''}`} onClick={() => selectTheme(themeName)}>
                <div className={`theme-preview ${themeName}-preview`}><span></span><span></span></div>
                <span>{themeName.charAt(0).toUpperCase() + themeName.slice(1)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="danger-card">
          <h2 className="danger-title">Danger Zone</h2>
          <div className="danger-row">
            <div><h3>Clear all expenses</h3><p>This will delete all your transaction history</p></div>
            <button className="danger-btn outline" onClick={clearExpenses}>Clear Data</button>
          </div>
          <div className="danger-row">
            <div><h3>Reset goal</h3><p>Remove your savings goal and progress</p></div>
            <button className="danger-btn outline" onClick={resetGoal}>Reset Goal</button>
          </div>
        </section>

        <section className="account-card">
          <div className="account-left">
            <div className="account-icon">↩</div>
            <div>
              <h2 className="account-title">Exit account</h2>
              <p className="account-text">Sign out from your current account safely</p>
            </div>
          </div>
          <button className="exit-btn" onClick={exitAccount}>Exit account</button>
        </section>

        <div className="actions-row">
          <button className="save-btn" onClick={saveSettings}>Save Changes</button>
        </div>
      </main>
    </div>
  );
};
