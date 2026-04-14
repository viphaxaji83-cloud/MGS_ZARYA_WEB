import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '@/api/client';
import { YandexLocationPicker, geocodeAddress } from '@/components/map/YandexLocationPicker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loader } from '@/components/ui/Loader';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToastStore } from '@/components/ui/Toast';
import type { Site } from '@/types';

type SiteFormState = {
  code: string;
  name: string;
  address: string;
  district: string;
  lat: string;
  lon: string;
  container_count: string;
};

type SiteSortKey = 'code' | 'name' | 'address' | 'district' | 'status' | 'camera_id' | 'is_active';
type SortDirection = 'asc' | 'desc';

const TABLE_HEADERS: Array<{ label: string; sortKey?: SiteSortKey }> = [
  { label: 'Код', sortKey: 'code' },
  { label: 'Название', sortKey: 'name' },
  { label: 'Адрес', sortKey: 'address' },
  { label: 'Район', sortKey: 'district' },
  { label: 'Статус', sortKey: 'status' },
  { label: 'Камера', sortKey: 'camera_id' },
  { label: 'Активна', sortKey: 'is_active' },
  { label: 'Действия' },
];
const DEFAULT_SITE_LAT = 44.6078;
const DEFAULT_SITE_LON = 40.1058;

const SITE_STATUS_ORDER: Record<Site['status'], number> = {
  critical: 0,
  warning: 1,
  normal: 2,
  no_data: 3,
  offline: 4,
};

function emptySiteForm(): SiteFormState {
  return {
    code: '',
    name: '',
    address: '',
    district: '',
    lat: DEFAULT_SITE_LAT.toFixed(6),
    lon: DEFAULT_SITE_LON.toFixed(6),
    container_count: '4',
  };
}

function buildSiteForm(site: Site): SiteFormState {
  return {
    code: site.code,
    name: site.name,
    address: site.address,
    district: site.district ?? '',
    lat: String(site.lat),
    lon: String(site.lon),
    container_count: String(site.container_count),
  };
}

function parseCoordinateValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isDefaultCoordinates(lat: string, lon: string) {
  return (
    parseCoordinateValue(lat, DEFAULT_SITE_LAT).toFixed(6) === DEFAULT_SITE_LAT.toFixed(6) &&
    parseCoordinateValue(lon, DEFAULT_SITE_LON).toFixed(6) === DEFAULT_SITE_LON.toFixed(6)
  );
}

function normalizeSitePayload(form: SiteFormState) {
  const lat = Number(form.lat);
  const lon = Number(form.lon);
  const containerCount = Number(form.container_count);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('Укажите корректные координаты площадки');
  }

  if (!Number.isInteger(containerCount) || containerCount < 0) {
    throw new Error('Количество контейнеров должно быть целым числом не меньше нуля');
  }

  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    address: form.address.trim(),
    district: form.district.trim() || null,
    lat,
    lon,
    container_count: containerCount,
  };
}

