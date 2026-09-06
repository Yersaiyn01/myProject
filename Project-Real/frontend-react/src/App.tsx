import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginModal } from './components/LoginModal';
import { RegisterModal } from './components/RegisterModal';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { Goal } from './pages/Goal';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { Reports } from './pages/Reports';
import { AiAdvisor } from './pages/AiAdvisor';
import { Onboarding } from './pages/Onboarding';
import { BoardAdmin } from './pages/BoardAdmin';
import { BoardModerator } from './pages/BoardModerator';
import { BoardUser } from './pages/BoardUser';
import './App.css';

const AppContent = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const modal = new URLSearchParams(location.search).get('modal');
  const showLogin = modal === 'login';
  const showRegister = modal === 'register';

  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  const closeLoginModal = () => {
    navigate('/home');
  };

  const closeRegisterModal = () => {
    navigate('/home');
  };

  const isLoggedIn = !!user;

  return (
    <div className="app">
      <nav className="custom-navbar">
        <div className="navbar-brand" onClick={() => navigate('/home')}>
          <img src="/ExpenseTracker.png" className="logo" alt="logo" />
          <span className="brand-text">expense-tracker</span>
        </div>

        {isLoggedIn && (
          <ul className="nav-center">
            <li><button onClick={() => navigate('/dashboard')} className={`nav-link ${location.pathname === '/dashboard' ? 'active-link' : ''}`}>Dashboard</button></li>
            <li><button onClick={() => navigate('/reports')} className={`nav-link ${location.pathname === '/reports' ? 'active-link' : ''}`}>Reports</button></li>
            <li><button onClick={() => navigate('/analytics')} className={`nav-link ${location.pathname === '/analytics' ? 'active-link' : ''}`}>Analytics</button></li>
            <li><button onClick={() => navigate('/goal')} className={`nav-link ${location.pathname === '/goal' ? 'active-link' : ''}`}>Goal</button></li>
            <li><button onClick={() => navigate('/settings')} className={`nav-link ${location.pathname === '/settings' ? 'active-link' : ''}`}>Settings</button></li>
            <li><button onClick={() => navigate('/ai-advisor')} className={`nav-link ${location.pathname === '/ai-advisor' ? 'active-link' : ''}`}>AI Advisor</button></li>
          </ul>
        )}

        <ul className="nav-right">
          {isLoggedIn ? (
            <>
              <li><button onClick={() => navigate('/profile')} className="user-btn">Profile</button></li>
              <li><button onClick={handleLogout} className="logout-btn">Logout</button></li>
            </>
          ) : (
            <>
              <li><button onClick={() => navigate('/home?modal=login')} className="auth-btn login-btn">Sign In</button></li>
              <li><button onClick={() => navigate('/home?modal=register')} className="auth-btn register-btn">Register</button></li>
            </>
          )}
        </ul>
      </nav>

      {showLogin && <LoginModal onClose={closeLoginModal} />}
      {showRegister && <RegisterModal onClose={closeRegisterModal} />}

      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/user" element={<ProtectedRoute><BoardUser /></ProtectedRoute>} />
        <Route path="/mod" element={<ProtectedRoute><BoardModerator /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><BoardAdmin /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/ai-advisor" element={<ProtectedRoute><AiAdvisor /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/goal" element={<ProtectedRoute><Goal /></ProtectedRoute>} />
      </Routes>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
