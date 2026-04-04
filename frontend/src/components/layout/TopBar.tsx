import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Мониторинг' },
  { path: '/sites', label: 'Площадки' },
  { path: '/alerts', label: 'Тревоги' },
  { path: '/cameras', label: 'Камеры' },
  { path: '/reports', label: 'Отчеты' },
];

const ADMIN_NAV = [
  { path: '/admin', label: 'Админ' },
];

export function TopBar({ wsConnected: _wsConnected }: { wsConnected: boolean }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const allNav = user?.role === 'admin' ? [...NAV_ITEMS, ...ADMIN_NAV] : NAV_ITEMS;

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        background: 'var(--color-dark)',
        color: 'var(--color-text-light)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '24px',
        borderBottom: '2px solid var(--color-accent)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
      }}
    >
      <Link
        to="/dashboard"
        style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}
      >
        <img
          src="/branding/Cut_logo_light.png"
          alt="ЗАРЯ"
          style={{
            display: 'block',
            height: '18px',
            width: 'auto',
            flexShrink: 0,
          }}
        />
      </Link>

      <nav style={{ display: 'flex', gap: '4px', marginLeft: '20px', flex: 1 }}>
        {allNav.map(item => {
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: '8px 14px',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: active ? 'var(--color-accent)' : 'var(--color-text-light)',
                textDecoration: 'none',
                borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                transition: 'color var(--transition-fast)',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-light)' }}>{user?.name}</span>

        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: '1px solid rgba(205,190,167,0.3)',
            color: 'var(--color-text-light)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Выход
        </button>
      </div>
    </header>
  );
}
