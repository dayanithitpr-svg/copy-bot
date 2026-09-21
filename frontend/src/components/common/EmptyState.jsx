import React from 'react';
import { Layers } from 'lucide-react';

const EmptyState = ({
  icon: Icon = Layers,
  title = 'No Data Available',
  description = 'Data for this section will be populated once live features are enabled in upcoming phases.',
  action = null
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={28} />
      </div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-desc">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
