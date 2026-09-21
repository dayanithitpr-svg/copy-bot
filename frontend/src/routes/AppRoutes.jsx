import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import DashboardPage from '../pages/DashboardPage';
import TradersPage from '../pages/TradersPage';
import ActivityPage from '../pages/ActivityPage';
import CopyRulesPage from '../pages/CopyRulesPage';
import PaperTradingPage from '../pages/PaperTradingPage';
import RiskManagementPage from '../pages/RiskManagementPage';
import CopyTradingPage from '../pages/CopyTradingPage';
import ExecutionSettingsPage from '../pages/ExecutionSettingsPage';
import MonitoringPage from '../pages/MonitoringPage';
import OperationsPage from '../pages/OperationsPage';
import SettingsPage from '../pages/SettingsPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import NotFoundPage from '../pages/NotFoundPage';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Main Application Layout Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="traders" element={<TradersPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="copy-rules" element={<CopyRulesPage />} />
        <Route path="risk-management" element={<RiskManagementPage />} />
        <Route path="risk" element={<RiskManagementPage />} />
        <Route path="copy-trading" element={<CopyTradingPage />} />
        <Route path="execution" element={<ExecutionSettingsPage />} />
        <Route path="operations" element={<OperationsPage />} />
        <Route path="paper-trading" element={<PaperTradingPage />} />
        <Route path="portfolio" element={<PaperTradingPage />} />
        <Route path="copy-trades" element={<CopyRulesPage />} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
