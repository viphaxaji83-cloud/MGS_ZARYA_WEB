import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/components/ui/Toast';
import { formatDate, alertStatusLabel, alertTypeLabel, severityLabel } from '@/utils/format';
import type { Alert } from '@/types';

type SortKey = 'id' | 'type' | 'severity' | 'status' | 'message' | 'site_id' | 'created_at';
type SortDirection = 'asc' | 'desc';

const ALERT_SEVERITY_ORDER: Record<Alert['severity'], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const ALERT_STATUS_ORDER: Record<Alert['status'], number> = {
  new: 0,
  viewed: 1,
  confirmed: 2,
  closed: 3,
  false_positive: 4,
};

const TABLE_HEADERS: Array<{ label: string; sortKey?: SortKey }> = [
  { label: 'ID', sortKey: 'id' },
  { label: 'Тип', sortKey: 'type' },
  { label: 'Важность', sortKey: 'severity' },
  { label: 'Статус', sortKey: 'status' },
  { label: 'Сообщение', sortKey: 'message' },
  { label: 'Площадка', sortKey: 'site_id' },
  { label: 'Дата', sortKey: 'created_at' },
  { label: 'Действия' },
];

const ROWS_PER_PAGE = 15;
const ALERT_HIGHLIGHT_DURATION_MS = 2200;

function compareText(a: string | null | undefined, b: string | null | undefined) {
  const left = a?.trim();
  const right = b?.trim();

  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  return left.localeCompare(right, 'ru', { numeric: true, sensitivity: 'base' });
}

