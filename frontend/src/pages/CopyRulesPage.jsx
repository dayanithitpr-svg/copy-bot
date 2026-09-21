import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Plus,
  RefreshCw,
  Trash2,
  PauseCircle,
  PlayCircle,
  Shield,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { copyRuleService } from '../services/copyRuleService';
import { useToast } from '../hooks/useToast';
import Badge from '../components/common/Badge';
import { SkeletonTable } from '../components/common/Skeleton';
import AddCopyRuleModal from '../components/copyRules/AddCopyRuleModal';

const CopyRulesPage = () => {
  const { success, error: toastError } = useToast();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const items = await copyRuleService.getRules();
      setRules(items || []);
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to fetch copy rules');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggle = async (ruleId) => {
    setTogglingId(ruleId);
    try {
      const updated = await copyRuleService.toggleRule(ruleId);
      setRules((prev) => prev.map((r) => ((r._id || r.id) === ruleId ? updated : r)));
      success(updated.enabled ? 'Copy rule activated' : 'Copy rule paused');
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to toggle copy rule');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Are you sure you want to remove this copy rule?')) return;
    try {
      await copyRuleService.deleteRule(ruleId);
      setRules((prev) => prev.filter((r) => (r._id || r.id) !== ruleId));
      success('Copy rule removed');
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to remove copy rule');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Copy Trading Rules</h2>
            <Badge variant="phase1">Phase 5 Simulation</Badge>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Configure virtual copy-trading allocations and risk limits for monitored trader public wallets
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={fetchRules}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsAddOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            Add Copy Rule
          </button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="card card-body" style={{ background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.05) 0%, rgba(13, 17, 23, 0.95) 100%)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Shield size={22} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          <strong>Zero Financial Risk:</strong> Copy rules drive virtual trade simulations using virtual <strong>Paper USDC</strong>. No real blockchain transactions or private keys are ever used.
        </div>
      </div>

      {/* Rules Table */}
      {loading ? (
        <SkeletonTable rows={4} cols={6} />
      ) : rules.length === 0 ? (
        <div className="card empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Sliders size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 6px 0' }}>No Copy Rules Configured</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 16px auto' }}>
            Add a copy rule to automatically simulate trades in Paper USDC whenever a tracked trader executes an on-chain swap.
          </p>
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} /> Configure First Rule
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Trader</th>
                  <th>Network</th>
                  <th>Status</th>
                  <th>Allocation</th>
                  <th>Trade Limit</th>
                  <th>24h Budget</th>
                  <th>Confidence Filter</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => {
                  const trader = rule.traderId || {};
                  const isEnabled = rule.enabled;
                  const ruleId = rule._id || rule.id;

                  return (
                    <tr key={ruleId} className="table-row-hover">
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {trader.displayName || 'Unknown Trader'}
                        </div>
                        <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {trader.walletAddress ? `${trader.walletAddress.slice(0, 6)}...${trader.walletAddress.slice(-4)}` : '—'}
                        </div>
                      </td>
                      <td>
                        <Badge variant={trader.network?.toLowerCase() || 'ethereum'}>
                          {trader.network || 'ALL'}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={isEnabled ? 'active' : 'idle'}>
                          {isEnabled ? 'ACTIVE' : 'PAUSED'}
                        </Badge>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {rule.allocationMode === 'FIXED_AMOUNT'
                            ? `$${rule.allocationValue} Paper USDC`
                            : `${rule.allocationValue}% of Paper Cash`}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        ${rule.maxTradeAmount || 1000}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        ${rule.maxDailyAmount || 5000}
                      </td>
                      <td>
                        <Badge variant={`confidence-${(rule.minConfidence || 'medium').toLowerCase()}`}>
                          {rule.minConfidence || 'MEDIUM'}+
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggle(ruleId)}
                            disabled={togglingId === ruleId}
                            className="btn-icon"
                            style={{ color: isEnabled ? 'var(--accent-green)' : 'var(--accent-yellow)' }}
                            title={isEnabled ? 'Pause Rule' : 'Resume Rule'}
                          >
                            {isEnabled ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(ruleId)}
                            className="btn-icon"
                            style={{ color: 'var(--accent-red)' }}
                            title="Delete Rule"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Copy Rule Modal */}
      <AddCopyRuleModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onRuleAdded={fetchRules}
      />
    </div>
  );
};

export default CopyRulesPage;
