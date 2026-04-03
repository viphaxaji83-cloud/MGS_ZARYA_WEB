import { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const styles: Record<string, React.CSSProperties> = {
  base: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    fontFamily: 'var(--font-body)', fontWeight: 600, letterSpacing: '0.03em',
    textTransform: 'uppercase', border: 'none', borderRadius: 'var(--radius)',
    cursor: 'pointer', transition: 'all var(--transition-fast)',
    whiteSpace: 'nowrap', lineHeight: 1,
  },
  primary: { background: 'var(--color-accent)', color: 'var(--color-white)' },
  outline: { background: 'transparent', color: 'var(--color-accent)', border: 'var(--border-accent)' },
  ghost: { background: 'transparent', color: 'var(--color-text)' },
  danger: { background: 'var(--color-error)', color: 'var(--color-white)' },
  sm: { padding: '6px 12px', fontSize: 'var(--text-xs)' },
  md: { padding: '10px 20px', fontSize: 'var(--text-sm)' },
  lg: { padding: '14px 28px', fontSize: 'var(--text-base)' },
};

export function Button({ variant = 'primary', size = 'md', children, style, disabled, ...props }: Props) {
  return (
    <button
      style={{
        ...styles.base, ...styles[variant], ...styles[size],
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : undefined,
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