export function AlertsPage() {
  const [searchParams] = useSearchParams();
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedMessageIds, setExpandedMessageIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedAlertId, setHighlightedAlertId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.add);
  const focusedAlertIdRef = useRef<number | null>(null);
  const clearHighlightTimeoutRef = useRef<number | null>(null);
  const focusAlertId = (() => {
    const parsed = Number(searchParams.get('alertId'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  })();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', typeFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '200');
      return api.get<Alert[]>(`/alerts?${params}`);
    },
  });

  const sortedAlerts = [...alerts].sort((a, b) => {
    let result = 0;

    switch (sortKey) {
      case 'id':
        result = a.id - b.id;
        break;
      case 'type':
        result = compareText(alertTypeLabel(a.type), alertTypeLabel(b.type));
        break;
      case 'severity':
        result = ALERT_SEVERITY_ORDER[a.severity] - ALERT_SEVERITY_ORDER[b.severity];
        break;
      case 'status':
        result = ALERT_STATUS_ORDER[a.status] - ALERT_STATUS_ORDER[b.status];
        break;
      case 'message':
        result = compareText(a.message, b.message);
        break;
      case 'site_id':
        result = a.site_id - b.site_id;
        break;
      case 'created_at':
        result = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }

    if (result === 0) {
      result = b.id - a.id;
    }

    return sortDirection === 'asc' ? result : -result;
  });

  const totalPages = Math.max(1, Math.ceil(sortedAlerts.length / ROWS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * ROWS_PER_PAGE;
  const paginatedAlerts = sortedAlerts.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const visibleFrom = sortedAlerts.length === 0 ? 0 : pageStart + 1;
  const visibleTo = Math.min(pageStart + ROWS_PER_PAGE, sortedAlerts.length);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  const updateAlert = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/alerts/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      addToast('Статус обновлён', 'success');
    },
  });

  const countByStatus = (status: string) => alerts.filter(alert => alert.status === status).length;

  const handleSort = (nextSortKey: SortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection(currentDirection => currentDirection === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection('asc');
  };

  const toggleMessage = (alertId: number) => {
    setExpandedMessageIds(currentIds => (
      currentIds.includes(alertId)
        ? currentIds.filter(id => id !== alertId)
        : [...currentIds, alertId]
    ));
  };

  useEffect(() => {
    setCurrentPage(1);
    setExpandedMessageIds([]);
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    focusedAlertIdRef.current = null;
    setHighlightedAlertId(null);

    if (clearHighlightTimeoutRef.current) {
      window.clearTimeout(clearHighlightTimeoutRef.current);
      clearHighlightTimeoutRef.current = null;
    }
  }, [focusAlertId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    return () => {
      if (clearHighlightTimeoutRef.current) {
        window.clearTimeout(clearHighlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!focusAlertId || sortedAlerts.length === 0) {
      return;
    }

    const targetIndex = sortedAlerts.findIndex(alert => alert.id === focusAlertId);
    if (targetIndex === -1) {
      return;
    }

    const targetPage = Math.floor(targetIndex / ROWS_PER_PAGE) + 1;
    if (safeCurrentPage !== targetPage) {
      setCurrentPage(targetPage);
      return;
    }

    if (focusedAlertIdRef.current === focusAlertId) {
      return;
    }

    focusedAlertIdRef.current = focusAlertId;

    const scrollTimeout = window.setTimeout(() => {
      const row = document.getElementById(`alert-row-${focusAlertId}`);
      if (!row) {
        return;
      }

      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedAlertId(focusAlertId);

      if (clearHighlightTimeoutRef.current) {
        window.clearTimeout(clearHighlightTimeoutRef.current);
      }

      clearHighlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedAlertId(current => (current === focusAlertId ? null : current));
        clearHighlightTimeoutRef.current = null;
      }, ALERT_HIGHLIGHT_DURATION_MS);
    }, 80);

    return () => window.clearTimeout(scrollTimeout);
  }, [focusAlertId, safeCurrentPage, sortedAlerts]);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: '20px' }}>Тревоги</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Новые', count: countByStatus('new'), color: 'var(--color-status-critical)' },
          { label: 'Просмотр.', count: countByStatus('viewed'), color: 'var(--color-status-warning)' },
          { label: 'Подтвержд.', count: countByStatus('confirmed'), color: 'var(--color-status-normal)' },
          { label: 'Закрыт.', count: countByStatus('closed'), color: 'var(--color-status-no-data)' },
        ].map(counter => (
          <div
            key={counter.label}
            style={{
              padding: '8px 16px',
              background: 'var(--color-white)',
              border: 'var(--border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: counter.color }}>
              {counter.count}
            </span>
            <span style={{ fontSize: 'var(--text-sm)', opacity: 0.6 }}>{counter.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <select
          value={typeFilter}
          onChange={event => setTypeFilter(event.target.value)}
          style={{
            padding: '8px 14px',
            border: 'var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)',
            background: 'var(--color-white)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <option value="">Все типы</option>
          {['overflow', 'litter', 'degradation', 'camera_offline', 'no_data', 'ai_error'].map(type => (
            <option key={type} value={type}>
              {alertTypeLabel(type)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
          style={{
            padding: '8px 14px',
            border: 'var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)',
            background: 'var(--color-white)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <option value="">Все статусы</option>
          {['new', 'viewed', 'confirmed', 'closed', 'false_positive'].map(status => (
            <option key={status} value={status}>
              {alertStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div
          style={{
            background: 'var(--color-white)',
            borderRadius: 'var(--radius)',
            border: 'var(--border)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: 'var(--border)' }}>
                {TABLE_HEADERS.map(({ label, sortKey: columnSortKey }) => (
                  <th
                    key={label}
                    style={{
                      padding: '10px 14px',
                      width: label === 'Сообщение' ? '320px' : undefined,
                      minWidth: label === 'Сообщение' ? '320px' : undefined,
                      textAlign: 'left',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 600,
                      opacity: 0.6,
                    }}
                  >
                    {columnSortKey ? (
                      <button
                        type="button"
                        onClick={() => handleSort(columnSortKey)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: 0,
                          border: 0,
                          background: 'none',
                          color: sortKey === columnSortKey ? 'var(--color-accent)' : 'inherit',
                          font: 'inherit',
                          letterSpacing: 'inherit',
                          textTransform: 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        <span>{label}</span>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '10px',
                            textAlign: 'center',
                            fontSize: '9px',
                            lineHeight: 1,
                            opacity: sortKey === columnSortKey ? 1 : 0.35,
                            transform: sortKey === columnSortKey && sortDirection === 'desc' ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.15s ease',
                          }}
                        >
                          ▲
                        </span>
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedAlerts.map(alert => {
                const message = alert.message?.trim() || '—';
                const isExpanded = expandedMessageIds.includes(alert.id);
                const canExpandMessage = message.length > 90;

                return (
                  <tr
                    id={`alert-row-${alert.id}`}
                    key={alert.id}
                    style={{
                      borderBottom: '1px solid var(--color-muted)',
                      background: highlightedAlertId === alert.id ? 'rgba(165, 36, 47, 0.08)' : 'transparent',
                      boxShadow: highlightedAlertId === alert.id ? 'inset 3px 0 0 var(--color-accent)' : 'none',
                      transition: 'background 0.2s ease, box-shadow 0.2s ease',
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>#{alert.id}</td>
                    <td style={{ padding: '10px 14px' }}>{alertTypeLabel(alert.type)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusBadge status={alert.severity} label={severityLabel(alert.severity)} />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusBadge status={alert.status} label={alertStatusLabel(alert.status)} />
                    </td>
                    <td style={{ padding: '10px 14px', width: '320px', minWidth: '320px', verticalAlign: 'top' }}>
                      <div
                        title={message}
                        style={{
                          color: 'rgba(15, 25, 35, 0.86)',
                          lineHeight: 1.45,
                          whiteSpace: isExpanded ? 'normal' : 'initial',
                          display: isExpanded ? 'block' : '-webkit-box',
                          WebkitLineClamp: isExpanded ? 'unset' : 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          wordBreak: 'break-word',
                        }}
                      >
                        {message}
                      </div>
                      {canExpandMessage && (
                        <button
                          type="button"
                          onClick={() => toggleMessage(alert.id)}
                          style={{
                            marginTop: '6px',
                            padding: 0,
                            border: 0,
                            background: 'none',
                            color: 'var(--color-accent)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {isExpanded ? 'Скрыть' : 'Ещё'}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <Link to={`/sites/${alert.site_id}`} style={{ color: 'var(--color-accent)' }}>
                        #{alert.site_id}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', opacity: 0.5 }}>
                      {formatDate(alert.created_at)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {alert.status === 'new' && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateAlert.mutate({ id: alert.id, status: 'confirmed' })}
                          >
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateAlert.mutate({ id: alert.id, status: 'false_positive' })}
                          >
                            ✕
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                borderTop: 'var(--border)',
                background: 'rgba(245, 243, 239, 0.55)',
              }}
            >
              <span style={{ fontSize: '12px', opacity: 0.65 }}>
                {visibleFrom}-{visibleTo} из {sortedAlerts.length}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '10px',
                    border: 'var(--border)',
                    background: safeCurrentPage === 1 ? 'rgba(15, 25, 35, 0.04)' : 'var(--color-white)',
                    color: 'var(--color-text)',
                    opacity: safeCurrentPage === 1 ? 0.45 : 1,
                    cursor: safeCurrentPage === 1 ? 'default' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Назад
                </button>
                {pageNumbers.map(page => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    style={{
                      minWidth: '34px',
                      padding: '7px 10px',
                      borderRadius: '10px',
                      border: page === safeCurrentPage ? '1px solid var(--color-accent)' : 'var(--border)',
                      background: page === safeCurrentPage ? 'rgba(165, 36, 47, 0.08)' : 'var(--color-white)',
                      color: page === safeCurrentPage ? 'var(--color-accent)' : 'var(--color-text)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage === totalPages}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '10px',
                    border: 'var(--border)',
                    background: safeCurrentPage === totalPages ? 'rgba(15, 25, 35, 0.04)' : 'var(--color-white)',
                    color: 'var(--color-text)',
                    opacity: safeCurrentPage === totalPages ? 0.45 : 1,
                    cursor: safeCurrentPage === totalPages ? 'default' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Вперёд
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
