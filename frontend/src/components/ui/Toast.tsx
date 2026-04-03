import { create } from 'zustand';
import { useEffect } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastState {
  toasts: ToastItem[];
  add: (message: string, type?: 'success' | 'error' | 'info') => void;
  remove: (id: number) => void;
}

let nextId = 0;
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'info') => {
    const id = ++nextId;
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000);
  },
  remove: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

const TYPE_COLORS = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',
};

export function ToastContainer() {
  const toasts = useToastStore(s => s.toasts);

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 2000,
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: 'var(--color-dark)', color: 'var(--color-white)',
          padding: '12px 20px', borderRadius: 'var(--radius)',
          borderLeft: `4px solid ${TYPE_COLORS[t.type]}`,
          fontSize: 'var(--text-sm)', boxShadow: 'var(--shadow-md)',
          minWidth: '280px', maxWidth: '400px',
          animation: 'slideIn 0.2s ease-out',
        }}>
          {t.message}
          <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
      ))}
    </div>
  );
}
