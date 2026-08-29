import React from 'react';
import { useExpense } from '../context/ExpenseContext';
import {
  LayoutDashboard,
  Receipt,
  Target,
  Repeat,
  TrendingUp,
  Settings
} from 'lucide-react';

export const Navigation = () => {
  const { activeTab, setActiveTab } = useExpense();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'budgets', label: 'Monthly Budgets', icon: Target },
    { id: 'subscriptions', label: 'Recurring & Bills', icon: Repeat },
    { id: 'analytics', label: 'Deep Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings & Data', icon: Settings }
  ];

  return (
    <nav className="nav-bar">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            className={`nav-tab ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
