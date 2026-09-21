import React, { useState, useEffect } from 'react';
import { Menu, Bell, LogOut, ShieldCheck, Wifi, Activity, Cpu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { healthService } from '../../services/healthService';
import Button from '../common/Button';
import { StatusDot } from '../common/StatusDot';

const Topbar = ({ title = 'Dashboard', onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchHealth = async () => {
      try {
        const data = await healthService.getHealth();
        if (mounted) {
          setHealth(data);
          setLoadingHealth(false);
        }
      } catch (err) {
        if (mounted) {
          setHealth({ status: 'error' });
          setLoadingHealth(false);
        }
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const isHealthy = health?.status === 'ok' || health?.status === 'healthy';
  const isMonitoring = health?.monitoring?.status === 'running' || health?.monitoring?.enabled;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-right">
        {/* Backend & Monitoring Status Indicator */}
        <div className="status-pill" title={`API: ${isHealthy ? 'Online' : 'Offline'} | Database: ${health?.database || 'Unknown'} | Monitoring: ${isMonitoring ? 'Active' : 'Standby'}`}>
          <StatusDot
            status={isHealthy ? 'active' : 'error'}
            showLabel={false}
            pulse={isHealthy}
          />
          <span style={{ fontWeight: 500 }}>
            {loadingHealth ? 'Connecting...' : isHealthy ? 'API Connected' : 'Offline'}
          </span>
          {isMonitoring && (
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'rgba(0, 242, 254, 0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>
              Monitoring Active
            </span>
          )}
        </div>

        {/* Logout Button */}
        <Button
          variant="secondary"
          onClick={logout}
          icon={<LogOut size={16} />}
          style={{ padding: '7px 12px', fontSize: '0.85rem' }}
        >
          Sign Out
        </Button>
      </div>
    </header>
  );
};

export default Topbar;
