import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Loader } from '@/components/ui/Loader';
import type { Camera } from '@/types';

type SortOption = 'status' | 'code_asc' | 'code_desc' | 'errors_desc' | 'site_asc';

const CAMERA_STATUS_ORDER: Record<Camera['status'], number> = {
  online: 0,
  maintenance: 1,
  offline: 2,
  error: 3,
};

function compareText(a: string | null | undefined, b: string | null | undefined) {
  const left = a?.trim();
  const right = b?.trim();

  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  return left.localeCompare(right, 'ru', { numeric: true, sensitivity: 'base' });
}

export function CamerasPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('status');

  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => api.get<Camera[]>('/cameras'),
    refetchInterval: 30000,
  });

  const online = cameras.filter(camera => camera.status === 'online').length;
  const offline = cameras.filter(camera => camera.status !== 'online').length;

  const filteredCameras = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return cameras.filter(camera => {
      if (statusFilter && camera.status !== statusFilter) return false;

      if (!normalizedQuery) return true;

      return (
        camera.code.toLowerCase().includes(normalizedQuery) ||
        camera.name.toLowerCase().includes(normalizedQuery) ||
        (camera.site_id ? `#${camera.site_id}` : '').includes(normalizedQuery) ||
        String(camera.site_id ?? '').includes(normalizedQuery)
      );
    });
  }, [cameras, search, statusFilter]);

  const sortedCameras = useMemo(() => {
    const nextCameras = [...filteredCameras];

    nextCameras.sort((left, right) => {
      let result = 0;

      switch (sortBy) {
        case 'status':
          result = CAMERA_STATUS_ORDER[left.status] - CAMERA_STATUS_ORDER[right.status];
          break;
        case 'code_asc':
          result = compareText(left.code, right.code);
          break;
        case 'code_desc':
          result = compareText(right.code, left.code);
          break;
        case 'errors_desc':
          result = right.error_count - left.error_count;
          break;
        case 'site_asc':
          if (left.site_id == null && right.site_id == null) {
            result = 0;
          } else if (left.site_id == null) {
            result = 1;
          } else if (right.site_id == null) {
            result = -1;
          } else {
            result = left.site_id - right.site_id;
          }
          break;
      }

      if (result === 0) {
        result = compareText(left.code, right.code);
      }

      return result;
    });

    return nextCameras;
  }, [filteredCameras, sortBy]);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>Камеры</h1>
        <div style={{ display: 'flex', gap: '12px', fontSize: 'var(--text-sm)', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--color-status-normal)', fontWeight: 600 }}>● {online} онлайн</span>
          <span style={{ color: 'var(--color-status-critical)', fontWeight: 600 }}>● {offline} нерабочих</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Поиск по коду, названию, площадке..."
          value={search}
          onChange={event => setSearch(event.target.value)}
          style={{
            flex: '1 1 280px',
            minWidth: '240px',
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
          <option value="online">Онлайн</option>
          <option value="offline">Оффлайн</option>
          <option value="error">Ошибка</option>
          <option value="maintenance">Обслуживание</option>
        </select>
        <select
          value={sortBy}
          onChange={event => setSortBy(event.target.value as SortOption)}
          style={{
            padding: '10px 14px',
            border: 'var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)',
            background: 'var(--color-white)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <option value="status">Сначала рабочие</option>
          <option value="code_asc">Код: А-Я</option>
          <option value="code_desc">Код: Я-А</option>
          <option value="errors_desc">Сначала с ошибками</option>
          <option value="site_asc">По площадке</option>
        </select>
      </div>

      {isLoading ? (
        <Loader />
      ) : sortedCameras.length === 0 ? (
        <div
          style={{
            background: 'var(--color-white)',
            border: 'var(--border)',
            borderRadius: 'var(--radius)',
            padding: '40px 24px',
            textAlign: 'center',
            opacity: 0.55,
            fontSize: 'var(--text-sm)',
          }}
        >
          Камеры не найдены
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {sortedCameras.map(camera => (
            <div
              key={camera.id}
              style={{
                background: 'var(--color-white)',
                border: 'var(--border)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  height: '120px',
                  background:
                    camera.status === 'online'
                      ? '#162a18'
                      : camera.status === 'maintenance'
                        ? '#332913'
                        : '#32201f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color:
                    camera.status === 'online'
                      ? 'rgba(71, 191, 79, 0.82)'
                      : camera.status === 'maintenance'
                        ? 'rgba(194, 149, 69, 0.88)'
                        : 'rgba(200, 66, 58, 0.82)',
                  fontSize: 'var(--text-sm)',
                  position: 'relative',
                }}
              >
                <span style={{ opacity: 0.9 }}>
                  {camera.status === 'online'
                    ? 'Live preview'
                    : camera.status === 'maintenance'
                      ? 'На обслуживании'
                      : 'Нет сигнала'}
                </span>
                <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
                  <StatusBadge status={camera.status} />
                </div>
              </div>

              <div
                style={{
                  minHeight: '128px',
                  padding: '18px 16px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '22px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      lineHeight: 1.2,
                      color: 'var(--color-accent)',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      marginBottom: '6px',
                    }}
                  >
                    {camera.code}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-sm)',
                      lineHeight: 1.2,
                      fontWeight: 600,
                      color: 'var(--color-text)',
                    }}
                  >
                    {camera.name}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: '16px',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <span style={{ opacity: 0.5 }}>Площадка: </span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                      {camera.site_id ? `#${camera.site_id}` : '—'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ opacity: 0.5 }}>Ошибки: </span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: camera.error_count > 0 ? 'var(--color-status-critical)' : 'var(--color-text)',
                      }}
                    >
                      {camera.error_count}
                    </span>
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
