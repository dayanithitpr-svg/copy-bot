import React from 'react';
import { X, ExternalLink, Copy, Check, Clock, ShieldCheck, Box, Repeat, ArrowRight } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import Badge from '../common/Badge';

const EXPLORER_URLS = {
  ETHEREUM: 'https://etherscan.io/tx/',
  BASE: 'https://basescan.org/tx/',
  POLYGON: 'https://polygonscan.com/tx/',
  SOLANA: 'https://solscan.io/tx/',
};

export const ActivityDetailsModal = ({ activity, onClose }) => {
  const { success } = useToast();

  if (!activity) return null;

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    success(`Copied ${label} to clipboard!`);
  };

  const getExplorerLink = (txHash, network) => {
    const base = EXPLORER_URLS[network?.toUpperCase()] || 'https://etherscan.io/tx/';
    return `${base}${txHash}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
  };

  const classification = activity.classification || activity.activityType || 'UNKNOWN';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        style={{ maxWidth: '720px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Parsed Transaction Details</h3>
              {activity.confidence && (
                <Badge variant={`confidence-${activity.confidence.toLowerCase()}`}>
                  {activity.confidence} CONFIDENCE
                </Badge>
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Read-only on-chain activity parsed and classified by Phase 4 engine
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Status & Classification Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant={activity.network?.toLowerCase()}>{activity.network}</Badge>
              <Badge variant={classification.toLowerCase()}>{classification}</Badge>
              {activity.protocol && (
                <span className="badge badge-protocol">{activity.protocol}</span>
              )}
            </div>
            <Badge variant={activity.status === 'CONFIRMED' ? 'active' : 'idle'}>
              {activity.status || 'CONFIRMED'}
            </Badge>
          </div>

          {/* Swap Details Panel (If SWAP) */}
          {activity.swap && (
            <div style={{ padding: '14px 16px', background: 'rgba(168, 85, 247, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#c084fc', fontWeight: 600, fontSize: '0.85rem' }}>
                <Repeat size={16} />
                <span>DEX Swap Intelligence</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Protocol:</span>{' '}
                  <strong>{activity.swap.protocol || 'Decentralized Exchange'}</strong>
                </div>
                {activity.swap.routerAddress && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Router:</span>{' '}
                    <span className="mono-text">{activity.swap.routerAddress.slice(0, 8)}...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Token Transfers Panel (If transfers exist) */}
          {activity.transfers && activity.transfers.length > 0 && (
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                Token Transfers ({activity.transfers.length})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activity.transfers.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <span className="mono-text" style={{ color: 'var(--text-secondary)' }}>{t.from?.slice(0, 6)}...</span>
                      <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>→</span>
                      <span className="mono-text" style={{ color: 'var(--text-secondary)' }}>{t.to?.slice(0, 6)}...</span>
                    </div>
                    <div>
                      <strong>{t.amount || '0'}</strong> {t.tokenSymbol || (t.tokenAddress ? `Token (${t.tokenAddress.slice(0, 6)}...)` : '')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <div className="detail-item">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transaction Hash</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span className="mono-text" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{activity.transactionHash}</span>
                <button className="btn-icon" onClick={() => handleCopy(activity.transactionHash, 'TX Hash')} title="Copy Hash">
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div className="detail-item">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Block Number / Slot</label>
              <div className="mono-text" style={{ fontSize: '0.9rem', marginTop: '4px', fontWeight: 600 }}>
                {activity.blockNumber ? `#${activity.blockNumber.toLocaleString()}` : 'N/A'}
              </div>
            </div>

            <div className="detail-item">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sender (From)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span className="mono-text" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{activity.from || activity.fromAddress || 'N/A'}</span>
                {(activity.from || activity.fromAddress) && (
                  <button className="btn-icon" onClick={() => handleCopy(activity.from || activity.fromAddress, 'From Address')} title="Copy Address">
                    <Copy size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="detail-item">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recipient (To)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span className="mono-text" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{activity.to || activity.toAddress || 'N/A'}</span>
                {(activity.to || activity.toAddress) && (
                  <button className="btn-icon" onClick={() => handleCopy(activity.to || activity.toAddress, 'To Address')} title="Copy Address">
                    <Copy size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="detail-item">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Native Value</label>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                {activity.nativeValue || (activity.amount ? `${activity.amount} ${activity.tokenSymbol || ''}` : '0.000')}
              </div>
            </div>

            <div className="detail-item">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</label>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                {formatTimestamp(activity.timestamp || activity.blockTimestamp || activity.createdAt)}
              </div>
            </div>
          </div>

          {/* Raw Metadata JSON Viewer */}
          {activity.rawMetadata && Object.keys(activity.rawMetadata).length > 0 && (
            <div style={{ marginTop: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Raw Metadata Payload</label>
              <pre
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  overflowX: 'auto',
                  marginTop: '6px',
                  maxHeight: '140px',
                }}
              >
                {JSON.stringify(activity.rawMetadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a
            href={getExplorerLink(activity.transactionHash, activity.network)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', textDecoration: 'none' }}
          >
            <ExternalLink size={15} />
            View in Block Explorer
          </a>
          <button className="btn btn-primary" onClick={onClose} style={{ fontSize: '0.85rem' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetailsModal;
