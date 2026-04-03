import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { useToastStore } from '@/components/ui/Toast';
import type { Site } from '@/types';

export function AdminSitesPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.add);
  const [showCreate, setShowCreate] = useState(false);

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['admin-sites'],
    queryFn: () => api.get<Site[]>('/admin/sites'),
  });

  const archive = useMutation({
    mutationFn: (id: number) => api.post(`/admin/sites/${id}/archive`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-sites'] }); addToast('Площадка архивирована', 'success'); },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>УПРАВЛЕНИЕ ПЛОЩАДКАМИ</h1>
        <Button onClick={() => setShowCreate(true)}>+ Добавить</Button>
      </div>

      {isLoading ? <Loader /> : (
        <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius)', border: 'var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: 'var(--border)' }}>
                {['Код', 'Название', 'Адрес', 'Район', 'Статус', 'Камера', 'Активна', 'Действия'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, opacity: 0.6 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sites.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--color-muted)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-accent)' }}>{s.code}</td>
                  <td style={{ padding: '10px 14px' }}>{s.name}</td>
                  <td style={{ padding: '10px 14px', opacity: 0.7, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.address}</td>
                  <td style={{ padding: '10px 14px' }}>{s.district || '—'}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={s.status} /></td>
                  <td style={{ padding: '10px 14px' }}>{s.camera_id ? `#${s.camera_id}` : '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge status={s.is_active ? 'normal' : 'offline'} label={s.is_active ? 'Да' : 'Нет'} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {s.is_active && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (confirm(`Архивировать ${s.code}?`)) archive.mutate(s.id);
                      }}>Архив</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateSiteModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function CreateSiteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.add);
  const [form, setForm] = useState({ code: '', name: '', address: '', district: '', lat: '44.6078', lon: '40.1058', container_count: '4' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: () => api.post('/admin/sites', {
      ...form, lat: parseFloat(form.lat), lon: parseFloat(form.lon), container_count: parseInt(form.container_count),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-sites'] }); addToast('Площадка создана', 'success'); onClose(); },
    onError: () => addToast('Ошибка создания', 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="СОЗДАТЬ ПЛОЩАДКУ" width={540}>
      <form onSubmit={e => { e.preventDefault(); create.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input label="Код" value={form.code} onChange={e => set('code', e.target.value)} required placeholder="MKP-031" />
          <Input label="Район" value={form.district} onChange={e => set('district', e.target.value)} placeholder="Центральный" />
        </div>
        <Input label="Название" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="КП ул. Примерная 1" />
        <Input label="Адрес" value={form.address} onChange={e => set('address', e.target.value)} required placeholder="ул. Примерная, 1, Майкоп" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <Input label="Широта" type="number" step="any" value={form.lat} onChange={e => set('lat', e.target.value)} required />
          <Input label="Долгота" type="number" step="any" value={form.lon} onChange={e => set('lon', e.target.value)} required />
          <Input label="Контейнеры" type="number" value={form.container_count} onChange={e => set('container_count', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Button variant="outline" type="button" onClick={onClose}>Отмена</Button>
          <Button type="submit">Создать</Button>
        </div>
      </form>
    </Modal>
  );
}
