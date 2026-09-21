import React from 'react';
import { PieChart, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';

const PortfolioPlaceholderPage = () => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: 4 }}>Portfolio Breakdown</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Aggregated paper and mirror asset distribution.
          </p>
        </div>
        <Badge variant="demo">Demo Portfolio Shell</Badge>
      </div>

      <Card>
        <EmptyState
          icon={PieChart}
          title="Portfolio Synchronization Scheduled for Phase 3"
          description="In Phase 3, you will view comprehensive profit/loss breakdown, win rate distributions, and allocation summaries across all mirrored strategies."
        />
      </Card>
    </div>
  );
};

export default PortfolioPlaceholderPage;
