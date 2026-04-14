import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '@/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { useToastStore } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/format';
import type { User } from '@/types';

type UserFormState = {
  name: string;
  email: string;
  login: string;
  role: User['role'];
};

type PasswordFormState = {
  password: string;
  confirmPassword: string;
};

type UserSortKey = 'id' | 'name' | 'login' | 'email' | 'role' | 'is_active' | 'last_login_at';
type SortDirection = 'asc' | 'desc';

const TABLE_HEADERS: Array<{ label: string; sortKey?: UserSortKey }> = [
  { label: 'ID', sortKey: 'id' },
  { label: 'Имя', sortKey: 'name' },
  { label: 'Логин', sortKey: 'login' },
  { label: 'Email', sortKey: 'email' },
  { label: 'Роль', sortKey: 'role' },
  { label: 'Статус', sortKey: 'is_active' },
  { label: 'Последний вход', sortKey: 'last_login_at' },
  { label: 'Действия' },
];

const USER_ROLE_ORDER: Record<User['role'], number> = {
  admin: 0,
  operator: 1,
};

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

function emptyCreateForm(): UserFormState & { password: string } {
  return {
    name: '',
    email: '',
    login: '',
    password: '',
    role: 'operator',
  };
}

function buildEditForm(user: User): UserFormState {
  return {
    name: user.name,
    email: user.email,
    login: user.login,
    role: user.role,
  };
}

function roleLabel(role: User['role']) {
  return role === 'admin' ? 'Администратор' : 'Оператор';
}

function compareText(a: string | null | undefined, b: string | null | undefined) {
  const left = a?.trim();
  const right = b?.trim();

  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  return left.localeCompare(right, 'ru', { numeric: true, sensitivity: 'base' });
}

