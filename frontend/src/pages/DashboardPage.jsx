import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Activity,
  Radio,
  Plus,
  ArrowRight,
  Clock,
  ExternalLink,
  CheckCircle2,
  ShieldAlert,
  Copy,
  Cpu
} from 'lucide-react';
import { traderService } from '../services/traderService';
import { healthService } from '../services/healthService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import Badge from '../components/common/Badge';
import { SkeletonCard, SkeletonTable } from '../components/common/Skeleton';
import { StatusDot } from '../components/common/StatusDot';
import ActivityDetailsModal from '../components/activity/ActivityDetailsModal';

const DashboardPage = () => {
  const { user } = useAuth();
  const { success } = useToast();
  const [traders, setTraders] = useState([]);
  const [activities, setActivities] = useState([]);
  const [health, setHealth] = useState(null);
  const [totalActivities, setTotalActivities] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchDashboard = async () => {
      try {
        const [tradersRes, actRes, healthData] = await Promise.all([
          traderService.getTraders().catch(() => ({ data: { traders: [] } })),
          traderService.getAllActivities({ limit: 6 }).catch(() => ({ data: { activities: [], pagination: { total: 0 } } })),
          healthService.getHealth().catch(() => ({ status: 'unknown' })),
        ]);

        if (mounted) {
          setTraders(tradersRes.data?.traders || []);
          setActivities(actRes.data?.activities || []);
          setTotalActivities(actRes.data?.pagination?.total || (actRes.data?.activities || []).length);
          setHealth(healthData);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const activeTraders = traders.filter((t) => t.isTracking);
  const isHealthy = health?.status === 'ok' || health?.status === 'healthy';
  const isMonitoring = health?.monitoring?.status === 'running' || health?.monitoring?.enabled;

  const handleCopy = (e, text, label) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    success(`Copied ${label} to clipboard!`);
  };

  const formatShortAddress = (addr) => {
    if (!addr) return 'N/A';
    if (addr.length <= 12) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div className="card" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.05) 0%, rgba(13, 17, 23, 0.95) 100%)', border: '1px solid var(--border-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
              Welcome back, {user?.profile?.displayName || user?.email?.split('@')[0]}
            </h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Real-time multi-chain wallet monitoring and read-only on-chain intelligence hub.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/traders" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontSize: '0.85rem' }}>
              <Plus size={16} /> Add Tracked Trader
            </Link>
            <Link to="/activity" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontSize: '0.85rem' }}>
              <Activity size={16} /> Activity Explorer
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {/* Tracked Traders */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Tracked Traders
              </span>
              <Users size={16} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>
              {traders.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {activeTraders.length} active · {traders.length - activeTraders.length} paused
            </div>
          </div>

          {/* Active Monitors */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Active Monitored Wallets
              </span>
              <Radio size={16} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--accent-cyan)' }}>
              {activeTraders.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Polling EVM & Solana nodes
            </div>
          </div>

          {/* On-Chain Events */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Recorded On-Chain Events
              </span>
              <Activity size={16} color="var(--accent-green)" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>
              {totalActivities}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Normalized transactions & transfers
            </div>
          </div>

          {/* Monitoring Engine */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Monitoring Engine
              </span>
              <StatusDot status={isMonitoring ? 'active' : 'idle'} showLabel={false} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: isMonitoring ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
              {isMonitoring ? 'RUNNING' : 'STANDBY'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              30s loop interval · Overlap protected
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Tracked Traders & Activity Streams */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        {/* Tracked Traders Summary Card */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Tracked Traders</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Configured public wallets
              </p>
            </div>
            <Link to="/traders" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Manage All <ArrowRight size={13} />
            </Link>
          </div>

          <div className="card-body" style={{ padding: '16px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : traders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <Users size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>No traders registered yet.</p>
                <Link to="/traders" className="btn btn-primary" style={{ fontSize: '0.8rem', textDecoration: 'none' }}>
                  Add First Trader
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {traders.slice(0, 5).map((trader) => (
                  <div
                    key={trader._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-card-hover)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Badge variant={trader.network?.toLowerCase()}>{trader.network}</Badge>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{trader.displayName}</div>
                        <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatShortAddress(trader.walletAddress)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge variant={trader.isTracking ? 'active' : 'idle'}>
                        {trader.isTracking ? 'TRACKING' : 'PAUSED'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent On-Chain Activity Stream */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Recent On-Chain Activity</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Live read-only transaction stream
              </p>
            </div>
            <Link to="/activity" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Full Explorer <ArrowRight size={13} />
            </Link>
          </div>

          <div className="card-body" style={{ padding: '16px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <Activity size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}>No events detected yet.</p>
                <p style={{ margin: 0, fontSize: '0.78rem' }}>Events will appear as the background scheduler discovers new blocks.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activities.slice(0, 5).map((act) => (
                  <div
                    key={act._id || act.transactionHash}
                    onClick={() => setSelectedActivity(act)}
                    className="table-row-hover"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-card-hover)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Badge variant={act.activityType?.toLowerCase()}>
                        {act.activityType || 'TRANSACTION'}
                      </Badge>
                      <div>
                        <div className="mono-text" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {formatShortAddress(act.transactionHash)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {act.network} · {formatTimestamp(act.blockTimestamp || act.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {act.amount ? `${act.amount} ${act.tokenSymbol || ''}` : '0.00'}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Inspect →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Architectural Guarantee Banner */}
      <div className="card card-body" style={{ background: 'var(--bg-surface)' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} color="var(--accent-cyan)" />
          Phase 1–3 Zero-Execution Security Notice
        </h4>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          CryptoCopy operates purely in <strong>Read-Only Monitoring Mode</strong>. The platform never requests, holds, or processes private keys or seed phrases. No trade execution, DEX swaps, or asset movements are performed in this phase.
        </p>
      </div>

      {/* Activity Details Modal */}
      {selectedActivity && (
        <ActivityDetailsModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
