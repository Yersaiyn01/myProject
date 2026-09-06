import { useEffect, useState } from 'react';
import { categoryService, expenseService } from '../services/api';
import type { Expense } from '../types';
import {
  DEFAULT_CATEGORY_NAMES,
  currentCurrencySymbol,
  expenseMoney as formatExpenseMoney,
  expenseTitle,
  formatAmount,
  money as formatMoney,
  normalizedCategory,
} from '../utils/finance';
import './Reports.css';

type ChartMode = 'bar' | 'line' | 'horizontal';
type SortField = 'date' | 'amount' | 'title' | 'category';
type SortDirection = 'asc' | 'desc';

const periods = ['This week', 'This month', 'Last month', 'This year'];
const chartModes: { key: ChartMode; label: string }[] = [
  { key: 'bar', label: 'Bar' },
  { key: 'line', label: 'Line' },
  { key: 'horizontal', label: 'Horizontal' },
];

const readReportsChartMode = (): ChartMode => {
  const savedMode = localStorage.getItem('reportsChartMode') as ChartMode | null;
  return savedMode && ['bar', 'line', 'horizontal'].includes(savedMode) ? savedMode : 'bar';
};

export const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This month');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChartMode, setSelectedChartMode] = useState<ChartMode>(() => readReportsChartMode());
  const [sortField, setSortFieldState] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(false);
  const currency = currentCurrencySymbol();

  useEffect(() => {
    const loadExpenses = async () => {
      setLoading(true);
      try {
        const response = await expenseService.getAll();
        setExpenses(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error loading report expenses', error);
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    };

    const loadCategories = async () => {
      try {
        const response = await categoryService.getAll();
        const apiCategories = Array.isArray(response.data)
          ? response.data.map((item) => String(item.name || '').trim()).filter(Boolean)
          : [];
        setCategories(Array.from(new Set(['All', ...DEFAULT_CATEGORY_NAMES, ...apiCategories])));
      } catch (error) {
        console.error('Error loading report categories', error);
        setCategories(['All', ...DEFAULT_CATEGORY_NAMES]);
      }
    };

    void loadExpenses();
    void loadCategories();
  }, []);

  const periodStartEnd = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (selectedPeriod === 'This week') {
      const start = new Date(today);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    if (selectedPeriod === 'This month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    if (selectedPeriod === 'Last month') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    const start = new Date(today.getFullYear(), 0, 1);
    const end = new Date(today.getFullYear(), 11, 31);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const compareExpenses = (a: Expense, b: Expense) => {
    let result = 0;

    if (sortField === 'date') {
      result = new Date(a.date).getTime() - new Date(b.date).getTime();
    }

    if (sortField === 'amount') {
      result = Number(a.amount || 0) - Number(b.amount || 0);
    }

    if (sortField === 'title') {
      result = expenseTitle(a).localeCompare(expenseTitle(b));
    }

    if (sortField === 'category') {
      result = normalizedCategory(a).localeCompare(normalizedCategory(b));
    }

    return sortDirection === 'asc' ? result : -result;
  };

  const filteredExpenses = () => {
    const { start, end } = periodStartEnd();
    const query = searchQuery.trim().toLowerCase();

    return expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        const category = normalizedCategory(expense);
        const withinPeriod = expenseDate >= start && expenseDate <= end;
        const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
        const matchesSearch =
          !query ||
          expenseTitle(expense).toLowerCase().includes(query) ||
          category.toLowerCase().includes(query) ||
          String(expense.description || '').toLowerCase().includes(query);

        return withinPeriod && matchesCategory && matchesSearch;
      })
      .sort(compareExpenses);
  };

  const setSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortFieldState(field);
    setSortDirection(field === 'title' || field === 'category' ? 'asc' : 'desc');
  };

  const totalSpent = () => filteredExpenses().reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const avgAmount = () => filteredExpenses().length ? totalSpent() / filteredExpenses().length : 0;
  const maxAmount = () => filteredExpenses().length ? Math.max(...filteredExpenses().map((expense) => Number(expense.amount || 0))) : 0;
  const money = (amount: number | string | null | undefined) => formatMoney(amount, currency);
  const expenseMoney = (amount: number | string | null | undefined) => formatExpenseMoney(amount, currency);

  const formattedDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const chartTitle = () => selectedPeriod === 'This year' ? 'Monthly expenses' : 'Period comparison';

  const withPercents = (items: Array<{ label: string; amount: number }>) => {
    const max = Math.max(...items.map((item) => item.amount), 1);
    return items.map((item) => ({
      ...item,
      percent: Math.max(item.amount > 0 ? 12 : 8, Math.round((item.amount / max) * 100)),
    }));
  };

  const comparisonData = () => {
    const filtered = filteredExpenses();

    if (selectedPeriod === 'This week') {
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return withPercents(labels.map((label, index) => ({
        label,
        amount: filtered
          .filter((expense) => {
            const day = new Date(expense.date).getDay();
            const normalized = day === 0 ? 6 : day - 1;
            return normalized === index;
          })
          .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
      })));
    }

    if (selectedPeriod === 'This year') {
      const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return withPercents(labels.map((label, index) => ({
        label,
        amount: filtered
          .filter((expense) => new Date(expense.date).getMonth() === index)
          .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
      })));
    }

    const grouped = [
      { label: 'Week 1', amount: 0 },
      { label: 'Week 2', amount: 0 },
      { label: 'Week 3', amount: 0 },
      { label: 'Week 4', amount: 0 },
      { label: 'Week 5', amount: 0 },
    ];

    filtered.forEach((expense) => {
      const weekIndex = Math.min(4, Math.floor((new Date(expense.date).getDate() - 1) / 7));
      grouped[weekIndex].amount += Number(expense.amount || 0);
    });

    return withPercents(grouped);
  };

  const linePoints = () => {
    const items = comparisonData();
    const width = 760;
    const leftPad = 26;
    const rightPad = 26;
    const topPad = 18;
    const usableWidth = width - leftPad - rightPad;
    const usableHeight = 160;

    return items.map((item, index) => {
      const x = leftPad + (usableWidth / Math.max(1, items.length - 1)) * index;
      const y = topPad + usableHeight - (usableHeight * item.percent) / 100;
      return `${x},${y}`;
    }).join(' ');
  };

  const lineAreaPoints = () => {
    const points = linePoints();
    return points ? `26,215 ${points} 734,215` : '';
  };

  const lineDots = () => {
    const items = comparisonData();
    const width = 760;
    const leftPad = 26;
    const rightPad = 26;
    const topPad = 18;
    const usableWidth = width - leftPad - rightPad;
    const usableHeight = 160;

    return items.map((item, index) => ({
      label: item.label,
      amount: item.amount,
      x: leftPad + (usableWidth / Math.max(1, items.length - 1)) * index,
      y: topPad + usableHeight - (usableHeight * item.percent) / 100,
    }));
  };

  const deleteExpense = async (id: number) => {
    try {
      await expenseService.delete(id);
      setExpenses((items) => items.filter((expense) => expense.id !== id));
    } catch (error) {
      console.error('Error deleting report expense', error);
    }
  };

  const exportCSV = () => {
    const rows = [['Title', 'Category', 'Date', 'Amount', 'Description']];

    filteredExpenses().forEach((expense) =>
      rows.push([
        expenseTitle(expense),
        normalizedCategory(expense),
        formattedDate(expense.date),
        String(formatAmount(expense.amount)),
        expense.description || '',
      ])
    );

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `expenses-${selectedPeriod.toLowerCase().replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const categoryBg = (category: string) => {
    const colorMap: Record<string, string> = {
      Food: '#e8f5e9',
      Transport: '#e3f2fd',
      Entertainment: '#f3e5f5',
      Shopping: '#fff3e0',
      Health: '#e0f2f1',
      Bills: '#ede7f6',
      Education: '#fce4ec',
      Other: '#f5f5f5',
    };
    return colorMap[category] || '#f5f5f5';
  };

  const catColor = (category: string) => {
    const colorMap: Record<string, string> = {
      Food: '#2e7d32',
      Transport: '#1565c0',
      Entertainment: '#6a1b9a',
      Shopping: '#e65100',
      Health: '#00695c',
      Bills: '#5e35b1',
      Education: '#ad1457',
      Other: '#424242',
    };
    return colorMap[category] || '#424242';
  };

  const updateChartMode = (mode: ChartMode) => {
    setSelectedChartMode(mode);
    localStorage.setItem('reportsChartMode', mode);
  };

  return (
    <div className="page reports-page">
      <main className="main">
        <div className="page-header">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="page-sub">Track and export your spending history</p>
          </div>
          <button className="export-btn" onClick={exportCSV}>⬆ Export</button>
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <span className="filter-label">Period</span>
            <div className="filter-options">
              {periods.map((period) => (
                <button
                  key={period}
                  className={`filter-btn ${selectedPeriod === period ? 'active' : ''}`}
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Category</span>
            <select className="filter-select" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">Search</span>
            <input
              type="text"
              className="filter-search"
              placeholder="Search transaction..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="filter-group">
            <span className="filter-label">Chart</span>
            <div className="chart-mode-row">
              {chartModes.map((mode) => (
                <button
                  key={mode.key}
                  className={`chart-mode-btn ${selectedChartMode === mode.key ? 'active' : ''}`}
                  onClick={() => updateChartMode(mode.key)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="summary-cards">
          <div className="sum-card">
            <span className="sum-label">Total Spent</span>
            <span className="sum-val red">{expenseMoney(totalSpent())}</span>
            <span className="sum-note">For selected filters</span>
          </div>
          <div className="sum-card">
            <span className="sum-label">Transactions</span>
            <span className="sum-val">{filteredExpenses().length}</span>
            <span className="sum-note">Matched records</span>
          </div>
          <div className="sum-card">
            <span className="sum-label">Average</span>
            <span className="sum-val">{money(avgAmount())}</span>
            <span className="sum-note">Per transaction</span>
          </div>
          <div className="sum-card">
            <span className="sum-label">Biggest</span>
            <span className="sum-val red">{expenseMoney(maxAmount())}</span>
            <span className="sum-note">Largest expense</span>
          </div>
        </div>

        <div className="comparison-card">
          <div className="comp-header">
            <span className="comp-title">{chartTitle()}</span>
            <span className="comp-sub">{filteredExpenses().length} filtered transactions</span>
          </div>

          {selectedChartMode === 'bar' && (
            <div className="comp-bars">
              {comparisonData().map((item) => (
                <div className="comp-col" key={item.label}>
                  <div className="comp-bar-wrap">
                    <div className="comp-bar" style={{ height: `${item.percent}%` }} />
                  </div>
                  <span className="comp-label">{item.label}</span>
                  <span className="comp-val">{money(item.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {selectedChartMode === 'line' && (
            <div className="line-chart-wrap">
              <svg className="line-chart" viewBox="0 0 760 260" preserveAspectRatio="none">
                <polyline points={lineAreaPoints()} fill="rgba(0, 204, 85, 0.10)" stroke="none" />
                <polyline points={linePoints()} fill="none" stroke="#00c853" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                {lineDots().map((dot) => <circle key={dot.label} cx={dot.x} cy={dot.y} r="5" fill="#00c853" />)}
                {lineDots().map((dot) => (
                  <text key={dot.label} x={dot.x} y="250" textAnchor="middle" className="line-axis-label">{dot.label}</text>
                ))}
              </svg>
            </div>
          )}

          {selectedChartMode === 'horizontal' && (
            <div className="horizontal-chart">
              {comparisonData().map((item) => (
                <div className="horizontal-row" key={item.label}>
                  <span className="horizontal-label">{item.label}</span>
                  <div className="horizontal-track">
                    <div className="horizontal-fill" style={{ width: `${item.percent}%` }} />
                  </div>
                  <span className="horizontal-value">{money(item.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="table-card">
          <div className="table-header">
            <span className="table-title">All transactions</span>
            <span className="table-count">{filteredExpenses().length} records</span>
          </div>

          <div className="table-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => setSort('title')}>Title</th>
                  <th className="sortable" onClick={() => setSort('category')}>Category</th>
                  <th className="sortable" onClick={() => setSort('date')}>Date</th>
                  <th className="sortable" onClick={() => setSort('amount')}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses().map((expense) => {
                  const category = normalizedCategory(expense);
                  return (
                    <tr key={expense.id}>
                      <td>
                        <div className="tx-cell">
                          <div className="tx-text">
                            <span className="tx-title">{expenseTitle(expense)}</span>
                            <span className="tx-sub">{expense.description || 'No description'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="cat-badge" style={{ background: categoryBg(category), color: catColor(category) }}>{category}</span>
                      </td>
                      <td className="date-cell">{formattedDate(expense.date)}</td>
                      <td className="amount-cell">{expenseMoney(expense.amount)}</td>
                      <td><button className="del-btn" onClick={() => deleteExpense(expense.id)}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="empty-state">
              <strong>Loading transactions...</strong>
              <p>Please wait a moment</p>
            </div>
          )}

          {!loading && filteredExpenses().length === 0 && (
            <div className="empty-state">
              <strong>No transactions found</strong>
              <p>Try changing the filters or search query</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
