import { create } from 'zustand';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export type ToastPlacement = 'default' | 'dashboard-map';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  placement: ToastPlacement;
  href?: string;
}

interface ToastState {
  toasts: ToastItem[];
  add: (
    message: string,
    type?: 'success' | 'error' | 'info',
    placement?: ToastPlacement,
    href?: string,
  ) => void;
  remove: (id: number) => void;
}

let nextId = 0;
const TOAST_LIFETIME_MS = 6000;
const TOAST_FADE_OUT_MS = 350;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'info', placement = 'default', href) => {
    const id = ++nextId;
    set(s => ({ toasts: [...s.toasts, { id, message, type, placement, href }] }));
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

interface ToastCardProps {
  toast: ToastItem;
  onRemove: (id: number) => void;
}

function ToastCard({ toast, onRemove }: ToastCardProps) {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);
  const remainingMsRef = useRef(TOAST_LIFETIME_MS);
  const startedAtRef = useRef(Date.now());
  const fadeTimeoutRef = useRef<number | null>(null);
  const removeTimeoutRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (fadeTimeoutRef.current !== null) {
      window.clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    if (removeTimeoutRef.current !== null) {
      window.clearTimeout(removeTimeoutRef.current);
      removeTimeoutRef.current = null;
    }
  };

  const scheduleTimers = (durationMs: number) => {
    clearTimers();
    startedAtRef.current = Date.now();

    const safeDurationMs = Math.max(durationMs, TOAST_FADE_OUT_MS);
    remainingMsRef.current = safeDurationMs;
    setIsExiting(false);

    const fadeDelayMs = Math.max(safeDurationMs - TOAST_FADE_OUT_MS, 0);

    fadeTimeoutRef.current = window.setTimeout(() => {
      setIsExiting(true);
    }, fadeDelayMs);

    removeTimeoutRef.current = window.setTimeout(() => {
      onRemove(toast.id);
    }, safeDurationMs);
  };

  useEffect(() => {
    scheduleTimers(TOAST_LIFETIME_MS);
    return clearTimers;
  }, [toast.id]);

  const pauseTimers = () => {
    const elapsedMs = Date.now() - startedAtRef.current;
    remainingMsRef.current = Math.max(
      TOAST_FADE_OUT_MS,
      remainingMsRef.current - elapsedMs,
    );
    clearTimers();
    setIsExiting(false);
  };

  const resumeTimers = () => {
    scheduleTimers(remainingMsRef.current);
  };

  const clickable = Boolean(toast.href);

  return (
    <div
      onMouseEnter={pauseTimers}
      onMouseLeave={resumeTimers}
      onClick={() => {
        if (!toast.href) return;
        onRemove(toast.id);
        navigate(toast.href);
      }}
      style={{
        background: 'var(--color-dark)',
        color: 'var(--color-text-light)',
        padding: '12px 20px',
        borderRadius: 'var(--radius)',
        borderLeft: `4px solid ${TYPE_COLORS[toast.type]}`,
        fontSize: 'var(--text-sm)',
        boxShadow: 'var(--shadow-md)',
        minWidth: '280px',
        maxWidth: '400px',
        cursor: clickable ? 'pointer' : 'default',
        pointerEvents: 'auto',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translateX(8px)' : 'translateX(0)',
        transition: `opacity ${TOAST_FADE_OUT_MS}ms ease-in, transform ${TOAST_FADE_OUT_MS}ms ease-in`,
        animation: 'slideIn 0.2s ease-out',
      }}
      title={clickable ? 'Открыть тревогу' : undefined}
    >
      {toast.message}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function ToastContainer({ placements = ['default'], style }: ToastContainerProps) {
  const toasts = useToastStore(s => s.toasts);
  const removeToast = useToastStore(s => s.remove);
  const visibleToasts = toasts.filter(toast => placements.includes(toast.placement));

  if (visibleToasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 'calc(var(--topbar-height) + 12px)', right: 16, zIndex: 2000,
      display: 'flex', flexDirection: 'column', gap: '8px',
      ...style,
    }}>
      {visibleToasts.map(toast => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
}
