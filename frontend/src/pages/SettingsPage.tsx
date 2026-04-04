import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToastStore } from '@/components/ui/Toast';
import { useNavigate } from 'react-router-dom';

export function SettingsPage() {
  const { user, logout } = useAuthStore();
  const addToast = useToastStore(s => s.add);
  const navigate = useNavigate();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: '24px' }}>НАСТРОЙКИ</h1>

      <Card style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
          Профиль
        </h3>
        <div style={{ fontSize: 'var(--text-sm)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, marginBottom: '4px' }}>Имя</div>
          <div style={{ fontWeight: 600 }}>{user?.name}</div>
        </div>
      </Card>

      <Card style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
          Смена пароля
        </h3>
        <form
          onSubmit={e => {
            e.preventDefault();
            addToast('Функция смены пароля будет доступна в следующей версии', 'info');
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}
        >
          <Input label="Текущий пароль" type="password" placeholder="••••••••" />
          <Input label="Новый пароль" type="password" placeholder="••••••••" />
          <Input label="Подтверждение" type="password" placeholder="••••••••" />
          <Button type="submit" variant="outline" size="sm" style={{ alignSelf: 'flex-start' }}>
            Сменить пароль
          </Button>
        </form>
      </Card>

      <Card style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
          Интерфейс
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
            />
            <span style={{ fontSize: 'var(--text-sm)' }}>Автообновление данных</span>
          </label>
          {autoRefresh && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: 'var(--text-sm)', opacity: 0.6 }}>Интервал (сек):</span>
              <input
                type="number"
                value={refreshInterval}
                onChange={e => setRefreshInterval(Number(e.target.value))}
                min={10}
                max={300}
                style={{
                  width: '80px',
                  padding: '6px 10px',
                  border: 'var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>
          )}
        </div>
      </Card>

      <Button variant="danger" onClick={async () => { await logout(); navigate('/login'); }}>
        Выйти из системы
      </Button>
    </div>
  );
}
