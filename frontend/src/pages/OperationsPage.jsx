import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Radio,
  Zap,
  Lock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Sliders,
  Power
} from 'lucide-react';
import { systemService } from '../services/systemService';
import { useToast } from '../hooks/useToast';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Alert from '../components/common/Alert';
import { SkeletonCard, SkeletonTable } from '../components/common/Skeleton';

const OperationsPage = () => {
  const { success, error: toastError } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [systemStatus, setSystemStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [readiness, setReadiness] = useState(null);

  // Recovery State
  const [recovering, setRecovering] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState(null);

  // Kill Switch State
  const [killSwitchUpdating, setKillSwitchUpdating] = useState(false);
  const [showKillSwitchConfirm, setShowKillSwitchConfirm] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPages, setAuditPages] = useState(1);
  const [filterEvent, setFilterEvent] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchSystemData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [statusData, metricsData, readinessData] = await Promise.all([
        systemService.getStatus(),
        systemService.getMetrics(),
        systemService.getReadiness().catch(() => null)
      ]);

      if (statusData) setSystemStatus(statusData);
      if (metricsData) setMetrics(metricsData);
      if (readinessData) setReadiness(readinessData);
    } catch (err) {
      if (!isSilent) {
        toastError(err.response?.data?.message || 'Failed to fetch system operational data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toastError]);

  const fetchLogs = useCallback(async (page = 1, eventType = '', severity = '') => {
    setLoadingLogs(true);
    try {
      const data = await systemService.getAuditLogs({ eventType, severity }, page, 15);
      if (data) {
        setAuditLogs(data.items || []);
        setAuditTotal(data.pagination?.total || 0);
        setAuditPage(data.pagination?.page || 1);
        setAuditPages(data.pagination?.pages || 1);
      }
    } catch (err) {
      // Non-blocking log fetch error
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemData();
    fetchLogs(1, filterEvent, filterSeverity);
  }, [fetchSystemData, fetchLogs, filterEvent, filterSeverity]);

  // Polling Effect
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchSystemData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchSystemData]);

  const handleToggleKillSwitch = async () => {
    if (!systemStatus) return;
    const newTarget = !systemStatus.executionKillSwitch;
    setKillSwitchUpdating(true);
    try {
      const res = await systemService.setKillSwitch(newTarget, 'Operator toggled kill switch via Operations Dashboard');
      if (res) {
        success(newTarget ? 'Emergency Kill Switch ENGAGED. All execution halted.' : 'Kill Switch Disengaged. Testnet execution restored.');
        setShowKillSwitchConfirm(false);
        fetchSystemData(true);
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to update kill switch');
    } finally {
      setKillSwitchUpdating(false);
    }
  };

  const handleTriggerRecovery = async () => {
    setRecovering(true);
    setRecoveryResult(null);
    try {
      const result = await systemService.triggerRecovery();
      setRecoveryResult(result);
      success(`Recovery scan complete: ${result.recovered} transaction(s) resolved.`);
      fetchSystemData(true);
      fetchLogs(1, filterEvent, filterSeverity);
    } catch (err) {
      toastError(err.response?.data?.message || 'Execution recovery scan failed');
    } finally {
      setRecovering(false);
    }
  };

  const getSeverityBadgeVariant = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'danger';
      case 'SECURITY': return 'purple';
      case 'WARN': return 'warning';
      default: return 'info';
    }
  };

  return (
    <div className="operations-page" style={{ paddingBottom: 60 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>System Health & Operations</h1>
            <Badge variant="cyan">Phase 9 Ready</Badge>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Production security oversight, fault-recovery gates, telemetry, and audit trail
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn-ghost ${autoRefresh ? 'active' : ''}`}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: autoRefresh ? 'rgba(0, 242, 254, 0.1)' : 'var(--card-bg)',
              border: `1px solid ${autoRefresh ? 'rgba(0, 242, 254, 0.3)' : 'var(--border-color)'}`,
              color: autoRefresh ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <Clock size={16} />
            <span>Auto-Refresh (10s)</span>
          </button>

          <Button
            variant="secondary"
            onClick={() => {
              fetchSystemData();
              fetchLogs(auditPage, filterEvent, filterSeverity);
            }}
            isLoading={refreshing}
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            onClick={handleTriggerRecovery}
            isLoading={recovering}
          >
            <RotateCcw size={16} />
            <span>Scan & Recover</span>
          </Button>
        </div>
      </div>

      {/* Prominent Multi-Layer Execution Safety Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.2) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: 10, borderRadius: '50%' }}>
            <ShieldCheck size={26} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>PRODUCTION SAFETY LOCK ACTIVE</span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4, background: '#10b981', color: '#000', fontWeight: 800 }}>
                STRICT ENFORCEMENT
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Supported Modes: <strong>PAPER (Simulation)</strong> and <strong>TESTNET (Zero Real Funds)</strong>. Mainnet trading is hard-blocked across 6 architectural gates.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MAINNET STATUS</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>STRICTLY BLOCKED</div>
          </div>
          <div style={{ height: 28, width: 1, background: 'var(--border-color)', margin: '0 4px' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>KILL SWITCH</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: systemStatus?.executionKillSwitch ? '#ef4444' : '#10b981' }}>
              {systemStatus?.executionKillSwitch ? 'ENGAGED (HALTED)' : 'DISENGAGED (READY)'}
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Feedback Alert if Triggered */}
      {recoveryResult && (
        <div style={{ marginBottom: 24 }}>
          <Alert
            type="info"
            title="Execution Recovery Scan Finished"
            message={`Scanned ${recoveryResult.scanned} record(s): ${recoveryResult.confirmed} confirmed on-chain, ${recoveryResult.failed} failed/reverted, ${recoveryResult.stillPending} still in mempool.`}
          />
        </div>
      )}

      {/* System Health Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* API Service */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>API GATEWAY</span>
                <Server size={18} color="var(--accent-cyan)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="status-dot healthy" />
                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>HEALTHY</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                Uptime: {systemStatus ? `${Math.floor(systemStatus.uptimeSeconds / 60)}m ${systemStatus.uptimeSeconds % 60}s` : 'Active'}
              </div>
            </div>

            {/* MongoDB Database */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>MONGODB CLUSTER</span>
                <Database size={18} color="var(--accent-green)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`status-dot ${systemStatus?.database === 'healthy' ? 'healthy' : 'degraded'}`} />
                <span style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  {systemStatus?.database || 'CONNECTED'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                Primary Persistence Engine
              </div>
            </div>

            {/* Monitoring Scheduler */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>MONITORING ENGINE</span>
                <Radio size={18} color="var(--accent-purple)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="status-dot healthy" />
                <span style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  {systemStatus?.monitoring || 'RUNNING'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                Cycles: {systemStatus?.totalMonitoringCycles || 0} executed
              </div>
            </div>

            {/* Emergency Kill Switch */}
            <div
              className="card"
              style={{
                padding: 18,
                border: systemStatus?.executionKillSwitch ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                background: systemStatus?.executionKillSwitch ? 'rgba(239, 68, 68, 0.05)' : 'var(--card-bg)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>EMERGENCY KILL SWITCH</span>
                <Power size={18} color={systemStatus?.executionKillSwitch ? '#ef4444' : '#10b981'} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: systemStatus?.executionKillSwitch ? '#ef4444' : '#10b981' }}>
                  {systemStatus?.executionKillSwitch ? 'ENGAGED' : 'OFF (NORMAL)'}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => setShowKillSwitchConfirm(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--accent-cyan)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {systemStatus?.executionKillSwitch ? 'Disengage Kill Switch' : 'Engage Emergency Halt'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Metrics & Performance Analytics */}
      {metrics && (
        <Card title="Internal Observability & Reliability Metrics" subtitle="Real-time counters, latency benchmarks, and failure prevention telemetry" className="mb-4" style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>API Requests Total</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4 }}>{metrics.counters?.apiRequestsTotal || 0}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginTop: 2 }}>
                {metrics.performance?.apiSuccessRatePercent}% success rate
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RPC Calls Handled</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4 }}>{metrics.counters?.rpcCallsTotal || 0}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginTop: 2 }}>
                Avg Latency: {metrics.performance?.avgRpcLatencyMs || 0}ms
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duplicates Prevented</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4, color: 'var(--accent-purple)' }}>
                {metrics.counters?.duplicatesPreventedTotal || 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Mutex & Idempotency
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Risk Blocks Enforced</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4, color: '#f59e0b' }}>
                {metrics.counters?.riskBlocksTotal || 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Ceilings & Blacklists
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Testnet Executions</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4, color: 'var(--accent-cyan)' }}>
                {metrics.counters?.testnetExecutionsTotal || 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {metrics.counters?.testnetExecutionsConfirmed || 0} confirmed
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Security & Operational Audit Log Viewer */}
      <Card
        title="Immutable Operational & Security Audit Trail"
        subtitle="Chronological log of authentication, risk updates, execution requests, and safety events"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="input-select"
              style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 6 }}
            >
              <option value="">All Events</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="EXECUTION_REQUESTED">EXECUTION_REQUESTED</option>
              <option value="EXECUTION_CONFIRMED">EXECUTION_CONFIRMED</option>
              <option value="EXECUTION_REJECTED">EXECUTION_REJECTED</option>
              <option value="EXECUTION_FAILED">EXECUTION_FAILED</option>
              <option value="EXECUTION_KILL_SWITCH_CHANGED">KILL_SWITCH_CHANGED</option>
              <option value="RECOVERY_ATTEMPTED">RECOVERY_ATTEMPTED</option>
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="input-select"
              style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 6 }}
            >
              <option value="">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="SECURITY">SECURITY</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        }
      >
        {loadingLogs ? (
          <SkeletonTable rows={5} />
        ) : auditLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <div>No audit events recorded for current filters</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <th style={{ padding: '10px 12px' }}>TIMESTAMP</th>
                  <th style={{ padding: '10px 12px' }}>EVENT TYPE</th>
                  <th style={{ padding: '10px 12px' }}>SEVERITY</th>
                  <th style={{ padding: '10px 12px' }}>RESOURCE</th>
                  <th style={{ padding: '10px 12px' }}>ACTION</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id || log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      {log.eventType}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge variant={getSeverityBadgeVariant(log.severity)}>
                        {log.severity}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                      {log.resourceType}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          color: 'var(--text-primary)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Showing page {auditPage} of {auditPages} ({auditTotal} total records)
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={auditPage <= 1}
                  onClick={() => fetchLogs(auditPage - 1, filterEvent, filterSeverity)}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={auditPage >= auditPages}
                  onClick={() => fetchLogs(auditPage + 1, filterEvent, filterSeverity)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Kill Switch Modal */}
      {showKillSwitchConfirm && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: systemStatus?.executionKillSwitch ? 'var(--accent-green)' : '#ef4444', marginBottom: 16 }}>
              <AlertTriangle size={28} />
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                {systemStatus?.executionKillSwitch ? 'Disengage Kill Switch?' : 'Engage Emergency Kill Switch?'}
              </h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 20 }}>
              {systemStatus?.executionKillSwitch
                ? 'Disengaging the emergency kill switch will restore testnet execution capabilities for approved copy rules and testnet transactions.'
                : 'Engaging the emergency kill switch will IMMEDIATELY halt all testnet execution, signing, and broadcasts server-wide. All copy rules will fail safely.'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button variant="secondary" onClick={() => setShowKillSwitchConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant={systemStatus?.executionKillSwitch ? 'primary' : 'danger'}
                onClick={handleToggleKillSwitch}
                isLoading={killSwitchUpdating}
              >
                {systemStatus?.executionKillSwitch ? 'Confirm Disengage' : 'Engage Emergency Halt'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Inspection Modal */}
      {selectedLog && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="card" style={{ maxWidth: 600, width: '100%', padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Audit Event Details</h3>
              <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.85rem' }}>
              <div><strong>Event:</strong> {selectedLog.eventType}</div>
              <div><strong>Severity:</strong> <Badge variant={getSeverityBadgeVariant(selectedLog.severity)}>{selectedLog.severity}</Badge></div>
              <div><strong>Timestamp:</strong> {new Date(selectedLog.createdAt).toISOString()}</div>
              <div><strong>Action:</strong> <code style={{ color: 'var(--accent-cyan)' }}>{selectedLog.action}</code></div>
              <div><strong>Request ID:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedLog.requestId || 'N/A'}</span></div>
              <div><strong>IP Address:</strong> {selectedLog.ipAddress || 'Unknown'}</div>
              <div><strong>User Agent:</strong> <span style={{ color: 'var(--text-muted)' }}>{selectedLog.userAgent || 'Unknown'}</span></div>

              <div style={{ marginTop: 8 }}>
                <strong>Sanitized Details Payload:</strong>
                <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 6, fontSize: '0.8rem', overflowX: 'auto', marginTop: 6, color: '#e2e8f0' }}>
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsPage;
