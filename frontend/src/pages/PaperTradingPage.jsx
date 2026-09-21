import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  PieChart,
  Repeat,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Coins,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { paperTradingService } from '../services/paperTradingService';
import { useToast } from '../hooks/useToast';
import Badge from '../components/common/Badge';
import { SkeletonCard, SkeletonTable } from '../components/common/Skeleton';

const PaperTradingPage = () => {
  const { success, error: toastError, info } = useToast();
  const [portfolio, setPortfolio] = useState(null);
  const [trades, setTrades] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 15, totalPages: 1 });
  const [isResetting, setIsResetting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [portData, tradesRes, sumData] = await Promise.all([
        paperTradingService.getPortfolio(),
        paperTradingService.getTrades({ page, limit: 15 }),
        paperTradingService.getSummary()
      ]);

      setPortfolio(portData);
      setTrades(tradesRes.items || []);
      setPagination(tradesRes.pagination || { total: 0, limit: 15, totalPages: 1 });
      setSummary(sumData);
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to load paper trading data');
    } finally {
      setLoading(false);
    }
  }, [page, toastError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReset = async () => {
    if (!window.confirm('Reset virtual paper portfolio balance back to 10,000 Paper USDC and clear holdings?')) {
      return;
    }

    setIsResetting(true);
    try {
      await paperTradingService.resetPortfolio(10000);
      success('Paper portfolio reset to 10,000 Paper USDC');
      fetchData();
    } catch (err) {
      toastError('Failed to reset paper portfolio');
    } finally {
      setIsResetting(false);
    }
  };

  const formatShortAddress = (addr) => {
    if (!addr) return 'N/A';
    if (addr.length <= 12) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Paper Trading Portfolio</h2>
            <Badge variant="phase1">100% Simulated Mode</Badge>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Virtual execution environment mirroring trader swaps with Paper USDC (Zero financial risk)
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
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={isResetting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: 'rgba(244, 63, 94, 0.3)', color: 'var(--accent-red)' }}
          >
            <RotateCcw size={15} className={isResetting ? 'animate-spin' : ''} />
            Reset Balance
          </button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="card card-body" style={{ background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShieldAlert size={24} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          <strong>SIMULATION MODE NOTICE:</strong> All portfolio balances, holdings, and trade executions on this page are 100% simulated using virtual <strong>Paper USDC</strong>. No real wallet connections, blockchain transactions, or live capital are used.
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
          {/* Virtual Cash Balance */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Virtual Cash Balance
              </span>
              <Wallet size={16} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--accent-cyan)' }}>
              ${portfolio?.virtualCashBalance ? portfolio.virtualCashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '10,000.00'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Paper USDC Base Currency
            </div>
          </div>

          {/* Virtual Token Holdings Count */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Virtual Holdings
              </span>
              <PieChart size={16} color="var(--accent-green)" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>
              {portfolio?.holdings?.length || 0} Assets
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Simulated acquired tokens
            </div>
          </div>

          {/* Simulated Trades Executed */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Simulated Copies
              </span>
              <CheckCircle2 size={16} color="var(--accent-green)" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--accent-green)' }}>
              {summary?.trades?.simulated || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Virtual executions completed
            </div>
          </div>

          {/* Skipped Trades */}
          <div className="card card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Filtered / Skipped
              </span>
              <XCircle size={16} color="var(--accent-yellow)" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--accent-yellow)' }}>
              {summary?.trades?.skipped || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Stopped by risk/limit rules
            </div>
          </div>
        </div>
      )}

      {/* Holdings Breakdown Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Virtual Token Holdings</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Assets acquired via simulated copy trading
            </p>
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={3} cols={5} />
        ) : !portfolio?.holdings || portfolio.holdings.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No virtual token holdings yet. When monitored traders swap tokens and match your copy rules, simulated holdings will appear here.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Token / Symbol</th>
                  <th>Network</th>
                  <th>Quantity</th>
                  <th>Total Cost (Paper USDC)</th>
                  <th>Token Contract</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((h, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {h.symbol || 'TOKEN'}
                      </div>
                    </td>
                    <td>
                      <Badge variant={h.network?.toLowerCase()}>{h.network}</Badge>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {h.quantity?.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </td>
                    <td>
                      ${h.totalCost?.toFixed(2)} Paper USDC
                    </td>
                    <td>
                      <span className="mono-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatShortAddress(h.tokenAddress)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paper Trades Simulation History Stream */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Simulated Trade History</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Full audit log of simulated executions and filtered copy decisions with reasons
            </p>
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : trades.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No simulated trades recorded yet. Monitored trader swaps will trigger automated paper simulations.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Status / Result</th>
                  <th>Trader</th>
                  <th>Network</th>
                  <th>Virtual Swap Allocation</th>
                  <th>Skip Reason</th>
                  <th>Simulated At</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => {
                  const trader = t.traderId || {};
                  const isSimulated = t.status === 'SIMULATED';
                  const isRiskBlocked = t.status === 'RISK_BLOCKED';

                  return (
                    <tr key={t.id || t._id} className="table-row-hover">
                      <td>
                        {isSimulated && <Badge variant="active">SIMULATED</Badge>}
                        {isRiskBlocked && <Badge variant="danger">RISK BLOCKED</Badge>}
                        {!isSimulated && !isRiskBlocked && <Badge variant="paused">SKIPPED</Badge>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {trader.displayName || 'Tracked Trader'}
                        </div>
                        <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {trader.walletAddress ? formatShortAddress(trader.walletAddress) : '—'}
                        </div>
                      </td>
                      <td>
                        <Badge variant={t.network?.toLowerCase()}>{t.network}</Badge>
                      </td>
                      <td>
                        {isSimulated ? (
                          <div style={{ fontSize: '0.85rem' }}>
                            <strong>${t.paperInputAmount?.toFixed(2)} Paper USDC</strong> → {t.paperOutputAmount?.toFixed(4)} {t.outputToken?.symbol || 'Tokens'}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {isRiskBlocked ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {(t.riskReasons && t.riskReasons.length > 0 ? t.riskReasons : [t.skipReason || 'RISK_BLOCKED']).map((r, i) => (
                              <span key={i} style={{ fontSize: '0.75rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.12)', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                                🛡 {r.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        ) : t.skipReason ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--accent-yellow)', background: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                            {t.skipReason.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--accent-green)', fontSize: '0.78rem' }}>✓ Simulated</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatTimestamp(t.simulatedAt || t.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Page {page} of {pagination.totalPages} ({pagination.total} total simulated records)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                className="btn btn-secondary"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperTradingPage;
