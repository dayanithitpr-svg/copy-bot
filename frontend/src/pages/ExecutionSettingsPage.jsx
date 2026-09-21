import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Save,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Fuel,
  Cpu,
  Layers,
  Terminal,
  Activity,
  Lock,
  ArrowRight
} from 'lucide-react';
import { executionService } from '../services/executionService';
import { useToast } from '../hooks/useToast';
import Badge from '../components/common/Badge';
import { SkeletonTable } from '../components/common/Skeleton';

const ExecutionSettingsPage = () => {
  const { success, error: toastError } = useToast();

  // Config State
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [networksData, setNetworksData] = useState([]);
  const [isTestnetModalOpen, setIsTestnetModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    mode: 'PAPER',
    enabled: false,
    allowedNetworks: ['sepolia', 'base-sepolia'],
    maxExecutionAmount: 100,
    maxDailyExecutionAmount: 500,
    maxGasCostGwei: 50,
    maxSlippageBps: 100
  });

  // Dry Run State
  const [dryRunAmount, setDryRunAmount] = useState(50);
  const [dryRunNetwork, setDryRunNetwork] = useState('sepolia');
  const [dryRunResult, setDryRunResult] = useState(null);
  const [evaluatingDryRun, setEvaluatingDryRun] = useState(false);

  // Audit Records State
  const [records, setRecords] = useState([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPages, setRecordsPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterNetwork, setFilterNetwork] = useState('');
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchConfigAndNetworks = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const [configData, netData] = await Promise.all([
        executionService.getConfig(),
        executionService.getNetworks()
      ]);

      if (configData) {
        setConfig(configData);
        setFormData({
          mode: configData.mode || 'PAPER',
          enabled: Boolean(configData.enabled),
          allowedNetworks: configData.allowedNetworks || ['sepolia', 'base-sepolia'],
          maxExecutionAmount: configData.maxExecutionAmount ?? 100,
          maxDailyExecutionAmount: configData.maxDailyExecutionAmount ?? 500,
          maxGasCostGwei: configData.maxGasCostGwei ?? 50,
          maxSlippageBps: configData.maxSlippageBps ?? 100
        });
      }

      if (netData?.networks) {
        setNetworksData(netData.networks);
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to load execution settings');
    } finally {
      setLoadingConfig(false);
    }
  }, [toastError]);

  const fetchRecords = useCallback(async (page = 1, status = '', network = '') => {
    setLoadingRecords(true);
    try {
      const filters = {};
      if (status) filters.status = status;
      if (network) filters.network = network;

      const res = await executionService.getRecords(filters, page, 10);
      setRecords(res?.data || []);
      setRecordsTotal(res?.pagination?.total || 0);
      setRecordsPage(res?.pagination?.page || 1);
      setRecordsPages(res?.pagination?.pages || 1);
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to fetch execution records');
    } finally {
      setLoadingRecords(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchConfigAndNetworks();
    fetchRecords(1, filterStatus, filterNetwork);
  }, [fetchConfigAndNetworks, fetchRecords, filterStatus, filterNetwork]);

  const handleSave = async (updatedFields = {}) => {
    setSaving(true);
    try {
      const payload = { ...formData, ...updatedFields };
      const updated = await executionService.updateConfig(payload);
      setConfig(updated);
      setFormData({
        mode: updated.mode,
        enabled: Boolean(updated.enabled),
        allowedNetworks: updated.allowedNetworks,
        maxExecutionAmount: updated.maxExecutionAmount,
        maxDailyExecutionAmount: updated.maxDailyExecutionAmount,
        maxGasCostGwei: updated.maxGasCostGwei,
        maxSlippageBps: updated.maxSlippageBps
      });
      success('Execution configuration updated successfully');
    } catch (err) {
      toastError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleModeChange = (newMode) => {
    if (newMode === 'TESTNET') {
      setIsTestnetModalOpen(true);
    } else {
      setFormData((prev) => ({ ...prev, mode: 'PAPER' }));
      handleSave({ mode: 'PAPER' });
    }
  };

  const confirmSwitchToTestnet = () => {
    setFormData((prev) => ({ ...prev, mode: 'TESTNET', enabled: true }));
    handleSave({ mode: 'TESTNET', enabled: true });
    setIsTestnetModalOpen(false);
  };

  const toggleNetwork = (netId) => {
    setFormData((prev) => {
      const exists = prev.allowedNetworks.includes(netId);
      const newNets = exists
        ? prev.allowedNetworks.filter((n) => n !== netId)
        : [...prev.allowedNetworks, netId];
      return { ...prev, allowedNetworks: newNets };
    });
  };

  const runSafetyDryRun = async () => {
    setEvaluatingDryRun(true);
    setDryRunResult(null);
    try {
      const result = await executionService.validateDryRun({
        proposedAmount: Number(dryRunAmount),
        network: dryRunNetwork
      });
      setDryRunResult(result);
    } catch (err) {
      toastError(err.response?.data?.message || 'Safety evaluation dry-run failed');
    } finally {
      setEvaluatingDryRun(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="success" icon={CheckCircle2} label="Confirmed" />;
      case 'SUBMITTED':
      case 'CONFIRMING':
        return <Badge variant="info" icon={RefreshCw} label={status} />;
      case 'BUILDING':
      case 'VALIDATED':
        return <Badge variant="warning" icon={Cpu} label={status} />;
      case 'REJECTED':
        return <Badge variant="danger" icon={XCircle} label="Rejected" />;
      case 'FAILED':
        return <Badge variant="danger" icon={AlertTriangle} label="Failed" />;
      default:
        return <Badge variant="neutral" label={status || 'Unknown'} />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
              <Zap className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Execution Engine & Testnet Gate</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Phase 8 Verified
            </span>
          </div>
          <p className="text-slate-400 text-sm max-w-2xl">
            Controlled testnet execution engine with strict multi-layer pre-signing safety checks, testnet router integration, and isolated simulation mode.
          </p>
        </div>

        {/* Global Security Shield Badge */}
        <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 backdrop-blur-md">
          <div className={`p-2 rounded-lg ${formData.mode === 'TESTNET' && formData.enabled ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
            {formData.mode === 'TESTNET' && formData.enabled ? <Activity className="w-5 h-5 animate-pulse" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Current Mode</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              {formData.mode === 'TESTNET' ? (
                formData.enabled ? <span className="text-amber-400">TESTNET ACTIVE</span> : <span className="text-slate-400">TESTNET PAUSED</span>
              ) : (
                <span className="text-emerald-400">PAPER SIMULATION</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mainnet Safety Disclaimer Alert */}
      <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 text-sm text-blue-200 flex items-start gap-3">
        <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-blue-300 font-semibold">Strict Zero-Mainnet Enforcement:</strong> All mainnet chains (Ethereum, Base, Polygon, Solana Mainnets) are hardcoded-rejected by the execution safety gate. Testnet trades only operate on Sepolia, Base Sepolia, and Polygon Amoy testnet faucets with zero real capital risk.
        </div>
      </div>

      {/* Execution Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Mode Selector & Safety Limits */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Execution Mode Switcher */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              Execution Mode
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Paper Trading Mode Card */}
              <div
                onClick={() => handleModeChange('PAPER')}
                className={`cursor-pointer rounded-xl p-5 border transition-all ${
                  formData.mode === 'PAPER'
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                    <span className="font-bold text-white">Paper Simulation</span>
                  </div>
                  {formData.mode === 'PAPER' && (
                    <span className="w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                  )}
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Virtual execution in memory and database. Zero blockchain broadcast, zero faucet gas needed. Safe default for copy-trading verification.
                </p>
              </div>

              {/* Testnet Execution Mode Card */}
              <div
                onClick={() => handleModeChange('TESTNET')}
                className={`cursor-pointer rounded-xl p-5 border transition-all ${
                  formData.mode === 'TESTNET'
                    ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/50'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                      <Zap className="w-5 h-5" />
                    </span>
                    <span className="font-bold text-white">Testnet Broadcast</span>
                  </div>
                  {formData.mode === 'TESTNET' && (
                    <span className="w-3 h-3 rounded-full bg-amber-400 ring-4 ring-amber-400/20" />
                  )}
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Broadcasts real transactions on Sepolia / Base Sepolia / Amoy testnets via server execution signer. Verifies on-chain receipt and gas.
                </p>
              </div>
            </div>

            {/* Testnet Master Toggle */}
            {formData.mode === 'TESTNET' && (
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Testnet Execution Active</div>
                  <div className="text-xs text-slate-400">Pause or resume testnet transaction broadcasting</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.enabled ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Card: Safety Limits and Budget Parameters */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Fuel className="w-5 h-5 text-indigo-400" />
              Safety Limits & Gas Bounds
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Max Single Trade Amount */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Max Single Trade (USD/Tokens)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={formData.maxExecutionAmount}
                    onChange={(e) => setFormData({ ...formData, maxExecutionAmount: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-500 font-mono font-medium">MAX</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">Ceiling per copied swap transaction</p>
              </div>

              {/* Max Daily Execution Amount */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Max Daily Limit (24h Budget)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="20000"
                    value={formData.maxDailyExecutionAmount}
                    onChange={(e) => setFormData({ ...formData, maxDailyExecutionAmount: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-500 font-mono font-medium">24H</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Spent Today: <strong className="text-indigo-400">${config?.dailySpent || 0}</strong>
                </p>
              </div>

              {/* Max Gas Price Gwei */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Max Gas Ceiling (Gwei)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.maxGasCostGwei}
                    onChange={(e) => setFormData({ ...formData, maxGasCostGwei: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-500 font-mono font-medium">GWEI</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">Rejects transaction if testnet base gas exceeds limit</p>
              </div>

              {/* Max Slippage BPS */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Max Slippage Tolerance
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={formData.maxSlippageBps}
                    onChange={(e) => setFormData({ ...formData, maxSlippageBps: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-500 font-mono font-medium">{formData.maxSlippageBps / 100}%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">100 bps = 1.0% maximum price slippage</p>
              </div>
            </div>

            {/* Allowed Testnet Networks */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Allowed Testnet Chains
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'sepolia', name: 'Ethereum Sepolia', chainId: 11155111 },
                  { id: 'base-sepolia', name: 'Base Sepolia', chainId: 84532 },
                  { id: 'polygon-amoy', name: 'Polygon Amoy', chainId: 80002 }
                ].map((net) => {
                  const isChecked = formData.allowedNetworks.includes(net.id);
                  return (
                    <div
                      key={net.id}
                      onClick={() => toggleNetwork(net.id)}
                      className={`cursor-pointer rounded-lg p-3 border text-xs flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-indigo-950/30 border-indigo-500/40 text-white'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{net.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Chain: {net.chainId}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Execution Settings
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Pre-Execution Safety Checker Dry-Run */}
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              Safety Gate Checker
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Test a hypothetical trade against the 10-point execution safety gate without submitting.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Simulated Amount ($)</label>
                <input
                  type="number"
                  value={dryRunAmount}
                  onChange={(e) => setDryRunAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Target Network</label>
                <select
                  value={dryRunNetwork}
                  onChange={(e) => setDryRunNetwork(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="sepolia">Sepolia Testnet</option>
                  <option value="base-sepolia">Base Sepolia</option>
                  <option value="polygon-amoy">Polygon Amoy</option>
                  <option value="ethereum">Ethereum Mainnet (Safety Trap)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={runSafetyDryRun}
                disabled={evaluatingDryRun}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-all border border-slate-700"
              >
                {evaluatingDryRun ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                Evaluate Pre-Signing Safety
              </button>

              {dryRunResult && (
                <div
                  className={`mt-4 p-4 rounded-xl border text-xs space-y-2.5 transition-all ${
                    dryRunResult.allowed
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span className="flex items-center gap-1.5">
                      {dryRunResult.allowed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      {dryRunResult.allowed ? 'PASS: Safe for Execution' : 'BLOCKED by Gate'}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-black/30">
                      {dryRunResult.reason || 'ALL CHECKS PASSED'}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800/60 max-h-48 overflow-y-auto">
                    {(dryRunResult.checkDetails || []).map((c, i) => (
                      <div key={i} className="flex items-start justify-between text-[11px] gap-2">
                        <span className="text-slate-400">{c.name}:</span>
                        <span className={`font-mono text-right ${c.status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Testnet Verified Tokens Allowlist */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Allowlisted Testnet Routers & Faucets
            </h3>
            <div className="space-y-3 text-xs text-slate-400">
              {networksData.map((net) => (
                <div key={net.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-white font-semibold mb-1">
                    <span>{net.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">ID: {net.chainId}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate mb-1">
                    Router: {net.uniswapV2Router}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(net.tokens || []).map((t) => (
                      <span key={t.symbol} className="px-1.5 py-0.5 bg-slate-800 text-[10px] rounded text-indigo-300 font-mono">
                        {t.symbol}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table: Testnet Execution Records */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              On-Chain Testnet Execution Audit Log
            </h2>
            <p className="text-xs text-slate-400">
              Comprehensive cryptographic audit trail for all testnet transactions, statuses, gas, and receipts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="FAILED">FAILED</option>
            </select>

            <select
              value={filterNetwork}
              onChange={(e) => setFilterNetwork(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Networks</option>
              <option value="sepolia">Sepolia</option>
              <option value="base-sepolia">Base Sepolia</option>
              <option value="polygon-amoy">Polygon Amoy</option>
            </select>

            <button
              type="button"
              onClick={() => fetchRecords(1, filterStatus, filterNetwork)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loadingRecords ? (
          <SkeletonTable rows={5} columns={6} />
        ) : records.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
            <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <div className="text-sm font-semibold text-slate-300">No testnet execution records found</div>
            <div className="text-xs text-slate-500 mt-1">
              Testnet transactions triggered by copy rules will be recorded with full hashes and gas metrics here.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400 border-b border-slate-800 bg-slate-950/40">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Network / Mode</th>
                  <th className="py-3 px-4">Pair / Swap</th>
                  <th className="py-3 px-4">Tx Hash & Nonce</th>
                  <th className="py-3 px-4">Gas Used</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {records.map((rec) => (
                  <tr key={rec._id || rec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">{getStatusBadge(rec.status)}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white capitalize">{rec.network}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{rec.executionMode}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-white text-xs">
                        {rec.tokenIn?.amount || '0'} {rec.tokenIn?.symbol || 'IN'} → {rec.tokenOut?.symbol || 'OUT'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Protocol: {rec.protocol}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {rec.transactionHash ? (
                        <a
                          href={rec.explorerUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          {rec.transactionHash.slice(0, 10)}...{rec.transactionHash.slice(-6)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                      {rec.nonce !== null && rec.nonce !== undefined && (
                        <span className="text-[10px] text-slate-500">Nonce: #{rec.nonce}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      {rec.gasUsed ? (
                        <span>{rec.gasUsed.toLocaleString()} units</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(rec.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {recordsPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Showing page {recordsPage} of {recordsPages} ({recordsTotal} total records)
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={recordsPage <= 1}
                onClick={() => fetchRecords(recordsPage - 1, filterStatus, filterNetwork)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={recordsPage >= recordsPages}
                onClick={() => fetchRecords(recordsPage + 1, filterStatus, filterNetwork)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Testnet Confirmation Modal */}
      {isTestnetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Enable Testnet Execution?</h3>
                <p className="text-xs text-slate-400">Please review testnet safety guarantees</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                <strong>1. Testnet Environment Only:</strong> Transactions are strictly sent to public Ethereum/Base/Polygon testnets (Sepolia, Base Sepolia, Amoy).
              </p>
              <p>
                <strong>2. Zero Real Capital Risk:</strong> Mainnets are mathematically blocked. No real funds, ETH, or USD are ever exposed.
              </p>
              <p>
                <strong>3. Automated Safety Gate:</strong> Trades are evaluated through pre-signing slippage, balance, gas, and token registries.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsTestnetModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSwitchToTestnet}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-amber-600/20"
              >
                Confirm & Enable Testnet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionSettingsPage;
