import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Loader } from '@/components/ui/Loader';
import { formatDate } from '@/utils/format';
import type { SystemStatus } from '@/types';

export function AdminSystemPage() {
  const { data: status, isLoading } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: () => api.get<SystemStatus>('/admin/system/status'),
    refetchInterval: 15000,
  });

  if (isLoading) return <Loader />;
  if (!status) return <div>Нет данных</div>;

  const services = [
    { label: 'Backend API', status: status.backend_status },
    { label: 'База данных PostgreSQL', status: status.database_status },
    { label: 'Хранилище изображений (S3/MinIO)', status: status.storage_status },
    { label: 'Live Updates (WebSocket)', status: status.live_updates_status },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: '24px' }}>СОСТОЯНИЕ СИСТЕМЫ</h1>

      {/* Services */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {services.map(svc => (
          <Card key={svc.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{svc.label}</span>
              <StatusBadge status={svc.status === 'ok' ? 'normal' : 'critical'} label={svc.status === 'ok' ? 'РАБОТАЕТ' : 'ОШИБКА'} size="md" />
            </div>
          </Card>
        ))}
      </div>

      {/* Metrics */}
      <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '16px' }}>МЕТРИКИ</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
        <MetricCard label="Камеры онлайн" value={status.active_cameras} color="var(--color-status-normal)" />
        <MetricCard label="Камеры оффлайн" value={status.offline_cameras} color="var(--color-status-critical)" />
        <MetricCard label="Площадки без данных" value={status.sites_without_data} color="var(--color-status-no-data)" />
        <MetricCard label="Активные тревоги" value={status.active_alerts} color="var(--color-status-warning)" />
      </div>

      {status.last_system_update && (
        <div style={{ fontSize: 'var(--text-sm)', opacity: 0.5 }}>
          Последнее обновление: {formatDate(status.last_system_update)}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color, marginTop: '4px' }}>{value}</div>
    </Card>
  );
}
