import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, ShieldCheck, ArrowRight, Check, X, Eye, EyeOff } from 'lucide-react';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [validationDetails, setValidationDetails] = useState([]);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Password requirements checker
  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'One number (0-9)', met: /[0-9]/.test(password) },
    { label: 'One special character (!@#$...)', met: /[\W_]/.test(password) },
  ];

  const allRequirementsMet = requirements.every((r) => r.met);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setValidationDetails([]);

    const result = await register({ email, password, displayName });
    setIsSubmitting(false);

    if (result?.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setErrorMessage(result?.message || 'Registration failed. Please review the inputs.');
      setValidationDetails(result?.details || []);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide-up" style={{ maxWidth: '460px' }}>
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
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">CryptoCopy On-Chain Intelligence Platform</p>
        </div>

        {errorMessage && <Alert type="error" message={errorMessage} details={validationDetails} />}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Display Name / Alias"
            id="reg-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. SatoshiAlpha"
            autoComplete="nickname"
          />

          <Input
            label="Email Address *"
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="trader@example.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password *"
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
            required
            autoComplete="new-password"
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

          {/* Password Requirements */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.04em' }}>
              PASSWORD REQUIREMENTS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {requirements.map((req, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.75rem',
                    color: req.met ? 'var(--accent-green)' : 'var(--text-muted)',
                  }}
                >
                  {req.met ? <Check size={12} /> : <X size={12} />}
                  <span>{req.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={!allRequirementsMet}
              style={{ width: '100%' }}
              icon={<ArrowRight size={18} />}
            >
              Register & Start Monitoring
            </Button>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent-cyan)', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
