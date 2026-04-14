import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { YandexMap } from '@/components/map/YandexMap';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FillBar } from '@/components/ui/FillBar';
import { Card } from '@/components/ui/Card';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { Loader, Skeleton } from '@/components/ui/Loader';
import { ToastContainer } from '@/components/ui/Toast';
import { useElementWidth } from '@/hooks/useElementWidth';
import { useResizableWidth } from '@/hooks/useResizableWidth';
import { useAppStore } from '@/stores/appStore';
import { alertStatusLabel, formatTimeAgo, statusLabel } from '@/utils/format';
import type { Site, DashboardSummary, Alert } from '@/types';

type FilterTab = 'all' | 'critical' | 'warning' | 'offline' | 'no_data';

const SITE_STATUS_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  normal: 2,
  no_data: 3,
  offline: 4,
};

const DEFAULT_LEFT_PANEL_WIDTH = 350;
const DEFAULT_RIGHT_PANEL_WIDTH = 380;
const MIN_LEFT_PANEL_WIDTH = 260;
const MIN_RIGHT_PANEL_WIDTH = 320;
const MIN_MAP_WIDTH = 420;
const HANDLE_WIDTH = 10;
const HANDLE_GAP_TOTAL = HANDLE_WIDTH * 2;

export function DashboardPage() {
  const { selectedSiteId, setSelectedSite } = useAppStore();
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { ref: dashboardRef, width: dashboardWidth } = useElementWidth<HTMLDivElement>();
  const leftPanelWidthRef = useRef(DEFAULT_LEFT_PANEL_WIDTH);
  const rightPanelWidthRef = useRef(DEFAULT_RIGHT_PANEL_WIDTH);

  const { width: leftPanelWidth, startResize: startLeftPanelResize } = useResizableWidth({
    storageKey: 'dashboard-left-panel-width-v2',
    defaultWidth: DEFAULT_LEFT_PANEL_WIDTH,
    minWidth: MIN_LEFT_PANEL_WIDTH,
    maxWidth: () => (
      dashboardWidth > 0
        ? Math.max(
            MIN_LEFT_PANEL_WIDTH,
            dashboardWidth - rightPanelWidthRef.current - MIN_MAP_WIDTH - HANDLE_GAP_TOTAL,
          )
        : Number.MAX_SAFE_INTEGER
    ),
    direction: 'leading',
  });

  const { width: rightPanelWidth, startResize: startRightPanelResize } = useResizableWidth({
    storageKey: 'dashboard-right-panel-width-v2',
    defaultWidth: DEFAULT_RIGHT_PANEL_WIDTH,
    minWidth: MIN_RIGHT_PANEL_WIDTH,
    maxWidth: () => (
      dashboardWidth > 0
        ? Math.max(
            MIN_RIGHT_PANEL_WIDTH,
            dashboardWidth - leftPanelWidthRef.current - MIN_MAP_WIDTH - HANDLE_GAP_TOTAL,
          )
        : Number.MAX_SAFE_INTEGER
    ),
    direction: 'trailing',
  });

  useEffect(() => {
    leftPanelWidthRef.current = leftPanelWidth;
  }, [leftPanelWidth]);

  useEffect(() => {
    rightPanelWidthRef.current = rightPanelWidth;
  }, [rightPanelWidth]);

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => api.get<{ items: Site[]; total: number }>('/sites').then(r => r.items),
    refetchInterval: 30000,
  });

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
    refetchInterval: 30000,
  });

  const { data: recentAlerts = [] } = useQuery({
    queryKey: ['alerts-recent'],
    queryFn: () => api.get<Alert[]>('/alerts?limit=10&status=new'),
  });

  const filteredSites = useMemo(() => {
    let list = [...sites];
    if (filterTab === 'critical') list = list.filter(s => s.status === 'critical');
    else if (filterTab === 'warning') list = list.filter(s => s.status === 'warning');
    else if (filterTab === 'offline') list = list.filter(s => s.status === 'offline');
    else if (filterTab === 'no_data') list = list.filter(s => s.status === 'no_data');

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
      );
    }

    if (filterTab === 'all') {
      list.sort((a, b) => {
        const byStatus = (SITE_STATUS_ORDER[a.status] ?? Number.MAX_SAFE_INTEGER)
          - (SITE_STATUS_ORDER[b.status] ?? Number.MAX_SAFE_INTEGER);

        if (byStatus !== 0) return byStatus;

        return a.code.localeCompare(b.code, 'ru', { numeric: true });
      });
    }

    return list;
  }, [sites, filterTab, searchQuery]);

  const selectedSite = sites.find(s => s.id === selectedSiteId);

  return (
    <div ref={dashboardRef} style={{ display: 'flex', height: 'calc(100vh - var(--topbar-height))' }}>
      {/* Left Panel — Site List */}
      <div style={{
        width: `${leftPanelWidth}px`, flexShrink: 0, background: 'var(--color-white)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Summary strip */}
        {summary && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px',
            background: 'var(--color-muted)', borderBottom: 'var(--border)',
          }}>
            {[
              { label: 'Норма', value: summary.sites_normal, color: 'var(--color-status-normal)' },
              { label: 'Вниман.', value: summary.sites_warning, color: 'var(--color-status-warning)' },
              { label: 'Крит.', value: summary.sites_critical, color: 'var(--color-status-critical)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--color-white)', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '12px' }}>
          <input
            type="text" placeholder="Поиск по ID, адресу, названию..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 'var(--text-sm)',
              border: 'var(--border)', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg)', outline: 'none', fontFamily: 'var(--font-body)',
            }}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '2px', padding: '0 12px 8px', flexWrap: 'wrap' }}>
          {([
            { key: 'all', label: 'Все' },
            { key: 'critical', label: 'Крит.' },
            { key: 'warning', label: 'Вним.' },
            { key: 'offline', label: 'Офф.' },
            { key: 'no_data', label: 'Нет данн.' },
          ] as { key: FilterTab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setFilterTab(t.key)} style={{
              padding: '4px 10px', fontSize: '11px', fontWeight: 600,
              textTransform: 'uppercase', border: 'var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: filterTab === t.key ? 'var(--color-accent)' : 'transparent',
              color: filterTab === t.key ? 'var(--color-text-light)' : 'var(--color-text)',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Site List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {sitesLoading ? <Loader /> : filteredSites.map(site => (
            <div key={site.id} onClick={() => setSelectedSite(site.id)} style={{
              padding: '14px 16px',
              margin: '6px 8px',
              borderRadius: 'var(--radius)',
              border: site.id === selectedSiteId ? '1px solid rgba(136,36,38,0.22)' : '1px solid rgba(205,190,167,0.55)',
              cursor: 'pointer',
              transition: 'background var(--transition-fast), box-shadow var(--transition-fast)',
              background: site.id === selectedSiteId ? 'rgba(136,36,38,0.06)' : 'var(--color-white)',
              boxShadow: site.id === selectedSiteId ? '0 0 0 1px var(--color-accent)' : 'var(--shadow-sm)',
            }}>
              {/* Row 1: Name + Status badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '15px',
                  fontWeight: 600,
                  lineHeight: 1.05,
                  color: 'var(--color-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  transform: 'translateY(1px)',
                }}>
                  {site.name}
                </div>
                <StatusBadge status={site.status} />
              </div>
              {/* Row 2: Code + Time ago */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: 'var(--color-accent)',
                  textTransform: 'uppercase',
                }}>
                  {site.code}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(50,48,48,0.45)', whiteSpace: 'nowrap' }}>
                  {formatTimeAgo(site.last_capture_at)}
                </div>
              </div>
              {/* Row 3: Fill bar + Percentage */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {site.fill_level > 0 ? <FillBar level={site.fill_level} height={8} /> : <div style={{ height: '8px' }} />}
                </div>
                <div style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                  whiteSpace: 'nowrap',
                  minWidth: '50px',
                  textAlign: 'right',
                }}>
                  {site.fill_level > 0 ? `${site.fill_level}%` : '—'}
                </div>
              </div>
            </div>
          ))}
          {!sitesLoading && filteredSites.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', opacity: 0.5, fontSize: 'var(--text-sm)' }}>
              Площадки не найдены
            </div>
          )}
        </div>
      </div>

      {/* Center — Map */}
      <ResizeHandle
        onPointerDown={startLeftPanelResize}
        background="rgba(245, 243, 239, 0.9)"
      />
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative' }}>
        <YandexMap sites={filteredSites} selectedSiteId={selectedSiteId} onSiteClick={setSelectedSite} />
        <ToastContainer
          placements={['dashboard-map']}
          style={{
            position: 'absolute',
            right: '18px',
            bottom: '72px',
            top: 'auto',
            alignItems: 'flex-end',
            zIndex: 15,
            pointerEvents: 'none',
          }}
        />

        {/* Summary overlay */}
        {summary && (
          <div style={{
            position: 'absolute', top: '12px', left: '12px', zIndex: 10,
            display: 'flex', gap: '6px',
          }}>
            {[ 
              { label: 'Площадки', value: summary.total_sites, color: '#f5f3ef' },
              { label: 'Камеры ON', value: summary.cameras_online, color: '#47bf4f' },
              { label: 'Камеры OFF', value: summary.cameras_offline, color: '#c29545' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--color-dark)', color: 'var(--color-text-light)',
                padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.03em',
                textAlign: 'center',
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  transform: 'translateY(1px)',
                }}>
                  <span style={{ color: s.color, fontWeight: 400, marginRight: '4px' }}>{s.value}</span>
                  <span>{s.label}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Panel — Selected Site Detail / AI Detection */}
      <ResizeHandle
        onPointerDown={startRightPanelResize}
        background="rgba(245, 243, 239, 0.9)"
      />
      <div style={{
        width: `${rightPanelWidth}px`, flexShrink: 0, background: 'var(--color-white)',
        minWidth: 0, overflowX: 'hidden', overflowY: 'auto',
      }}>
        {selectedSite ? (
          <SiteDetailPanel site={selectedSite} />
        ) : (
          <div style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            gap: '12px',
            opacity: 0.5,
          }}>
            <div style={{ fontSize: 'var(--text-3xl)' }}>◎</div>
            <p style={{
              margin: 0,
              maxWidth: '240px',
              fontSize: 'var(--text-sm)',
              lineHeight: 1.5,
              overflowWrap: 'break-word',
            }}>
              Выберите площадку на карте или в списке
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SiteDetailPanel({ site }: { site: Site }) {
  const { data: alerts = [] } = useQuery({
    queryKey: ['site-alerts', site.id],
    queryFn: () => api.get<Alert[]>(`/sites/${site.id}/alerts?limit=5`),
  });

  const lowConfidence = site.ai_confidence > 0 && site.ai_confidence < 0.6;

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: 'var(--color-dark)',
        color: 'var(--color-text-light)',
        borderBottom: '2px solid var(--color-accent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <StatusBadge status={site.status} size="xs" />
        </div>
        <h3 style={{
          fontSize: 'var(--text-lg)',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          fontWeight: 700,
          margin: '10px 0 8px',
          color: 'var(--color-text-light)',
          overflowWrap: 'anywhere',
        }}>
          {site.name}
        </h3>
        <div style={{
          fontSize: '11px',
          lineHeight: 1,
          letterSpacing: '0.03em',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: '#c29545',
        }}>
          {site.code}
        </div>
      </div>

      {/* Image Preview */}
      <div style={{
        margin: '16px', background: 'var(--color-muted)', borderRadius: 'var(--radius)',
        height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', border: 'var(--border)',
      }}>
        {site.last_image_url ? (
          <div style={{
            width: '100%',
            height: '100%',
            padding: '0 12px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#2a2a2a',
            color: 'var(--color-secondary)',
            fontSize: 'var(--text-sm)',
            textAlign: 'center',
            overflowWrap: 'anywhere',
          }}>
            📷 Последний кадр — {formatTimeAgo(site.last_capture_at)}
          </div>
        ) : (
          <span style={{ fontSize: 'var(--text-sm)', opacity: 0.5 }}>Нет изображения</span>
        )}
      </div>

      {/* AI Detection Section */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--color-accent)', marginBottom: '12px', paddingBottom: '8px', borderBottom: 'var(--border)',
        }}>
          AI Detection
        </div>

        {/* Fill Level */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Заполненность</span>
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
              {site.fill_level > 0 ? `${site.fill_level}%` : '—'}
            </span>
          </div>
          <FillBar level={site.fill_level} height={8} />
        </div>

        {/* Confidence */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)' }}>AI Confidence</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
              {site.ai_confidence > 0 ? `${(site.ai_confidence * 100).toFixed(0)}%` : '—'}
            </span>
          </div>
          {lowConfidence && (
            <div style={{
              marginTop: '6px', padding: '6px 10px', fontSize: '11px',
              background: 'rgba(201,138,26,0.1)', border: '1px solid var(--color-status-warning)',
              borderRadius: 'var(--radius-sm)', color: 'var(--color-status-warning)',
            }}>
              ⚠ Низкая уверенность — требует проверки оператором
            </div>
          )}
        </div>

        {/* Detection Flags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <DetectionFlag label="Переполнение" active={site.has_overflow} />
          <DetectionFlag label="Мусор вне контейнера" active={site.has_litter_outside} />
          <DetectionFlag label="Камера" active={site.status !== 'offline'} good />
          <DetectionFlag label="Свежие данные" active={!!site.last_capture_at} good />
        </div>
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--color-accent)', marginBottom: '8px', paddingBottom: '6px', borderBottom: 'var(--border)',
          }}>
            Последние тревоги
          </div>
          {alerts.map(a => (
            <Link
              key={a.id}
              to={`/alerts?alertId=${a.id}`}
              style={{
                padding: '6px 0',
                borderBottom: '1px solid var(--color-muted)',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <span style={{ minWidth: 0, marginRight: '12px', overflowWrap: 'anywhere' }}>{a.message || a.type}</span>
              <StatusBadge status={a.status} label={alertStatusLabel(a.status)} size="sm" />
            </Link>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Link to={`/sites/${site.id}`} style={{
          display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', padding: '10px',
          background: 'var(--color-accent)', color: 'var(--color-text-light)',
          borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 'var(--text-sm)',
          textTransform: 'uppercase', letterSpacing: '0.04em', textDecoration: 'none',
        }}>
          Открыть объект →
        </Link>
      </div>
    </div>
  );
}

function DetectionFlag({ label, active, good }: { label: string; active: boolean; good?: boolean }) {
  const color = good
    ? (active ? 'var(--color-status-normal)' : 'var(--color-status-critical)')
    : (active ? 'var(--color-status-critical)' : 'var(--color-status-normal)');
  const text = good
    ? (active ? 'Да' : 'Нет')
    : (active ? 'Да' : 'Нет');

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
      <span style={{ minWidth: 0, marginRight: '12px' }}>{label}</span>
      <span style={{ flexShrink: 0, fontWeight: 600, color }}>{text}</span>
    </div>
  );
}
