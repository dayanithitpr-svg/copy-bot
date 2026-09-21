import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Badge from './Badge';

const DemoDisclaimerBanner = () => {
  return (
    <div className="disclaimer-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <AlertTriangle size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Phase 1 Foundation Mode:</strong> All metrics, trader lists, and portfolio balances shown on this platform are sample demonstrative data. No live wallets or real-money trading connections are active.
        </div>
      </div>
      <Badge variant="demo">Sample / Not Real Data</Badge>
    </div>
  );
};

export default DemoDisclaimerBanner;
