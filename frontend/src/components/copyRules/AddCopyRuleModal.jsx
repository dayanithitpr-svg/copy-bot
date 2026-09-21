import React, { useState, useEffect } from 'react';
import { X, Sliders, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { copyRuleService } from '../../services/copyRuleService';
import { traderService } from '../../services/traderService';
import { useToast } from '../../hooks/useToast';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';

const AddCopyRuleModal = ({ isOpen, onClose, onRuleAdded }) => {
  const { success, error: toastError } = useToast();
  const [traders, setTraders] = useState([]);
  const [traderId, setTraderId] = useState('');
  const [allocationMode, setAllocationMode] = useState('FIXED_AMOUNT');
  const [allocationValue, setAllocationValue] = useState('100');
  const [maxTradeAmount, setMaxTradeAmount] = useState('1000');
  const [maxDailyAmount, setMaxDailyAmount] = useState('5000');
  const [minConfidence, setMinConfidence] = useState('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      traderService.getTraders().then((res) => {
        const items = res.items || res.traders || [];
        setTraders(items);
        if (items.length > 0 && !traderId) {
          setTraderId(items[0]._id || items[0].id);
        }
      }).catch(() => {});
    }
  }, [isOpen, traderId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!traderId) {
      setErrorMessage('Please select a tracked trader to copy');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const newRule = await copyRuleService.createRule({
        traderId,
        allocationMode,
        allocationValue: Number(allocationValue),
        maxTradeAmount: Number(maxTradeAmount),
        maxDailyAmount: Number(maxDailyAmount),
        minConfidence
      });

      success('Copy rule created successfully!');
      onRuleAdded(newRule);
      onClose();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to create copy rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        style={{ width: '92%', maxWidth: '540px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(0, 242, 254, 0.12)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sliders size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Configure Copy Rule</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Simulate paper trades when detected swaps match these parameters
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          {errorMessage && <Alert type="error" message={errorMessage} />}

          {/* Simulation Notice */}
          <div style={{ padding: '10px 14px', background: 'rgba(0, 242, 254, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 242, 254, 0.2)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
            <strong>Paper Simulation Mode:</strong> Trades are simulated in virtual Paper USDC. No real funds or blockchain transactions will be used.
          </div>

          {/* Target Trader Selector */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
              Tracked Trader *
            </label>
            {traders.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-red)' }}>
                No tracked traders found. Please add a tracked trader first.
              </div>
            ) : (
              <select
                value={traderId}
                onChange={(e) => setTraderId(e.target.value)}
                className="select-input"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                required
              >
                {traders.map((t) => (
                  <option key={t._id || t.id} value={t._id || t.id}>
                    {t.displayName} ({t.network.toUpperCase()} - {t.walletAddress.slice(0, 6)}...{t.walletAddress.slice(-4)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Allocation Mode & Value */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                Allocation Mode
              </label>
              <select
                value={allocationMode}
                onChange={(e) => setAllocationMode(e.target.value)}
                className="select-input"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              >
                <option value="FIXED_AMOUNT">Fixed Paper USDC</option>
                <option value="PERCENTAGE">% of Virtual Cash</option>
              </select>
            </div>

            <div>
              <Input
                label={allocationMode === 'FIXED_AMOUNT' ? 'Amount (Paper USDC) *' : 'Percentage (1-100%) *'}
                type="number"
                value={allocationValue}
                onChange={(e) => setAllocationValue(e.target.value)}
                placeholder={allocationMode === 'FIXED_AMOUNT' ? '100' : '10'}
                required
              />
            </div>
          </div>

          {/* Limits: Max Trade Amount & Max Daily Allocation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input
              label="Max Single Trade ($)"
              type="number"
              value={maxTradeAmount}
              onChange={(e) => setMaxTradeAmount(e.target.value)}
              placeholder="1000"
              required
            />

            <Input
              label="24h Daily Budget ($)"
              type="number"
              value={maxDailyAmount}
              onChange={(e) => setMaxDailyAmount(e.target.value)}
              placeholder="5000"
              required
            />
          </div>

          {/* Min Confidence Threshold */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
              Minimum Parser Confidence Threshold
            </label>
            <select
              value={minConfidence}
              onChange={(e) => setMinConfidence(e.target.value)}
              className="select-input"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              <option value="HIGH">HIGH Only (Verified Routers & Swap Logs)</option>
              <option value="MEDIUM">MEDIUM (Standard DEX Selectors & Routers)</option>
              <option value="LOW">LOW (All Contract Interactions)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={traders.length === 0 || !allocationValue}
            >
              Save Copy Rule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCopyRuleModal;
