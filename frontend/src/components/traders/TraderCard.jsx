import React, { useState } from 'react';
import { Copy, Check, Edit2, Trash2, PauseCircle, PlayCircle, Activity } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import Badge from '../common/Badge';

const TraderCard = ({ trader, onEdit, onDelete, onToggleStatus, onViewActivity }) => {
  const { success } = useToast();
  const [isToggling, setIsToggling] = useState(false);

  const traderId = trader._id || trader.id;
  const isTracking = trader.isTracking !== undefined ? trader.isTracking : trader.trackingEnabled;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(trader.walletAddress);
    success('Copied wallet address to clipboard!');
  };

  const handleToggle = async (e) => {
    e.stopPropagation();
    setIsToggling(true);
    try {
      await onToggleStatus(traderId, !isTracking);
    } finally {
      setIsToggling(false);
    }
  };

  const shortenedAddress = trader.walletAddress
    ? `${trader.walletAddress.slice(0, 6)}...${trader.walletAddress.slice(-4)}`
    : 'N/A';

  return (
    <div
      className="card card-body animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '16px',
        height: '100%',
      }}
    >
      <div>
        {/* Header: Name + Network Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
              {trader.displayName}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: isTracking ? 'var(--accent-green)' : 'var(--text-muted)',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: isTracking ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                {isTracking ? 'Active Monitoring' : 'Monitoring Paused'}
              </span>
            </div>
          </div>

          <Badge variant={trader.network?.toLowerCase()}>
            {trader.network}
          </Badge>
        </div>

        {/* Public Wallet Address Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            marginTop: '12px',
          }}
        >
          <span className="mono-text" style={{ fontSize: '0.85rem' }}>
            {shortenedAddress}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="btn-icon"
            title="Copy Public Wallet Address"
          >
            <Copy size={14} />
          </button>
        </div>

        {/* Notes (if any) */}
        {trader.notes && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '10px', marginBottom: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
            "{trader.notes}"
          </p>
        )}
      </div>

      {/* Footer: Activity Button + Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => onViewActivity(trader)}
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            padding: '6px 12px',
          }}
        >
          <Activity size={14} color="var(--accent-cyan)" />
          <span>Activity</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            className="btn-icon"
            style={{
              color: isTracking ? 'var(--accent-green)' : 'var(--accent-yellow)',
            }}
            title={isTracking ? 'Pause Monitoring' : 'Resume Monitoring'}
          >
            {isTracking ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
          </button>

          <button
            type="button"
            onClick={() => onEdit(trader)}
            className="btn-icon"
            title="Edit Trader"
          >
            <Edit2 size={15} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(trader)}
            className="btn-icon"
            style={{ color: 'var(--accent-red)' }}
            title="Remove Trader"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TraderCard;
