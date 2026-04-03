import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Loader } from '@/components/ui/Loader';
import { Link } from 'react-router-dom';
import type { SystemStatus } from '@/types';

export function AdminDashboard() {
  const { data: status, isLoading } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: () => api.get<SystemStatus>('/admin/system/status'),
    refetchInterval: 30000,
  });

  if (isLoading) return <Loader />;

  return (
    <div>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: '24px' }}>АДМИНИСТРИРОВАНИЕ</h1>

      {status && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
          <StatusCard label="Backend" value={status.backend_status} />
          <StatusCard label="База данных" value={status.database_status} />
          <StatusCard label="Хранилище" value={status.storage_status} />
          <StatusCard label="Live Updates" value={status.live_updates_status} />
        </div>
      )}

      {status && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
          <Card>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Камеры онлайн</div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-status-normal)' }}>{status.active_cameras}</div>
          </Card>
          <Card>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Камеры оффлайн</div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-status-critical)' }}>{status.offline_cameras}</div>
          </Card>
          <Card>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Без данных</div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-status-no-data)' }}>{status.sites_without_data}</div>
          </Card>
          <Card>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Акт. тревоги</div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-status-warning)' }}>{status.active_alerts}</div>
          </Card>
        </div>
      )}

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { to: '/admin/users', label: 'Пользователи', desc: 'Управление аккаунтами' },
          { to: '/admin/sites', label: 'Площадки', desc: 'Управление объектами' },
          { to: '/admin/cameras', label: 'Камеры', desc: 'Управление устройствами' },
          { to: '/admin/settings', label: 'Настройки', desc: 'Конфигурация платформы' },
          { to: '/admin/system', label: 'Система', desc: 'Состояние сервисов' },
          { to: '/admin/audit-log', label: 'Журнал', desc: 'История действий' },
        ].map(item => (
          <Link key={item.to} to={item.to} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Card style={{ cursor: 'pointer', transition: 'border-color var(--transition-fast)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', margin: '0 0 4px', color: 'var(--color-accent)' }}>{item.label}</h3>
              <p style={{ fontSize: 'var(--text-sm)', margin: 0, opacity: 0.6 }}>{item.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</div>
      <StatusBadge status={value === 'ok' ? 'normal' : 'critical'} label={value === 'ok' ? 'OK' : 'Ошибка'} size="md" />
    </Card>
  );
}
