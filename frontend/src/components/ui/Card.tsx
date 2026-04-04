import { ReactNode, CSSProperties } from 'react';

interface Props {
  children: ReactNode;
  dark?: boolean;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export function Card({ children, dark, style, onClick, active }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        background: dark ? 'var(--color-dark)' : 'var(--color-white)',
        color: dark ? 'var(--color-text-light)' : 'var(--color-text)',
        border: active ? 'var(--border-accent)' : 'var(--border)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-md)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
