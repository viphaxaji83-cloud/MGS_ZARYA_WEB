import { ReactNode, useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, width = 480 }: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(17,17,17,0.5)', backdropFilter: 'blur(2px)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)', width: `${width}px`, maxWidth: '95vw',
        maxHeight: '90vh', overflow: 'auto',
      }} onClick={e => e.stopPropagation()}>
        {title && (
          <div style={{
            padding: '20px 24px 16px', borderBottom: 'var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-heading)', margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer',
              color: 'var(--color-text)', opacity: 0.5, padding: '4px',
            }}>✕</button>
          </div>
        )}
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
}
