import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Onboarding.css';

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

export const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [salary, setSalary] = useState(0);
  const [currency, setCurrency] = useState('₸');
  const [dream, setDream] = useState({
    label: '',
    amount: 0,
    months: 12,
    custom: '',
  });
  const navigate = useNavigate();

  const selectDream = (selectedDream: typeof dreamOptions[0]) => {
    setDream({ ...dream, label: selectedDream.label });
  };

  const monthlySaving = () => {
    if (!dream.amount || !dream.months) return 0;
    return Math.round(dream.amount / dream.months);
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const finish = () => {
    localStorage.setItem('userProfile', JSON.stringify({
      salary,
      currency,
      dream,
      monthlySaving: monthlySaving(),
    }));
    navigate('/dashboard');
  };

  return (
    <div className="onboarding-shell">
      <div className="onboarding">
        <div className="steps-indicator">
          <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'done' : ''}`}>1</div>
          <div className={`step-line ${currentStep > 1 ? 'done' : ''}`} />
          <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'done' : ''}`}>2</div>
          <div className={`step-line ${currentStep > 2 ? 'done' : ''}`} />
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
        </div>

        {currentStep === 1 && (
          <div className="step-card">
            <h2 className="step-title">Какая у вас зарплата?</h2>
            <p className="step-sub">Это поможет нам рассчитать ваш бюджет и сбережения</p>

            <div className="input-group">
              <label>Ежемесячный доход</label>
              <div className="amount-input">
                <span className="currency">₸</span>
                <input type="number" value={salary || ''} onChange={(event) => setSalary(Number(event.target.value) || 0)} placeholder="500 000" className="big-input" />
              </div>
            </div>

            <div className="input-group">
              <label>Валюта</label>
              <div className="currency-options">
                <button className={`cur-btn ${currency === '₸' ? 'active' : ''}`} onClick={() => setCurrency('₸')}>₸ Тенге</button>
                <button className={`cur-btn ${currency === '$' ? 'active' : ''}`} onClick={() => setCurrency('$')}>$ Доллар</button>
                <button className={`cur-btn ${currency === '₽' ? 'active' : ''}`} onClick={() => setCurrency('₽')}>₽ Рубль</button>
              </div>
            </div>

            <button className="next-btn" onClick={nextStep} disabled={!salary}>Продолжить →</button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="step-card">
            <h2 className="step-title">Какова ваша мечта?</h2>
            <p className="step-sub">На что вы хотите накопить? Мы поможем вам достичь цели</p>

            <div className="dream-grid">
              {dreamOptions.map((option) => (
                <div key={option.label} className={`dream-card ${dream.label === option.label ? 'active' : ''}`} onClick={() => selectDream(option)}>
                  <span className="dream-label">{option.label}</span>
                </div>
              ))}
            </div>

            {dream.label === 'Другое' && (
              <div className="input-group custom-goal-input">
                <label>Опишите вашу цель</label>
                <input type="text" value={dream.custom} onChange={(event) => setDream({ ...dream, custom: event.target.value })} placeholder="Например: ремонт квартиры" className="text-input" />
              </div>
            )}

            <div className="input-group">
              <label>Сумма цели</label>
              <div className="amount-input">
                <span className="currency">{currency}</span>
                <input type="number" value={dream.amount || ''} onChange={(event) => setDream({ ...dream, amount: Number(event.target.value) || 0 })} placeholder="1 000 000" className="big-input" />
              </div>
            </div>

            <div className="input-group">
              <label>Когда хотите достичь?</label>
              <div className="date-options">
                <button className={`cur-btn ${dream.months === 6 ? 'active' : ''}`} onClick={() => setDream({ ...dream, months: 6 })}>6 мес</button>
                <button className={`cur-btn ${dream.months === 12 ? 'active' : ''}`} onClick={() => setDream({ ...dream, months: 12 })}>1 год</button>
                <button className={`cur-btn ${dream.months === 24 ? 'active' : ''}`} onClick={() => setDream({ ...dream, months: 24 })}>2 года</button>
                <button className={`cur-btn ${dream.months === 36 ? 'active' : ''}`} onClick={() => setDream({ ...dream, months: 36 })}>3 года</button>
              </div>
            </div>

            {dream.amount && dream.months ? (
              <div className="calc-hint">Нужно откладывать <strong>{currency}{monthlySaving().toLocaleString()}</strong> в месяц</div>
            ) : null}

            <div className="btn-row">
              <button className="back-btn" onClick={() => setCurrentStep(1)}>← Назад</button>
              <button className="next-btn" onClick={nextStep} disabled={!dream.label || !dream.amount || !dream.months}>Продолжить →</button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="step-card success-card">
            <h2 className="step-title">Всё готово!</h2>
            <p className="step-sub">Ваш финансовый профиль создан</p>
            <div className="summary">
              <div className="summary-row"><span className="s-label">Зарплата</span><span className="s-val">{currency}{salary.toLocaleString()}</span></div>
              <div className="summary-row"><span className="s-label">Мечта</span><span className="s-val">{dream.label === 'Другое' ? dream.custom : dream.label}</span></div>
              <div className="summary-row"><span className="s-label">Цель</span><span className="s-val">{currency}{dream.amount.toLocaleString()}</span></div>
              <div className="summary-row"><span className="s-label">Срок</span><span className="s-val">{dream.months} месяцев</span></div>
              <div className="summary-row highlight-row"><span className="s-label">Откладывать в месяц</span><span className="s-val green">{currency}{monthlySaving().toLocaleString()}</span></div>
              <div className="summary-row highlight-row"><span className="s-label">Остаток на расходы</span><span className="s-val">{currency}{(salary - monthlySaving()).toLocaleString()}</span></div>
            </div>
            <button className="next-btn" onClick={finish}>Перейти к Dashboard →</button>
          </div>
        )}
      </div>
    </div>
  );
};
