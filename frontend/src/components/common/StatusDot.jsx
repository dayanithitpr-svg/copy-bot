import React from 'react';

export const StatusDot = ({ status = 'online', label, showLabel = true, pulse = true }) => {
  const getDotClass = () => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'online':
      case 'connected':
      case 'healthy':
      case 'success':
        return 'status-dot-active';
      case 'warning':
      case 'degraded':
        return 'status-dot-warning';
      case 'error':
      case 'offline':
      case 'disconnected':
      case 'unhealthy':
        return 'status-dot-error';
      default:
        return 'status-dot-idle';
    }
  };

  return (
    <span className="status-indicator" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span className={`status-dot ${getDotClass()} ${pulse ? 'status-dot-pulse' : ''}`} />
      {showLabel && <span className="status-label">{label || status}</span>}
    </span>
  );
};
