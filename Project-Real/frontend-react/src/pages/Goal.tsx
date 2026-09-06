import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addSaving as storeAddSaving,
  getCurrencyFromSettings,
  getHistory,
  getProfile,
  getSalaryFromSettings,
  getSavedAmount,
  resetGoal,
  saveProfile,
  syncProfileWithSettings,
  type GoalHistoryItem,
  type GoalProfile,
} from '../utils/goalStorage';
import './Goal.css';

type GoalChartType = 'bar' | 'line' | 'ring';

const dreamOptions = [
  { label: 'Автомобиль' },
  { label: 'iPhone' },
  { label: 'Путешествие' },
  { label: 'Квартира' },
  { label: 'Ноутбук' },
  { label: 'Свадьба' },
  { label: 'Образование' },
  { label: 'Другое' },
];

const chartModes: Array<{ key: GoalChartType; label: string }> = [
  { key: 'bar', label: 'Bar' },
  { key: 'line', label: 'Line' },
  { key: 'ring', label: 'Ring' },
];

const quickAmounts = [10000, 25000, 50000, 100000];

const readGoalChart = (): GoalChartType => {
  const savedChart = localStorage.getItem('goal-chart-type') as GoalChartType | null;
  return savedChart && ['bar', 'line', 'ring'].includes(savedChart) ? savedChart : 'bar';
};

