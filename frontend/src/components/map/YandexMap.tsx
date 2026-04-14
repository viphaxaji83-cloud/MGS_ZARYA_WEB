import { useEffect, useRef, useCallback } from 'react';
import type { Site } from '@/types';

declare global {
  interface Window { ymaps: any; }
}

const STATUS_COLORS: Record<string, string> = {
  normal: '#3a8c5c',
  warning: '#c98a1a',
  critical: '#c23b3b',
  no_data: '#9a9590',
  offline: '#5a5652',
};

const MAP_VIEWPORT_STORAGE_KEY = 'dashboard-map-viewport-v1';
const DEFAULT_MAP_CENTER: [number, number] = [44.6078, 40.1058];
const DEFAULT_MAP_ZOOM = 13;

function readStoredViewport() {
  try {
    const raw = window.localStorage.getItem(MAP_VIEWPORT_STORAGE_KEY);
    if (!raw) {
      return { center: DEFAULT_MAP_CENTER, zoom: DEFAULT_MAP_ZOOM };
    }

    const parsed = JSON.parse(raw) as { center?: number[]; zoom?: number };
    const center = parsed.center;
    const zoom = parsed.zoom;

    if (
      Array.isArray(center) &&
      center.length === 2 &&
      typeof center[0] === 'number' &&
      typeof center[1] === 'number' &&
      typeof zoom === 'number'
    ) {
      return { center: [center[0], center[1]] as [number, number], zoom };
    }
  } catch {}

  return { center: DEFAULT_MAP_CENTER, zoom: DEFAULT_MAP_ZOOM };
}

function persistViewport(map: any) {
  try {
    const center = map?.getCenter?.();
    const zoom = map?.getZoom?.();

    if (
      Array.isArray(center) &&
      center.length === 2 &&
      typeof center[0] === 'number' &&
      typeof center[1] === 'number' &&
      typeof zoom === 'number'
    ) {
      window.localStorage.setItem(
        MAP_VIEWPORT_STORAGE_KEY,
        JSON.stringify({ center, zoom }),
      );
    }
  } catch {}
}

interface Props {
  sites: Site[];
  selectedSiteId: number | null;
  onSiteClick: (id: number) => void;
}

