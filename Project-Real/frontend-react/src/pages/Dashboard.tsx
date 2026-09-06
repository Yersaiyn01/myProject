/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';
import { analyticsService, categoryService, expenseService } from '../services/api';
import type { Category, Expense } from '../types';
import {
  DEFAULT_CATEGORY_NAMES,
  categoryIdByName,
  currentCurrencySymbol,
  expenseMoney as formatExpenseMoney,
  expenseTitle,
  money as formatMoney,
  normalizedCategory,
  todayString,
} from '../utils/finance';
import './Dashboard.css';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs';

const defaultAnalytics = {
  summary: {
    total_spent: 0,
    total_income: 0,
    daily_average: 0,
    month_forecast: 0,
    balance: 0,
    transactions_this_week: 0,
    savings_rate: 0,
  },
  top_category: {
    name: 'No data',
    amount: 0,
    percent: 0,
  },
  weekly_spending: [] as Array<{ day: string; amount: number }>,
  category_breakdown: [] as Array<{ name: string; total: number; amount?: number; percent: number }>,
  month_comparison: { percent_change: 0 },
  weekly_comparison: { percent_change: 0 },
  transaction_comparison: { percent_change: 0 },
};

const dreamOptions = [
  { label: 'Trip' },
  { label: 'Phone' },
  { label: 'Car' },
  { label: 'Laptop' },
  { label: 'House' },
  { label: 'Study' },
];

const readDashboardProfile = () => {
  const savedProfile = localStorage.getItem('userProfile');
  if (!savedProfile) return null;

  try {
    return JSON.parse(savedProfile);
  } catch {
    localStorage.removeItem('userProfile');
    return null;
  }
};

const readDashboardSavedAmount = () => Number(localStorage.getItem('savedAmount') || 0);

const buildFallbackAnalytics = (expenses: Expense[], categories: Category[]) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  weekStart.setHours(0, 0, 0, 0);

  const currentMonthExpenses = expenses.filter((expense) => new Date(expense.date) >= monthStart);
  const totalSpent = currentMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const transactionsThisWeek = expenses.filter((expense) => new Date(expense.date) >= weekStart).length;

  const categoryTotals = new Map<string, number>();
  currentMonthExpenses.forEach((expense) => {
    const category = normalizedCategory(expense, categories);
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + Number(expense.amount || 0));
  });

  const categoryBreakdown = Array.from(categoryTotals.entries())
    .map(([name, total]) => ({
      name,
      total,
      amount: total,
      percent: Math.round((total / Math.max(totalSpent, 1)) * 100),
    }))
    .sort((a, b) => b.total - a.total);

  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklySpending = weekLabels.map((label, index) => {
    const amount = expenses
      .filter((expense) => {
        const date = new Date(expense.date);
        const normalized = date.getDay() === 0 ? 6 : date.getDay() - 1;
        return date >= weekStart && normalized === index;
      })
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    return { day: label, amount };
  });

  return {
    ...defaultAnalytics,
    summary: {
      ...defaultAnalytics.summary,
      total_spent: totalSpent,
      daily_average: totalSpent / Math.max(now.getDate(), 1),
      month_forecast: (totalSpent / Math.max(now.getDate(), 1)) * 30,
      transactions_this_week: transactionsThisWeek,
    },
    top_category: {
      name: categoryBreakdown[0]?.name || 'No data',
      amount: categoryBreakdown[0]?.total || 0,
      percent: categoryBreakdown[0]?.percent || 0,
    },
    weekly_spending: weeklySpending,
    category_breakdown: categoryBreakdown,
  };
};