export const Goal = () => {
  const [profile, setProfile] = useState<GoalProfile | null>(() => syncProfileWithSettings() || getProfile());
  const [savedAmount, setSavedAmount] = useState(() => getSavedAmount());
  const [addSavingAmount, setAddSavingAmount] = useState('');
  const [monthlyHistory, setMonthlyHistory] = useState<GoalHistoryItem[]>(() => getHistory());
  const [settingsSalary, setSettingsSalary] = useState(() => Number(getSalaryFromSettings() || 0));
  const [settingsCurrencySymbol, setSettingsCurrencySymbol] = useState(() => getCurrencyFromSettings());
  const [selectedChart, setSelectedChart] = useState<GoalChartType>(() => readGoalChart());
  const [goalForm, setGoalForm] = useState({
    dreamLabel: '',
    amount: '',
    months: 12,
    customDreamName: '',
  });
  const navigate = useNavigate();

  const reloadGoalState = () => {
    setSettingsSalary(Number(getSalaryFromSettings() || 0));
    setSettingsCurrencySymbol(getCurrencyFromSettings());
    const synced = syncProfileWithSettings();
    const nextProfile = synced || getProfile();
    setProfile(nextProfile);
    setSavedAmount(getSavedAmount());
    setMonthlyHistory(getHistory());
  };

  const setChart = (type: GoalChartType) => {
    setSelectedChart(type);
    localStorage.setItem('goal-chart-type', type);
  };

  const selectDream = (label: string) => {
    setGoalForm({
      ...goalForm,
      dreamLabel: label,
      customDreamName: label === 'Другое' ? goalForm.customDreamName : '',
    });
  };

  const finalDreamLabel = () => {
    if (goalForm.dreamLabel === 'Другое') {
      return goalForm.customDreamName.trim() || 'Другое';
    }
    return goalForm.dreamLabel;
  };

  const goalMonthlySaving = () => {
    const amount = Number(goalForm.amount || 0);
    const months = Number(goalForm.months || 0);
    if (!amount || !months) return 0;
    return Math.ceil(amount / months);
  };

  const savingPercentOfSalary = () => {
    if (!settingsSalary || settingsSalary <= 0) return 0;
    return Math.round((goalMonthlySaving() / settingsSalary) * 100);
  };

  const savingPercentVisual = () => Math.min(savingPercentOfSalary(), 100);
  const isGoalTooExpensive = () => savingPercentOfSalary() > 80;

  const salaryRecommendation = () => {
    const percent = savingPercentOfSalary();
    if (!settingsSalary) return 'Сначала добавьте зарплату в настройках.';
    if (!goalForm.amount || !goalForm.months) return 'Введите сумму и срок цели.';
    if (percent <= 20) return 'Отличный план. Такая цель выглядит комфортной для вашей зарплаты.';
    if (percent <= 40) return 'Нормально. Цель достижимая, если откладывать регулярно каждый месяц.';
    if (percent <= 60) return 'Нагрузка уже заметная. Возможно, стоит сократить ежемесячные расходы.';
    if (percent <= 80) return 'Цель довольно тяжёлая для текущей зарплаты. Лучше увеличить срок накопления.';
    return 'Слишком большая нагрузка на зарплату. Рекомендуется увеличить срок или уменьшить сумму цели.';
  };

  const isSaveDisabled = () => {
    if (!settingsSalary) return true;
    if (!Number(goalForm.amount) || Number(goalForm.amount) <= 0) return true;
    if (!goalForm.months || goalForm.months <= 0) return true;
    if (!goalForm.dreamLabel) return true;
    if (goalForm.dreamLabel === 'Другое' && !goalForm.customDreamName.trim()) return true;
    return false;
  };

  const saveGoal = () => {
    if (isSaveDisabled()) return;
    saveProfile({
      salary: settingsSalary,
      currency: settingsCurrencySymbol,
      monthlySaving: goalMonthlySaving(),
      dream: {
        label: finalDreamLabel(),
        amount: Number(goalForm.amount),
        months: Number(goalForm.months),
      },
    });
    reloadGoalState();
  };

  const editGoal = () => {
    if (!profile) return;
    const currentLabel = profile.dream?.label || '';
    const isPresetDream = dreamOptions.some((dream) => dream.label === currentLabel && dream.label !== 'Другое');
    setGoalForm({
      dreamLabel: isPresetDream ? currentLabel : 'Другое',
      amount: String(profile.dream?.amount || ''),
      months: Number(profile.dream?.months || 12),
      customDreamName: isPresetDream ? '' : currentLabel,
    });
    resetGoal();
    setProfile(null);
    setSavedAmount(0);
    setMonthlyHistory(getHistory());
  };

  const goalProgress = () => {
    if (!profile?.dream?.amount) return 0;
    return Math.min(Math.round((savedAmount / profile.dream.amount) * 100), 100);
  };

  const monthsLeft = () => {
    if (!profile?.dream?.amount || !profile?.monthlySaving) return 0;
    const remaining = Math.max(0, profile.dream.amount - savedAmount);
    return Math.ceil(remaining / profile.monthlySaving);
  };

  const remainingAmount = () => profile?.dream?.amount ? Math.max(0, profile.dream.amount - savedAmount) : 0;

  const addSaving = () => {
    const amount = Number(addSavingAmount);
    if (!amount || amount <= 0) return;
    storeAddSaving(amount);
    setAddSavingAmount('');
    reloadGoalState();
  };

  const pickQuickAmount = (amount: number) => setAddSavingAmount(String(amount));
  const maxHistory = () => Math.max(...monthlyHistory.map((item) => item.saved), 1);

  const chartPoints = () => {
    if (!monthlyHistory.length) return '';
    const width = 640;
    const leftPad = 26;
    const rightPad = 26;
    const topPad = 20;
    const usableWidth = width - leftPad - rightPad;
    const usableHeight = 160;
    const max = maxHistory();
    return monthlyHistory.map((item, index) => {
      const x = leftPad + (usableWidth / Math.max(1, monthlyHistory.length - 1)) * index;
      const y = topPad + usableHeight - (Number(item.saved || 0) / max) * usableHeight;
      return `${x},${y}`;
    }).join(' ');
  };

  const chartAreaPoints = () => {
    const points = chartPoints();
    if (!points) return '';
    return `26,180 ${points} 614,180`;
  };

  const chartDots = () => {
    const width = 640;
    const leftPad = 26;
    const rightPad = 26;
    const topPad = 20;
    const usableWidth = width - leftPad - rightPad;
    const usableHeight = 160;
    const max = maxHistory();
    return monthlyHistory.map((item, index) => ({
      month: item.month,
      saved: item.saved,
      x: leftPad + (usableWidth / Math.max(1, monthlyHistory.length - 1)) * index,
      y: topPad + usableHeight - (Number(item.saved || 0) / max) * usableHeight,
    }));
  };

  const ringCircumference = () => 2 * Math.PI * 52;
  const ringOffset = () => ringCircumference() * (1 - goalProgress() / 100);

  const goalAdvice = () => {
    const progress = goalProgress();
    if (progress >= 100) return 'Поздравляем! Вы уже достигли цели.';
    if (progress >= 75) return 'Отличный темп. До цели осталось совсем немного.';
    if (progress >= 50) return 'Уже пройдена половина пути. Продолжайте регулярно откладывать.';
    if (progress >= 25) return 'Хороший старт. Старайтесь не пропускать ежемесячные пополнения.';
    return 'Начало положено. Даже небольшие регулярные суммы дадут сильный результат.';
  };

  return (
    <div className="goal-page">
      <main className="goal-main centered-main">
        <div className="goal-header centered-header">
          <h1 className="goal-title">Моя цель</h1>
          <p className="goal-sub">Планируй сегодня — достигай завтра</p>
        </div>

        {!profile ? (
          <div className="goal-form-card centered-card">
            <h2 className="form-title centered-form-title">Установите свою цель</h2>

            {!settingsSalary && (
              <div className="goal-settings-hint warning-box">
                Сначала добавьте ежемесячную зарплату в Settings.
                <button className="settings-link-btn" onClick={() => navigate('/settings')}>Open Settings</button>
              </div>
            )}

            <div className="form-grid single">
              <div className="goal-input-group">
                <label>Сумма цели</label>
                <div className="goal-amount-input">
                  <span className="goal-currency">{settingsCurrencySymbol}</span>
                  <input
                    type="number"
                    value={goalForm.amount}
                    onChange={(event) => setGoalForm({ ...goalForm, amount: event.target.value })}
                    placeholder="1000000"
                    className="goal-big-input"
                  />
                </div>
              </div>
            </div>

            <div className="goal-input-group">
              <label>На что копим?</label>
              <div className="dream-grid">
                {dreamOptions.map((dream) => (
                  <div
                    key={dream.label}
                    className={`dream-card ${goalForm.dreamLabel === dream.label ? 'active' : ''}`}
                    onClick={() => selectDream(dream.label)}
                  >
                    <span className="dream-label">{dream.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {goalForm.dreamLabel === 'Другое' && (
              <div className="goal-input-group custom-dream-group">
                <label>Название вашей мечты</label>
                <div className="goal-amount-input">
                  <input
                    type="text"
                    value={goalForm.customDreamName}
                    onChange={(event) => setGoalForm({ ...goalForm, customDreamName: event.target.value })}
                    placeholder="Например: PlayStation, Бизнес, Курсы"
                    className="goal-big-input custom-dream-input"
                  />
                </div>
              </div>
            )}

            <div className="goal-input-group">
              <label>Срок накопления</label>
              <div className="timeline-grid">
                {[6, 12, 24, 36].map((months) => (
                  <button
                    key={months}
                    type="button"
                    className={`tl-btn ${goalForm.months === months ? 'active' : ''}`}
                    onClick={() => setGoalForm({ ...goalForm, months })}
                  >
                    <span className="tl-months">{months}</span>
                    <span className="tl-label">месяцев</span>
                  </button>
                ))}
              </div>
            </div>

            {goalForm.amount && goalForm.months ? (
              <div className="goal-calc-card">
                <div className="calc-row">
                  <span>Нужно откладывать в месяц</span>
                  <strong>{settingsCurrencySymbol}{goalMonthlySaving().toLocaleString()}</strong>
                </div>
                <div className="calc-row">
                  <span>Это от зарплаты</span>
                  <strong>{savingPercentOfSalary()}%</strong>
                </div>
                <div className="calc-row">
                  <span>Срок</span>
                  <strong>{goalForm.months} мес.</strong>
                </div>
                {settingsSalary ? (
                  <div className="salary-progress-block">
                    <div className="salary-progress-text">
                      <span>Нагрузка на зарплату</span>
                      <span>{savingPercentOfSalary()}%</span>
                    </div>
                    <div className="salary-progress-track">
                      <div className="salary-progress-fill" style={{ width: `${savingPercentVisual()}%` }} />
                    </div>
                    <p className={`salary-advice ${isGoalTooExpensive() ? 'danger' : ''}`}>{salaryRecommendation()}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button className="goal-save-btn" onClick={saveGoal} disabled={isSaveDisabled()}>
              Начать копить →
            </button>
          </div>
        ) : (
          <div className="goal-analytics-grid centered-analytics">
            <div className="dream-hero-card">
              <div className="dream-hero-left">
                <div className="dream-hero-info">
                  <h2 className="dream-hero-name">{profile.dream.label}</h2>
                  <p className="dream-hero-sub">{profile.currency}{profile.dream.amount.toLocaleString()} цель</p>
                </div>
              </div>
              <button className="reset-goal-btn" onClick={editGoal}>Изменить</button>
            </div>

            <div className="progress-card">
              <div className="progress-header">
                <span className="progress-title">Прогресс</span>
                <span className="progress-pct">{goalProgress()}%</span>
              </div>
              <div className="big-progress-track">
                <div className="big-progress-fill" style={{ width: `${goalProgress()}%` }}>
                  <span className="progress-bubble">{goalProgress()}%</span>
                </div>
              </div>
              <div className="progress-amounts">
                <span>{profile.currency}{savedAmount.toLocaleString()} накоплено</span>
                <span>{profile.currency}{profile.dream.amount.toLocaleString()} цель</span>
              </div>
            </div>

            <div className="goal-stats-row goal-stats-row-three">
              <div className="goal-stat-card"><span className="gs-label">Нужно в месяц</span><span className="gs-val green">{profile.currency}{profile.monthlySaving.toLocaleString()}</span></div>
              <div className="goal-stat-card"><span className="gs-label">Осталось месяцев</span><span className="gs-val">{monthsLeft()}</span></div>
              <div className="goal-stat-card"><span className="gs-label">Осталось накопить</span><span className="gs-val red">{profile.currency}{remainingAmount().toLocaleString()}</span></div>
            </div>

            <div className="history-card">
              <div className="card-header-row">
                <div>
                  <span className="card-title">График цели</span>
                  <p className="card-subtitle">Выберите способ отображения прогресса</p>
                </div>
                <div className="chart-switcher">
                  {chartModes.map((mode) => (
                    <button key={mode.key} className={`chart-switch-btn ${selectedChart === mode.key ? 'active' : ''}`} onClick={() => setChart(mode.key)}>
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedChart === 'bar' && (
                <div className="history-chart">
                  {monthlyHistory.map((item) => (
                    <div className="h-col" key={item.month}>
                      <span className="h-val">{profile.currency}{(item.saved / 1000).toFixed(0)}k</span>
                      <div className="h-track">
                        <div className="h-fill" style={{ height: `${(item.saved / maxHistory()) * 100}%` }} />
                      </div>
                      <span className="h-label">{item.month}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedChart === 'line' && (
                <div className="line-chart-wrap">
                  <svg className="line-chart" viewBox="0 0 640 220" preserveAspectRatio="none">
                    <polyline points={chartAreaPoints()} fill="rgba(0, 204, 85, 0.10)" stroke="none" />
                    <polyline points={chartPoints()} fill="none" stroke="#00c853" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    {chartDots().map((dot) => <circle key={dot.month} cx={dot.x} cy={dot.y} r="5" fill="#00c853" />)}
                    {chartDots().map((dot) => <text key={dot.month} x={dot.x} y="212" textAnchor="middle" className="line-axis-label">{dot.month}</text>)}
                  </svg>
                </div>
              )}

              {selectedChart === 'ring' && (
                <div className="ring-chart-wrap">
                  <svg viewBox="0 0 160 160" width="220" height="220">
                    <circle cx="80" cy="80" r="52" fill="none" stroke="#edf3ee" strokeWidth="14" />
                    <circle
                      cx="80"
                      cy="80"
                      r="52"
                      fill="none"
                      stroke="#00c853"
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference()}
                      strokeDashoffset={ringOffset()}
                      transform="rotate(-90 80 80)"
                    />
                    <text x="80" y="77" textAnchor="middle" className="ring-label">Прогресс</text>
                    <text x="80" y="93" textAnchor="middle" className="ring-value">{goalProgress()}%</text>
                  </svg>
                  <div className="ring-side-info">
                    <div className="ring-mini-card"><span>Накоплено</span><strong>{profile.currency}{savedAmount.toLocaleString()}</strong></div>
                    <div className="ring-mini-card"><span>Осталось</span><strong>{profile.currency}{remainingAmount().toLocaleString()}</strong></div>
                  </div>
                </div>
              )}
            </div>

            <div className="advice-add-row">
              <div className="advice-card">
                <div>
                  <p className="advice-title">Совет</p>
                  <p className="advice-text">{goalAdvice()}</p>
                </div>
              </div>

              <div className="add-saving-card">
                <p className="add-title">Добавить накопления</p>
                <div className="add-row">
                  <div className="add-input-wrap">
                    <span className="add-currency">{profile.currency}</span>
                    <input type="number" value={addSavingAmount} onChange={(event) => setAddSavingAmount(event.target.value)} placeholder="Введите сумму" className="add-input" />
                  </div>
                  <button className="add-btn" onClick={addSaving}>+ Добавить</button>
                </div>
                <div className="quick-amounts">
                  {quickAmounts.map((amount) => (
                    <button key={amount} className="quick-btn" onClick={() => pickQuickAmount(amount)}>
                      +{profile.currency}{(amount / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
