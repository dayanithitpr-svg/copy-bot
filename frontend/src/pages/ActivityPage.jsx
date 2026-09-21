import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Filter,
  Search,
  RefreshCw,
  ExternalLink,
  Copy,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Zap,
  Repeat
} from 'lucide-react';
import { traderService } from '../services/traderService';
import { useToast } from '../hooks/useToast';
import Badge from '../components/common/Badge';
import { SkeletonTable } from '../components/common/Skeleton';
import ActivityDetailsModal from '../components/activity/ActivityDetailsModal';

const CLASSIFICATIONS = [
  { id: 'ALL', label: 'All Classifications' },
  { id: 'SWAP', label: 'Swaps (DEX)' },
  { id: 'TOKEN_TRANSFER', label: 'Token Transfers' },
  { id: 'TRANSFER', label: 'Native Transfers' },
  { id: 'CONTRACT_INTERACTION', label: 'Contract Calls' },
  { id: 'APPROVAL', label: 'Approvals' },
  { id: 'MINT', label: 'Mints' },
  { id: 'BURN', label: 'Burns' },
  { id: 'UNKNOWN', label: 'Unknown' },
];

const ActivityPage = () => {
  const { success, error: toastError } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);

  // Filters
  const [networkFilter, setNetworkFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 15, totalPages: 1 });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
      };
      if (networkFilter !== 'ALL') params.network = networkFilter;
      if (classFilter !== 'ALL') params.classification = classFilter;

      const data = await traderService.getRecentTransactions(params);
      if (data) {
        setTransactions(data.items || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to fetch on-chain transactions');
    } finally {
      setLoading(false);
    }
  }, [page, networkFilter, classFilter, toastError]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleCopy = (e, text, label) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    success(`Copied ${label} to clipboard!`);
  };

  const filteredTxs = transactions.filter((tx) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.transactionHash?.toLowerCase().includes(q) ||
      tx.from?.toLowerCase().includes(q) ||
      tx.to?.toLowerCase().includes(q) ||
      tx.protocol?.toLowerCase().includes(q) ||
      tx.classification?.toLowerCase().includes(q)
    );
  });

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
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Activity & Trade Explorer</h2>
            <Badge variant="phase1">Phase 4 Detection</Badge>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Deep transaction parsing, token transfer detection, and DEX swap classification across monitored wallets
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={fetchTransactions}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh Activity
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '6px 12px', flex: '1', minWidth: '240px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by TX hash, address, or protocol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* Network Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Network:</label>
            <select
              value={networkFilter}
              onChange={(e) => {
                setNetworkFilter(e.target.value);
                setPage(1);
              }}
              className="select-input"
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Networks</option>
              <option value="ETHEREUM">Ethereum</option>
              <option value="BASE">Base</option>
              <option value="POLYGON">Polygon</option>
              <option value="SOLANA">Solana</option>
            </select>
          </div>

          {/* Classification Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Classification:</label>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="select-input"
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity / Transactions Table */}
      {loading ? (
        <SkeletonTable rows={6} cols={7} />
      ) : filteredTxs.length === 0 ? (
        <div className="card empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Activity size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 6px 0' }}>No Transactions Detected</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto' }}>
            When the background monitoring engine discovers on-chain events on tracked wallets, transactions will be parsed, classified, and displayed here.
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Classification</th>
                  <th>Network</th>
                  <th>Protocol / Router</th>
                  <th>TX Hash</th>
                  <th>Activity Details</th>
                  <th>Confidence</th>
                  <th>Detected At</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map((tx) => (
                  <tr
                    key={tx.id || tx.transactionHash}
                    onClick={() => setSelectedTx(tx)}
                    style={{ cursor: 'pointer' }}
                    className="table-row-hover"
                  >
                    <td>
                      <Badge variant={tx.classification?.toLowerCase()}>
                        {tx.classification || 'UNKNOWN'}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={tx.network?.toLowerCase()}>
                        {tx.network}
                      </Badge>
                    </td>
                    <td>
                      {tx.protocol ? (
                        <span className="badge badge-protocol" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {tx.protocol}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="mono-text" style={{ fontSize: '0.85rem' }}>
                          {formatShortAddress(tx.transactionHash)}
                        </span>
                        <button
                          className="btn-icon"
                          onClick={(e) => handleCopy(e, tx.transactionHash, 'TX Hash')}
                          title="Copy Transaction Hash"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </td>
                    <td>
                      {tx.classification === 'SWAP' && tx.swap ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                          <Repeat size={13} />
                          <span>{tx.swap.protocol || 'DEX Swap'}</span>
                        </div>
                      ) : tx.transfers && tx.transfers.length > 0 ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          {tx.transfers.length} token transfer{tx.transfers.length > 1 ? 's' : ''}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {tx.nativeValue || '0.000'}
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge variant={`confidence-${(tx.confidence || 'low').toLowerCase()}`}>
                        {tx.confidence || 'LOW'}
                      </Badge>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(tx.timestamp || tx.createdAt)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTx(tx);
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Page {page} of {pagination.totalPages} ({pagination.total} total events)
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
      )}

      {/* Transaction Details Modal */}
      {selectedTx && (
        <ActivityDetailsModal
          activity={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  );
};

export default ActivityPage;
