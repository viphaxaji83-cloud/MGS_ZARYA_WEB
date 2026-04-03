import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FillBar } from '@/components/ui/FillBar';
import { Loader } from '@/components/ui/Loader';
import { formatTimeAgo } from '@/utils/format';
import type { Site } from '@/types';

export function SitesListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sites', search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      return api.get<{ items: Site[]; total: number }>(`/sites?${params}`);
    },
  });

  const sites = data?.items || [];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>ПЛОЩАДКИ</h1>
        <span style={{ fontSize: 'var(--text-sm)', opacity: 0.5 }}>{data?.total || 0} объектов</span>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input
          type="text" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, padding: '10px 14px', border: 'var(--border)', borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', background: 'var(--color-white)',
          }}
        />
        <select
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 14px', border: 'var(--border)', borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)', background: 'var(--color-white)', fontFamily: 'var(--font-body)',
          }}
        >
          <option value="">Все статусы</option>
          <option value="normal">Норма</option>
          <option value="warning">Внимание</option>
          <option value="critical">Критично</option>
          <option value="no_data">Нет данных</option>
          <option value="offline">Оффлайн</option>
        </select>
      </div>

      {isLoading ? <Loader /> : (
        <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius)', border: 'var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: 'var(--border)' }}>
                {['Код', 'Название', 'Адрес', 'Район', 'Статус', 'Заполн.', 'AI', 'Обновлено', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: '11px',
                    textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, opacity: 0.6,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sites.map(site => (
                <tr key={site.id} style={{ borderBottom: '1px solid var(--color-muted)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-accent)' }}>{site.code}</td>
                  <td style={{ padding: '10px 14px' }}>{site.name}</td>
                  <td style={{ padding: '10px 14px', opacity: 0.7, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.address}</td>
                  <td style={{ padding: '10px 14px' }}>{site.district || '—'}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={site.status} /></td>
                  <td style={{ padding: '10px 14px', width: '120px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, minWidth: '35px' }}>{site.fill_level}%</span>
                      <FillBar level={site.fill_level} />
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>{(site.ai_confidence * 100).toFixed(0)}%</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px', opacity: 0.5 }}>{formatTimeAgo(site.last_capture_at)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <Link to={`/sites/${site.id}`} style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '12px' }}>Открыть →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
