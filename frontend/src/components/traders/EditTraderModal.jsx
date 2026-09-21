import React, { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import { traderService } from '../../services/traderService';

const EditTraderModal = ({ isOpen, onClose, trader, onTraderUpdated }) => {
  const [displayName, setDisplayName] = useState('');
  const [notes, setNotes] = useState('');
  const [isTracking, setIsTracking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (trader) {
      setDisplayName(trader.displayName || '');
      setNotes(trader.notes || '');
      setIsTracking(trader.isTracking !== undefined ? trader.isTracking : trader.trackingEnabled ?? true);
      setErrorMessage(null);
    }
  }, [trader]);

  if (!isOpen || !trader) return null;

  const traderId = trader._id || trader.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await traderService.updateTrader(traderId, {
        displayName: displayName.trim(),
        notes: notes.trim(),
        isTracking,
      });

      const updated = res.data?.trader || res.data;
      onTraderUpdated(updated);
      onClose();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update trader');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        style={{ width: '90%', maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Edit Trader Profile</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Update alias and monitoring status
            </p>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          {errorMessage && <Alert type="error" message={errorMessage} />}

          {/* Readonly Wallet & Network */}
          <div style={{ padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Network & Address (Read Only)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                {trader.network}
              </span>
              <span className="mono-text" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {trader.walletAddress?.slice(0, 6)}...{trader.walletAddress?.slice(-4)}
              </span>
            </div>
          </div>

          <Input
            label="Trader Display Name *"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />

          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 600 }}>Strategy Notes</label>
            <textarea
              className="form-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Strategy notes..."
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Tracking Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Monitoring Status</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {isTracking ? 'Active background polling' : 'Monitoring paused'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsTracking(!isTracking)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: isTracking ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: isTracking ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: isTracking ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              }}
            >
              {isTracking ? 'Active' : 'Paused'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!displayName.trim()}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTraderModal;
