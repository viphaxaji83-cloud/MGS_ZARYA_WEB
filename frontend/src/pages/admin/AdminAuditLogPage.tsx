import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Loader } from '@/components/ui/Loader';
import { formatDate } from '@/utils/format';
import type { AuditLogEntry } from '@/types';

export function AdminAuditLogPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-audit-log', actionFilter, entityFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity_type', entityFilter);
      params.set('limit', '200');
      return api.get<AuditLogEntry[]>(`/admin/audit-log?${params}`);
    },
  });

  return (
    <div>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: '20px' }}>ЖУРНАЛ ДЕЙСТВИЙ</h1>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{
          padding: '10px 14px', border: 'var(--border)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', background: 'var(--color-white)', fontFamily: 'var(--font-body)',
        }}>
          <option value="">Все действия</option>
          {['login', 'create_user', 'update_user', 'deactivate_user', 'activate_user', 'reset_password',
            'create_camera', 'update_camera', 'assign_camera_site', 'unassign_camera_site',
            'create_site', 'update_site', 'archive_site', 'update_settings', 'seed_database'].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} style={{
          padding: '10px 14px', border: 'var(--border)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', background: 'var(--color-white)', fontFamily: 'var(--font-body)',
        }}>
          <option value="">Все сущности</option>
          {['user', 'camera', 'site', 'platform_setting', 'system'].map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {isLoading ? <Loader /> : (
        <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius)', border: 'var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: 'var(--border)' }}>
                {['ID', 'Действие', 'Сущность', 'ID сущности', 'Пользователь', 'Роль', 'Дата', 'Детали'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, opacity: 0.6 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--color-muted)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, opacity: 0.5 }}>#{log.id}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 8px', fontSize: '11px', fontWeight: 600, borderRadius: 'var(--radius-sm)',
                      background: 'rgba(136,36,38,0.08)', color: 'var(--color-accent)', textTransform: 'uppercase',
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>{log.entity_type || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>{log.entity_id || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>#{log.actor_user_id}</td>
                  <td style={{ padding: '10px 14px', opacity: 0.6 }}>{log.actor_role || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px', opacity: 0.5 }}>{formatDate(log.created_at)}</td>
                  <td style={{ padding: '10px 14px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px', opacity: 0.4 }}>
                    {log.payload_json || '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', opacity: 0.4 }}>Записи не найдены</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
