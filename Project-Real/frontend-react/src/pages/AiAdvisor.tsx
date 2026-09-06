import { useEffect, useRef, useState, type FormEvent } from 'react';
import { aiAdvisorService, expenseService, type AiChatMessage } from '../services/api';
import type { Expense } from '../types';
import { normalizedCategory, readSettings, type StoredSettings } from '../utils/finance';
import { getProfile, getSavedAmount, syncProfileWithSettings, type GoalProfile } from '../utils/goalStorage';
import './AiAdvisor.css';

type Period = 'month' | 'quarter' | 'year';

interface ChatUiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  aiEnabled?: boolean;
  model?: string;
}

const createChatId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const starterPrompts = [
  'Проанализируй мои расходы и скажи честно, что улучшить',
  'Составь бюджет на следующий месяц',
  'Какие траты мне сократить первыми?',
  'Помоги накопить на цель быстрее',
  'Объясни простыми словами, как вести личные финансы',
];

export const AiAdvisor = () => {
  const [activePeriod, setActivePeriod] = useState<Period>('month');
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [settings] = useState<StoredSettings | null>(() => readSettings());
  const [goalProfile] = useState<GoalProfile | null>(() => syncProfileWithSettings() || getProfile());
  const [savedAmount] = useState(() => getSavedAmount());
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatSuggestions, setChatSuggestions] = useState(starterPrompts);
  const [chatMessages, setChatMessages] = useState<ChatUiMessage[]>(() => [
    {
      id: createChatId(),
      role: 'assistant',
      content: 'Привет. Я AI Advisor. Можешь писать обычным языком: про расходы, бюджет, цель, учёбу, работу или план действий. Если подключён OpenAI API key, я отвечаю как настоящий AI и использую твои данные из приложения как контекст.',
      model: 'advisor',
    },
  ]);
  const messagesRef = useRef<HTMLDivElement>(null);
  const pendingRequestsRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loadExpenses = async () => {
        try {
          const response = await expenseService.getAll();
          setAllExpenses(Array.isArray(response.data) ? response.data : []);
        } catch {
          setAllExpenses([]);
        }
      };

      void loadExpenses();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [chatMessages, chatLoading]);

  const currency = () => settings?.form?.currency || goalProfile?.currency || '₸';
  const monthlySalary = () => Number(settings?.form?.salary || goalProfile?.salary || 0);

  const currentRange = () => {
    const now = new Date();
    if (activePeriod === 'month') {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    }
    if (activePeriod === 'quarter') {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarterStart, 1),
        end: new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59, 999),
      };
    }
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  };

  const periodExpenses = () => {
    const range = currentRange();
    return allExpenses.filter((expense) => {
      const date = new Date(expense.date);
      return date >= range.start && date <= range.end;
    });
  };

  const totalSpent = () => periodExpenses().reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const monthlyBudgetLeft = () => Math.max(monthlySalary() - totalSpent(), 0);
  const topCategories = () => {
    const grouped: Record<string, { total: number; count: number }> = {};
    periodExpenses().forEach((expense) => {
      const category = normalizedCategory(expense);
      if (!grouped[category]) grouped[category] = { total: 0, count: 0 };
      grouped[category].total += Number(expense.amount || 0);
      grouped[category].count += 1;
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, total: Math.round(value.total), count: value.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };
  const strongestCategory = () => topCategories()[0]?.name || 'No data yet';
  const goalProgress = () => {
    const target = goalProfile?.dream?.amount || 0;
    if (!target) return 0;
    return Math.min(100, Math.round((savedAmount / target) * 100));
  };
  const budgetStatus = () => {
    const salary = monthlySalary();
    if (!salary) return 'Add salary in Settings for better answers';
    const used = Math.round((totalSpent() / salary) * 100);
    if (used <= 50) return 'Healthy spending pace';
    if (used <= 75) return 'Watch flexible expenses';
    if (used <= 100) return 'Budget is tight';
    return 'Spending is above income';
  };
  const chatHistory = (messages: ChatUiMessage[]): AiChatMessage[] =>
    messages
      .filter((message) => message.content.trim())
      .slice(-12)
      .map((message) => ({ role: message.role, content: message.content }));

  const sendChatMessage = async (promptOverride?: string) => {
    const prompt = (promptOverride || chatInput).trim();
    if (!prompt) return;

    const userMessage: ChatUiMessage = {
      id: createChatId(),
      role: 'user',
      content: prompt,
    };
    const requestHistory = chatHistory([...chatMessages, userMessage]);
    setChatMessages((currentMessages) => [...currentMessages, userMessage]);
    setChatInput('');
    setChatError('');
    pendingRequestsRef.current += 1;
    setChatLoading(true);

    try {
      const response = await aiAdvisorService.chat(prompt, requestHistory);
      const data = response.data;
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createChatId(),
          role: 'assistant',
          content: data.reply,
          aiEnabled: data.aiEnabled,
          model: data.model,
        },
      ]);
      if (data.suggestions?.length) setChatSuggestions(data.suggestions);
    } catch {
      setChatError('Backend is not answering or took too long. Restart Spring Boot and try again.');
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createChatId(),
          role: 'assistant',
          content: 'Я не смог получить ответ от backend. Проверь, что Spring Boot запущен на 8090. Если подключён OpenAI ключ, запрос мог занять слишком долго, но чат не заблокирован и можно писать дальше.',
          aiEnabled: false,
          model: 'offline',
        },
      ]);
    } finally {
      pendingRequestsRef.current = Math.max(0, pendingRequestsRef.current - 1);
      setChatLoading(pendingRequestsRef.current > 0);
    }
  };

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendChatMessage();
  };

  const latestAssistant = [...chatMessages].reverse().find((message) => message.role === 'assistant');
  const aiStatus = latestAssistant?.aiEnabled === false ? 'Fallback mode' : latestAssistant?.aiEnabled === true ? 'OpenAI mode' : 'Ready';

  return (
    <div className="advisor-page advisor-chat-only">
      <main className="advisor-shell">
        <section className="advisor-chat-app">
          <div className="chat-app-header">
            <div>
              <span className="chat-kicker">AI Advisor</span>
              <h1>Ask anything. Get a useful plan.</h1>
              <p>Real chat assistant for spending, saving, budgeting, goals, and everyday decisions.</p>
            </div>
            <div className={`chat-status-pill ${latestAssistant?.aiEnabled === false ? 'fallback' : ''}`}>
              <span className="status-dot" />
              <span>{aiStatus}</span>
            </div>
          </div>

          <div className="chat-body">
            <div className="chat-main">
              <div className="message-list" ref={messagesRef}>
                {chatMessages.map((message) => (
                  <div key={message.id} className={`chat-message ${message.role}`}>
                    <div className="message-bubble">
                      <span className="message-role">{message.role === 'assistant' ? 'AI Advisor' : 'You'}</span>
                      <p>{message.content}</p>
                      {message.role === 'assistant' && message.model && (
                        <span className="message-model">{message.aiEnabled === false ? 'local fallback' : message.model}</span>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-message assistant">
                    <div className="message-bubble typing-bubble">
                      <span className="message-role">AI Advisor</span>
                      <div className="typing-dots"><span></span><span></span><span></span></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="suggestion-strip">
                {chatSuggestions.slice(0, 4).map((prompt) => (
                  <button type="button" key={prompt} onClick={() => void sendChatMessage(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>

              <form className="chat-composer" onSubmit={handleChatSubmit}>
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Напиши вопрос как в обычном чате..."
                />
                <button type="submit" disabled={!chatInput.trim()}>
                  Send
                </button>
              </form>
              {chatError && <div className="chat-error">{chatError}</div>}
            </div>

            <aside className="advisor-context-panel">
              <div className="context-card status-card">
                <h2>Context</h2>
                <p>{budgetStatus()}</p>
              </div>

              <div className="context-card">
                <div className="period-switch">
                  {(['month', 'quarter', 'year'] as Period[]).map((period) => (
                    <button
                      key={period}
                      type="button"
                      className={activePeriod === period ? 'active' : ''}
                      onClick={() => setActivePeriod(period)}
                    >
                      {period}
                    </button>
                  ))}
                </div>
                <div className="context-row"><span>Spent</span><strong>{currency()}{totalSpent().toLocaleString()}</strong></div>
                <div className="context-row"><span>Free budget</span><strong>{currency()}{monthlyBudgetLeft().toLocaleString()}</strong></div>
                <div className="context-row"><span>Transactions</span><strong>{periodExpenses().length}</strong></div>
                <div className="context-row"><span>Top category</span><strong>{strongestCategory()}</strong></div>
              </div>

              <div className="context-card">
                <h2>Top categories</h2>
                <div className="compact-category-list">
                  {topCategories().length ? topCategories().map((category) => (
                    <div key={category.name} className="compact-category">
                      <div>
                        <strong>{category.name}</strong>
                        <small>{category.count} transactions</small>
                      </div>
                      <b>{currency()}{category.total.toLocaleString()}</b>
                    </div>
                  )) : <p className="empty-context">No expenses in this period yet.</p>}
                </div>
              </div>

              <div className="context-card">
                <h2>Goal</h2>
                {goalProfile ? (
                  <>
                    <div className="context-row"><span>{goalProfile.dream.label}</span><strong>{goalProgress()}%</strong></div>
                    <div className="goal-meter"><span style={{ width: `${goalProgress()}%` }} /></div>
                    <p className="context-note">AI uses this goal when you ask about saving plans.</p>
                  </>
                ) : (
                  <p className="empty-context">Create a goal to get more personal saving advice.</p>
                )}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
};
