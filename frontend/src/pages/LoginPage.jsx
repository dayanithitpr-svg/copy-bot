import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Layers, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [validationDetails, setValidationDetails] = useState([]);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setValidationDetails([]);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (result?.success) {
      navigate(from, { replace: true });
    } else {
      setErrorMessage(result?.message || 'Authentication failed. Please verify credentials.');
      setValidationDetails(result?.details || []);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide-up">
        {/* Brand Header */}
        <div className="auth-header">
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(79, 172, 254, 0.1) 100%)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(0, 242, 254, 0.15)',
            }}
          >
            <Layers size={28} color="#00f2fe" />
          </div>
          <h2 className="auth-title">CryptoCopy</h2>
          <p className="auth-subtitle">On-Chain Intelligence & Wallet Monitoring</p>
        </div>

        {errorMessage && <Alert type="error" message={errorMessage} details={validationDetails} />}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Email Address"
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
            autoComplete="current-password"
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="btn-icon"
                style={{ color: 'var(--text-muted)' }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <div style={{ marginTop: '10px' }}>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              style={{ width: '100%' }}
              icon={<ArrowRight size={18} />}
            >
              Sign In
            </Button>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent-cyan)', fontWeight: 600, textDecoration: 'none' }}>
              Create Account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
