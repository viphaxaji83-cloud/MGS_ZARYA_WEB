import { NavLink, Outlet } from 'react-router-dom';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { useElementWidth } from '@/hooks/useElementWidth';
import { useResizableWidth } from '@/hooks/useResizableWidth';

const ADMIN_LINKS = [
  { path: '/admin', label: 'Обзор', exact: true },
  { path: '/admin/users', label: 'Пользователи' },
  { path: '/admin/sites', label: 'Площадки' },
  { path: '/admin/cameras', label: 'Камеры' },
  { path: '/admin/settings', label: 'Настройки' },
  { path: '/admin/system', label: 'Система' },
  { path: '/admin/audit-log', label: 'Журнал' },
];

const DEFAULT_ADMIN_SIDEBAR_WIDTH = 220;
const MIN_ADMIN_SIDEBAR_WIDTH = 180;
const MIN_ADMIN_CONTENT_WIDTH = 640;
const ADMIN_HANDLE_WIDTH = 10;

export function AdminLayout() {
  const { ref: adminLayoutRef, width: adminLayoutWidth } = useElementWidth<HTMLDivElement>();
  const { width: adminSidebarWidth, startResize: startAdminSidebarResize } = useResizableWidth({
    storageKey: 'admin-sidebar-width',
    defaultWidth: DEFAULT_ADMIN_SIDEBAR_WIDTH,
    minWidth: MIN_ADMIN_SIDEBAR_WIDTH,
    maxWidth: () => (
      adminLayoutWidth > 0
        ? Math.max(
            MIN_ADMIN_SIDEBAR_WIDTH,
            adminLayoutWidth - MIN_ADMIN_CONTENT_WIDTH - ADMIN_HANDLE_WIDTH,
          )
        : Number.MAX_SAFE_INTEGER
    ),
    direction: 'leading',
  });

  return (
    <div ref={adminLayoutRef} style={{ display: 'flex', minHeight: 'calc(100vh - var(--topbar-height))' }}>
      <aside style={{
        width: `${adminSidebarWidth}px`, background: 'var(--color-dark)', padding: '24px 0',
        borderRight: '1px solid rgba(205,190,167,0.15)', flexShrink: 0,
      }}>
        <div style={{
          padding: '0 20px 20px', fontSize: 'var(--text-xs)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent)',
          borderBottom: '1px solid rgba(205,190,167,0.1)', marginBottom: '12px',
        }}>
          Администрирование
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          {ADMIN_LINKS.map(link => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.exact}
              style={({ isActive }) => ({
                padding: '10px 20px', fontSize: 'var(--text-sm)', fontWeight: 500,
                color: isActive ? 'var(--color-accent)' : 'var(--color-secondary)',
                textDecoration: 'none', borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
                background: isActive ? 'rgba(136,36,38,0.1)' : 'transparent',
                transition: 'all var(--transition-fast)',
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <ResizeHandle
        onPointerDown={startAdminSidebarResize}
        lineColor="rgba(205, 190, 167, 0.2)"
        background="rgba(17, 17, 17, 0.04)"
      />
      <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
