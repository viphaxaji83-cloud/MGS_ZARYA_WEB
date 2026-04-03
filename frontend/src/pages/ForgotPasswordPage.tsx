import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/api/client';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {} finally {
      setLoading(false);
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
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', marginBottom: '8px' }}>
          ВОССТАНОВЛЕНИЕ ПАРОЛЯ
        </h2>

        {sent ? (
          <div>
            <p style={{ fontSize: 'var(--text-sm)', margin: '20px 0', color: 'var(--color-text)' }}>
              Если указанный email зарегистрирован в системе, на него отправлена инструкция по восстановлению пароля.
            </p>
            <Link to="/login">
              <Button variant="outline" style={{ width: '100%' }}>Вернуться к входу</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="user@zarya.local" />
            <Button type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Отправка...' : 'Отправить'}
            </Button>
            <Link to="/login" style={{ fontSize: 'var(--text-sm)', textAlign: 'center' }}>Назад к входу</Link>
          </form>
        )}
      </div>
    </div>
  );
}
