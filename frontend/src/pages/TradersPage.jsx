import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Filter, RefreshCw, Layers } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { traderService } from '../services/traderService';
import Badge from '../components/common/Badge';
import { SkeletonCard } from '../components/common/Skeleton';
import TraderCard from '../components/traders/TraderCard';
import AddTraderModal from '../components/traders/AddTraderModal';
import EditTraderModal from '../components/traders/EditTraderModal';
import DeleteTraderModal from '../components/traders/DeleteTraderModal';
import TraderActivityModal from '../components/traders/TraderActivityModal';

const NETWORKS = [
  { id: '', label: 'All Networks' },
  { id: 'ETHEREUM', label: 'Ethereum' },
  { id: 'BASE', label: 'Base' },
  { id: 'POLYGON', label: 'Polygon' },
  { id: 'SOLANA', label: 'Solana' },
];

const TradersPage = () => {
  const { success, error: toastError } = useToast();
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTrader, setEditingTrader] = useState(null);
  const [deletingTrader, setDeletingTrader] = useState(null);
  const [viewingActivityTrader, setViewingActivityTrader] = useState(null);

  const fetchTraders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await traderService.getTraders();
      setTraders(res.data?.traders || []);
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to load tracked traders');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchTraders();
  }, [fetchTraders]);

  const handleTraderAdded = (newTrader) => {
    success(`Trader "${newTrader.displayName}" added to monitoring registry!`);
    fetchTraders();
  };

  const handleTraderUpdated = (updatedTrader) => {
    const id = updatedTrader._id || updatedTrader.id;
    setTraders((prev) => prev.map((t) => ((t._id || t.id) === id ? updatedTrader : t)));
    success(`Trader "${updatedTrader.displayName}" updated successfully!`);
  };

  const handleTraderDeleted = (deletedId) => {
    setTraders((prev) => prev.filter((t) => (t._id || t.id) !== deletedId));
    success('Trader removed from monitoring');
  };

  const handleToggleStatus = async (traderId, newTrackingState) => {
    try {
      const res = await traderService.updateTrader(traderId, { isTracking: newTrackingState });
      const updated = res.data?.trader || res.data;
      setTraders((prev) => prev.map((t) => ((t._id || t.id) === traderId ? updated : t)));
      success(newTrackingState ? 'Monitoring resumed for trader' : 'Monitoring paused for trader');
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to update tracking state');
    }
  };

  const filteredTraders = traders.filter((t) => {
    if (selectedNetwork && t.network?.toUpperCase() !== selectedNetwork.toUpperCase()) return false;
    if (selectedStatus === 'ACTIVE' && !t.isTracking) return false;
    if (selectedStatus === 'PAUSED' && t.isTracking) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.displayName?.toLowerCase().includes(q) ||
        t.walletAddress?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Tracked Traders</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Manage public wallet addresses monitored across Ethereum, Base, Polygon, and Solana
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={fetchTraders}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsAddOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            Add Trader
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Network Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {NETWORKS.map((n) => (
              <button
                type="button"
                key={n.id}
                onClick={() => setSelectedNetwork(n.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: selectedNetwork === n.id ? 'var(--accent-cyan)' : 'var(--bg-surface)',
                  color: selectedNetwork === n.id ? '#050810' : 'var(--text-secondary)',
                  border: selectedNetwork === n.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  transition: 'all 0.15s ease',
                }}
              >
                {n.label}
              </button>
            ))}
          </div>

          {/* Search & Status Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', maxWidth: '400px', minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '6px 10px', width: '100%' }}>
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search alias or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="select-input"
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredTraders.length === 0 ? (
        <div className="card empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Users size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 6px 0' }}>No Tracked Traders Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto 16px auto' }}>
            {searchQuery || selectedNetwork || selectedStatus
              ? 'No traders match the current filter criteria.'
              : 'Add your first public crypto trader wallet to start monitoring on-chain activity.'}
          </p>
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} /> Add First Trader
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredTraders.map((trader) => (
            <TraderCard
              key={trader._id || trader.id}
              trader={trader}
              onEdit={(t) => setEditingTrader(t)}
              onDelete={(t) => setDeletingTrader(t)}
              onToggleStatus={handleToggleStatus}
              onViewActivity={(t) => setViewingActivityTrader(t)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddTraderModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onTraderAdded={handleTraderAdded}
      />

      <EditTraderModal
        isOpen={Boolean(editingTrader)}
        trader={editingTrader}
        onClose={() => setEditingTrader(null)}
        onTraderUpdated={handleTraderUpdated}
      />

      <DeleteTraderModal
        isOpen={Boolean(deletingTrader)}
        trader={deletingTrader}
        onClose={() => setDeletingTrader(null)}
        onTraderDeleted={handleTraderDeleted}
      />

      <TraderActivityModal
        isOpen={Boolean(viewingActivityTrader)}
        trader={viewingActivityTrader}
        onClose={() => setViewingActivityTrader(null)}
      />
    </div>
  );
};

export default TradersPage;
