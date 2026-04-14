import { create } from 'zustand';
import type { CSSProperties } from 'react';

export type ToastPlacement = 'default' | 'dashboard-map';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  placement: ToastPlacement;
}

interface ToastState {
  toasts: ToastItem[];
  add: (message: string, type?: 'success' | 'error' | 'info', placement?: ToastPlacement) => void;
  remove: (id: number) => void;
}

let nextId = 0;
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'info', placement = 'default') => {
    const id = ++nextId;
    set(s => ({ toasts: [...s.toasts, { id, message, type, placement }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000);
  },
  remove: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

const TYPE_COLORS = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',
};

interface ToastContainerProps {
  placements?: ToastPlacement[];
  style?: CSSProperties;
}

export function ToastContainer({ placements = ['default'], style }: ToastContainerProps) {
  const toasts = useToastStore(s => s.toasts);
  const visibleToasts = toasts.filter(toast => placements.includes(toast.placement));

  if (visibleToasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 'calc(var(--topbar-height) + 12px)', right: 16, zIndex: 2000,
      display: 'flex', flexDirection: 'column', gap: '8px',
      ...style,
    }}>
      {visibleToasts.map(t => (
        <div key={t.id} style={{
          background: 'var(--color-dark)', color: 'var(--color-text-light)',
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
