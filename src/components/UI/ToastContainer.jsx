import React from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useExpense();

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let className = 'toast-success';
        if (toast.type === 'error') {
          Icon = AlertCircle;
          className = 'toast-error';
        } else if (toast.type === 'info') {
          Icon = Info;
          className = 'toast-info';
        }

        return (
          <div key={toast.id} className={`toast ${className}`}>
            <Icon size={18} />
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
