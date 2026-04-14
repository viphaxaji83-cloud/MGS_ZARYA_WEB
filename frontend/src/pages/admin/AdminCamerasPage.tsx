import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '@/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { useToastStore } from '@/components/ui/Toast';
import { formatTimeAgo } from '@/utils/format';
import type { Camera, Site } from '@/types';

type CameraFormState = {
  code: string;
  name: string;
  source_url: string;
  polling_interval_sec: string;
  status: Camera['status'];
};

type BindingFormState = {
  site_id: string;
};

const TABLE_HEADERS = ['Код', 'Название', 'Статус', 'Площадка', 'Интервал', 'Ошибки', 'Активность', 'Действия'];

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: 'var(--border)',
  borderRadius: 'var(--radius)',
  fontSize: 'var(--text-base)',
  fontFamily: 'var(--font-body)',
  background: 'var(--color-white)',
  color: 'var(--color-text)',
};

function emptyCameraForm(): CameraFormState {
  return {
    code: '',
    name: '',
    source_url: '',
    polling_interval_sec: '300',
    status: 'online',
  };
}

function buildCameraForm(camera: Camera): CameraFormState {
  return {
    code: camera.code,
    name: camera.name,
    source_url: camera.source_url ?? '',
    polling_interval_sec: String(camera.polling_interval_sec),
    status: camera.status,
  };
}

function buildBindingForm(camera: Camera | null): BindingFormState {
  return {
    site_id: camera?.site_id ? String(camera.site_id) : '',
  };
}

