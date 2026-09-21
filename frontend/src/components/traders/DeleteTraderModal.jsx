import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { traderService } from '../../services/traderService';

const DeleteTraderModal = ({ isOpen, onClose, trader, onTraderDeleted }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen || !trader) return null;

  const traderId = trader._id || trader.id;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await traderService.deleteTrader(traderId);
      onTraderDeleted(traderId);
      onClose();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to delete trader');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        style={{ width: '90%', maxWidth: '440px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(244, 63, 94, 0.12)',
            color: 'var(--accent-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={22} />
        </div>

        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 600 }}>Remove Tracked Trader?</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          Are you sure you want to stop monitoring <strong>{trader.displayName}</strong> ({trader.network}: <span className="mono-text">{trader.walletAddress?.slice(0, 6)}...{trader.walletAddress?.slice(-4)}</span>)?
        </p>

        {errorMessage && <Alert type="error" message={errorMessage} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
            icon={<Trash2 size={16} />}
          >
            Remove Trader
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTraderModal;
