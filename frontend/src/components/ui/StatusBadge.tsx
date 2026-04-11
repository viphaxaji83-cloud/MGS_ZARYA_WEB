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
  viewed: 'var(--color-status-warning)',
  confirmed: 'var(--color-status-normal)',
  closed: 'var(--color-status-no-data)',
  false_positive: 'var(--color-status-offline)',
  low: 'var(--color-severity-low)',
  medium: 'var(--color-severity-medium)',
  high: 'var(--color-severity-high)',
};

interface Props {
  status: string;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
}

export function StatusBadge({ status, label, size = 'sm' }: Props) {
  const color = STATUS_COLORS[status] || 'var(--color-status-no-data)';
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
