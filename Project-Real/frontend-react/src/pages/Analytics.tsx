import { useEffect, useState } from 'react';
import { expenseService } from '../services/api';
import type { Expense } from '../types';
import {
  categoryColor,
  categoryTint,
  currentCurrencySymbol,
  expenseMoney as formatExpenseMoney,
  expenseTitle,
  money as formatMoney,
  normalizedCategory,
} from '../utils/finance';
import './Analytics.css';

interface ChartBar {
  label: string;
  amount: number;
  percent: number;
  isHighlight: boolean;
}

type ChartMode = 'bar' | 'line' | 'donut' | 'horizontal';

const periods = ['Week', 'Month', 'Quarter', 'Year'];
const chartModes: { key: ChartMode; label: string }[] = [
  { key: 'bar', label: 'Bar' },
  { key: 'line', label: 'Line' },
  { key: 'donut', label: 'Donut' },
  { key: 'horizontal', label: 'Horizontal' },
];
const pieColors = ['#00cc55', '#2196F3', '#9C27B0', '#FF9800', '#F44336', '#009688', '#546e7a', '#3949ab'];

const readAnalyticsChartMode = (): ChartMode => {
  const savedChartMode = localStorage.getItem('analyticsChartMode') as ChartMode | null;
  return savedChartMode && ['bar', 'line', 'donut', 'horizontal'].includes(savedChartMode) ? savedChartMode : 'bar';
};

