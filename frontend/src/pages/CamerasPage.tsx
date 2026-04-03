import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Loader } from '@/components/ui/Loader';
import { formatTimeAgo } from '@/utils/format';
import type { Camera } from '@/types';

export function CamerasPage() {
  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => api.get<Camera[]>('/cameras'),
    refetchInterval: 30000,
  });

  const online = cameras.filter(c => c.status === 'online').length;
  const offline = cameras.filter(c => c.status !== 'online').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>КАМЕРЫ</h1>
        <div style={{ display: 'flex', gap: '12px', fontSize: 'var(--text-sm)' }}>
          <span style={{ color: 'var(--color-status-normal)', fontWeight: 600 }}>● {online} онлайн</span>
          <span style={{ color: 'var(--color-status-critical)', fontWeight: 600 }}>● {offline} оффлайн</span>
        </div>
      </div>

      {isLoading ? <Loader /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {cameras.map(cam => (
            <div key={cam.id} style={{
              background: 'var(--color-white)', border: 'var(--border)', borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}>
              {/* Preview area */}
              <div style={{
                height: '120px', background: cam.status === 'online' ? '#1a2a1a' : '#2a1a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: cam.status === 'online' ? 'var(--color-status-normal)' : 'var(--color-status-critical)',
                fontSize: 'var(--text-sm)', position: 'relative',
              }}>
                <span style={{ opacity: 0.6 }}>📷 {cam.status === 'online' ? 'Live preview' : 'Нет сигнала'}</span>
                <div style={{
                  position: 'absolute', top: '8px', right: '8px',
                }}>
                  <StatusBadge status={cam.status} />
                </div>
              </div>

              <div style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 700 }}>{cam.code}</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{cam.name}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ opacity: 0.5 }}>Площадка: </span>
                    <span style={{ fontWeight: 500 }}>{cam.site_id ? `#${cam.site_id}` : '—'}</span>
                  </div>
                  <div>
                    <span style={{ opacity: 0.5 }}>Интервал: </span>
                    <span style={{ fontWeight: 500 }}>{cam.polling_interval_sec}с</span>
                  </div>
                  <div>
                    <span style={{ opacity: 0.5 }}>Ошибки: </span>
                    <span style={{ fontWeight: 500, color: cam.error_count > 0 ? 'var(--color-status-critical)' : 'inherit' }}>
                      {cam.error_count}
                    </span>
                  </div>
                  <div>
                    <span style={{ opacity: 0.5 }}>Активность: </span>
                    <span style={{ fontWeight: 500 }}>{formatTimeAgo(cam.last_seen_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
