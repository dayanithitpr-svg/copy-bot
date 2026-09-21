import React from 'react';

const Card = ({ children, title = null, subtitle = null, action = null, className = '', style = {} }) => {
  return (
    <div className={`glass-card ${className}`} style={style}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            {title && <h3 style={{ fontSize: '1.2rem', marginBottom: 2 }}>{title}</h3>}
            {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
