import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import { traderService } from '../../services/traderService';

const EVM_REGEX = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const NETWORKS = [
  { id: 'ETHEREUM', name: 'Ethereum', symbol: 'ETH', type: 'EVM', desc: '0x... (40 hex characters)' },
  { id: 'BASE', name: 'Base', symbol: 'ETH', type: 'EVM', desc: '0x... (40 hex characters)' },
  { id: 'POLYGON', name: 'Polygon', symbol: 'POL', type: 'EVM', desc: '0x... (40 hex characters)' },
  { id: 'SOLANA', name: 'Solana', symbol: 'SOL', type: 'Base58', desc: 'Base58 (32–44 characters)' },
];

const AddTraderModal = ({ isOpen, onClose, onTraderAdded }) => {
  const [displayName, setDisplayName] = useState('');
  const [network, setNetwork] = useState('ETHEREUM');
  const [walletAddress, setWalletAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen) return null;

  const getAddressValidation = () => {
    if (!walletAddress) return { isValid: false, message: '' };
    const trimmed = walletAddress.trim();
    if (network === 'SOLANA') {
      const valid = SOLANA_REGEX.test(trimmed);
      return {
        isValid: valid,
        message: valid ? 'Valid Solana Base58 address format' : 'Invalid Solana address (Must be 32–44 Base58 characters)',
      };
    } else {
      const valid = EVM_REGEX.test(trimmed);
      return {
        isValid: valid,
        message: valid ? `Valid ${network} EVM address format` : `Invalid ${network} address (Must start with 0x and have 40 hex characters)`,
      };
    }
  };

  const validation = getAddressValidation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await traderService.createTrader({
        displayName: displayName.trim(),
        walletAddress: walletAddress.trim(),
        network,
        notes: notes.trim(),
      });

      const newTrader = res.data?.trader || res.data;
      onTraderAdded(newTrader);
      onClose();
      // Reset form
      setDisplayName('');
      setWalletAddress('');
      setNotes('');
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to add trader');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        style={{ width: '90%', maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Add Tracked Trader</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Enter the public wallet address to monitor
            </p>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          {errorMessage && <Alert type="error" message={errorMessage} />}

          {/* Security Notice */}
          <div
            style={{
              background: 'rgba(0, 242, 254, 0.08)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: '0.8rem',
              color: 'var(--text-primary)',
            }}
          >
            <ShieldAlert size={18} color="var(--accent-cyan)" />
            <span><strong>Read-Only:</strong> Enter public wallet addresses only. Never enter private keys or seed phrases.</span>
          </div>

          {/* Network Selector */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 600 }}>Select Network *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {NETWORKS.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => setNetwork(n.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: network === n.id ? 'rgba(0, 242, 254, 0.15)' : 'var(--bg-surface)',
                    border: network === n.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    color: network === n.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{n.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{n.type}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Trader Name */}
          <Input
            label="Trader Alias / Label *"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Whale Alpha, Trend Follower 1"
            required
          />

          {/* Public Wallet Address */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
              Public Wallet Address * <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({NETWORKS.find((n) => n.id === network)?.desc})</span>
            </label>
            <input
              type="text"
              className="form-input mono-text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={network === 'SOLANA' ? '6vjWc64CcmWjD7D4dF661kQ2V8pG5xN7...' : '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'}
              required
              style={{
                borderColor: walletAddress
                  ? validation.isValid
                    ? 'var(--accent-green)'
                    : 'var(--accent-red)'
                  : undefined,
              }}
            />
            {walletAddress && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 4,
                  fontSize: '0.75rem',
                  color: validation.isValid ? 'var(--accent-green)' : 'var(--accent-red)',
                }}
              >
                {validation.isValid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>{validation.message}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 600 }}>Strategy Notes (Optional)</label>
            <textarea
              className="form-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. High volume DEX trader..."
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={!validation.isValid || !displayName.trim()}
            >
              Add Trader
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTraderModal;
