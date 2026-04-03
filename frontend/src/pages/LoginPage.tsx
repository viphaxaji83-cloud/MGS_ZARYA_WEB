import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login: doLogin, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await doLogin(login, password, rememberMe);
      navigate('/dashboard');
    } catch {}
  };

  return (
    <div className="grid-bg" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', position: 'relative',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: '900px', width: '100%',
        background: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)', overflow: 'hidden', position: 'relative', zIndex: 1,
        border: 'var(--border)',
      }}>
        {/* Left: Branding */}
        <div style={{
          background: 'var(--color-dark)', padding: '60px 48px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          borderRight: '3px solid var(--color-accent)',
        }}>
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{
              fontFamily: 'var(--font-heading)', fontSize: 'var(--text-4xl)',
              color: 'var(--color-accent)', margin: 0, letterSpacing: '0.1em',
            }}>ЗАРЯ</h1>
            <div style={{
              width: '60px', height: '3px', background: 'var(--color-accent)',
              margin: '16px 0',
            }} />
            <p style={{
              fontSize: 'var(--text-sm)', color: 'var(--color-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
            }}>
              Система мониторинга контейнерных площадок
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              'Мониторинг в реальном времени',
              'AI-анализ изображений',
              'Контроль состояния площадок',
              'Управление тревогами',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  width: '6px', height: '6px', background: 'var(--color-accent)',
                  borderRadius: '50%', flexShrink: 0,
                }} />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-icon-dark)', opacity: 0.8 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '48px', fontSize: 'var(--text-xs)', color: 'var(--color-secondary)',
            opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            г. Майкоп / МГТУ / v1.0
          </div>
        </div>

        {/* Right: Login Form */}
        <div style={{ padding: '60px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)',
            marginBottom: '8px', color: 'var(--color-text)',
          }}>
            ВХОД В СИСТЕМУ
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', opacity: 0.6, marginBottom: '32px' }}>
            Введите данные для авторизации
          </p>

          {error && (
            <div style={{
              padding: '12px 16px', background: 'rgba(194,59,59,0.08)',
              border: '1px solid var(--color-error)', borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-sm)', color: 'var(--color-error)', marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Input
              label="Логин / Email"
              value={login}
              onChange={e => setLogin(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />

            <div style={{ position: 'relative' }}>
              <Input
                label="Пароль"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                position: 'absolute', right: '12px', bottom: '10px',
                background: 'none', border: 'none', color: 'var(--color-text)',
                opacity: 0.4, cursor: 'pointer', fontSize: 'var(--text-sm)',
              }}>
                {showPassword ? '◉' : '◎'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: 'var(--text-sm)', cursor: 'pointer', color: 'var(--color-text)',
              }}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }} />
                Запомнить меня
              </label>
              <a href="/forgot-password" style={{
                fontSize: 'var(--text-sm)', color: 'var(--color-accent)', fontWeight: 500,
              }}>
                Забыли пароль?
              </a>
            </div>

            <Button type="submit" disabled={isLoading} size="lg" style={{ width: '100%', marginTop: '8px' }}>
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
