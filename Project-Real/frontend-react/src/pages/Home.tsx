import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

export const Home = () => {
  const [selectedOption, setSelectedOption] = useState(0);
  const [email, setEmail] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Если пользователь уже авторизован, перенаправить на dashboard
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const goToLogin = () => {
    navigate('/home?modal=login');
  };

  const loginWithGoogle = () => {
    window.location.href = 'http://localhost:8090/auth/login/google-oauth2/';
  };

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            The <em className="highlight">easiest</em> way<br />
            to do your expenses
          </h1>

          <ul className="features">
            <li>
              <div><strong>All inclusive.</strong> AI-powered expenses,Analyze all your expenses.</div>
            </li>
          </ul>

          <div className="want-section">
            <p className="want-label">I want to:</p>
            <div className="want-options">
              <div
                className={`want-card ${selectedOption === 0 ? 'active' : ''}`}
                onClick={() => setSelectedOption(0)}
              >
                <div className={`radio-circle ${selectedOption === 0 ? 'selected' : ''}`}></div>
                <span>Organize my own expenses</span>
              </div>
              <div
                className={`want-card ${selectedOption === 1 ? 'active' : ''}`}
                onClick={() => setSelectedOption(1)}
              >
                <div className={`radio-circle ${selectedOption === 1 ? 'selected' : ''}`}></div>
                <span>Manage expenses for 1-9 employees</span>
              </div>
              <div
                className={`want-card ${selectedOption === 2 ? 'active' : ''}`}
                onClick={() => setSelectedOption(2)}
              >
                <div className={`radio-circle ${selectedOption === 2 ? 'selected' : ''}`}></div>
                <span>Manage expenses for 10+ employees</span>
              </div>
            </div>
          </div>

          <div className="cta-row">
            <input
              type="text"
              className="cta-input"
              placeholder="Enter your email or phone number"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="cta-btn" onClick={goToLogin}>Get started for free</button>
          </div>

          <div className="google-row">
            <span>Or get started with</span>
            <button className="google-icon-btn" onClick={loginWithGoogle}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="hero-visual">
          <img src="/1111.png" alt="Expense Tracker" className="visual-main" />
        </div>
      </section>

      <section className="features-section">
        <h2 className="features-title">Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-header">
              <h3 className="feature-name">Expense management</h3>
            </div>
            <p className="feature-desc">Automatically create, submit, approve, and reimburse expenses. Reports automatically sync with accounting.</p>
          </div>

          <div className="feature-card">
            <div className="feature-header">
              <h3 className="feature-name">File upload</h3>
            </div>
            <p className="feature-desc">we'll scan the information and automatically create an expense.</p>
          </div>

          <div className="feature-card">
            <div className="feature-header">
              <h3 className="feature-name">Receipt  scanning</h3>
            </div>
            <p className="feature-desc">Upload a receipt or take a picture — we'll read the data and create an expense for you.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-col">
            <h4 className="footer-heading">Features</h4>
            <a className="footer-link">Expense Management</a>
            <a className="footer-link">Spend Management</a>
            <a className="footer-link">Expense Reports</a>
            <a className="footer-link">Receipt Scanning</a>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Resources</h4>
            <a className="footer-link">Approved!</a>
            <a className="footer-link">Support</a>
            <a className="footer-link">Help Center</a>
            <a className="footer-link">Terms of Service</a>
            <a className="footer-link">Privacy</a>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Learn more</h4>
            <a className="footer-link">About</a>
            <div className="social-row">
              <a className="social-btn">𝕏</a>
              <a className="social-btn">in</a>
              <a className="social-btn">f</a>
              <a className="social-btn">▶</a>
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Get Started</h4>
            <a className="footer-link" onClick={() => navigate('/home?modal=register')}>Create a new account</a>
            <a className="footer-link" onClick={() => navigate('/home?modal=login')}>Log in</a>
            <p className="footer-copy">2026 Expense Tracker</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
