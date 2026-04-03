import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FillBar } from '@/components/ui/FillBar';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { formatDate, formatTimeAgo, alertTypeLabel, alertStatusLabel } from '@/utils/format';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Site, Observation, Alert } from '@/types';

export function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: site, isLoading } = useQuery({
    queryKey: ['site', id],
    queryFn: () => api.get<Site>(`/sites/${id}`),
  });

  const { data: observations = [] } = useQuery({
    queryKey: ['site-observations', id],
    queryFn: () => api.get<Observation[]>(`/sites/${id}/observations?limit=50`),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['site-alerts', id],
    queryFn: () => api.get<Alert[]>(`/sites/${id}/alerts?limit=20`),
  });

  if (isLoading) return <div style={{ padding: '48px' }}><Loader /></div>;
  if (!site) return <div style={{ padding: '48px', textAlign: 'center' }}>Площадка не найдена</div>;

  const chartData = observations
    .slice().reverse()
    .map(o => ({
      time: new Date(o.captured_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      fill_level: o.fill_level,
      confidence: +(o.ai_confidence * 100).toFixed(0),
    }));

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px', fontSize: 'var(--text-sm)', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Link to="/dashboard" style={{ color: 'var(--color-accent)' }}>← Dashboard</Link>
        <span style={{ opacity: 0.3 }}>/</span>
        <Link to="/sites" style={{ color: 'var(--color-accent)' }}>Площадки</Link>
        <span style={{ opacity: 0.3 }}>/</span>
        <span>{site.code}</span>
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: 'var(--text-3xl)', margin: 0 }}>{site.name}</h1>
            <StatusBadge status={site.status} size="md" />
          </div>
          <p style={{ fontSize: 'var(--text-sm)', opacity: 0.6 }}>{site.address}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/dashboard" style={{
            padding: '8px 16px', border: 'var(--border)', borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)', fontWeight: 600, textTransform: 'uppercase',
            color: 'var(--color-text)', textDecoration: 'none',
          }}>
            На карту
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <Card>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>Заполненность</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, margin: '4px 0' }}>{site.fill_level}%</div>
          <FillBar level={site.fill_level} />
        </Card>
        <Card>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>AI Confidence</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, margin: '4px 0' }}>{(site.ai_confidence * 100).toFixed(0)}%</div>
          {site.ai_confidence < 0.6 && site.ai_confidence > 0 && (
            <div style={{ fontSize: '10px', color: 'var(--color-status-warning)' }}>⚠ Требует проверки</div>
          )}
        </Card>
        <Card>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>Контейнеры</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, margin: '4px 0' }}>{site.container_count}</div>
        </Card>
        <Card>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>Район</div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: '4px 0' }}>{site.district || '—'}</div>
        </Card>
        <Card>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>Посл. кадр</div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, margin: '4px 0' }}>{formatTimeAgo(site.last_capture_at)}</div>
        </Card>
      </div>

      {/* Two columns: Chart + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Fill level chart */}
        <Card>
          <h3 style={{ fontSize: 'var(--text-sm)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Заполненность — последние наблюдения
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-muted)" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="fill_level" stroke="var(--color-accent)" strokeWidth={2} name="Заполненность %" />
                <Line type="monotone" dataKey="confidence" stroke="var(--color-info)" strokeWidth={1} strokeDasharray="4 4" name="AI Confidence %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
              Нет данных для графика
            </div>
          )}
        </Card>

        {/* Alerts for this site */}
        <Card>
          <h3 style={{ fontSize: 'var(--text-sm)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Тревоги ({alerts.length})
          </h3>
          <div style={{ maxHeight: '250px', overflow: 'auto' }}>
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', opacity: 0.4, fontSize: 'var(--text-sm)' }}>Нет тревог</div>
            ) : alerts.map(a => (
              <div key={a.id} style={{
                padding: '8px 0', borderBottom: '1px solid var(--color-muted)',
                fontSize: 'var(--text-sm)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontWeight: 500 }}>{alertTypeLabel(a.type)}</span>
                  <StatusBadge status={a.status} label={alertStatusLabel(a.status)} />
                </div>
                <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>{formatDate(a.created_at)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Observations gallery */}
      <Card>
        <h3 style={{ fontSize: 'var(--text-sm)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Последние наблюдения
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {observations.slice(0, 12).map(obs => (
            <div key={obs.id} style={{
              background: 'var(--color-bg)', borderRadius: 'var(--radius)', border: 'var(--border)',
              padding: '12px', fontSize: 'var(--text-sm)',
            }}>
              <div style={{
                height: '100px', background: '#2a2a2a', borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-secondary)', fontSize: '11px', marginBottom: '8px',
              }}>
                📷 {obs.fill_level}%
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <StatusBadge status={obs.status} />
                <span style={{ fontSize: '11px', opacity: 0.5 }}>{formatTimeAgo(obs.captured_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Site Meta */}
      <Card style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: 'var(--text-sm)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Информация об объекте
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: 'var(--text-sm)' }}>
          <InfoRow label="ID" value={String(site.id)} />
          <InfoRow label="Код" value={site.code} />
          <InfoRow label="Тип" value={site.type} />
          <InfoRow label="Координаты" value={`${site.lat.toFixed(4)}, ${site.lon.toFixed(4)}`} />
          <InfoRow label="Камера" value={site.camera_id ? `#${site.camera_id}` : 'не привязана'} />
          <InfoRow label="Переполнение" value={site.has_overflow ? 'Да' : 'Нет'} />
          <InfoRow label="Мусор вне контейнера" value={site.has_litter_outside ? 'Да' : 'Нет'} />
          <InfoRow label="Создан" value={formatDate(site.created_at)} />
        </div>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5, marginBottom: '2px' }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}
