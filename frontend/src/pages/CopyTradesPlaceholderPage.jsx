import React from 'react';
import { Copy, AlertCircle, Sliders, Shield } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';

const CopyTradesPlaceholderPage = () => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: 4 }}>Copy Trading Engine</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Configure risk parameters, slippage tolerance, and simulated paper execution rules.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Badge variant="paper">Paper Trading Mode</Badge>
          <Badge variant="demo">Phase 3 Feature</Badge>
        </div>
      </div>

      <Card>
        <EmptyState
          icon={Copy}
          title="Copy Trading Engine Scheduled for Phase 3"
          description="In Phase 3, this engine will execute zero-risk paper trade simulations first before any user-authorized live wallet mirroring is made available in later phases."
        />
      </Card>
    </div>
  );
};

export default CopyTradesPlaceholderPage;
