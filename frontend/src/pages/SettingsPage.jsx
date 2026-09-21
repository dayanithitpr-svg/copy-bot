import React, { useState } from 'react';
import { Shield, Key, Lock, User as UserIcon, CheckCircle2, Server, Power, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Alert from '../components/common/Alert';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SettingsPage = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.profile?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const response = await api.put('/users/profile', { displayName });
      if (response.data?.success) {
        setFeedback({ type: 'success', message: 'Profile updated successfully!' });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update profile'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 840 }}>
      {feedback && <Alert type={feedback.type} message={feedback.message} />}

      {/* Operations Quick Link Card */}
      <Card
        title="Production Safety & Operations Control"
        subtitle="Phase 9 emergency kill switch, live health telemetry, and immutable audit logs"
        style={{ marginBottom: 24 }}
        action={
          <Link to="/operations">
            <Button variant="primary" size="small">
              <span>Open Operations Console</span>
              <ArrowRight size={14} />
            </Button>
          </Link>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EXECUTION MODES</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-green)', marginTop: 2 }}>
              PAPER & TESTNET ACTIVE
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MAINNET DEFENSE GATE</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ef4444', marginTop: 2 }}>
              STRICTLY BLOCKED
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AUDIT LOGGING</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-cyan)', marginTop: 2 }}>
              IMMUTABLE & ACTIVE
            </div>
          </div>
        </div>
      </Card>

      {/* User Account Details */}
      <Card title="Account Profile" subtitle="Your account credentials and role on the platform" className="mb-4" style={{ marginBottom: 24 }}>
        <form onSubmit={handleUpdateProfile}>
          <Input
            label="Email Address"
            value={user?.email || ''}
            disabled
            placeholder="your-email@example.com"
          />

          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Trader Alias"
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Assigned Role:</span>
            <Badge variant={user?.role === 'ADMIN' ? 'admin' : 'user'}>
              {user?.role || 'USER'}
            </Badge>
          </div>

          <div style={{ marginTop: 20 }}>
            <Button type="submit" isLoading={isSaving}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Security Architecture Information */}
      <Card title="Security & Wallet Architecture" subtitle="How this platform safeguards your information" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Shield size={20} style={{ color: 'var(--accent-emerald)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Zero Private Key Storage Guarantee</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 2 }}>
                This platform NEVER requests, requires, or stores user private keys or seed phrases in MongoDB or client storage.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Lock size={20} style={{ color: 'var(--accent-cyan)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Argon2id Password Hashing</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 2 }}>
                Your password is protected with modern memory-hard Argon2id encryption with per-user cryptographic salts. Plaintext passwords never touch database storage.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Key size={20} style={{ color: 'var(--accent-purple)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Short-Lived JWT & Automatic Refresh Rotation</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 2 }}>
                Sessions are secured via 15-minute access tokens and single-use refresh token rotation in HttpOnly, SameSite cookies to protect against token reuse and XSS vulnerabilities.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
