import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Activity,
  ShieldAlert,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import Badge from '../common/Badge';
import { SkeletonTable } from '../common/Skeleton';
import { traderService } from '../../services/traderService';

const EXPLORERS = {
  ETHEREUM: 'https://etherscan.io/tx/',
  BASE: 'https://basescan.org/tx/',
  POLYGON: 'https://polygonscan.com/tx/',
  SOLANA: 'https://solscan.io/tx/',
};

const TraderActivityModal = ({ isOpen, onClose, trader }) => {
  const { success, error: toastError } = useToast();
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [activityTypeFilter, setActivityTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const traderId = trader?._id || trader?.id;

  const fetchActivity = useCallback(async (page = 1) => {
    if (!traderId) return;
    setIsLoading(true);

    try {
      const params = {
        page,
        limit: 10,
      };
      if (activityTypeFilter) params.activityType = activityTypeFilter;

      const res = await traderService.getTraderActivities(traderId, params);
      setActivities(res.data?.activities || []);
      setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to load activity stream');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [traderId, activityTypeFilter, toastError]);

  useEffect(() => {
    if (isOpen && traderId) {
      fetchActivity(1);
    }
  }, [isOpen, traderId, fetchActivity]);

  if (!isOpen || !trader) return null;

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    success(`Copied ${label} to clipboard!`);
  };

  const getExplorerUrl = (txHash) => {
    const base = EXPLORERS[trader.network?.toUpperCase()] || 'https://etherscan.io/tx/';
    return `${base}${txHash}`;
  };

  const formatShortAddress = (addr) => {
    if (!addr || addr.length < 12) return addr || '—';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        style={{ width: '90%', maxWidth: '780px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 242, 254, 0.12)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Activity size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>{trader.displayName}</h3>
                <Badge variant={trader.network?.toLowerCase()}>
                  {trader.network}
                </Badge>
              </div>
              <div className="mono-text" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {trader.walletAddress}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setIsRefreshing(true);
                fetchActivity(pagination.page);
              }}
              className="btn-icon"
              title="Refresh Activity"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="modal-close-btn"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {/* Read-Only Notice Banner */}
          <div
            style={{
              background: 'rgba(0, 242, 254, 0.08)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
              fontSize: '0.82rem',
              color: 'var(--text-primary)'
            }}
          >
            <ShieldAlert size={18} color="var(--accent-cyan)" />
            <span><strong>Read-Only Monitoring:</strong> Displaying confirmed on-chain events detected for this address.</span>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>On-Chain Events ({pagination.total})</h4>
            <div style={{ display: 'flex', gap: 6 }}>
              {['', 'TRANSACTION', 'TOKEN_TRANSFER', 'CONTRACT_INTERACTION'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActivityTypeFilter(type)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: activityTypeFilter === type ? 'rgba(0, 242, 254, 0.2)' : 'var(--bg-surface)',
                    color: activityTypeFilter === type ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    border: activityTypeFilter === type ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  }}
                >
                  {type ? type.replace('_', ' ') : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Stream List */}
          {isLoading ? (
            <SkeletonTable rows={4} cols={4} />
          ) : activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
              <Activity size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No recent on-chain activity detected for this wallet yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activities.map((act) => (
                <div
                  key={act._id || act.transactionHash}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {/* Top Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge variant={act.activityType?.toLowerCase()}>
                        {act.activityType || 'TRANSACTION'}
                      </Badge>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {act.amount ? `${act.amount} ${act.tokenSymbol || ''}` : '0.00'}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(act.blockTimestamp || act.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Middle Row: From -> To */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span className="mono-text">{formatShortAddress(act.fromAddress)}</span>
                    <span>→</span>
                    <span className="mono-text">{formatShortAddress(act.toAddress)}</span>
                    {act.blockNumber && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: 'auto' }}>
                        Block #{act.blockNumber}
                      </span>
                    )}
                  </div>

                  {/* Bottom Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 6,
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Tx:</span>
                      <span className="mono-text" style={{ color: 'var(--accent-cyan)' }}>
                        {formatShortAddress(act.transactionHash)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(act.transactionHash, 'TX Hash')}
                        className="btn-icon"
                        title="Copy Hash"
                      >
                        <Copy size={12} />
                      </button>
                    </div>

                    <a
                      href={getExplorerUrl(act.transactionHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: 'var(--accent-cyan)',
                        fontSize: '0.75rem',
                        textDecoration: 'none',
                      }}
                    >
                      <span>Explorer</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.85rem' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TraderActivityModal;
