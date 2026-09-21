import React from 'react';
import { Users, Search, Filter, ShieldCheck, ArrowUpRight } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';

const TradersPlaceholderPage = () => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: 4 }}>Traders Discovery</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Discover and analyze top performing decentralized traders (Phase 2 feature).
          </p>
        </div>
        <Badge variant="demo">Demo Shell / Phase 2</Badge>
      </div>

      <Card>
        <EmptyState
          icon={Users}
          title="Trader Tracking is Scheduled for Phase 2"
          description="In Phase 2, this section will allow searching public wallet addresses, ranking traders by ROI and win rate, and exploring detailed transaction graphs without exposing private keys."
        />
      </Card>
    </div>
  );
};

export default TradersPlaceholderPage;
