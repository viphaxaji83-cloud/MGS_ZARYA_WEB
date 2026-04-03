import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/components/ui/Toast';
import { formatDate, alertTypeLabel, alertStatusLabel, severityLabel } from '@/utils/format';
import type { Alert } from '@/types';

export function AlertsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.add);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', typeFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '200');
      return api.get<Alert[]>(`/alerts?${params}`);
    },
  });

  const updateAlert = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/alerts/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      addToast('Статус обновлён', 'success');
    },
  });

  const countByStatus = (s: string) => alerts.filter(a => a.status === s).length;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: '20px' }}>ТРЕВОГИ</h1>

      {/* Counters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Новые', count: countByStatus('new'), color: 'var(--color-status-critical)' },
          { label: 'Просмотр.', count: countByStatus('viewed'), color: 'var(--color-status-warning)' },
          { label: 'Подтвержд.', count: countByStatus('confirmed'), color: 'var(--color-status-normal)' },
          { label: 'Закрыт.', count: countByStatus('closed'), color: 'var(--color-status-no-data)' },
        ].map(c => (
          <div key={c.label} style={{
            padding: '8px 16px', background: 'var(--color-white)', border: 'var(--border)',
            borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: c.color }}>{c.count}</span>
            <span style={{ fontSize: 'var(--text-sm)', opacity: 0.6 }}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '8px 14px', border: 'var(--border)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', background: 'var(--color-white)' }}>
          <option value="">Все типы</option>
          {['overflow', 'litter', 'degradation', 'camera_offline', 'no_data', 'ai_error'].map(t => (
            <option key={t} value={t}>{alertTypeLabel(t)}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 14px', border: 'var(--border)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', background: 'var(--color-white)' }}>
          <option value="">Все статусы</option>
          {['new', 'viewed', 'confirmed', 'closed', 'false_positive'].map(s => (
            <option key={s} value={s}>{alertStatusLabel(s)}</option>
          ))}
        </select>
      </div>

      {isLoading ? <Loader /> : (
        <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius)', border: 'var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: 'var(--border)' }}>
                {['ID', 'Тип', 'Важность', 'Статус', 'Сообщение', 'Площадка', 'Дата', 'Действия'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, opacity: 0.6 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--color-muted)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>#{a.id}</td>
                  <td style={{ padding: '10px 14px' }}>{alertTypeLabel(a.type)}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={a.severity} label={severityLabel(a.severity)} /></td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={a.status} label={alertStatusLabel(a.status)} /></td>
                  <td style={{ padding: '10px 14px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message || '—'}</td>
                  <td style={{ padding: '10px 14px' }}><Link to={`/sites/${a.site_id}`} style={{ color: 'var(--color-accent)' }}>#{a.site_id}</Link></td>
                  <td style={{ padding: '10px 14px', fontSize: '12px', opacity: 0.5 }}>{formatDate(a.created_at)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {a.status === 'new' && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button size="sm" variant="outline" onClick={() => updateAlert.mutate({ id: a.id, status: 'confirmed' })}>✓</Button>
                        <Button size="sm" variant="ghost" onClick={() => updateAlert.mutate({ id: a.id, status: 'false_positive' })}>✗</Button>
                      </div>
                    )}
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
