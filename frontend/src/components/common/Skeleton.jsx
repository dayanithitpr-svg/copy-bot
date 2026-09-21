import React from 'react';

export const Skeleton = ({ width = '100%', height = '20px', borderRadius = 'var(--radius-md)', className = '' }) => {
  return (
    <div
      className={`skeleton-loader ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
};

export const SkeletonCard = () => (
  <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <Skeleton height="24px" width="40%" />
    <Skeleton height="36px" width="70%" />
    <Skeleton height="16px" width="50%" />
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 5 }) => (
  <div className="card">
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Skeleton height="16px" width="80px" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><Skeleton height="18px" width={c === 0 ? '120px' : '80px'} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
