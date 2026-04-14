import { useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ToastContainer, useToastStore } from '@/components/ui/Toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { alertTypeLabel, severityLabel } from '@/utils/format';
import { TopBar } from './TopBar';

export function AppLayout() {
  const location = useLocation();
  const addToast = useToastStore(s => s.add);
  const isDashboard = location.pathname === '/dashboard';

  const handleWsMessage = useCallback((msg: { type: string; data: any }) => {
    if (msg.type === 'new_alert') {
      addToast(
        `Новая тревога: ${alertTypeLabel(msg.data.alert_type)} (${severityLabel(msg.data.severity)})`,
        'error',
        'dashboard-map',
        msg.data.alert_id ? `/alerts?alertId=${msg.data.alert_id}` : '/alerts',
      );
    }
  }, [addToast]);

  const { connected } = useWebSocket(handleWsMessage);

  return (
    <div className="landing-grid-bg" style={{ minHeight: '100vh' }}>
      <TopBar wsConnected={connected} />
      <main style={{ paddingTop: 'var(--topbar-height)' }}>
        <Outlet />
      </main>
      <ToastContainer placements={isDashboard ? ['default'] : ['default', 'dashboard-map']} />
    </div>
  );
}