export function YandexMap({ sites, selectedSiteId, onSiteClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const sitesRef = useRef(sites);
  const selectedSiteIdRef = useRef(selectedSiteId);
  const onSiteClickRef = useRef(onSiteClick);
  const hasMountedRef = useRef(false);

  const updateMarkers = useCallback(() => {
    if (!mapInstance.current || !window.ymaps) return;
    const map = mapInstance.current;
    const currentSites = sitesRef.current;
    const currentSelectedSiteId = selectedSiteIdRef.current;
    const handleSiteClick = onSiteClickRef.current;

    // Remove old markers
    markersRef.current.forEach(m => map.geoObjects.remove(m));
    markersRef.current.clear();

    currentSites.forEach(site => {
      const color = STATUS_COLORS[site.status] || STATUS_COLORS.no_data;
      const isSelected = site.id === currentSelectedSiteId;

      const placemark = new window.ymaps.Placemark(
        [site.lat, site.lon],
        {
          hintContent: site.name,
          balloonContentHeader: `<strong>${site.code}</strong> — ${site.name}`,
          balloonContentBody: `
            <div style="font-family: sans-serif; font-size: 13px; max-width: 280px;">
              <p style="margin: 4px 0; color: #666;">${site.address}</p>
              <div style="display: flex; gap: 12px; margin: 8px 0;">
                <span>Статус: <b style="color:${color}">${site.status}</b></span>
                <span>Заполн.: <b>${site.fill_level}%</b></span>
              </div>
              <div style="margin: 4px 0;">AI: ${(site.ai_confidence * 100).toFixed(0)}%</div>
              ${site.has_overflow ? '<div style="color:#c23b3b;">⚠ Переполнение</div>' : ''}
              ${site.has_litter_outside ? '<div style="color:#c98a1a;">⚠ Мусор вне контейнера</div>' : ''}
              <div style="margin-top: 8px; font-size: 11px; color: #999;">${site.last_capture_at ? new Date(site.last_capture_at).toLocaleString('ru-RU') : 'нет данных'}</div>
            </div>
          `,
          balloonContentFooter: `<a href="/sites/${site.id}" style="color:#882426;">Открыть объект →</a>`,
        },
        {
          preset: 'islands#circleDotIcon',
          iconColor: color,
          iconLayout: 'default#image',
          iconImageHref: `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? 24 : 18}" height="${isSelected ? 24 : 18}">
              <circle cx="${isSelected ? 12 : 9}" cy="${isSelected ? 12 : 9}" r="${isSelected ? 11 : 8}" fill="${color}" stroke="${isSelected ? '#fff' : color}" stroke-width="${isSelected ? 3 : 1.5}"/>
              ${isSelected ? `<circle cx="12" cy="12" r="4" fill="#fff"/>` : ''}
            </svg>
          `)}`,
          iconImageSize: isSelected ? [24, 24] : [18, 18],
          iconImageOffset: isSelected ? [-12, -12] : [-9, -9],
        }
      );

      placemark.events.add('click', () => handleSiteClick(site.id));
      map.geoObjects.add(placemark);
      markersRef.current.set(site.id, placemark);
    });
  }, []);

  const centerOnSite = useCallback((siteId: number | null) => {
    if (!mapInstance.current || !siteId) return;

    const site = sitesRef.current.find(item => item.id === siteId);
    if (site) {
      mapInstance.current.setCenter([site.lat, site.lon], 15, { duration: 300 });
    }
  }, []);

  const resetToDefaultViewport = useCallback(() => {
    if (!mapInstance.current) return;

    mapInstance.current.setCenter(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, { duration: 300 });
    window.setTimeout(() => persistViewport(mapInstance.current), 320);
  }, []);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.ymaps) return;

    window.ymaps.ready(() => {
      if (!mapRef.current || mapInstance.current) return;
      const hasStoredViewport = Boolean(window.localStorage.getItem(MAP_VIEWPORT_STORAGE_KEY));
      const initialViewport = readStoredViewport();

      mapInstance.current = new window.ymaps.Map(mapRef.current, {
        center: initialViewport.center,
        zoom: initialViewport.zoom,
        controls: ['zoomControl', 'geolocationControl'],
      }, {
        suppressMapOpenBlock: true,
      });

      mapInstance.current.events.add('boundschange', () => {
        persistViewport(mapInstance.current);
      });

      updateMarkers();
      if (!hasStoredViewport && selectedSiteIdRef.current !== null) {
        centerOnSite(selectedSiteIdRef.current);
      }
      persistViewport(mapInstance.current);
    });
  }, [centerOnSite, updateMarkers]);

  useEffect(() => {
    // Load Yandex Maps API if not loaded
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';
    if (!window.ymaps) {
      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [initMap]);

  useEffect(() => {
    sitesRef.current = sites;
    selectedSiteIdRef.current = selectedSiteId;
    onSiteClickRef.current = onSiteClick;

    if (mapInstance.current) {
      updateMarkers();
    }
  }, [sites, selectedSiteId, onSiteClick, updateMarkers]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (selectedSiteId !== null) {
      centerOnSite(selectedSiteId);
    }
  }, [selectedSiteId, centerOnSite]);

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        persistViewport(mapInstance.current);
        mapInstance.current.destroy?.();
        mapInstance.current = null;
      }
    };
  }, []);

  // Keep map in sync with container size (panel resize, window resize)
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      mapInstance.current?.container.fitToViewport();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 'var(--radius)', position: 'relative', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <button
        type="button"
        onClick={resetToDefaultViewport}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: 'var(--color-dark)',
          color: 'var(--color-text-light)',
          fontSize: '11px',
          fontWeight: 600,
          lineHeight: 1.1,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Вернуться к базовой точке"
      >
        К центру
      </button>
    </div>
  );
}
