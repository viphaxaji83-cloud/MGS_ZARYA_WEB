import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
      settings.forEach(setting => {
        map[setting.key] = setting.value || '';
      });
      setEdits(map);
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () => api.patch('/admin/settings', edits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      addToast('Настройки сохранены', 'success');
    },
    onError: () => addToast('Ошибка сохранения', 'error'),
  });

  if (isLoading) return <Loader />;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>Настройки платформы</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.6, fontSize: 'var(--text-sm)' }}>
            Центральный раздел для системных параметров платформы.
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>

      <Card
        style={{
          marginBottom: '16px',
          background: 'linear-gradient(135deg, rgba(136, 36, 38, 0.06), rgba(17, 17, 17, 0.02))',
          border: '1px solid rgba(136, 36, 38, 0.14)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-accent)' }}>
            О разделе
          </div>
          <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, opacity: 0.82 }}>
            Здесь администратор управляет ключевыми параметрами платформы: интервалом обновления дашборда,
            порогами статусов и тревог, параметрами карты, уведомлениями и демо-режимом.
          </div>
          <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, opacity: 0.82 }}>
            Сейчас этот раздел уже работает как единый центр хранения и редактирования системных настроек,
            но не все параметры ещё напрямую влияют на поведение интерфейса и backend-логики в реальном времени.
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {settings.map(setting => (
          <Card key={setting.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                  {setting.key}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '2px' }}>
                  {setting.description || '—'}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.3, marginTop: '2px' }}>
                  Тип: {setting.value_type}
                </div>
              </div>
              <input
                type={setting.value_type === 'int' || setting.value_type === 'float' ? 'number' : 'text'}
                step={setting.value_type === 'float' ? '0.01' : undefined}
                value={edits[setting.key] || ''}
                onChange={event => setEdits(prev => ({ ...prev, [setting.key]: event.target.value }))}
                style={{
                  width: '200px',
                  padding: '8px 12px',
                  border: 'var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-body)',
                  textAlign: 'right',
                }}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
