export function Loader({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-lg)',
    }}>
      <div style={{
        width: size, height: size, border: '3px solid var(--color-muted)',
        borderTopColor: 'var(--color-accent)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function Skeleton({ width = '100%', height = 20 }: { width?: string | number; height?: number }) {
  return (
    <div style={{
      width, height, background: 'var(--color-muted)', borderRadius: 'var(--radius-sm)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}
