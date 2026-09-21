import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Save,
  Info,
  Layers,
  Flame,
  Activity,
  Filter
} from 'lucide-react';
import { riskService } from '../services/riskService';
import { useToast } from '../hooks/useToast';
import Badge from '../components/common/Badge';
import { SkeletonTable } from '../components/common/Skeleton';

const ALL_NETWORKS = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'base', name: 'Base' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'solana', name: 'Solana' }
];

const RiskManagementPage = () => {
  const { success, error: toastError } = useToast();

  // Config State
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    enabled: true,
    maxTradeExposure: 1000,
    maxDailyExposure: 3000,
    maxPortfolioExposure: 40,
    maxTraderAllocation: 30,
    maxTokenAllocation: 25,
    maxOpenPositions: 10,
    minConfidence: 'MEDIUM',
    allowedNetworks: ['ethereum', 'base', 'polygon', 'solana'],
    blockedTokensStr: ''
  });

  // Audit History State
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [filterDecision, setFilterDecision] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedEval, setSelectedEval] = useState(null);

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const data = await riskService.getRiskConfig();
      if (data) {
        setConfig(data);
        setFormData({
          enabled: data.enabled ?? true,
          maxTradeExposure: data.maxTradeExposure ?? 1000,
          maxDailyExposure: data.maxDailyExposure ?? 3000,
          maxPortfolioExposure: data.maxPortfolioExposure ?? 40,
          maxTraderAllocation: data.maxTraderAllocation ?? 30,
          maxTokenAllocation: data.maxTokenAllocation ?? 25,
          maxOpenPositions: data.maxOpenPositions ?? 10,
          minConfidence: data.minConfidence || 'MEDIUM',
          allowedNetworks: data.allowedNetworks || ['ethereum', 'base', 'polygon', 'solana'],
          blockedTokensStr: (data.blockedTokens || []).join('\n')
        });
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to load risk configuration');
    } finally {
      setLoadingConfig(false);
    }
  }, [toastError]);

  const fetchHistory = useCallback(async (page = 1, decision = '') => {
    setLoadingHistory(true);
    try {
      const filters = {};
      if (decision) filters.decision = decision;
      const res = await riskService.getRiskHistory(filters, page, 10);
      setHistory(res?.data || []);
      setHistoryTotal(res?.pagination?.total || 0);
      setHistoryPage(res?.pagination?.page || 1);
      setHistoryPages(res?.pagination?.pages || 1);
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to fetch risk history');
    } finally {
      setLoadingHistory(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchConfig();
    fetchHistory(1, filterDecision);
  }, [fetchConfig, fetchHistory, filterDecision]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const blockedTokens = formData.blockedTokensStr
        .split('\n')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const payload = {
        enabled: formData.enabled,
        maxTradeExposure: Number(formData.maxTradeExposure),
        maxDailyExposure: Number(formData.maxDailyExposure),
        maxPortfolioExposure: Number(formData.maxPortfolioExposure),
        maxTraderAllocation: Number(formData.maxTraderAllocation),
        maxTokenAllocation: Number(formData.maxTokenAllocation),
        maxOpenPositions: Number(formData.maxOpenPositions),
        minConfidence: formData.minConfidence,
        allowedNetworks: formData.allowedNetworks,
        blockedTokens
      };

      const updated = await riskService.updateRiskConfig(payload);
      setConfig(updated);
      success('Risk limits updated successfully');
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to update risk configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleNetworkToggle = (netId) => {
    setFormData((prev) => {
      const current = prev.allowedNetworks || [];
      const updated = current.includes(netId)
        ? current.filter((n) => n !== netId)
        : [...current, netId];
      return { ...prev, allowedNetworks: updated };
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Risk Management Engine</h2>
            <Badge variant="phase1">Phase 6 Active</Badge>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Centralized deterministic risk evaluation before simulated paper executions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { fetchConfig(); fetchHistory(1, filterDecision); }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loadingConfig || loadingHistory ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Observational Simulation Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <ShieldAlert size={22} color="#818cf8" />
        </div>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            PRE-EXECUTION RISK EVALUATION — SIMULATION ENVIRONMENT
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
            The Risk Engine intercepts all copy decisions from CopyRuleEngine. Any trade violating these limits is blocked with a recorded audit trail, preserving virtual paper portfolio cash balances.
          </div>
        </div>
      </div>

      {/* Risk Configuration Form */}
      <form onSubmit={handleSaveConfig} className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={20} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Risk Parameters & Controls</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                style={{ marginRight: '6px' }}
              />
              Risk Engine Enabled
            </label>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Max Single Trade Exposure */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              Max Single Trade Exposure (Paper USDC)
              <Info size={14} color="var(--text-secondary)" title="Maximum virtual capital that a single trade may allocate." />
            </label>
            <input
              type="number"
              min="1"
              step="10"
              className="form-control"
              value={formData.maxTradeExposure}
              onChange={(e) => setFormData({ ...formData, maxTradeExposure: e.target.value })}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Hard ceiling per simulated order (default: 1,000 Paper USDC).
            </span>
          </div>

          {/* Max Daily Exposure */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              Max Daily Exposure (Paper USDC)
              <Info size={14} color="var(--text-secondary)" title="Rolling 24-hour total simulated trade budget across all traders." />
            </label>
            <input
              type="number"
              min="1"
              step="50"
              className="form-control"
              value={formData.maxDailyExposure}
              onChange={(e) => setFormData({ ...formData, maxDailyExposure: e.target.value })}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Cumulative 24h allocation cap across all copy rules.
            </span>
          </div>

          {/* Max Portfolio Exposure % */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              Max Portfolio Exposure (%)
              <Info size={14} color="var(--text-secondary)" title="Maximum percentage of total portfolio equity a single trade can occupy." />
            </label>
            <input
              type="number"
              min="1"
              max="100"
              className="form-control"
              value={formData.maxPortfolioExposure}
              onChange={(e) => setFormData({ ...formData, maxPortfolioExposure: e.target.value })}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Prevents single-trade overconcentration (e.g. 40%).
            </span>
          </div>

          {/* Max Trader Allocation % */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              Max Trader Concentration (%)
              <Info size={14} color="var(--text-secondary)" title="Maximum portfolio percentage that can be copied from a single trader." />
            </label>
            <input
              type="number"
              min="1"
              max="100"
              className="form-control"
              value={formData.maxTraderAllocation}
              onChange={(e) => setFormData({ ...formData, maxTraderAllocation: e.target.value })}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Limits total capital exposure to any individual trader.
            </span>
          </div>

          {/* Max Token Allocation % */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              Max Token Concentration (%)
              <Info size={14} color="var(--text-secondary)" title="Maximum portfolio percentage allowed in a single token holding." />
            </label>
            <input
              type="number"
              min="1"
              max="100"
              className="form-control"
              value={formData.maxTokenAllocation}
              onChange={(e) => setFormData({ ...formData, maxTokenAllocation: e.target.value })}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Guards against single-asset overexposure (e.g. 25%).
            </span>
          </div>

          {/* Max Open Positions */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              Max Open Token Positions
              <Info size={14} color="var(--text-secondary)" title="Maximum count of distinct active token holdings." />
            </label>
            <input
              type="number"
              min="1"
              max="50"
              className="form-control"
              value={formData.maxOpenPositions}
              onChange={(e) => setFormData({ ...formData, maxOpenPositions: e.target.value })}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Limits portfolio fragmentation (e.g. 10 positions).
            </span>
          </div>

          {/* Minimum Parser Confidence */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              Minimum Parser Confidence
              <Info size={14} color="var(--text-secondary)" title="Transactions below this confidence level are blocked by the risk engine." />
            </label>
            <select
              className="form-control"
              value={formData.minConfidence}
              onChange={(e) => setFormData({ ...formData, minConfidence: e.target.value })}
            >
              <option value="HIGH">HIGH (Known DEX Routers & Verified Swap Logs Only)</option>
              <option value="MEDIUM">MEDIUM (Standard Smart Contract Swaps)</option>
              <option value="LOW">LOW (Allow Heuristic / Low Confidence Calls)</option>
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Blocks uncertain on-chain interpretations from paper execution.
            </span>
          </div>

          {/* Network Filter */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              Allowed Blockchain Networks
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
              {ALL_NETWORKS.map((net) => (
                <label key={net.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={(formData.allowedNetworks || []).includes(net.id)}
                    onChange={() => handleNetworkToggle(net.id)}
                  />
                  {net.name}
                </label>
              ))}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', display: 'block' }}>
              Transactions on unchecked networks will be automatically blocked.
            </span>
          </div>
        </div>

        {/* Blocked Tokens Text Area */}
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            Blocked Token Addresses (One per line)
            <Info size={14} color="var(--text-secondary)" title="Any swap containing these addresses as input or output will be blocked." />
          </label>
          <textarea
            rows="3"
            className="form-control"
            placeholder="0x...\n0x..."
            value={formData.blockedTokensStr}
            onChange={(e) => setFormData({ ...formData, blockedTokensStr: e.target.value })}
            style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Risk Parameters'}
          </button>
        </div>
      </form>

      {/* Risk Evaluation Audit History */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Risk Evaluation Audit Log</h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Historical record of all evaluated risk decisions and multi-check results
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} color="var(--text-secondary)" />
            <select
              className="form-control"
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              style={{ padding: '4px 10px', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="">All Decisions</option>
              <option value="APPROVED">Approved Only</option>
              <option value="BLOCKED">Blocked Only</option>
            </select>
          </div>
        </div>

        {loadingHistory ? (
          <SkeletonTable rows={5} columns={6} />
        ) : history.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={36} color="var(--text-secondary)" style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>No Risk Evaluations Recorded Yet</div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              When tracked traders execute on-chain transactions, pre-trade risk checks will appear here.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Network</th>
                  <th>Trader</th>
                  <th>Proposed Allocation</th>
                  <th>Decision</th>
                  <th>Checks / Reasons</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((evalItem) => {
                  const evalId = evalItem._id || evalItem.id;
                  const isApproved = evalItem.decision === 'APPROVED';
                  const failedChecks = (evalItem.checks || []).filter((c) => c.status === 'BLOCK');
                  const passedChecks = (evalItem.checks || []).filter((c) => c.status === 'PASS');

                  return (
                    <tr key={evalId}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {new Date(evalItem.evaluatedAt || evalItem.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                          {evalItem.network}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>
                          {evalItem.traderId?.displayName || 'Monitored Trader'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        ${(evalItem.proposedAllocation || 0).toFixed(2)} Paper USDC
                      </td>
                      <td>
                        {isApproved ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> RISK APPROVED
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={12} /> RISK BLOCKED
                          </span>
                        )}
                      </td>
                      <td>
                        {isApproved ? (
                          <span style={{ color: 'var(--color-success)', fontSize: '0.8rem' }}>
                            All {passedChecks.length} checks passed
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {(evalItem.reasons || []).map((r, i) => (
                              <span key={i} style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 500 }}>
                                • {r.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedEval(evalItem)}
                          className="btn btn-outline"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          View Breakdown
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {historyPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Showing page {historyPage} of {historyPages} ({historyTotal} total evaluations)
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => fetchHistory(historyPage - 1, filterDecision)}
                    disabled={historyPage <= 1}
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchHistory(historyPage + 1, filterDecision)}
                    disabled={historyPage >= historyPages}
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Check Breakdown Modal */}
      {selectedEval && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedEval(null)}
        >
          <div
            className="card"
            style={{ maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Risk Check Audit Breakdown</h3>
              <button
                onClick={() => setSelectedEval(null)}
                className="btn btn-outline"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Decision:</span>
              {selectedEval.decision === 'APPROVED' ? (
                <span className="badge badge-success">APPROVED</span>
              ) : (
                <span className="badge badge-danger">BLOCKED</span>
              )}
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: 'auto' }}>
                {new Date(selectedEval.evaluatedAt).toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(selectedEval.checks || []).map((chk, idx) => {
                const isPass = chk.status === 'PASS';
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: isPass ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      border: `1px solid ${isPass ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isPass ? 'var(--color-success)' : '#f87171' }}>
                        {chk.name.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {chk.detail}
                      </div>
                    </div>
                    <div>
                      {isPass ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.75rem' }}>PASS</span>
                      ) : (
                        <span style={{ color: '#f87171', fontWeight: 600, fontSize: '0.75rem' }}>BLOCK</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskManagementPage;
