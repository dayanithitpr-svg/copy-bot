import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  Sliders,
  Wallet,
  Radio,
  Settings,
  Shield,
  Layers,
  Cpu,
  Zap,
  Server,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Badge from '../common/Badge';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/traders', label: 'Tracked Traders', icon: Users },
    { path: '/activity', label: 'Activity Explorer', icon: Activity },
    { path: '/copy-rules', label: 'Copy Rules', icon: Sliders, badge: 'Phase 5' },
    { path: '/risk-management', label: 'Risk Controls', icon: Shield, badge: 'Phase 6' },
    { path: '/copy-trading', label: 'Copy Engine', icon: Cpu, badge: 'Phase 7' },
    { path: '/execution', label: 'Testnet Execution', icon: Zap, badge: 'Phase 8' },
    { path: '/operations', label: 'System Operations', icon: Server, badge: 'Phase 9' },
    { path: '/paper-trading', label: 'Paper Trading', icon: Wallet, badge: 'Simulated' },
    { path: '/monitoring', label: 'Monitoring Engine', icon: Radio, badge: 'Live' },
    { path: '/settings', label: 'Settings & Security', icon: Settings },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="sidebar-logo-icon">
            <Layers size={22} color="#00f2fe" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="sidebar-logo-text">CryptoCopy</span>
            <span className="sidebar-subtitle">ON-CHAIN INTELLIGENCE</span>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close sidebar navigation"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div style={{ padding: '0 8px 8px 8px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
          MAIN MENU
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: item.badge === 'Simulated' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 242, 254, 0.15)',
                    color: item.badge === 'Simulated' ? 'var(--accent-green)' : 'var(--accent-cyan)',
                    fontWeight: 600,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer User Info */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar-circle">
            {(user?.profile?.displayName || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {user?.profile?.displayName || user?.email?.split('@')[0]}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Badge variant={user?.role === 'ADMIN' ? 'admin' : 'user'}>
                {user?.role || 'USER'}
              </Badge>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Phase 9 Prod</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
