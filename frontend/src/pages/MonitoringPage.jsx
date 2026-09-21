import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Cpu,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Database,
  Layers,
  ArrowRight
} from 'lucide-react';
import { healthService } from '../services/healthService';
import { traderService } from '../services/traderService';
import { useToast } from '../hooks/useToast';
import Badge from '../components/common/Badge';
import { SkeletonCard, SkeletonTable } from '../components/common/Skeleton';
import { StatusDot } from '../components/common/StatusDot';

const MonitoringPage = () => {
  const { success, error: toastError, info } = useToast();
  const [health, setHealth] = useState(null);
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthData, tradersRes] = await Promise.all([
        healthService.getHealth(),
        traderService.getTraders(),
      ]);
      setHealth(healthData);
      setTraders(tradersRes.data?.traders || []);
    } catch (err) {
      toastError('Failed to fetch monitoring status or checkpoints');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSyncSingle = async (traderId, displayName) => {
    setSyncingId(traderId);
    try {
      const res = await traderService.syncTrader(traderId);
      success(`Sync cycle completed for ${displayName}. ${res.data?.newActivitiesCount || 0} new activities logged.`);
      fetchData();
    } catch (err) {
      toastError(err.response?.data?.message || `Failed to sync trader ${displayName}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    info('Triggering manual blockchain sync for all active wallets...');
    try {
      const activeTraders = traders.filter((t) => t.isTracking);
      let totalNew = 0;
      for (const t of activeTraders) {
        try {
          const res = await traderService.syncTrader(t._id);
          totalNew += res.data?.newActivitiesCount || 0;
        } catch (e) {
          // ignore single failure in batch
        }
      }
      success(`Batch sync finished: ${totalNew} new events captured across ${activeTraders.length} wallets.`);
      fetchData();
    } catch (err) {
      toastError('Error during batch sync');
    } finally {
      setSyncingAll(false);
    }
  };

  const activeTraders = traders.filter((t) => t.isTracking);
  const isHealthy = health?.status === 'ok' || health?.status === 'healthy';
  const isMonitoringRunning = health?.monitoring?.status === 'running' || health?.monitoring?.enabled;

  const formatShortAddress = (addr) => {
    if (!addr) return 'N/A';
    if (addr.length <= 12) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Monitoring Engine</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Multi-chain polling coordinator & read-only block checkpoint tracker
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={fetchData}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSyncAll}
            disabled={syncingAll || activeTraders.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Cpu size={15} className={syncingAll ? 'animate-spin' : ''} />
            {syncingAll ? 'Syncing All...' : 'Trigger Sync Now'}
          </button>
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
          {/* Scheduler Status */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Engine Status
              </span>
              <StatusDot status={isMonitoringRunning ? 'active' : 'idle'} showLabel={false} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '8px 0 4px 0', color: isMonitoringRunning ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
              {isMonitoringRunning ? 'RUNNING' : 'STANDBY'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Cycle interval: {health?.monitoring?.intervalMs ? `${health.monitoring.intervalMs / 1000}s` : '30s'}
            </div>
          </div>

          {/* Active Monitors */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Monitored Wallets
              </span>
              <Radio size={16} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>
              {activeTraders.length} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {traders.length} Total</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {activeTraders.length > 0 ? 'Active polling registered' : 'No active wallets to monitor'}
            </div>
          </div>

          {/* Database & RPC Health */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Database Health
              </span>
              <Database size={16} color={isHealthy ? 'var(--accent-green)' : 'var(--accent-red)'} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '8px 0 4px 0', color: isHealthy ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {health?.database === 'connected' ? 'CONNECTED' : isHealthy ? 'ONLINE' : 'DEGRADED'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              MongoDB @ 127.0.0.1:27017
            </div>
          </div>

          {/* Supported Adapters */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Blockchain Adapters
              </span>
              <Layers size={16} color="var(--accent-cyan)" />
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
              <Badge variant="ethereum">Ethereum</Badge>
              <Badge variant="base">Base</Badge>
              <Badge variant="polygon">Polygon</Badge>
              <Badge variant="solana">Solana</Badge>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              EVM (Ethers.js v6) + Solana Web3
            </div>
          </div>
        </div>
      )}

      {/* Checkpoints Status Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Wallet Checkpoint Registry</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Idempotent block numbers and signature tracking prevents missed or duplicate events
            </p>
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={4} cols={5} />
        ) : traders.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No traders added yet. Add a trader from the Tracked Traders page to start monitoring.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Trader / Wallet</th>
                  <th>Network</th>
                  <th>Monitoring Status</th>
                  <th>Last Sync Time</th>
                  <th>Last Processed Checkpoint</th>
                  <th style={{ textAlign: 'right' }}>Manual Action</th>
                </tr>
              </thead>
              <tbody>
                {traders.map((trader) => (
                  <tr key={trader._id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {trader.displayName}
                        </div>
                        <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatShortAddress(trader.walletAddress)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant={trader.network?.toLowerCase()}>{trader.network}</Badge>
                    </td>
                    <td>
                      <Badge variant={trader.isTracking ? 'active' : 'idle'}>
                        {trader.isTracking ? 'ACTIVE' : 'PAUSED'}
                      </Badge>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {trader.lastSyncedAt
                        ? new Date(trader.lastSyncedAt).toLocaleString()
                        : 'Pending first cycle'}
                    </td>
                    <td>
                      <div className="mono-text" style={{ fontSize: '0.8rem' }}>
                        {trader.lastCheckedBlock
                          ? `#${trader.lastCheckedBlock}`
                          : trader.lastSignature
                          ? `Sig: ${formatShortAddress(trader.lastSignature)}`
                          : 'Genesis (0)'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        disabled={!trader.isTracking || syncingId === trader._id}
                        onClick={() => handleSyncSingle(trader._id, trader.displayName)}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <RefreshCw size={12} className={syncingId === trader._id ? 'animate-spin' : ''} />
                        {syncingId === trader._id ? 'Syncing...' : 'Sync Wallet'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringPage;
