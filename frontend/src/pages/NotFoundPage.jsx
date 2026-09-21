import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';
import Button from '../components/common/Button';

const NotFoundPage = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 24,
        background: 'var(--bg-primary)'
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(244, 63, 94, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-rose)',
          marginBottom: 20
        }}
      >
        <AlertCircle size={32} />
      </div>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 8 }}>404</h1>
      <h2 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: 400, marginBottom: 32 }}>
        The requested URL was not found on this server.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" icon={<Home size={18} />}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
