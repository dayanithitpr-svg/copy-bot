import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import DemoDisclaimerBanner from '../common/DemoDisclaimerBanner';

const getPageTitle = (pathname) => {
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname.startsWith('/traders')) return 'Tracked Traders';
  if (pathname.startsWith('/activity')) return 'Activity Explorer';
  if (pathname.startsWith('/copy-rules') || pathname.startsWith('/copy-trades')) return 'Copy Trading Rules';
  if (pathname.startsWith('/paper-trading') || pathname.startsWith('/portfolio')) return 'Paper Trading & Portfolio';
  if (pathname.startsWith('/monitoring')) return 'Monitoring Engine';
  if (pathname.startsWith('/settings')) return 'Security & Settings';
  return 'CryptoCopy Platform';
};

const MainLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const title = getPageTitle(location.pathname);

  return (
    <div className="app-container">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Topbar
          title={title}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="content-area">
          <DemoDisclaimerBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