export const Dashboard = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [analytics, setAnalytics] = useState(defaultAnalytics);
  const [weeklyData, setWeeklyData] = useState<Array<{ day: string; amount: number; percent: number }>>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [kaspiImporting, setKaspiImporting] = useState(false);
  const [kaspiImportMessage, setKaspiImportMessage] = useState('');
  const [kaspiImportError, setKaspiImportError] = useState('');
  const [expenseErrorMessage, setExpenseErrorMessage] = useState('');
  const [expenseSuccessMessage, setExpenseSuccessMessage] = useState('');
  const [profile, setProfile] = useState<any>(() => readDashboardProfile());
  const [savedAmount, setSavedAmount] = useState(() => readDashboardSavedAmount());
  const [addSavingAmount, setAddSavingAmount] = useState('');
  const [goalForm, setGoalForm] = useState({
    salary: '',
    dreamLabel: '',
    amount: '',
    months: 12,
  });
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: '',
    date: todayString(),
    description: '',
  });

  const kaspiFileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const currency = currentCurrencySymbol();

  useEffect(() => {
    const closeMenu = () => setExportOpen(false);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const safeCategories = useMemo(
    () => categories.length ? categories : DEFAULT_CATEGORY_NAMES.map((name, index) => ({ id: index + 1, name })),
    [categories],
  );

  const mapWeeklyData = (raw: Array<{ day: string; amount: number }>) => {
    const maxAmount = Math.max(...raw.map((item) => Number(item.amount) || 0), 1);
    return raw.map((item) => ({
      day: item.day,
      amount: Number(item.amount) || 0,
      percent: Math.max(12, ((Number(item.amount) || 0) / maxAmount) * 100),
    }));
  };

  const normalizeAnalytics = (data: any, fallback: ReturnType<typeof buildFallbackAnalytics>) => {
    if (!data) return fallback;
    if (data.summary) return { ...defaultAnalytics, ...data };

    return {
      ...fallback,
      summary: {
        ...fallback.summary,
        total_spent: Number(data.totalExpenses || fallback.summary.total_spent || 0),
        daily_average: Number(data.dailyAverage || fallback.summary.daily_average || 0),
        savings_rate: Number(data.savingsRate || fallback.summary.savings_rate || 0),
      },
      category_breakdown: Array.isArray(data.topCategories)
        ? data.topCategories.map((item: any) => ({
            name: item.category,
            total: Number(item.amount || 0),
            amount: Number(item.amount || 0),
            percent: Math.round((Number(item.amount || 0) / Math.max(Number(data.totalExpenses || 1), 1)) * 100),
          }))
        : fallback.category_breakdown,
      weekly_spending: Array.isArray(data.weeklyComparison)
        ? data.weeklyComparison.map((item: any) => ({ day: item.week, amount: Number(item.amount || 0) }))
        : fallback.weekly_spending,
    };
  };

  const loadData = async () => {
    try {
      const [expensesRes, categoriesRes] = await Promise.all([
        expenseService.getAll(),
        categoryService.getAll(),
      ]);
      const loadedExpenses = Array.isArray(expensesRes.data) ? expensesRes.data : [];
      const loadedCategories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
      const fallback = buildFallbackAnalytics(loadedExpenses, loadedCategories);

      setExpenses(loadedExpenses);
      setCategories(loadedCategories);

      try {
        const analyticsRes = await analyticsService.getAnalytics();
        const normalized = normalizeAnalytics(analyticsRes.data, fallback);
        setAnalytics(normalized);
        setWeeklyData(mapWeeklyData(normalized.weekly_spending || []));
      } catch {
        setAnalytics(fallback);
        setWeeklyData(mapWeeklyData(fallback.weekly_spending));
      }
    } catch (error) {
      console.error('Error loading dashboard data', error);
      setExpenses([]);
      setCategories([]);
      setAnalytics(defaultAnalytics);
      setWeeklyData([]);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredExpenses = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return expenses;

    return expenses.filter((expense) =>
      expenseTitle(expense).toLowerCase().includes(q) ||
      normalizedCategory(expense, safeCategories).toLowerCase().includes(q)
    );
  };

  const totalExpenses = () => Number(analytics.summary.total_spent || 0);
  const totalTransactionsThisWeek = () => Number(analytics.summary.transactions_this_week || 0);
  const savingsRate = () => Math.max(0, Number(analytics.summary.savings_rate || 0));
  const topCategories = () => analytics.category_breakdown.slice(0, 5).map((cat: any) => ({
    ...cat,
    total: Number(cat.total || cat.amount || 0),
  }));
  const biggestCategory = () => analytics.top_category?.name || 'No data';
  const monthTrend = () => Number(analytics.month_comparison?.percent_change || 0);
  const weeklyTrend = () => Number(analytics.weekly_comparison?.percent_change || 0);
  const transactionTrend = () => Number(analytics.transaction_comparison?.percent_change || 0);
  const trendLabel = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  const trendClass = (value: number) => value >= 0 ? 'up' : 'down';
  const money = (amount: number | string | null | undefined) => formatMoney(amount, currency);
  const expenseMoney = (amount: number | string | null | undefined) => formatExpenseMoney(amount, currency);

  const addExpense = async () => {
    setExpenseErrorMessage('');
    setExpenseSuccessMessage('');

    if (!newExpense.title || !newExpense.amount || !newExpense.category) {
      setExpenseErrorMessage('Fill in title, amount and category.');
      return;
    }

    try {
      const categoryId = await categoryIdByName(newExpense.category, safeCategories, categoryService.create);
      await expenseService.create({
        title: newExpense.title,
        amount: Number(newExpense.amount),
        category: categoryId,
        date: newExpense.date,
        description: newExpense.description || newExpense.title,
      });

      setNewExpense({
        title: '',
        amount: '',
        category: newExpense.category,
        date: newExpense.date || todayString(),
        description: '',
      });
      setShowForm(true);
      setExpenseSuccessMessage('Transaction added. You can add the next one.');
      await loadData();
    } catch (error: any) {
      console.error('Error adding expense', error);
      setExpenseErrorMessage(error?.response?.data?.category?.[0] || error?.response?.data?.detail || 'Could not add transaction.');
    }
  };

  const deleteExpense = async (id: number) => {
    try {
      await expenseService.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting expense', error);
    }
  };

  const toggleExportMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    setExportOpen((open) => !open);
  };

  const closeExportMenu = () => setExportOpen(false);

  const exportPDF = () => {
    closeExportMenu();
    const doc = new jsPDF();
    const rows = filteredExpenses().map((item, index) => [
      String(index + 1),
      expenseTitle(item),
      normalizedCategory(item, safeCategories),
      item.date || '-',
      money(item.amount),
    ]);

    doc.setFontSize(20);
    doc.text('Expense Report', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text(`Total spent: ${money(totalExpenses())}`, 14, 38);
    doc.text(`Transactions: ${filteredExpenses().length}`, 14, 46);
    doc.text(`Top category: ${biggestCategory()}`, 14, 54);

    autoTable(doc, {
      startY: 62,
      head: [['#', 'Title', 'Category', 'Date', 'Amount']],
      body: rows.length ? rows : [['-', 'No transactions', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [0, 204, 85] },
      styles: { fontSize: 10 },
    });

    doc.save(`expense-report-${todayString()}.pdf`);
  };

  const exportCSV = () => {
    closeExportMenu();
    const headers = ['Title', 'Category', 'Date', 'Amount', 'Description'];
    const rows = filteredExpenses().map((item) => [
      expenseTitle(item),
      normalizedCategory(item, safeCategories),
      item.date || '',
      money(item.amount),
      item.description || '',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `expense-report-${todayString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    closeExportMenu();
    window.print();
  };

  const openKaspiImport = () => {
    setKaspiImportError('');
    setKaspiImportMessage('');
    kaspiFileInput.current?.click();
  };

  const parseKaspiAmount = (value: any) => {
    const cleaned = String(value || '')
      .replace(/[^\d,.-]/g, '')
      .replace(/\s/g, '')
      .replace(',', '.');
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? 0 : Math.abs(parsed);
  };

  const normalizeKaspiDate = (value: string) => {
    const iso = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;

    const m1 = iso.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (m1) return `20${m1[3]}-${m1[2]}-${m1[1]}`;

    const m2 = iso.match(/^(\d{2})[./-](\d{2})[./-](\d{2,4})$/);
    if (m2) {
      const year = m2[3].length === 2 ? `20${m2[3]}` : m2[3];
      return `${year}-${m2[2]}-${m2[1]}`;
    }

    return todayString();
  };

  const detectCategory = (text: string) => {
    const t = text.toLowerCase();
    if (/зейтун|magnum|spar|акбаров|dala trade|maki maki|столовая|живая вода|yandex\.eda|магазин|супермаркет|кафе|ресторан|food/i.test(t)) return 'Food';
    if (/onay|проезд|transport|taxi|uber|yandex go/i.test(t)) return 'Transport';
    if (/steam|langame|cyber club|di bro|yandex\.plus|entertainment|game/i.test(t)) return 'Entertainment';
    if (/ауырма жаным|медицин/i.test(t)) return 'Health';
    if (/delta-print|education|study|kbtu/i.test(t)) return 'Education';
    return 'Other';
  };

  const buildKaspiTransaction = (date: string, amount: number, operation: string, details: string) => {
    const op = operation.toLowerCase();
    const title = details.trim();

    if (op === 'покупка') {
      return { title, amount, category: detectCategory(title), date, description: `Imported from Kaspi: ${operation}` };
    }

    if (op === 'перевод') {
      return { title, amount, category: 'Other', date, description: /kaspi депозит/i.test(title) ? 'Imported from Kaspi: Savings transfer' : `Imported from Kaspi: ${operation}` };
    }

    return null;
  };

  const parseKaspiStatementText = (text: string) => {
    const normalized = String(text || '').replace(/\r/g, '\n');
    const regex = /(\d{2}\.\d{2}\.\d{2})\s+([+-])\s*([\d\s]+,\d{2})\s*₸\s+(Покупка|Перевод|Пополнение)\s+(.+?)(?=\s+\d{2}\.\d{2}\.\d{2}\s+[+-]\s*[\d\s]+,\d{2}\s*₸\s+(?:Покупка|Перевод|Пополнение)|$)/gsu;
    const rows: any[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(normalized)) !== null) {
      const amount = parseKaspiAmount(match[3]);
      if (!amount) continue;
      const built = buildKaspiTransaction(
        normalizeKaspiDate(match[1]),
        amount,
        match[4],
        match[5].replace(/\s+/g, ' ').trim(),
      );
      if (built) rows.push(built);
    }

    return rows;
  };

  const normalizeKaspiCsvRow = (row: any) => {
    const keys = Object.keys(row || {});
    const pick = (...names: string[]) => {
      const found = keys.find((key) => names.some((name) => key.toLowerCase().includes(name.toLowerCase())));
      return found ? row[found] : null;
    };

    const rawDate = pick('date', 'дата');
    const rawAmount = pick('amount', 'sum', 'сумма');
    const rawOperation = pick('operation', 'операция');
    const rawDetails = pick('details', 'merchant', 'description', 'детали', 'описание');
    const amount = parseKaspiAmount(rawAmount);
    const operation = String(rawOperation || '').trim();
    const details = String(rawDetails || '').trim();

    if (!amount || !operation || !details) return null;
    return buildKaspiTransaction(normalizeKaspiDate(String(rawDate || todayString())), amount, operation, details);
  };

  const parseKaspiCsv = (file: File) =>
    new Promise<any[]>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<any>) => {
          if (results.errors?.length) {
            reject(new Error('CSV parse error.'));
            return;
          }
          resolve((Array.isArray(results.data) ? results.data : []).map(normalizeKaspiCsvRow).filter(Boolean));
        },
        error: (error: Error) => reject(error),
      });
    });

  const parseKaspiPdf = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = (pdfjsLib as any).getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = Array.isArray(textContent?.items) ? textContent.items : [];
      pageTexts.push(items.map((item: any) => String(item?.str || '')).join('\n'));
    }

    return parseKaspiStatementText(pageTexts.join('\n'));
  };

  const saveImportedTransactions = async (items: any[]) => {
    for (const item of items) {
      const categoryId = await categoryIdByName(item.category || 'Other', safeCategories, categoryService.create);
      await expenseService.create({
        title: item.title,
        amount: item.amount,
        category: categoryId,
        date: item.date,
        description: item.description || '',
      });
    }
  };

  const onKaspiFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    setKaspiImporting(true);
    setKaspiImportError('');
    setKaspiImportMessage('');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let parsedRows: any[] = [];

      if (ext === 'csv') parsedRows = await parseKaspiCsv(file);
      else if (ext === 'pdf') parsedRows = await parseKaspiPdf(file);
      else if (ext === 'txt') parsedRows = parseKaspiStatementText(await file.text());
      else throw new Error('Use CSV, PDF or TXT file.');

      const cleaned = parsedRows.filter((row) => row && row.title && row.amount > 0);
      if (!cleaned.length) throw new Error('No valid transactions found in file.');

      await saveImportedTransactions(cleaned);
      setKaspiImportMessage(`Imported ${cleaned.length} transaction(s).`);
      await loadData();
    } catch (error: any) {
      console.error(error);
      setKaspiImportError(error?.message || 'Could not import Kaspi file.');
    } finally {
      setKaspiImporting(false);
      input.value = '';
    }
  };

  const goalMonthlySaving = () => {
    const amount = Number(goalForm.amount || 0);
    const months = Number(goalForm.months || 0);
    return amount && months ? amount / months : 0;
  };

  const saveGoal = () => {
    const nextProfile = {
      salary: Number(goalForm.salary || 0),
      currency,
      monthlySaving: goalMonthlySaving(),
      dream: {
        label: goalForm.dreamLabel,
        amount: Number(goalForm.amount || 0),
        months: Number(goalForm.months || 0),
      },
    };
    setProfile(nextProfile);
    localStorage.setItem('userProfile', JSON.stringify(nextProfile));
    localStorage.setItem('savedAmount', String(savedAmount));
  };

  const resetGoal = () => {
    setProfile(null);
    setSavedAmount(0);
    localStorage.removeItem('userProfile');
    localStorage.removeItem('savedAmount');
  };

  const goalProgress = () => {
    if (!profile?.dream?.amount) return 0;
    return Math.min(100, Math.round((Number(savedAmount || 0) / Number(profile.dream.amount || 0)) * 100));
  };

  const monthsLeft = () => {
    if (!profile?.dream?.months) return 0;
    const leftPercent = 100 - goalProgress();
    return Math.ceil((profile.dream.months * leftPercent) / 100);
  };

  const goalAdvice = () => {
    if (!profile) return 'Create a goal to see personalized advice.';
    const progress = goalProgress();
    if (progress >= 100) return 'Goal achieved! Great job.';
    if (progress >= 70) return 'You are very close to your goal. Keep going.';
    if (progress >= 40) return 'Good progress. Stay consistent with savings.';
    return 'Try to reduce spending in your top category to save faster.';
  };

  const addSaving = () => {
    const amount = Number(addSavingAmount);
    if (!amount || amount <= 0) return;
    const next = savedAmount + amount;
    setSavedAmount(next);
    localStorage.setItem('savedAmount', String(next));
    setAddSavingAmount('');
  };

  const budgetCompleted = () => goalProgress();
  const budgetPending = () => Math.max(0, 100 - goalProgress());

  return (
    <div className="dashboard">
      {showGoalModal && (
        <div className="goal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="goal-modal" onClick={(event) => event.stopPropagation()}>
            <div className="goal-modal-header">
              <span className="goal-modal-title">My Goal</span>
              <button className="close-btn" onClick={() => setShowGoalModal(false)}>✕</button>
            </div>

            {!profile ? (
              <div className="goal-form">
                <div className="goal-input-group">
                  <label>Monthly salary</label>
                  <div className="goal-amount-input">
                    <span className="goal-currency">{currency}</span>
                    <input
                      type="number"
                      value={goalForm.salary}
                      onChange={(event) => setGoalForm({ ...goalForm, salary: event.target.value })}
                      placeholder="500 000"
                      className="goal-big-input"
                    />
                  </div>
                </div>

                <div className="goal-input-group">
                  <label>My dream</label>
                  <div className="dream-grid-mini">
                    {dreamOptions.map((dream) => (
                      <div
                        key={dream.label}
                        className={`dream-chip ${goalForm.dreamLabel === dream.label ? 'active' : ''}`}
                        onClick={() => setGoalForm({ ...goalForm, dreamLabel: dream.label })}
                      >
                        <span>{dream.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="goal-input-group">
                  <label>Goal amount</label>
                  <div className="goal-amount-input">
                    <span className="goal-currency">{currency}</span>
                    <input
                      type="number"
                      value={goalForm.amount}
                      onChange={(event) => setGoalForm({ ...goalForm, amount: event.target.value })}
                      placeholder="1 000 000"
                      className="goal-big-input"
                    />
                  </div>
                </div>

                <div className="goal-input-group">
                  <label>Timeline</label>
                  <div className="timeline-options">
                    {[6, 12, 24, 36].map((months) => (
                      <button
                        key={months}
                        className={`tl-btn ${goalForm.months === months ? 'active' : ''}`}
                        onClick={() => setGoalForm({ ...goalForm, months })}
                      >
                        {months} мес
                      </button>
                    ))}
                  </div>
                </div>

                {goalForm.amount && goalForm.months ? (
                  <div className="goal-hint">
                    Откладывать <strong>{currency}{goalMonthlySaving().toLocaleString()}</strong> / месяц
                  </div>
                ) : null}

                <button
                  className="goal-save-btn"
                  onClick={saveGoal}
                  disabled={!goalForm.salary || !goalForm.dreamLabel || !goalForm.amount || !goalForm.months}
                >
                  Save Goal →
                </button>
              </div>
            ) : (
              <div className="goal-analytics">
                <div className="goal-dream-header">
                  <div>
                    <p className="goal-dream-name">{profile.dream.label}</p>
                    <p className="goal-dream-sub">{profile.currency}{Number(profile.dream.amount).toLocaleString()} за {profile.dream.months} мес.</p>
                  </div>
                  <button className="reset-btn" onClick={resetGoal}>Edit</button>
                </div>

                <div className="goal-progress-section">
                  <div className="goal-progress-labels">
                    <span>Накоплено</span>
                    <span>{money(savedAmount)} / {money(profile.dream.amount)}</span>
                  </div>
                  <div className="goal-progress-track">
                    <div className="goal-progress-fill" style={{ width: `${goalProgress()}%` }} />
                  </div>
                  <div className="goal-progress-pct">{goalProgress()}%</div>
                </div>

                <div className="goal-stats">
                  <div className="goal-stat">
                    <span className="gs-label">Зарплата</span>
                    <span className="gs-val">{money(profile.salary)}</span>
                  </div>
                  <div className="goal-stat">
                    <span className="gs-label">Расходы</span>
                    <span className="gs-val red">{money(totalExpenses())}</span>
                  </div>
                  <div className="goal-stat">
                    <span className="gs-label">Остаток</span>
                    <span className="gs-val green">{money((profile.salary || 0) - totalExpenses())}</span>
                  </div>
                  <div className="goal-stat">
                    <span className="gs-label">Нужно/мес</span>
                    <span className="gs-val">{money(profile.monthlySaving)}</span>
                  </div>
                </div>

                <div className="goal-timeline">
                  <div className="gt-row">
                    <span className="gt-label">Осталось месяцев</span>
                    <span className="gt-val">{monthsLeft()}</span>
                  </div>
                  <div className="gt-row">
                    <span className="gt-label">При текущих расходах</span>
                    {(profile.salary - totalExpenses()) > 0 ? (
                      <span className="gt-val green">
                        {Math.ceil(((profile.dream.amount || 0) - (savedAmount || 0)) / Math.max(1, ((profile.salary || 0) - totalExpenses())))} мес.
                      </span>
                    ) : (
                      <span className="gt-val red">Расходы превышают доход!</span>
                    )}
                  </div>
                </div>

                <div className="goal-advice">
                  <p className="advice-text">{goalAdvice()}</p>
                </div>

                <div className="add-saving-row">
                  <input
                    type="number"
                    value={addSavingAmount}
                    onChange={(event) => setAddSavingAmount(event.target.value)}
                    placeholder="Добавить накопление..."
                    className="saving-input"
                  />
                  <button className="add-saving-btn" onClick={addSaving}>+ Добавить</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-actions">
              <button className="btn-primary-dash" onClick={() => navigate('/reports')}>View Report</button>

              <div className="export-wrapper" onClick={(event) => event.stopPropagation()}>
                <button className="btn-outline-dash" onClick={toggleExportMenu}>Export</button>
                {exportOpen && (
                  <div className="export-menu">
                    <button className="export-menu-item" onClick={exportPDF}>Export PDF</button>
                    <button className="export-menu-item" onClick={exportCSV}>Export CSV</button>
                    <button className="export-menu-item" onClick={printReport}>Print</button>
                  </div>
                )}
              </div>

              <button className="kaspi-btn" onClick={openKaspiImport}>Kaspi Import</button>
              <input
                ref={kaspiFileInput}
                type="file"
                accept=".csv,.pdf,.txt"
                hidden
                onChange={onKaspiFileSelected}
              />
            </div>

            {kaspiImporting && <div className="import-note">Importing Kaspi file...</div>}
            {kaspiImportMessage && <div className="import-note success">{kaspiImportMessage}</div>}
            {kaspiImportError && <div className="import-note error">{kaspiImportError}</div>}
          </div>

          <div className="topbar-right">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="user-avatar">
              <img src="/ExpenseTracker.png" alt="avatar" />
            </div>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Total Expenses</span>
              <span className={`stat-trend ${trendClass(monthTrend())}`}>{trendLabel(monthTrend())}</span>
            </div>
            <div className="stat-value">{money(totalExpenses())}</div>
            <div className="stat-sub">this month</div>
            <div className="mini-chart green" />
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Transactions</span>
              <span className={`stat-trend ${trendClass(transactionTrend())}`}>{trendLabel(transactionTrend())}</span>
            </div>
            <div className="stat-value">{totalTransactionsThisWeek()}</div>
            <div className="stat-sub">this week</div>
            <div className="mini-chart lightgreen" />
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Savings Rate</span>
            </div>
            <div className="stat-value">{savingsRate()}%</div>
            <div className="donut-wrapper">
              <svg viewBox="0 0 80 80" width="70" height="70">
                <circle cx="40" cy="40" r="30" fill="none" stroke="#e0f0e0" strokeWidth="10" />
                <circle
                  cx="40"
                  cy="40"
                  r="30"
                  fill="none"
                  stroke="#00cc55"
                  strokeWidth="10"
                  strokeDasharray={`${savingsRate() * 1.885} 188.5`}
                  strokeDashoffset="47"
                  strokeLinecap="round"
                />
                <text x="40" y="45" textAnchor="middle" fontSize="14" fontWeight="700" fill="#111">{savingsRate()}%</text>
              </svg>
            </div>
          </div>
        </div>

        <div className="middle-row">
          <div className="chart-card wide">
            <div className="card-header">
              <span className="card-title">Weekly Spending</span>
              <span className="trend-badge">{trendLabel(weeklyTrend())}</span>
            </div>
            <div className="bar-chart">
              {weeklyData.map((item) => (
                <div className="bar-col" key={item.day}>
                  <div className="bar" style={{ height: `${item.percent}%` }} />
                  <span className="bar-label">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <div className="card-header">
              <span className="card-title">Top Categories</span>
            </div>
            <div className="category-list">
              {topCategories().map((cat) => (
                <div className="cat-row" key={cat.name}>
                  <span className="cat-name">{cat.name}</span>
                  <div className="cat-track">
                    <div className="cat-fill" style={{ width: `${cat.percent}%` }} />
                  </div>
                  <span className="cat-amount">{money(cat.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bottom-row">
          <div className="chart-card wide">
            <div className="card-header">
              <span className="card-title">Recent Transactions</span>
              <button className="btn-small" onClick={() => setShowForm((show) => !show)}>+ Add</button>
            </div>

            {showForm && (
              <>
                <div className="add-form">
                  <input
                    type="text"
                    value={newExpense.title}
                    onChange={(event) => setNewExpense({ ...newExpense, title: event.target.value })}
                    placeholder="Title"
                    className="form-inp"
                  />
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(event) => setNewExpense({ ...newExpense, amount: event.target.value })}
                    placeholder="Amount"
                    className="form-inp"
                  />
                  <select
                    value={newExpense.category}
                    onChange={(event) => setNewExpense({ ...newExpense, category: event.target.value })}
                    className="form-inp"
                  >
                    <option value="" disabled>Select category</option>
                    {safeCategories.map((category) => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                  <button className="btn-primary-dash" onClick={addExpense}>Save</button>
                </div>
                {expenseErrorMessage && <div className="form-feedback" style={{ color: '#c62828', marginTop: 10 }}>{expenseErrorMessage}</div>}
                {expenseSuccessMessage && <div className="form-feedback" style={{ color: '#1d7a46', marginTop: 10 }}>{expenseSuccessMessage}</div>}
              </>
            )}

            <div className="transactions">
              {filteredExpenses().map((expense) => {
                const cat = normalizedCategory(expense, safeCategories);
                return (
                  <div className="tx-row" key={expense.id}>
                    <div className="tx-info">
                      <span className="tx-title">{expenseTitle(expense)}</span>
                      <span className="tx-cat">{cat}</span>
                    </div>
                    <span className="tx-amount">{expenseMoney(expense.amount)}</span>
                    <button className="tx-delete" onClick={() => deleteExpense(expense.id)}>✕</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="right-panel">
            <div className="chart-card">
              <div className="card-header">
                <span className="card-title">Budget Status</span>
                <span className="pending-badge">Pending</span>
              </div>
              <div className="budget-items">
                <div className="budget-item">
                  <span className="b-dot completed" />
                  <span>Completed</span>
                  <span className="b-val">{budgetCompleted()}%</span>
                </div>
                <div className="budget-item">
                  <span className="b-dot pending-dot" />
                  <span>Pending</span>
                  <span className="b-val">{budgetPending()}%</span>
                </div>
              </div>
            </div>

            <div className="chart-card summary-card">
              <div className="summary-row">
                <div>
                  <p className="s-label">Top Category</p>
                  <p className="s-val">{biggestCategory()}</p>
                </div>
                <div>
                  <p className="s-label">Total Spent</p>
                  <p className="s-val green">{money(totalExpenses())}</p>
                </div>
              </div>
            </div>

            <button className="btn-primary-dash" onClick={() => setShowGoalModal(true)}>My Goal</button>
          </div>
        </div>
      </main>
    </div>
  );
};
