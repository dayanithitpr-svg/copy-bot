import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  PlayCircle,
  PauseCircle,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Wallet,
  Activity,
  ArrowRight,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { copyTradingService } from '../services/copyTradingService';
import { useToast } from '../hooks/useToast';
import Badge from '../components/common/Badge';
import { SkeletonCard, SkeletonTable } from '../components/common/Skeleton';

const formatShortAddress = (addr) => {
  if (!addr || addr.length < 10) return addr || '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const formatTimestamp = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
};

const CopyTradingPage = () => {
  const { success, error: toastError } = useToast();

  const [status, setStatus] = useState(null);
  const [summary, setSummary] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [totalDecisions, setTotalDecisions] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState(null);

  const fetchData = useCallback(async (pageNum = 1, statusFilter = '') => {
    setLoading(true);
    try {
      const [statusRes, summaryRes, decisionsRes] = await Promise.all([
        copyTradingService.getStatus(),
        copyTradingService.getSummary(),
        copyTradingService.getDecisions(statusFilter ? { status: statusFilter } : {}, pageNum, 10)
      ]);

      setStatus(statusRes);
      setSummary(summaryRes);
      setDecisions(decisionsRes?.data || []);
      setTotalDecisions(decisionsRes?.pagination?.total || 0);
      setPage(decisionsRes?.pagination?.page || 1);
      setTotalPages(decisionsRes?.pagination?.pages || 1);
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to fetch copy trading data');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchData(1, filterStatus);
  }, [fetchData, filterStatus]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Copy Trading Engine</h2>
            <Badge variant="phase1">Phase 7 Live Hub</Badge>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Centralized orchestration connecting on-chain monitoring, copy rules, risk controls, and virtual execution
          </p>
        </div>

        <button
          onClick={() => fetchData(page, filterStatus)}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Engine
        </button>
      </div>

      {/* Safety Notice Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%)',
          border: '1px solid rgba(0, 242, 254, 0.25)',
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
            background: 'rgba(0, 242, 254, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Cpu size={22} color="var(--accent-cyan)" />
        </div>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            SIMULATION-ONLY COPY TRADING PIPELINE
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
            The Copy Trading Engine operates purely with simulated <strong>Paper USDC</strong> funds. No wallet signing, private keys, or mainnet capital are involved.
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Active Copy Rules */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Active Copy Rules
              </span>
              <Sliders size={16} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--accent-cyan)' }}>
              {status?.activeRulesCount || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Across {status?.trackedTradersCount || 0} active tracked traders
            </div>
          </div>

          {/* Copied Executions */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Copied Trades
              </span>
              <CheckCircle2 size={16} color="var(--accent-green)" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--accent-green)' }}>
              {summary?.simulated || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Approved & virtually simulated
            </div>
          </div>

          {/* Risk Blocked Trades */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Risk Blocked
              </span>
              <ShieldAlert size={16} color="#f87171" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: '#f87171' }}>
              {summary?.riskBlocked || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Protected by risk controls
            </div>
          </div>

          {/* Total Copied Volume */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Simulated Volume
              </span>
              <Wallet size={16} color="#818cf8" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>
              ${(summary?.totalVolume || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Paper USDC Allocated
            </div>
          </div>
        </div>
      )}

      {/* Visual Pipeline Banner */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Copy Execution Pipeline Architecture
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.85rem' }}>
          <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontWeight: 500 }}>
            1. Blockchain Activity
          </span>
          <ArrowRight size={14} color="var(--text-secondary)" />
          <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontWeight: 500 }}>
            2. Transaction Parser
          </span>
          <ArrowRight size={14} color="var(--text-secondary)" />
          <span style={{ padding: '6px 12px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: '6px', fontWeight: 600 }}>
            3. Copy Rule Engine
          </span>
          <ArrowRight size={14} color="var(--text-secondary)" />
          <span style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.15)', color: '#f87171', borderRadius: '6px', fontWeight: 600 }}>
            4. Risk Engine
          </span>
          <ArrowRight size={14} color="var(--text-secondary)" />
          <span style={{ padding: '6px 12px', background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)', borderRadius: '6px', fontWeight: 600 }}>
            5. Paper Execution
          </span>
        </div>
      </div>

      {/* Copy Decision Audit Stream */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Copy Decision Stream</h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Complete audit log of all evaluated trader transactions and copy outcomes
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} color="var(--text-secondary)" />
            <select
              className="form-control"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '4px 10px', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="">All Decisions</option>
              <option value="SIMULATED">Copied / Simulated</option>
              <option value="RISK_BLOCKED">Risk Blocked</option>
              <option value="SKIPPED">Skipped by Rule</option>
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : decisions.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Activity size={36} color="var(--text-secondary)" style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>No Copy Decisions Recorded Yet</div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              Transactions detected from monitored traders will appear in this stream.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Decision</th>
                  <th>Trader</th>
                  <th>Network</th>
                  <th>Simulated Allocation</th>
                  <th>Reason / Result</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((d) => {
                  const decisionId = d._id || d.id;
                  const isSimulated = d.status === 'SIMULATED';
                  const isRiskBlocked = d.status === 'RISK_BLOCKED';
                  const isSkipped = d.status === 'SKIPPED';
                  const trader = d.traderId || {};

                  return (
                    <tr key={decisionId} className="table-row-hover">
                      <td>
                        {isSimulated && (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> COPIED
                          </span>
                        )}
                        {isRiskBlocked && (
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldAlert size={12} /> RISK BLOCKED
                          </span>
                        )}
                        {isSkipped && (
                          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} /> SKIPPED
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {trader.displayName || 'Monitored Trader'}
                        </div>
                        <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {formatShortAddress(trader.walletAddress)}
                        </div>
                      </td>
                      <td>
                        <Badge variant={d.network?.toLowerCase()}>{d.network}</Badge>
                      </td>
                      <td>
                        {isSimulated ? (
                          <div style={{ fontSize: '0.85rem' }}>
                            <strong>${(d.paperInputAmount || 0).toFixed(2)} Paper USDC</strong> → {(d.paperOutputAmount || 0).toFixed(4)} {d.outputToken?.symbol || 'Tokens'}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        {isRiskBlocked ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {(d.riskReasons && d.riskReasons.length > 0 ? d.riskReasons : [d.skipReason || 'RISK_BLOCKED']).map((r, i) => (
                              <span key={i} style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 500 }}>
                                🛡 {r.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        ) : isSkipped ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--accent-yellow)', background: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                            {d.skipReason ? d.skipReason.replace(/_/g, ' ') : 'Rule Filtered'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-success)', fontSize: '0.78rem' }}>
                            ✓ Simulated Successfully
                          </span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {formatTimestamp(d.simulatedAt || d.createdAt)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedDecision(d)}
                          className="btn btn-outline"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Page {page} of {totalPages} ({totalDecisions} total decisions)
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => fetchData(page - 1, filterStatus)}
                    disabled={page <= 1}
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    onClick={() => fetchData(page + 1, filterStatus)}
                    disabled={page >= totalPages}
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decision Details Modal */}
      {selectedDecision && (
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
          onClick={() => setSelectedDecision(null)}
        >
          <div
            className="card"
            style={{ maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Copy Decision Audit Record</h3>
              <button
                onClick={() => setSelectedDecision(null)}
                className="btn btn-outline"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status / Result:</span>
                <span style={{ fontWeight: 600 }}>{selectedDecision.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tracked Trader:</span>
                <span style={{ fontWeight: 500 }}>{selectedDecision.traderId?.displayName || 'Monitored Trader'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Network:</span>
                <span style={{ textTransform: 'capitalize' }}>{selectedDecision.network}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Allocation Mode:</span>
                <span>{selectedDecision.allocationMode} ({selectedDecision.allocationValue})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Simulated Input / Output:</span>
                <span>${(selectedDecision.paperInputAmount || 0).toFixed(2)} Paper USDC → {(selectedDecision.paperOutputAmount || 0).toFixed(4)} {selectedDecision.outputToken?.symbol}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Reason / Audit Detail:</span>
                <span>{selectedDecision.skipReason ? selectedDecision.skipReason.replace(/_/g, ' ') : 'Approved & Simulated'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Timestamp:</span>
                <span>{formatTimestamp(selectedDecision.simulatedAt || selectedDecision.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CopyTradingPage;