function compareText(a: string | null | undefined, b: string | null | undefined) {
  const left = a?.trim();
  const right = b?.trim();

  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  return left.localeCompare(right, 'ru', { numeric: true, sensitivity: 'base' });
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.body);
      if (typeof parsed?.detail === 'string') {
        return parsed.detail;
      }
    } catch {}

    if (error.body) {
      return error.body;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function AdminSitesPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.add);

  const [showCreate, setShowCreate] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [sortKey, setSortKey] = useState<SiteSortKey>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['admin-sites'],
    queryFn: () => api.get<Site[]>('/admin/sites'),
  });

  const sortedSites = useMemo(() => {
    const list = [...sites];

    list.sort((a, b) => {
      let result = 0;

      switch (sortKey) {
        case 'code':
          result = compareText(a.code, b.code);
          break;
        case 'name':
          result = compareText(a.name, b.name);
          break;
        case 'address':
          result = compareText(a.address, b.address);
          break;
        case 'district':
          result = compareText(a.district, b.district);
          break;
        case 'status':
          result = SITE_STATUS_ORDER[a.status] - SITE_STATUS_ORDER[b.status];
          break;
        case 'camera_id':
          result = (a.camera_id ?? Number.MAX_SAFE_INTEGER) - (b.camera_id ?? Number.MAX_SAFE_INTEGER);
          break;
        case 'is_active':
          result = Number(a.is_active === false) - Number(b.is_active === false);
          break;
      }

      if (result === 0) {
        result = compareText(a.code, b.code);
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return list;
  }, [sites, sortDirection, sortKey]);

  const handleSort = (nextSortKey: SiteSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection(currentDirection => (currentDirection === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection('asc');
  };

  const createSite = useMutation({
    mutationFn: (body: ReturnType<typeof normalizeSitePayload>) => api.post<Site>('/admin/sites', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
      addToast('Площадка создана', 'success');
      setShowCreate(false);
    },
    onError: error => addToast(getApiErrorMessage(error, 'Не удалось создать площадку'), 'error'),
  });

  const updateSite = useMutation({
    mutationFn: ({ siteId, body }: { siteId: number; body: ReturnType<typeof normalizeSitePayload> }) =>
      api.patch<Site>(`/admin/sites/${siteId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
      addToast('Площадка обновлена', 'success');
      setEditingSite(null);
    },
    onError: error => addToast(getApiErrorMessage(error, 'Не удалось сохранить площадку'), 'error'),
  });

  const deleteSite = useMutation({
    mutationFn: (siteId: number) => api.delete(`/admin/sites/${siteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
      addToast('Площадка удалена', 'success');
    },
    onError: error => addToast(getApiErrorMessage(error, 'Не удалось удалить площадку'), 'error'),
  });

  const submitCreate = (form: SiteFormState) => {
    try {
      createSite.mutate(normalizeSitePayload(form));
    } catch (error) {
      addToast(getApiErrorMessage(error, 'Не удалось создать площадку'), 'error');
    }
  };

  const submitUpdate = (siteId: number, form: SiteFormState) => {
    try {
      updateSite.mutate({ siteId, body: normalizeSitePayload(form) });
    } catch (error) {
      addToast(getApiErrorMessage(error, 'Не удалось сохранить площадку'), 'error');
    }
  };

  const handleDelete = (site: Site) => {
    if (!window.confirm(`Удалить площадку "${site.code}"? Связанные наблюдения и тревоги тоже будут удалены.`)) {
      return;
    }

    deleteSite.mutate(site.id);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>Управление площадками</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.6, fontSize: 'var(--text-sm)' }}>
            Создание, редактирование и удаление площадок мониторинга.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Добавить площадку</Button>
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)', minWidth: '1120px' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', borderBottom: 'var(--border)' }}>
                  {TABLE_HEADERS.map(({ label, sortKey: columnSortKey }) => (
                    <th
                      key={label}
                      style={{
                        padding: '10px 14px',
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
                      ) : label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedSites.map(site => (
                  <tr key={site.id} style={{ borderBottom: '1px solid var(--color-muted)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--color-accent)' }}>{site.code}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 500 }}>{site.name}</td>
                    <td
                      title={site.address}
                      style={{
                        padding: '12px 14px',
                        opacity: 0.7,
                        maxWidth: '240px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {site.address}
                    </td>
                    <td style={{ padding: '12px 14px' }}>{site.district || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={site.status} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>{site.camera_id ? `#${site.camera_id}` : '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={site.is_active ? 'normal' : 'offline'} label={site.is_active ? 'Да' : 'Нет'} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Button size="sm" variant="outline" onClick={() => setEditingSite(site)}>
                          Редактировать
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={deleteSite.isPending && deleteSite.variables === site.id}
                          onClick={() => handleDelete(site)}
                        >
                          Удалить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SiteModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Создать площадку"
        submitLabel="Создать"
        isSaving={createSite.isPending}
        initialForm={emptySiteForm()}
        onSubmit={submitCreate}
      />

      <SiteModal
        open={Boolean(editingSite)}
        onClose={() => setEditingSite(null)}
        title="Редактировать площадку"
        submitLabel="Сохранить"
        isSaving={updateSite.isPending}
        initialForm={editingSite ? buildSiteForm(editingSite) : emptySiteForm()}
        onSubmit={form => {
          if (!editingSite) {
            return;
          }

          submitUpdate(editingSite.id, form);
        }}
      />
    </div>
  );
}

function SiteModal({
  open,
  onClose,
  title,
  submitLabel,
  isSaving,
  initialForm,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  submitLabel: string;
  isSaving: boolean;
  initialForm: SiteFormState;
  onSubmit: (form: SiteFormState) => void;
}) {
  const addToast = useToastStore(s => s.add);
  const [form, setForm] = useState<SiteFormState>(initialForm);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeNote, setGeocodeNote] = useState<string | null>(null);
  const lastAutoGeocodeAddressRef = useRef<string>('');

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setIsGeocoding(false);
      setGeocodeNote(null);
      lastAutoGeocodeAddressRef.current = '';
    }
  }, [initialForm, open]);

  const setField = (key: keyof SiteFormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'address') {
      setGeocodeNote(null);
    }
  };

  const pickerLat = useMemo(() => parseCoordinateValue(form.lat, DEFAULT_SITE_LAT), [form.lat]);
  const pickerLon = useMemo(() => parseCoordinateValue(form.lon, DEFAULT_SITE_LON), [form.lon]);

  const updateCoordinates = ({ lat, lon }: { lat: number; lon: number }) => {
    setForm(prev => ({
      ...prev,
      lat: lat.toFixed(6),
      lon: lon.toFixed(6),
    }));
  };

  const geocodeCurrentAddress = async (mode: 'manual' | 'auto') => {
    const address = form.address.trim();
    if (!address || isGeocoding) {
      return;
    }

    setIsGeocoding(true);
    if (mode === 'manual') {
      setGeocodeNote('Ищу адрес на карте...');
    }

    try {
      const coords = await geocodeAddress(address);
      updateCoordinates(coords);
      setGeocodeNote(`Точка обновлена по адресу: ${coords.query}`);
      lastAutoGeocodeAddressRef.current = address;

      if (mode === 'manual') {
        addToast('Координаты определены по адресу', 'success');
      }
    } catch (error) {
      const message = getApiErrorMessage(error, 'Не удалось определить координаты по адресу');
      setGeocodeNote(message);

      if (mode === 'manual') {
        addToast(message, 'error');
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleAddressBlur = () => {
    const address = form.address.trim();
    if (!address) {
      return;
    }

    if (!isDefaultCoordinates(form.lat, form.lon)) {
      return;
    }

    if (lastAutoGeocodeAddressRef.current === address) {
      return;
    }

    void geocodeCurrentAddress('auto');
  };

  return (
    <Modal open={open} onClose={onClose} title={title} width={760}>
      <form
        onSubmit={event => {
          event.preventDefault();
          onSubmit(form);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input label="Код" value={form.code} onChange={event => setField('code', event.target.value)} required placeholder="MKP-031" />
          <Input label="Район" value={form.district} onChange={event => setField('district', event.target.value)} placeholder="Центральный" />
        </div>

        <Input label="Название" value={form.name} onChange={event => setField('name', event.target.value)} required />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'end' }}>
          <Input
            label="Адрес"
            value={form.address}
            onChange={event => setField('address', event.target.value)}
            onBlur={handleAddressBlur}
            required
          />
          <Button
            type="button"
            variant="outline"
            disabled={isGeocoding || !form.address.trim()}
            style={{ minWidth: '168px' }}
            onClick={() => void geocodeCurrentAddress('manual')}
          >
            {isGeocoding ? 'Поиск...' : 'Найти по адресу'}
          </Button>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            borderRadius: 'var(--radius)',
            border: 'var(--border)',
            background: 'var(--color-bg)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                opacity: 0.7,
                marginBottom: '4px',
              }}
            >
              Точка на карте
            </div>
            <div style={{ fontSize: 'var(--text-sm)', opacity: 0.7, lineHeight: 1.45 }}>
              Можно поставить точку вручную на карте или определить её по адресу. После автопоиска маркер тоже можно подвинуть вручную.
            </div>
          </div>

          <YandexLocationPicker lat={pickerLat} lon={pickerLon} onChange={updateCoordinates} />

          <div style={{ fontSize: 'var(--text-xs)', opacity: 0.65 }}>
            Текущая точка: {pickerLat.toFixed(6)}, {pickerLon.toFixed(6)}
          </div>

          {geocodeNote && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', lineHeight: 1.45 }}>
              {geocodeNote}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <Input label="Широта" type="number" step="any" value={form.lat} onChange={event => setField('lat', event.target.value)} required />
          <Input label="Долгота" type="number" step="any" value={form.lon} onChange={event => setField('lon', event.target.value)} required />
          <Input label="Контейнеры" type="number" min="0" value={form.container_count} onChange={event => setField('container_count', event.target.value)} required />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Button variant="outline" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSaving}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
