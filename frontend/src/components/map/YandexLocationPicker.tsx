import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';

declare global {
  interface Window {
    ymaps: any;
    __yandexMapsLoaderPromise?: Promise<any>;
  }
}

const DEFAULT_CENTER: [number, number] = [44.6078, 40.1058];
const DEFAULT_ZOOM = 15;

function isValidCoordinate(value: number) {
  return Number.isFinite(value);
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

function getInitialCenter(lat: number, lon: number): [number, number] {
  if (isValidCoordinate(lat) && isValidCoordinate(lon)) {
    return [lat, lon];
  }

  return DEFAULT_CENTER;
}

function buildGeocodeQuery(address: string) {
  const normalized = address.trim();
  if (!normalized) {
    throw new Error('Сначала укажи адрес площадки');
  }

  if (/майкоп/i.test(normalized)) {
    return normalized;
  }

  return `${normalized}, Майкоп`;
}

type GeocodeResponse = {
  lat: number;
  lon: number;
  query: string;
  resolved_address?: string;
};

async function geocodeAddressViaBackend(query: string): Promise<GeocodeResponse> {
  return api.get<GeocodeResponse>(`/admin/sites/geocode?address=${encodeURIComponent(query)}`);
}

export function loadYandexMaps() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not available'));
  }

  if (window.ymaps) {
    return Promise.resolve(window.ymaps);
  }

  if (window.__yandexMapsLoaderPromise) {
    return window.__yandexMapsLoaderPromise;
  }

  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';

  window.__yandexMapsLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-yandex-maps-loader="true"]') as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (!window.ymaps) {
          reject(new Error('Yandex Maps API is unavailable'));
          return;
        }

        window.ymaps.ready(() => resolve(window.ymaps));
      }, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Yandex Maps API')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    script.dataset.yandexMapsLoader = 'true';
    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error('Yandex Maps API is unavailable'));
        return;
      }

      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => reject(new Error('Failed to load Yandex Maps API'));
    document.head.appendChild(script);
  });

  return window.__yandexMapsLoaderPromise;
}

export async function geocodeAddress(address: string) {
  const query = buildGeocodeQuery(address);
  const hasYandexGeocodeKey = Boolean(import.meta.env.VITE_YANDEX_MAPS_API_KEY?.trim());

  if (!hasYandexGeocodeKey) {
    return geocodeAddressViaBackend(query);
  }

  try {
    const ymaps = await loadYandexMaps();
    const result = await ymaps.geocode(query, { results: 1 });
    const geoObject = result.geoObjects.get(0);

    if (!geoObject) {
      throw new Error('Не удалось определить координаты по этому адресу');
    }

    const coords = geoObject.geometry.getCoordinates() as [number, number];
    return {
      lat: roundCoordinate(coords[0]),
      lon: roundCoordinate(coords[1]),
      query,
    };
  } catch {
    return geocodeAddressViaBackend(query);
  }
}

interface Props {
  lat: number;
  lon: number;
  onChange: (coords: { lat: number; lon: number }) => void;
  height?: number;
}

export function YandexLocationPicker({ lat, lon, onChange, height = 320 }: Props) {
  const mapNodeRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const syncMarker = useCallback((coords: [number, number], shouldCenter = false) => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker) {
      return;
    }

    marker.geometry.setCoordinates(coords);
    if (shouldCenter) {
      map.setCenter(coords, map.getZoom(), { duration: 250 });
    }
  }, []);

  const emitCoordinates = useCallback((coords: [number, number]) => {
    onChangeRef.current({
      lat: roundCoordinate(coords[0]),
      lon: roundCoordinate(coords[1]),
    });
  }, []);

  useEffect(() => {
    let isDisposed = false;

    const init = async () => {
      try {
        await loadYandexMaps();

        if (isDisposed || !mapNodeRef.current || mapInstanceRef.current) {
          return;
        }

        const initialCenter = getInitialCenter(lat, lon);
        const map = new window.ymaps.Map(
          mapNodeRef.current,
          {
            center: initialCenter,
            zoom: DEFAULT_ZOOM,
            controls: ['zoomControl'],
          },
          {
            suppressMapOpenBlock: true,
            searchControlProvider: 'yandex#search',
          },
        );

        const marker = new window.ymaps.Placemark(
          initialCenter,
          { hintContent: 'Положение площадки' },
          {
            preset: 'islands#redDotIcon',
            draggable: true,
          },
        );

        marker.events.add('dragend', () => {
          const coords = marker.geometry.getCoordinates() as [number, number];
          emitCoordinates(coords);
        });

        map.events.add('click', (event: any) => {
          const coords = event.get('coords') as [number, number];
          syncMarker(coords);
          emitCoordinates(coords);
        });

        try {
          const searchControl = new window.ymaps.control.SearchControl({
            options: {
              float: 'right',
              noPlacemark: true,
              provider: 'yandex#search',
              placeholderContent: 'Найти адрес',
              size: 'small',
            },
          });

          searchControl.events.add('resultselect', (event: any) => {
            const index = event.get('index');
            searchControl.getResult(index).then((result: any) => {
              const coords = result.geometry.getCoordinates() as [number, number];
              syncMarker(coords, true);
              emitCoordinates(coords);
            });
          });

          map.controls.add(searchControl);
        } catch {}

        map.geoObjects.add(marker);
        mapInstanceRef.current = map;
        markerRef.current = marker;

        requestAnimationFrame(() => {
          map.container.fitToViewport();
        });
      } catch (error) {
        if (!isDisposed) {
          setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить карту');
        }
      }
    };

    void init();

    return () => {
      isDisposed = true;
      markerRef.current = null;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy?.();
        mapInstanceRef.current = null;
      }
    };
  }, [emitCoordinates, lat, lon, syncMarker]);

  useEffect(() => {
    if (!isValidCoordinate(lat) || !isValidCoordinate(lon) || !markerRef.current) {
      return;
    }

    syncMarker([lat, lon], true);
  }, [lat, lon, syncMarker]);

  if (loadError) {
    return (
      <div
        style={{
          height,
          borderRadius: 'var(--radius)',
          border: 'var(--border)',
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          opacity: 0.7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '16px',
          fontSize: 'var(--text-sm)',
        }}
      >
        {loadError}
      </div>
    );
  }

  return (
    <div
      ref={mapNodeRef}
      style={{
        width: '100%',
        height,
        borderRadius: 'var(--radius)',
        border: 'var(--border)',
        overflow: 'hidden',
        background: 'var(--color-bg)',
      }}
    />
  );
}
