import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ToastContainer, useToastStore } from '@/components/ui/Toast';
import { useCallback } from 'react';

export function AppLayout() {
  const addToast = useToastStore(s => s.add);

  const handleWsMessage = useCallback((msg: { type: string; data: any }) => {
    if (msg.type === 'new_alert') {
      addToast(`Новая тревога: ${msg.data.alert_type} (${msg.data.severity})`, 'error');
    }
  }, [addToast]);

  const { connected } = useWebSocket(handleWsMessage);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <TopBar wsConnected={connected} />
      <main style={{ paddingTop: 'var(--topbar-height)' }}>
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