function normalizeCameraPayload(form: CameraFormState) {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    source_url: form.source_url.trim() || null,
    polling_interval_sec: parseInt(form.polling_interval_sec, 10),
    status: form.status,
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

export function AdminCamerasPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.add);

  const [showCreate, setShowCreate] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [bindingCamera, setBindingCamera] = useState<Camera | null>(null);

  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ['admin-cameras'],
    queryFn: () => api.get<Camera[]>('/admin/cameras'),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['admin-sites-for-binding'],
    queryFn: () => api.get<Site[]>('/admin/sites'),
  });

  const createCamera = useMutation({
    mutationFn: (body: ReturnType<typeof normalizeCameraPayload>) => api.post<Camera>('/admin/cameras', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cameras'] });
      addToast('Камера создана', 'success');
      setShowCreate(false);
    },
    onError: error => addToast(getApiErrorMessage(error, 'Не удалось создать камеру'), 'error'),
  });

  const updateCamera = useMutation({
    mutationFn: ({ cameraId, body }: { cameraId: number; body: ReturnType<typeof normalizeCameraPayload> }) =>
      api.patch<Camera>(`/admin/cameras/${cameraId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cameras'] });
      addToast('Камера обновлена', 'success');
      setEditingCamera(null);
    },
    onError: error => addToast(getApiErrorMessage(error, 'Не удалось сохранить камеру'), 'error'),
  });

  const bindCamera = useMutation({
    mutationFn: ({ cameraId, siteId }: { cameraId: number; siteId: string }) => {
      if (!siteId) {
        return api.post(`/admin/cameras/${cameraId}/unassign-site`);
      }
      return api.post(`/admin/cameras/${cameraId}/assign-site?site_id=${siteId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-cameras'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sites-for-binding'] });
      addToast(variables.siteId ? 'Камера привязана к площадке' : 'Привязка камеры снята', 'success');
      setBindingCamera(null);
    },
    onError: error => addToast(getApiErrorMessage(error, 'Не удалось изменить привязку камеры'), 'error'),
  });

  const deleteCamera = useMutation({
    mutationFn: (cameraId: number) => api.delete(`/admin/cameras/${cameraId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cameras'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
      addToast('Камера удалена', 'success');
    },
    onError: error => addToast(getApiErrorMessage(error, 'Не удалось удалить камеру'), 'error'),
  });

  const handleDelete = (camera: Camera) => {
    if (!window.confirm(`Удалить камеру "${camera.code}"?`)) {
      return;
    }

    deleteCamera.mutate(camera.id);
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
          <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>Управление камерами</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.6, fontSize: 'var(--text-sm)' }}>
            Создание, редактирование, привязка и удаление камер мониторинга.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Добавить камеру</Button>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)', minWidth: '1180px' }}>
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
                {cameras.map(camera => (
                  <tr key={camera.id} style={{ borderBottom: '1px solid var(--color-muted)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--color-accent)' }}>{camera.code}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 500 }}>{camera.name}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={camera.status} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>{camera.site_id ? `#${camera.site_id}` : '—'}</td>
                    <td style={{ padding: '12px 14px' }}>{camera.polling_interval_sec}с</td>
                    <td
                      style={{
                        padding: '12px 14px',
                        color: camera.error_count > 0 ? 'var(--color-status-critical)' : 'inherit',
                        fontWeight: camera.error_count > 0 ? 600 : 400,
                      }}
                    >
                      {camera.error_count}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', opacity: 0.55 }}>{formatTimeAgo(camera.last_seen_at)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Button size="sm" variant="outline" onClick={() => setEditingCamera(camera)}>
                          Редактировать
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setBindingCamera(camera)}>
                          {camera.site_id ? 'Сменить площадку' : 'Привязать'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={deleteCamera.isPending && deleteCamera.variables === camera.id}
                          onClick={() => handleDelete(camera)}
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

      <CameraModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Создать камеру"
        submitLabel="Создать"
        isSaving={createCamera.isPending}
        initialForm={emptyCameraForm()}
        onSubmit={form => createCamera.mutate(normalizeCameraPayload(form))}
      />

      <CameraModal
        open={Boolean(editingCamera)}
        onClose={() => setEditingCamera(null)}
        title="Редактировать камеру"
        submitLabel="Сохранить"
        isSaving={updateCamera.isPending}
        initialForm={editingCamera ? buildCameraForm(editingCamera) : emptyCameraForm()}
        onSubmit={form => {
          if (!editingCamera) return;
          updateCamera.mutate({ cameraId: editingCamera.id, body: normalizeCameraPayload(form) });
        }}
      />

      <BindingModal
        open={Boolean(bindingCamera)}
        onClose={() => setBindingCamera(null)}
        camera={bindingCamera}
        sites={sites}
        isSaving={bindCamera.isPending}
        onSubmit={form => {
          if (!bindingCamera) return;
          bindCamera.mutate({ cameraId: bindingCamera.id, siteId: form.site_id });
        }}
      />
    </div>
  );
}

function CameraModal({
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
  initialForm: CameraFormState;
  onSubmit: (form: CameraFormState) => void;
}) {
  const [form, setForm] = useState<CameraFormState>(initialForm);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
    }
  }, [initialForm, open]);

  const setField = <K extends keyof CameraFormState>(key: K, value: CameraFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        onSubmit={event => {
          event.preventDefault();
          onSubmit(form);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <Input label="Код" value={form.code} onChange={event => setField('code', event.target.value)} required placeholder="CAM-031" />
        <Input label="Название" value={form.name} onChange={event => setField('name', event.target.value)} required placeholder="Камера 031" />
        <Input label="URL источника" value={form.source_url} onChange={event => setField('source_url', event.target.value)} placeholder="rtsp://..." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="Интервал опроса (сек)"
            type="number"
            min="1"
            value={form.polling_interval_sec}
            onChange={event => setField('polling_interval_sec', event.target.value)}
            required
          />
          <div>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                opacity: 0.7,
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Статус
            </label>
            <select value={form.status} onChange={event => setField('status', event.target.value as Camera['status'])} style={selectStyle}>
              <option value="online">Онлайн</option>
              <option value="maintenance">Обслуживание</option>
              <option value="offline">Оффлайн</option>
              <option value="error">Ошибка</option>
            </select>
          </div>
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

function BindingModal({
  open,
  onClose,
  camera,
  sites,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  camera: Camera | null;
  sites: Site[];
  isSaving: boolean;
  onSubmit: (form: BindingFormState) => void;
}) {
  const [form, setForm] = useState<BindingFormState>(buildBindingForm(camera));

  useEffect(() => {
    if (open) {
      setForm(buildBindingForm(camera));
    }
  }, [camera, open]);

  return (
    <Modal open={open} onClose={onClose} title="Привязка к площадке">
      <form
        onSubmit={event => {
          event.preventDefault();
          onSubmit(form);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.5, opacity: 0.75 }}>
          {camera ? `Выбери площадку для камеры ${camera.code}. Пустое значение снимет текущую привязку.` : 'Выбери площадку.'}
        </div>
        <div>
          <label
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              opacity: 0.7,
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Площадка
          </label>
          <select value={form.site_id} onChange={event => setForm({ site_id: event.target.value })} style={selectStyle}>
            <option value="">Не привязана</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>
                {site.code} · {site.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Button variant="outline" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSaving}>
            Сохранить привязку
          </Button>
        </div>
      </form>
    </Modal>
  );
}
