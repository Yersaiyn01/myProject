import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginModal = ({ onClose }: { onClose: () => void }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [selectedMethod, setSelectedMethod] = useState<'email' | null>(null);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      onClose();
    } catch {
      setError('Login failed');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="logo-text">Expense-tracker</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <h2 className="modal-title">Welcome back! How would you like to sign in?</h2>

        <button className="option-btn" onClick={() => setSelectedMethod('email')}>
          <span>Log-in</span>
          <span className="arrow">›</span>
        </button>

        {selectedMethod && (
          <form name="form" onSubmit={handleSubmit} className="inline-form" noValidate>
            <input
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="form-control"
            />
            <input
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              className="form-control"
            />
            <button type="submit" className="submit-btn">Sign In ›</button>
            {error && <div className="alert-warning">Login failed: {error}</div>}
          </form>
        )}

        <div className="divider">
          <button
            type="button"
            className="icon-btn apple-btn"
            onClick={() => { window.location.href =  'https://myproject-2y95.onrender.com/api'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn google-btn"
            onClick={() => { window.location.href = 'https://myproject-2y95.onrender.com/api/test'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </button>
        </div>

        <p className="terms-text">
          By logging in, you agree to our <a href="#">terms of service</a> and <a href="#">privacy policy</a>.
        </p>
      </div>
    </div>
  );
};
