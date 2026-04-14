import { statusLabel } from '@/utils/format';

const STATUS_COLORS: Record<string, string> = {
  normal: 'var(--color-status-normal)',
  warning: 'var(--color-status-warning)',
  critical: 'var(--color-status-critical)',
  no_data: 'var(--color-status-no-data)',
  offline: 'var(--color-status-offline)',
  online: 'var(--color-status-normal)',
  error: 'var(--color-error)',
  maintenance: 'var(--color-status-warning)',
  new: 'var(--color-info)',
  confirmed: 'var(--color-status-normal)',
  false_positive: 'var(--color-status-offline)',
  viewed: 'var(--color-info)',
  closed: 'var(--color-status-normal)',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'var(--color-severity-low)',
  medium: 'var(--color-severity-medium)',
  high: 'var(--color-severity-high)',
  critical: 'var(--color-severity-critical)',
};

interface Props {
  status: string;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  kind?: 'status' | 'severity';
}

export function StatusBadge({ status, label, size = 'sm', kind = 'status' }: Props) {
  const palette = kind === 'severity' ? SEVERITY_COLORS : STATUS_COLORS;
  const color = palette[status] || 'var(--color-status-no-data)';
  const text = label || statusLabel(status);
  const px = size === 'xs' ? '7px' : size === 'sm' ? '8px' : '12px';
  const py = size === 'xs' ? '1px' : size === 'sm' ? '2px' : '4px';
  const fontSize = size === 'xs' ? '11px' : size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${py} ${px}`,
      fontSize,
      fontWeight: 600,
      fontFamily: 'var(--font-body)',
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
      color,
      border: `1px solid ${color}`,
      borderRadius: 'var(--radius-sm)',
      whiteSpace: 'nowrap',
      textAlign: 'center',
    }}>
      <span style={{ display: 'inline-block', transform: 'translateY(1px)' }}>{text}</span>
    </span>
  );
}