export const Analytics = () => {
  const [activePeriod, setActivePeriod] = useState('Month');
  const [selectedBar, setSelectedBar] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeChartMode, setActiveChartMode] = useState<ChartMode>(() => readAnalyticsChartMode());
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const currency = currentCurrencySymbol();

  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const response = await expenseService.getAll();
        setAllExpenses(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error loading analytics expenses', error);
        setAllExpenses([]);
      }
    };

    void loadExpenses();
  }, []);

  const money = (amount: number | string | null | undefined) => formatMoney(amount, currency);
  const expenseMoney = (amount: number | string | null | undefined) => formatExpenseMoney(amount, currency);
  const today = () => new Date();
  const atStartOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const atEndOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);

  const currentRange = (reference = today()) => {
    const ref = atStartOfDay(reference);

    if (activePeriod === 'Week') {
      const start = new Date(ref);
      const weekday = start.getDay();
      const diff = weekday === 0 ? 6 : weekday - 1;
      start.setDate(start.getDate() - diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: atStartOfDay(start), end: atEndOfDay(end) };
    }

    if (activePeriod === 'Month') {
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
      return { start: atStartOfDay(start), end: atEndOfDay(end) };
    }

    if (activePeriod === 'Quarter') {
      const quarterStartMonth = Math.floor(ref.getMonth() / 3) * 3;
      const start = new Date(ref.getFullYear(), quarterStartMonth, 1);
      const end = new Date(ref.getFullYear(), quarterStartMonth + 3, 0);
      return { start: atStartOfDay(start), end: atEndOfDay(end) };
    }

    const start = new Date(ref.getFullYear(), 0, 1);
    const end = new Date(ref.getFullYear(), 11, 31);
    return { start: atStartOfDay(start), end: atEndOfDay(end) };
  };

  const previousRange = () => {
    const current = currentRange();

    if (activePeriod === 'Week') {
      const start = new Date(current.start);
      start.setDate(start.getDate() - 7);
      const end = new Date(current.end);
      end.setDate(end.getDate() - 7);
      return { start, end };
    }

    if (activePeriod === 'Month') {
      const start = new Date(current.start.getFullYear(), current.start.getMonth() - 1, 1);
      const end = new Date(current.start.getFullYear(), current.start.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }

    if (activePeriod === 'Quarter') {
      const start = new Date(current.start.getFullYear(), current.start.getMonth() - 3, 1);
      const end = new Date(current.start.getFullYear(), current.start.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }

    const start = new Date(current.start.getFullYear() - 1, 0, 1);
    const end = new Date(current.start.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return { start, end };
  };

  const expensesInRange = (range: { start: Date; end: Date }) =>
    allExpenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= range.start && expenseDate <= range.end;
    });

  const periodExpenses = () => expensesInRange(currentRange());
  const barLabelForExpense = (expense: Expense) => {
    const date = new Date(expense.date);

    if (activePeriod === 'Week') {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(date.getDay() + 6) % 7];
    }

    if (activePeriod === 'Month') return `Week ${Math.ceil(date.getDate() / 7)}`;
    return date.toLocaleDateString('en-US', { month: 'short' });
  };
  const barExpenses = (label: string) => periodExpenses().filter((expense) => barLabelForExpense(expense) === label);

  const expenses = () => {
    const base = selectedBar ? barExpenses(selectedBar) : periodExpenses();
    if (!selectedCategory) return base;
    return base.filter((expense) => normalizedCategory(expense) === selectedCategory);
  };

  const chartLabels = () => {
    if (activePeriod === 'Week') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (activePeriod === 'Month') {
      const { end } = currentRange();
      const weeks = Math.ceil(end.getDate() / 7);
      return Array.from({ length: weeks }, (_, index) => `Week ${index + 1}`);
    }
    if (activePeriod === 'Quarter') {
      const { start } = currentRange();
      return [0, 1, 2].map((offset) =>
        new Date(start.getFullYear(), start.getMonth() + offset, 1).toLocaleDateString('en-US', { month: 'short' })
      );
    }
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  };

  const chartBars = (): ChartBar[] => {
    const labels = chartLabels();
    const source = selectedCategory
      ? periodExpenses().filter((expense) => normalizedCategory(expense) === selectedCategory)
      : periodExpenses();

    const grouped = labels.map((label) => ({
      label,
      amount: source
        .filter((expense) => barLabelForExpense(expense) === label)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    }));

    const max = Math.max(...grouped.map((item) => item.amount), 1);
    return grouped.map((item) => ({
      label: item.label,
      amount: item.amount,
      percent: Math.max(item.amount > 0 ? 12 : 4, Math.round((item.amount / max) * 100)),
      isHighlight: item.label === selectedBar,
    }));
  };

  const linePoints = () => {
    const bars = chartBars();
    const width = 640;
    const leftPad = 24;
    const usableWidth = width - leftPad * 2;
    const usableHeight = 168;
    return bars.map((bar, index) => {
      const x = leftPad + (usableWidth / Math.max(1, bars.length - 1)) * index;
      const y = 20 + usableHeight - (usableHeight * bar.percent) / 100;
      return `${x},${y}`;
    }).join(' ');
  };

  const lineAreaPoints = () => {
    const points = linePoints();
    return points ? `24,204 ${points} 616,204` : '';
  };

  const lineDots = () => {
    const bars = chartBars();
    const width = 640;
    const leftPad = 24;
    const usableWidth = width - leftPad * 2;
    const usableHeight = 168;
    return bars.map((bar, index) => ({
      label: bar.label,
      amount: bar.amount,
      isHighlight: bar.isHighlight,
      x: leftPad + (usableWidth / Math.max(1, bars.length - 1)) * index,
      y: 20 + usableHeight - (usableHeight * bar.percent) / 100,
    }));
  };

  const selectBar = (label: string) => setSelectedBar(selectedBar === label ? null : label);
  const selectCategory = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
    setSelectedBar(null);
  };
  const clearSelections = () => {
    setSelectedBar(null);
    setSelectedCategory(null);
  };
  const setPeriod = (period: string) => {
    setActivePeriod(period);
    clearSelections();
  };
  const setChartMode = (mode: ChartMode) => {
    setActiveChartMode(mode);
    localStorage.setItem('analyticsChartMode', mode);
  };

  const totalSpent = () => expenses().reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const allPeriodTotal = () => {
    const source = selectedCategory
      ? periodExpenses().filter((expense) => normalizedCategory(expense) === selectedCategory)
      : periodExpenses();
    return source.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  };
  const periodDayCount = () => {
    const { start, end } = currentRange();
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  };
  const dailyAvg = () => totalSpent() / periodDayCount();
  const forecast = () => {
    const now = today();
    const { start, end } = currentRange();
    const elapsedEnd = now < end ? now : end;
    const elapsedDays = Math.max(1, Math.round((atEndOfDay(elapsedEnd).getTime() - start.getTime()) / 86400000) + 1);
    return (totalSpent() / elapsedDays) * periodDayCount();
  };

  const categoryTotals = () => {
    const map: Record<string, { total: number; count: number }> = {};
    expenses().forEach((expense) => {
      const category = normalizedCategory(expense);
      if (!map[category]) map[category] = { total: 0, count: 0 };
      map[category].total += Number(expense.amount || 0);
      map[category].count += 1;
    });

    const total = totalSpent() || 1;
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        total: value.total,
        count: value.count,
        percent: Math.round((value.total / total) * 100),
      }))
      .sort((a, b) => b.total - a.total);
  };

  const topCategory = () => categoryTotals()[0]?.name || '—';
  const topCategoryPct = () => categoryTotals()[0]?.percent || 0;
  const periodTitle = () => ({ Week: 'Week total', Month: 'Month total', Quarter: 'Quarter total', Year: 'Year total' }[activePeriod]);
  const transactionsLabel = () => ({ Week: 'transactions this week', Month: 'transactions this month', Quarter: 'transactions this quarter', Year: 'transactions this year' }[activePeriod]);
  const forecastLabel = () => ({ Week: 'projected this week', Month: 'projected this month', Quarter: 'projected this quarter', Year: 'projected this year' }[activePeriod]);
  const chartTitle = () => ({ Week: 'Daily spending this week', Month: 'Weekly spending this month', Quarter: 'Monthly spending this quarter', Year: 'Monthly spending this year' }[activePeriod]);

  const pieSlices = () => {
    const categories = categoryTotals();
    const total = totalSpent();
    if (!total) return [];
    let angle = -Math.PI / 2;
    return categories.map((category) => {
      const arc = (category.total / total) * 2 * Math.PI;
      const end = angle + arc;
      const x1 = 100 + 90 * Math.cos(angle);
      const y1 = 100 + 90 * Math.sin(angle);
      const x2 = 100 + 90 * Math.cos(end);
      const y2 = 100 + 90 * Math.sin(end);
      const path = `M100 100 L${x1} ${y1} A90 90 0 ${arc > Math.PI ? 1 : 0} 1 ${x2} ${y2}Z`;
      angle = end;
      return { category: category.name, path };
    });
  };

  const comparisonCurrentAmount = () => allPeriodTotal();
  const comparisonPreviousAmount = () => {
    const previousExpenses = expensesInRange(previousRange());
    const filtered = selectedCategory
      ? previousExpenses.filter((expense) => normalizedCategory(expense) === selectedCategory)
      : previousExpenses;
    return filtered.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  };
  const comparisonCurrentLabel = () => ({ Week: 'This week', Month: 'This month', Quarter: 'This quarter', Year: 'This year' }[activePeriod]);
  const comparisonPreviousLabel = () => ({ Week: 'Previous week', Month: 'Previous month', Quarter: 'Previous quarter', Year: 'Previous year' }[activePeriod]);
  const comparisonCurrentPct = () => Math.round((comparisonCurrentAmount() / Math.max(comparisonCurrentAmount(), comparisonPreviousAmount(), 1)) * 100);
  const comparisonPreviousPct = () => Math.round((comparisonPreviousAmount() / Math.max(comparisonCurrentAmount(), comparisonPreviousAmount(), 1)) * 100);
  const comparisonInsightText = () => {
    const current = comparisonCurrentAmount();
    const previous = comparisonPreviousAmount();
    const difference = Math.abs(current - previous);
    if (current > previous) return `↑ ${money(difference)} more than ${String(comparisonPreviousLabel()).toLowerCase()}`;
    if (current < previous) return `↓ Saved ${money(difference)} vs ${String(comparisonPreviousLabel()).toLowerCase()}`;
    return `No change vs ${String(comparisonPreviousLabel()).toLowerCase()}`;
  };
  const comparisonInsightClass = () => comparisonCurrentAmount() > comparisonPreviousAmount() ? 'bad' : 'good';

  const savingsTips = () => {
    const factor = activePeriod === 'Week' ? 0.15 : activePeriod === 'Year' ? 0.12 : 0.2;
    return categoryTotals().slice(0, 4).map((category) => ({
      category: category.name,
      saving: category.total * factor,
      percent: category.percent,
      reductionPercent: Math.round(factor * 100),
    }));
  };
  const totalPotentialSavings = () => savingsTips().reduce((sum, tip) => sum + tip.saving, 0);
  const activeAccentCategory = () => selectedCategory || topCategory() || 'Food';
  const savingsPeriodLabel = () => ({ Week: 'week', Month: 'month', Quarter: 'quarter', Year: 'year' }[activePeriod]);
  const hasCategoryFocus = () => !!selectedCategory || categoryTotals().length <= 1;
  const focusedCategory = () => categoryTotals()[0] || null;
  const focusedCategoryShare = () => focusedCategory()?.percent || 0;
  const focusedCategoryTransactions = () => focusedCategory()?.count || 0;
  const focusedCategoryAmount = () => focusedCategory()?.total || 0;
  const focusedCategoryAverage = () => focusedCategoryTransactions() ? focusedCategoryAmount() / focusedCategoryTransactions() : 0;

  return (
    <div className="page analytics-page">
      <main className="main">
        <div className="page-header">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-sub">
              {selectedBar || selectedCategory ? (
                <>
                  Showing {selectedBar && <strong>{selectedBar}</strong>}
                  {selectedBar && selectedCategory && <span> · </span>}
                  {selectedCategory && <strong>{selectedCategory}</strong>}
                  {' — '}
                  <span className="clear-filter" onClick={clearSelections}>show all ✕</span>
                </>
              ) : (
                'Click on a chart element to see detailed breakdown'
              )}
            </p>

            {selectedCategory && (
              <div className="active-filter-row">
                <span className="active-filter-chip">
                  {selectedCategory}
                  <button className="chip-clear-btn" onClick={() => selectCategory(selectedCategory)}>✕</button>
                </span>
              </div>
            )}
          </div>

          <div className="analytics-tabs-wrap">
            <div className="period-tabs">
              {periods.map((period) => (
                <button key={period} className={`period-btn ${activePeriod === period ? 'active' : ''}`} onClick={() => setPeriod(period)}>
                  {period}
                </button>
              ))}
            </div>
            <div className="period-tabs">
              {chartModes.map((mode) => (
                <button key={mode.key} className={`period-btn ${activeChartMode === mode.key ? 'active' : ''}`} onClick={() => setChartMode(mode.key)}>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card green-card" style={selectedCategory ? { background: `linear-gradient(135deg, ${categoryColor(selectedCategory)}, ${categoryTint(selectedCategory, 0.9)})` } : undefined}>
            <div>
              <span className="stat-label">{selectedBar ? `${selectedBar} spent` : periodTitle()}</span>
              <span className="stat-val">{money(totalSpent())}</span>
              <span className="stat-trend">{expenses().length} {transactionsLabel()}</span>
            </div>
          </div>
          <div className="stat-card">
            <div>
              <span className="stat-label">Daily average</span>
              <span className="stat-val">{money(dailyAvg())}</span>
              <span className="stat-trend">per day</span>
            </div>
          </div>
          <div className="stat-card">
            <div>
              <span className="stat-label">Top category</span>
              <span className="stat-val">{topCategory()}</span>
              <span className="stat-trend">{topCategoryPct()}% of total</span>
            </div>
          </div>
          <div className="stat-card">
            <div>
              <span className="stat-label">Forecast</span>
              <span className="stat-val red">{money(forecast())}</span>
              <span className="stat-trend red">{forecastLabel()}</span>
            </div>
          </div>
        </div>

        <div className="chart-card wide">
          <div className="card-header-row">
            <span className="card-title">{chartTitle()}</span>
            <span className="total-badge">{money(allPeriodTotal())} total</span>
          </div>

          {activeChartMode === 'bar' && (
            <div className="monthly-chart">
              {chartBars().map((bar) => (
                <div
                  key={bar.label}
                  className={`month-col ${bar.isHighlight ? 'selected' : ''} ${bar.amount === 0 ? 'empty' : ''}`}
                  onClick={() => bar.amount > 0 && selectBar(bar.label)}
                >
                  <span className="month-amount">{bar.amount > 0 ? money(bar.amount) : ''}</span>
                  <div className="month-bar-track">
                    <div
                      className={`month-bar-fill ${bar.isHighlight ? 'selected-bar' : ''}`}
                      style={{
                        background: bar.amount > 0 ? categoryTint(activeAccentCategory(), bar.isHighlight ? 0.78 : 0.18) : undefined,
                        boxShadow: bar.isHighlight ? `0 8px 18px ${categoryTint(activeAccentCategory(), 0.18)}` : undefined,
                        height: `${bar.percent || 2}%`,
                      }}
                    />
                  </div>
                  <span className={`month-label ${bar.isHighlight ? 'selected-label' : ''}`}>{bar.label}</span>
                </div>
              ))}
            </div>
          )}

          {activeChartMode === 'line' && (
            <div className="analytics-line-wrap">
              <svg viewBox="0 0 640 220" width="100%" height="240">
                <polyline points={lineAreaPoints()} fill={categoryTint(activeAccentCategory(), 0.12)} stroke="none" />
                <polyline points={linePoints()} fill="none" stroke={categoryColor(activeAccentCategory())} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                {lineDots().map((dot) => <circle key={dot.label} cx={dot.x} cy={dot.y} r={dot.isHighlight ? 7 : 5} fill={categoryColor(activeAccentCategory())} onClick={() => selectBar(dot.label)} style={{ cursor: 'pointer' }} />)}
                {lineDots().map((dot) => <text key={dot.label} x={dot.x} y="214" textAnchor="middle" fontSize="12" fill="#7a7a7a">{dot.label}</text>)}
              </svg>
            </div>
          )}

          {activeChartMode === 'horizontal' && (
            <div className="analytics-horizontal-chart">
              {chartBars().map((bar) => (
                <div className="analytics-horizontal-row" key={bar.label} onClick={() => bar.amount > 0 && selectBar(bar.label)}>
                  <span>{bar.label}</span>
                  <div className="analytics-horizontal-track">
                    <div
                      style={{
                        width: `${bar.percent}%`,
                        height: '100%',
                        background: bar.isHighlight ? categoryColor(activeAccentCategory()) : categoryTint(activeAccentCategory(), 0.65),
                        borderRadius: 999,
                      }}
                    />
                  </div>
                  <strong>{money(bar.amount)}</strong>
                </div>
              ))}
            </div>
          )}

          {activeChartMode === 'donut' && (
            <PieBlock
              pieSlices={pieSlices()}
              categoryTotals={categoryTotals()}
              selectedCategory={selectedCategory}
              selectCategory={selectCategory}
              total={money(totalSpent())}
              money={money}
            />
          )}
        </div>

        {selectedBar && expenses().length > 0 && (
          <div className="chart-card detail-card">
            <div className="card-header-row">
              <span className="card-title">{selectedBar} — transactions</span>
              <span className="total-badge">{expenses().length} items · {money(totalSpent())}</span>
            </div>
            <div className="detail-grid">
              <div className="detail-cats">
                {categoryTotals().map((cat, index) => (
                  <div className="dc-row" key={cat.name}>
                    <div className="dc-info">
                      <span className="dc-name">{cat.name}</span>
                      <div className="dc-bar-track">
                        <div className="dc-bar-fill" style={{ width: `${cat.percent}%`, background: pieColors[index % pieColors.length] }} />
                      </div>
                    </div>
                    <span className="dc-pct">{cat.percent}%</span>
                    <span className="dc-amt">{expenseMoney(cat.total)}</span>
                  </div>
                ))}
              </div>
              <div className="detail-list">
                {expenses().map((expense) => {
                  const category = normalizedCategory(expense);
                  return (
                    <div className="dl-row" key={expense.id}>
                      <div className="dl-info">
                        <span className="dl-title">{expenseTitle(expense)}</span>
                        <span className="dl-date">{expense.date} · {category}</span>
                      </div>
                      <span className="dl-amt">{expenseMoney(expense.amount)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="analytics-grid">
          <div className="chart-card">
            <div className="card-header-row">
              <span className="card-title">By category</span>
            </div>
            {hasCategoryFocus() && focusedCategory() ? (
              <div
                className="focus-category-card"
                style={{
                  borderColor: categoryTint(focusedCategory()!.name, 0.22),
                  background: `radial-gradient(circle at top left, ${categoryTint(focusedCategory()!.name, 0.14)}, transparent 36%), linear-gradient(180deg, ${categoryTint(focusedCategory()!.name, 0.06)}, ${categoryTint(focusedCategory()!.name, 0.02)})`,
                }}
              >
                <div className="focus-top">
                  <div className="focus-meta">
                    <span className="focus-label">Focused category</span>
                    <span className="focus-name">{focusedCategory()!.name}</span>
                  </div>
                  <span className="focus-percent" style={{ color: categoryColor(focusedCategory()!.name) }}>{focusedCategoryShare()}%</span>
                </div>
                <div className="focus-stats">
                  <div className="focus-stat"><span className="focus-stat-label">Spent</span><span className="focus-stat-value">{money(focusedCategoryAmount())}</span></div>
                  <div className="focus-stat"><span className="focus-stat-label">Transactions</span><span className="focus-stat-value">{focusedCategoryTransactions()}</span></div>
                  <div className="focus-stat"><span className="focus-stat-label">Average</span><span className="focus-stat-value">{money(focusedCategoryAverage())}</span></div>
                </div>
                <div className="focus-bar-track">
                  <div className="focus-bar-fill" style={{ width: `${focusedCategoryShare()}%`, background: `linear-gradient(90deg, ${categoryColor(focusedCategory()!.name)}, ${categoryTint(focusedCategory()!.name, 0.85)})` }} />
                </div>
                <p className="focus-copy">{selectedCategory ? `This view is focused on ${selectedCategory} for the selected period.` : 'One category covers the whole selected period right now.'}</p>
              </div>
            ) : (
              <PieBlock
                pieSlices={pieSlices()}
                categoryTotals={categoryTotals()}
                selectedCategory={selectedCategory}
                selectCategory={selectCategory}
                total={money(totalSpent())}
                money={money}
                compact
              />
            )}
          </div>

          <div className="chart-card">
            <div className="card-header-row">
              <span className="card-title">Category breakdown</span>
              <span className="total-badge">{expenses().length} transactions</span>
            </div>
            <div className="breakdown-list">
              {categoryTotals().map((cat) => (
                <div
                  key={cat.name}
                  className={`breakdown-row ${selectedCategory === cat.name ? 'breakdown-row-active' : ''}`}
                  style={{
                    borderColor: selectedCategory === cat.name ? categoryTint(cat.name, 0.22) : 'transparent',
                    background: selectedCategory === cat.name ? categoryTint(cat.name, 0.08) : undefined,
                    cursor: 'pointer',
                    opacity: !selectedCategory || selectedCategory === cat.name ? 1 : 0.45,
                  }}
                  onClick={() => selectCategory(cat.name)}
                >
                  <div className="bd-left">
                    <div className="bd-info"><span className="bd-name">{cat.name}</span><span className="bd-sub">{cat.count} transactions</span></div>
                  </div>
                  <div className="bd-bar-section">
                    <div className="bd-bar-track"><div className="bd-bar-fill" style={{ width: `${cat.percent}%`, background: categoryColor(cat.name) }} /></div>
                    <span className="bd-pct">{cat.percent}%</span>
                  </div>
                  <div className="bd-right"><span className="bd-amount">{expenseMoney(cat.total)}</span></div>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <div className="card-header-row"><span className="card-title">Comparison</span></div>
            <div className="compare-section">
              <div className="compare-months">
                <div className="cmp-month"><span className="cmp-label">{comparisonCurrentLabel()}</span><span className="cmp-amount">{money(comparisonCurrentAmount())}</span></div>
                <div className="cmp-vs">vs</div>
                <div className="cmp-month"><span className="cmp-label">{comparisonPreviousLabel()}</span><span className="cmp-amount">{money(comparisonPreviousAmount())}</span></div>
              </div>
              <div className="cmp-bars">
                <div className="cmp-bar-row">
                  <span className="cmp-bar-label">Now</span>
                  <div className="cmp-bar-track"><div className="cmp-bar-fill this" style={{ width: `${comparisonCurrentPct()}%`, background: categoryColor(activeAccentCategory()) }} /></div>
                  <span className="cmp-bar-val">{money(comparisonCurrentAmount())}</span>
                </div>
                <div className="cmp-bar-row">
                  <span className="cmp-bar-label">Prev</span>
                  <div className="cmp-bar-track"><div className="cmp-bar-fill last" style={{ width: `${comparisonPreviousPct()}%`, background: categoryTint(activeAccentCategory(), 0.45) }} /></div>
                  <span className="cmp-bar-val">{money(comparisonPreviousAmount())}</span>
                </div>
              </div>
              <div className={`cmp-insight ${comparisonInsightClass()}`} style={{ background: categoryTint(activeAccentCategory(), comparisonInsightClass() === 'bad' ? 0.12 : 0.10), color: categoryColor(activeAccentCategory()) }}>{comparisonInsightText()}</div>
            </div>
          </div>

          <div className="chart-card">
            <div className="card-header-row">
              <span className="card-title">Savings potential</span>
              <span className="total-badge">{money(totalPotentialSavings())}/{savingsPeriodLabel()}</span>
            </div>
            <div className="savings-list">
              {savingsTips().map((tip) => (
                <div className="saving-tip" key={tip.category}>
                  <div className="tip-info"><span className="tip-title">Cut {tip.category} by {tip.reductionPercent}%</span><span className="tip-sub">Save {money(tip.saving)}/{savingsPeriodLabel()}</span></div>
                  <div className="tip-bar-track"><div className="tip-bar-fill" style={{ width: `${tip.percent}%`, background: `linear-gradient(90deg, ${categoryColor(tip.category)}, ${categoryTint(tip.category, 0.75)})` }} /></div>
                </div>
              ))}
            </div>
            <div className="total-savings">Potential savings: <strong>{money(totalPotentialSavings())}/{savingsPeriodLabel()}</strong></div>
          </div>
        </div>
      </main>
    </div>
  );
};

interface PieBlockProps {
  pieSlices: Array<{ category: string; path: string }>;
  categoryTotals: Array<{ name: string; total: number; percent: number }>;
  selectedCategory: string | null;
  selectCategory: (category: string) => void;
  total: string;
  money: (amount: number | string | null | undefined) => string;
  compact?: boolean;
}

const PieBlock = ({ pieSlices, categoryTotals, selectedCategory, selectCategory, total, money, compact }: PieBlockProps) => (
  <div className="pie-wrapper">
    <div className="pie-container">
      <svg viewBox="0 0 200 200" width={compact ? 180 : 220} height={compact ? 180 : 220}>
        {pieSlices.map((slice) => (
          <path
            key={slice.category}
            d={slice.path}
            fill={categoryColor(slice.category)}
            stroke="white"
            strokeWidth="3"
            className="pie-slice"
            style={{ opacity: !selectedCategory || selectedCategory === slice.category ? 1 : 0.35 }}
            onClick={() => selectCategory(slice.category)}
          />
        ))}
        <circle cx="100" cy="100" r="52" className="pie-center-fill" />
        <text x="100" y="94" textAnchor="middle" fontSize="11" className="pie-center-label">Total</text>
        <text x="100" y="112" textAnchor="middle" fontSize="15" fontWeight="800" className="pie-center-value">{total}</text>
      </svg>
    </div>
    <div className="pie-legend">
      {categoryTotals.map((cat) => (
        <div
          key={cat.name}
          className="legend-item"
          style={{ cursor: 'pointer', opacity: !selectedCategory || selectedCategory === cat.name ? 1 : 0.45 }}
          onClick={() => selectCategory(cat.name)}
        >
          <span className="legend-dot" style={{ background: categoryColor(cat.name) }} />
          <span className="legend-name">{cat.name}</span>
          <span className="legend-pct">{cat.percent}%</span>
          <span className="legend-amt">{money(cat.total)}</span>
        </div>
      ))}
    </div>
  </div>
);
