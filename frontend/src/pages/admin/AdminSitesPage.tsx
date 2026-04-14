import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '@/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
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

const TABLE_HEADERS = ['Код', 'Название', 'Адрес', 'Район', 'Статус', 'Камера', 'Активна', 'Действия'];

function emptySiteForm(): SiteFormState {
  return {
    code: '',
    name: '',
    address: '',
    district: '',
    lat: '44.6078',
    lon: '40.1058',
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

function normalizeSitePayload(form: SiteFormState) {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    address: form.address.trim(),
    district: form.district.trim() || null,
    lat: parseFloat(form.lat),
    lon: parseFloat(form.lon),
    container_count: parseInt(form.container_count, 10),
  };
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

  return fallback;
}

export function AdminSitesPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.add);

  const [showCreate, setShowCreate] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['admin-sites'],
    queryFn: () => api.get<Site[]>('/admin/sites'),
  });

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
                  {TABLE_HEADERS.map(header => (
                    <th
                      key={header}
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
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sites.map(site => (
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
        onSubmit={form => createSite.mutate(normalizeSitePayload(form))}
      />

      <SiteModal
        open={Boolean(editingSite)}
        onClose={() => setEditingSite(null)}
        title="Редактировать площадку"
        submitLabel="Сохранить"
        isSaving={updateSite.isPending}
        initialForm={editingSite ? buildSiteForm(editingSite) : emptySiteForm()}
        onSubmit={form => {
          if (!editingSite) return;
          updateSite.mutate({ siteId: editingSite.id, body: normalizeSitePayload(form) });
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
  const [form, setForm] = useState<SiteFormState>(initialForm);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
    }
  }, [initialForm, open]);

  const setField = (key: keyof SiteFormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Modal open={open} onClose={onClose} title={title} width={560}>
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
        <Input label="Адрес" value={form.address} onChange={event => setField('address', event.target.value)} required />
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
