import { useState, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/api/client';

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Минимум 8 символов'); return; }
    if (password !== confirm) { setError('Пароли не совпадают'); return; }
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setDone(true);
    } catch {
      setError('Ссылка недействительна или истекла');
    }
  };

  return (
    <div className="grid-bg" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <div style={{
        maxWidth: '440px', width: '100%', background: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
        padding: '48px', border: 'var(--border)', position: 'relative', zIndex: 1,
      }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', marginBottom: '16px' }}>
          НОВЫЙ ПАРОЛЬ
        </h2>

        {done ? (
          <div>
            <p style={{ margin: '16px 0', fontSize: 'var(--text-sm)' }}>Пароль успешно изменён.</p>
            <Link to="/login"><Button style={{ width: '100%' }}>Войти</Button></Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && <div style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)' }}>{error}</div>}
            <Input label="Новый пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Input label="Подтверждение" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            <Button type="submit" style={{ width: '100%' }}>Установить пароль</Button>
          </form>
        )}
      </div>
    </div>
  );
}
