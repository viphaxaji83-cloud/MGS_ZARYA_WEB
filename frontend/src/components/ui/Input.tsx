import { InputHTMLAttributes, forwardRef } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, style, ...props }, ref) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <label style={{
          fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.05em', color: 'var(--color-text)', opacity: 0.7,
        }}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        style={{
          padding: '10px 14px',
          fontSize: 'var(--text-base)',
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text)',
          background: 'var(--color-white)',
          border: error ? '1px solid var(--color-error)' : 'var(--border)',
          borderRadius: 'var(--radius)',
          outline: 'none',
          transition: 'border-color var(--transition-fast)',
          width: '100%',
          ...style,
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{error}</span>
      )}
    </div>
  );
});