function compareDate(a: string | null | undefined, b: string | null | undefined) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  return new Date(a).getTime() - new Date(b).getTime();
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

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.add);
  const currentUser = useAuthStore(s => s.user);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortKey, setSortKey] = useState<UserSortKey>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', searchQuery, roleFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter) params.set('role', roleFilter);
      return api.get<User[]>(`/admin/users?${params}`);
    },
  });

  const sortedUsers = useMemo(() => {
    const list = [...users];

    list.sort((a, b) => {
      let result = 0;

      switch (sortKey) {
        case 'id':
          result = a.id - b.id;
          break;
        case 'name':
          result = compareText(a.name, b.name);
          break;
        case 'login':
          result = compareText(a.login, b.login);
          break;
        case 'email':
          result = compareText(a.email, b.email);
          break;
        case 'role':
          result = USER_ROLE_ORDER[a.role] - USER_ROLE_ORDER[b.role];
          break;
        case 'is_active':
          result = Number(a.is_active === false) - Number(b.is_active === false);
          break;
        case 'last_login_at':
          result = compareDate(a.last_login_at, b.last_login_at);
          break;
      }

      if (result === 0) {
        result = a.id - b.id;
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return list;
  }, [users, sortDirection, sortKey]);

  const handleSort = (nextSortKey: UserSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection(currentDirection => (currentDirection === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection('asc');
  };

  const createUser = useMutation({
    mutationFn: (body: UserFormState & { password: string }) => api.post<User>('/admin/users', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      addToast('Пользователь создан', 'success');
      setShowCreateModal(false);
    },
    onError: error => addToast(getApiErrorMessage(error, 'Не удалось создать пользователя'), 'error'),
  });

  const updateUser = useMutation({
    mutationFn: ({ userId, body }: { userId: number; body: UserFormState }) => api.patch<User>(`/admin/users/${userId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      addToast('Профиль пользователя обновлён', 'success');
      setEditingUser(null);
    },
    onError: error => addToast(getApiErrorMessage(error, 'Не удалось сохранить изменения'), 'error'),
  });

  const setPassword = useMutation({
    mutationFn: ({ userId, password }: { userId: number; password: string }) =>
      api.post(`/admin/users/${userId}/set-password`, { password }),
    onSuccess: () => {
      addToast('Новый пароль сохранён', 'success');
      setPasswordUser(null);
    },
    onError: error => addToast(getApiErrorMessage(error, 'Не удалось обновить пароль'), 'error'),
  });

  const deleteUser = useMutation({
    mutationFn: (userId: number) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      addToast('Пользователь удалён', 'success');
    },
    onError: error => addToast(getApiErrorMessage(error, 'Не удалось удалить пользователя'), 'error'),
  });

  const handleDelete = (user: User) => {
    if (!window.confirm(`Удалить пользователя "${user.name}"? Это действие нельзя отменить.`)) {
      return;
    }

    deleteUser.mutate(user.id);
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
          <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>Пользователи</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.6, fontSize: 'var(--text-sm)' }}>
            Управление профилями, ролями и паролями пользователей платформы.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Создать пользователя</Button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Поиск по имени, логину или email..."
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          style={{
            flex: '1 1 320px',
            minWidth: '240px',
            padding: '10px 14px',
            border: 'var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-body)',
            background: 'var(--color-white)',
          }}
        />
        <select
          value={roleFilter}
          onChange={event => setRoleFilter(event.target.value)}
          style={{
            padding: '10px 14px',
            border: 'var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)',
            background: 'var(--color-white)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <option value="">Все роли</option>
          <option value="admin">Администратор</option>
          <option value="operator">Оператор</option>
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)', minWidth: '1100px' }}>
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
                {sortedUsers.map(user => {
                  const isSelf = currentUser?.id === user.id;

                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--color-muted)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>#{user.id}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 500 }}>{user.name}</td>
                      <td style={{ padding: '12px 14px' }}>{user.login}</td>
                      <td style={{ padding: '12px 14px', opacity: 0.7 }}>{user.email}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <StatusBadge
                          status={user.role === 'admin' ? 'critical' : 'normal'}
                          label={roleLabel(user.role)}
                        />
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <StatusBadge
                          status={user.is_active ? 'normal' : 'offline'}
                          label={user.is_active ? 'Активен' : 'Неактивен'}
                        />
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', opacity: 0.55 }}>
                        {formatDate(user.last_login_at)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>
                            Редактировать
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setPasswordUser(user)}>
                            Установить пароль
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={deleteUser.isPending && deleteUser.variables === user.id}
                            onClick={() => handleDelete(user)}
                            title={isSelf ? 'Нельзя удалить свою учётную запись' : undefined}
                            style={isSelf ? { opacity: 0.45, pointerEvents: 'none' } : undefined}
                          >
                            Удалить
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateUserModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={form => createUser.mutate(form)}
        isSaving={createUser.isPending}
      />

      <EditUserModal
        user={editingUser}
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onSubmit={form => {
          if (!editingUser) return;
          updateUser.mutate({ userId: editingUser.id, body: form });
        }}
        isSaving={updateUser.isPending}
      />

      <SetPasswordModal
        user={passwordUser}
        open={Boolean(passwordUser)}
        onClose={() => setPasswordUser(null)}
        onSubmit={form => {
          if (!passwordUser) return;
          setPassword.mutate({ userId: passwordUser.id, password: form.password });
        }}
        isSaving={setPassword.isPending}
      />
    </div>
  );
}

function CreateUserModal({
  open,
  onClose,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: UserFormState & { password: string }) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<UserFormState & { password: string }>(emptyCreateForm());

  useEffect(() => {
    if (open) {
      setForm(emptyCreateForm());
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Создать пользователя">
      <form
        onSubmit={event => {
          event.preventDefault();
          onSubmit({
            ...form,
            name: form.name.trim(),
            email: form.email.trim(),
            login: form.login.trim(),
          });
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <Input
          label="Имя"
          value={form.name}
          onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
          required
        />
        <Input
          label="Логин"
          value={form.login}
          onChange={event => setForm(prev => ({ ...prev, login: event.target.value }))}
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
          required
        />
        <Input
          label="Пароль"
          type="password"
          value={form.password}
          onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
          minLength={8}
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
            Роль
          </label>
          <select
            value={form.role}
            onChange={event => setForm(prev => ({ ...prev, role: event.target.value as User['role'] }))}
            style={selectStyle}
          >
            <option value="operator">Оператор</option>
            <option value="admin">Администратор</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Button variant="outline" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSaving}>
            Создать
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({
  user,
  open,
  onClose,
  onSubmit,
  isSaving,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (form: UserFormState) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<UserFormState>({
    name: '',
    email: '',
    login: '',
    role: 'operator',
  });

  useEffect(() => {
    if (user) {
      setForm(buildEditForm(user));
    }
  }, [user]);

  return (
    <Modal open={open} onClose={onClose} title="Редактировать профиль">
      <form
        onSubmit={event => {
          event.preventDefault();
          onSubmit({
            ...form,
            name: form.name.trim(),
            email: form.email.trim(),
            login: form.login.trim(),
          });
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <Input
          label="Имя"
          value={form.name}
          onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
          required
        />
        <Input
          label="Логин"
          value={form.login}
          onChange={event => setForm(prev => ({ ...prev, login: event.target.value }))}
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
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
            Роль
          </label>
          <select
            value={form.role}
            onChange={event => setForm(prev => ({ ...prev, role: event.target.value as User['role'] }))}
            style={selectStyle}
          >
            <option value="operator">Оператор</option>
            <option value="admin">Администратор</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Button variant="outline" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSaving}>
            Сохранить
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SetPasswordModal({
  user,
  open,
  onClose,
  onSubmit,
  isSaving,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (form: PasswordFormState) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<PasswordFormState>({ password: '', confirmPassword: '' });
  const passwordsMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  useEffect(() => {
    if (open) {
      setForm({ password: '', confirmPassword: '' });
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Установить новый пароль">
      <form
        onSubmit={event => {
          event.preventDefault();
          if (passwordsMismatch) return;
          onSubmit(form);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.5, opacity: 0.75 }}>
          {user ? `Новый пароль будет установлен для пользователя ${user.name}.` : 'Установите новый пароль.'}
        </div>
        <Input
          label="Новый пароль"
          type="password"
          value={form.password}
          onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
          minLength={8}
          required
        />
        <Input
          label="Повторите пароль"
          type="password"
          value={form.confirmPassword}
          onChange={event => setForm(prev => ({ ...prev, confirmPassword: event.target.value }))}
          error={passwordsMismatch ? 'Пароли не совпадают' : undefined}
          minLength={8}
          required
        />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Button variant="outline" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSaving || passwordsMismatch}>
            Сохранить пароль
          </Button>
        </div>
      </form>
    </Modal>
  );
}
