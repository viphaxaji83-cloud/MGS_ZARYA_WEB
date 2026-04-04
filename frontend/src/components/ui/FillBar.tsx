interface Props {
  level: number;
  height?: number;
  trackColor?: string;
}

export function FillBar({ level, height = 6, trackColor = 'var(--color-muted)' }: Props) {
  const color = level < 60 ? 'var(--color-status-normal)' :
                level < 85 ? 'var(--color-status-warning)' :
                'var(--color-status-critical)';

  return (
    <div style={{
      width: '100%', height: `${height}px`,
      background: trackColor, borderRadius: '3px',
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, level))}%`, height: '100%',
        background: color, borderRadius: '3px',
        transition: 'width var(--transition)',
      }} />
    </div>
  );
}
