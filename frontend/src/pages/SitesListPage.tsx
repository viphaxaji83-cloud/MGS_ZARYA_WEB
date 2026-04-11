import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FillBar } from '@/components/ui/FillBar';
import { Loader } from '@/components/ui/Loader';
import { formatTimeAgo } from '@/utils/format';
import type { Site } from '@/types';

type SortKey = 'code' | 'name' | 'address' | 'district' | 'status' | 'fill_level' | 'ai_confidence' | 'last_capture_at';
type SortDirection = 'asc' | 'desc';

const SITE_STATUS_ORDER: Record<Site['status'], number> = {
  critical: 0,
  warning: 1,
  normal: 2,
  no_data: 3,
  offline: 4,
};

const TABLE_HEADERS: Array<{ label: string; sortKey?: SortKey }> = [
  { label: 'Код', sortKey: 'code' },
  { label: 'Название', sortKey: 'name' },
  { label: 'Адрес', sortKey: 'address' },
  { label: 'Район', sortKey: 'district' },
  { label: 'Статус', sortKey: 'status' },
  { label: 'Заполн.', sortKey: 'fill_level' },
  { label: 'AI', sortKey: 'ai_confidence' },
  { label: 'Обновлено', sortKey: 'last_capture_at' },
  { label: '' },
];

function compareText(a: string | null | undefined, b: string | null | undefined) {
  const left = a?.trim();
  const right = b?.trim();

  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  return left.localeCompare(right, 'ru', { numeric: true, sensitivity: 'base' });
}

export function SitesListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
  const sortedSites = [...sites].sort((a, b) => {
    let result = 0;

    switch (sortKey) {
      case 'code':
        result = compareText(a.code, b.code);
        break;
      case 'name':
        result = compareText(a.name, b.name);
        break;
      case 'address':
        result = compareText(a.address, b.address);
        break;
      case 'district':
        result = compareText(a.district, b.district);
        break;
      case 'status':
        result = SITE_STATUS_ORDER[a.status] - SITE_STATUS_ORDER[b.status];
        break;
      case 'fill_level':
        result = a.fill_level - b.fill_level;
        break;
      case 'ai_confidence':
        result = a.ai_confidence - b.ai_confidence;
        break;
      case 'last_capture_at':
        if (!a.last_capture_at && !b.last_capture_at) {
          result = 0;
        } else if (!a.last_capture_at) {
          result = 1;
        } else if (!b.last_capture_at) {
          result = -1;
        } else {
          result = new Date(a.last_capture_at).getTime() - new Date(b.last_capture_at).getTime();
        }
        break;
    }

    if (result === 0) {
      result = compareText(a.code, b.code);
    }

    return sortDirection === 'asc' ? result : -result;
  });

  const handleSort = (nextSortKey: SortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection(currentDirection => currentDirection === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection('asc');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>Площадки</h1>
        <span style={{ fontSize: 'var(--text-sm)', opacity: 0.5 }}>{data?.total || 0} объектов</span>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={event => setSearch(event.target.value)}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: 'var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-body)',
            background: 'var(--color-white)',
          }}
        />
        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
          style={{
            padding: '10px 14px',
            border: 'var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)',
            background: 'var(--color-white)',
            fontFamily: 'var(--font-body)',
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
                {TABLE_HEADERS.map(({ label, sortKey: columnSortKey }, index) => (
                  <th
                    key={label || 'actions'}
                    style={{
                      padding: '10px 14px',
                      width: index === 2 ? '280px' : undefined,
                      minWidth: index === 2 ? '280px' : undefined,
                      textAlign: 'left',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 600,
                      opacity: 0.6,
                    }}
                  >
                    {columnSortKey ? (
                      <button
                        type="button"
                        onClick={() => handleSort(columnSortKey)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: 0,
                          border: 0,
                          background: 'none',
                          color: sortKey === columnSortKey ? 'var(--color-accent)' : 'inherit',
                          font: 'inherit',
                          letterSpacing: 'inherit',
                          textTransform: 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        <span>{label}</span>
                        <span style={{ width: '10px', fontSize: '10px', opacity: sortKey === columnSortKey ? 1 : 0.35 }}>
                          {sortKey === columnSortKey ? (sortDirection === 'asc' ? '▲' : '▼') : '▲'}
                        </span>
                      </button>
                    ) : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedSites.map(site => (
                <tr key={site.id} style={{ borderBottom: '1px solid var(--color-muted)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-accent)' }}>{site.code}</td>
                  <td style={{ padding: '10px 14px' }}>{site.name}</td>
                  <td style={{ padding: '10px 14px', width: '280px', minWidth: '280px' }}>
                    <div
                      title={site.address}
                      style={{
                        opacity: 0.7,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.35,
                        maxHeight: '2.7em',
                        wordBreak: 'break-word',
                      }}
                    >
                      {site.address}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>{site.district || '—'}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={site.status} /></td>
                  <td style={{ padding: '10px 14px', width: '150px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '50px minmax(56px, 1fr)', alignItems: 'center', columnGap: '10px' }}>
                      <span style={{ fontWeight: 600, minWidth: '50px', whiteSpace: 'nowrap' }}>{site.fill_level}%</span>
                      <div style={{ minWidth: '56px' }}>
                        <FillBar level={site.fill_level} />
                      </div>
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
