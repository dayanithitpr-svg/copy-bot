import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const Alert = ({ type = 'error', message, details = [] }) => {
  if (!message) return null;

  const Icon = type === 'success' ? CheckCircle2 : type === 'info' ? Info : AlertCircle;

  return (
    <div className={`alert alert-${type}`}>
      <Icon size={18} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div>{message}</div>
        {details.length > 0 && (
          <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: '0.8rem' }}>
            {details.map((d, i) => (
              <li key={i}>{d.message || d}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Alert;
