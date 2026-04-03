import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { useToastStore } from '@/components/ui/Toast';
import { formatTimeAgo } from '@/utils/format';
import type { Camera } from '@/types';

export function AdminCamerasPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.add);
  const [showCreate, setShowCreate] = useState(false);

  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ['admin-cameras'],
    queryFn: () => api.get<Camera[]>('/admin/cameras'),
  });

  const unassign = useMutation({
    mutationFn: (id: number) => api.post(`/admin/cameras/${id}/unassign-site`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-cameras'] }); addToast('Камера отвязана', 'success'); },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>УПРАВЛЕНИЕ КАМЕРАМИ</h1>
        <Button onClick={() => setShowCreate(true)}>+ Добавить</Button>
      </div>

      {isLoading ? <Loader /> : (
        <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius)', border: 'var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: 'var(--border)' }}>
                {['Код', 'Название', 'Статус', 'Площадка', 'Интервал', 'Ошибки', 'Активность', 'Действия'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, opacity: 0.6 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cameras.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--color-muted)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-accent)' }}>{c.code}</td>
                  <td style={{ padding: '10px 14px' }}>{c.name}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={c.status} /></td>
                  <td style={{ padding: '10px 14px' }}>{c.site_id ? `#${c.site_id}` : '—'}</td>
                  <td style={{ padding: '10px 14px' }}>{c.polling_interval_sec}с</td>
                  <td style={{ padding: '10px 14px', color: c.error_count > 0 ? 'var(--color-status-critical)' : 'inherit', fontWeight: c.error_count > 0 ? 600 : 400 }}>{c.error_count}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px', opacity: 0.5 }}>{formatTimeAgo(c.last_seen_at)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {c.site_id && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (confirm('Отвязать камеру от площадки?')) unassign.mutate(c.id);
                      }}>Отвязать</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateCameraModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function CreateCameraModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.add);
  const [form, setForm] = useState({ code: '', name: '', source_url: '', polling_interval_sec: '300' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: () => api.post('/admin/cameras', { ...form, polling_interval_sec: parseInt(form.polling_interval_sec) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-cameras'] }); addToast('Камера создана', 'success'); onClose(); },
    onError: () => addToast('Ошибка создания', 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="СОЗДАТЬ КАМЕРУ">
      <form onSubmit={e => { e.preventDefault(); create.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Input label="Код" value={form.code} onChange={e => set('code', e.target.value)} required placeholder="CAM-031" />
        <Input label="Название" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Камера 031" />
        <Input label="URL источника" value={form.source_url} onChange={e => set('source_url', e.target.value)} placeholder="rtsp://..." />
        <Input label="Интервал опроса (сек)" type="number" value={form.polling_interval_sec} onChange={e => set('polling_interval_sec', e.target.value)} />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Button variant="outline" type="button" onClick={onClose}>Отмена</Button>
          <Button type="submit">Создать</Button>
        </div>
      </form>
    </Modal>
  );
}
