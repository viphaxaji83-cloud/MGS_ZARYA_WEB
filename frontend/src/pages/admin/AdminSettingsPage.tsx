import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { useToastStore } from '@/components/ui/Toast';
import type { PlatformSetting } from '@/types';

export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.add);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get<PlatformSetting[]>('/admin/settings'),
  });

  useEffect(() => {
    if (settings.length > 0) {
      const map: Record<string, string> = {};
      settings.forEach(s => { map[s.key] = s.value || ''; });
      setEdits(map);
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () => api.patch('/admin/settings', edits),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-settings'] }); addToast('Настройки сохранены', 'success'); },
    onError: () => addToast('Ошибка сохранения', 'error'),
  });

  if (isLoading) return <Loader />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>НАСТРОЙКИ ПЛАТФОРМЫ</h1>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {settings.map(s => (
          <Card key={s.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{s.key}</div>
                <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '2px' }}>{s.description || '—'}</div>
                <div style={{ fontSize: '11px', opacity: 0.3, marginTop: '2px' }}>Тип: {s.value_type}</div>
              </div>
              <input
                type={s.value_type === 'int' || s.value_type === 'float' ? 'number' : 'text'}
                step={s.value_type === 'float' ? '0.01' : undefined}
                value={edits[s.key] || ''}
                onChange={e => setEdits(prev => ({ ...prev, [s.key]: e.target.value }))}
                style={{
                  width: '200px', padding: '8px 12px', border: 'var(--border)', borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', textAlign: 'right',
                }}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
