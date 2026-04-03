import { useAuthStore } from '@/stores/authStore';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/StatusBadge';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Мониторинг' },
  { path: '/sites', label: 'Площадки' },
  { path: '/alerts', label: 'Тревоги' },
  { path: '/cameras', label: 'Камеры' },
  { path: '/reports', label: 'Отчёты' },
];

const ADMIN_NAV = [
  { path: '/admin', label: 'Админ' },
];

export function TopBar({ wsConnected }: { wsConnected: boolean }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const allNav = user?.role === 'admin' ? [...NAV_ITEMS, ...ADMIN_NAV] : NAV_ITEMS;

  return (
    <header style={{
      height: 'var(--topbar-height)', background: 'var(--color-dark)', color: 'var(--color-white)',
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: '24px',
      borderBottom: '2px solid var(--color-accent)', position: 'fixed', top: 0, left: 0, right: 0,
      zIndex: 100,
    }}>
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
        <span style={{
          fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)',
          letterSpacing: '0.1em', color: 'var(--color-accent)',
        }}>ЗАРЯ</span>
        <span style={{
          fontSize: 'var(--text-xs)', color: 'var(--color-secondary)', opacity: 0.7,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>мониторинг</span>
      </Link>

      <nav style={{ display: 'flex', gap: '4px', marginLeft: '20px', flex: 1 }}>
        {allNav.map(item => {
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link key={item.path} to={item.path} style={{
              padding: '8px 14px', fontSize: 'var(--text-sm)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              color: active ? 'var(--color-accent)' : 'var(--color-secondary)',
              textDecoration: 'none', borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
              transition: 'color var(--transition-fast)',
            }}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: wsConnected ? 'var(--color-status-normal)' : 'var(--color-status-critical)',
        }} title={wsConnected ? 'Live-обновления активны' : 'Нет связи'} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge status={user?.role || 'operator'} label={user?.role === 'admin' ? 'Admin' : 'Operator'} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-secondary)' }}>{user?.name}</span>
        </div>

        <button onClick={handleLogout} style={{
          background: 'none', border: '1px solid rgba(205,190,167,0.3)', color: 'var(--color-secondary)',
          padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)',
          fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer',
        }}>
          Выход
        </button>
      </div>
    </header>
  );
}
