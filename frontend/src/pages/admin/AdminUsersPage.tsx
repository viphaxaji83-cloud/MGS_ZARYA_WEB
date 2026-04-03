import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { useToastStore } from '@/components/ui/Toast';
import { formatDate } from '@/utils/format';
import type { User } from '@/types';

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.add);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', searchQuery, roleFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter) params.set('role', roleFilter);
      return api.get<User[]>(`/admin/users?${params}`);
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/deactivate`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); addToast('Пользователь деактивирован', 'success'); },
  });

  const activate = useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/activate`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); addToast('Пользователь активирован', 'success'); },
  });

  const resetPwd = useMutation({
    mutationFn: (id: number) => api.post<{ temporary_password: string }>(`/admin/users/${id}/reset-password`),
    onSuccess: (data: any) => { addToast(`Пароль сброшен: ${data.temporary_password}`, 'info'); },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>ПОЛЬЗОВАТЕЛИ</h1>
        <Button onClick={() => setShowCreateModal(true)}>+ Создать</Button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input
          type="text" placeholder="Поиск..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', border: 'var(--border)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', background: 'var(--color-white)' }}
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{
          padding: '10px 14px', border: 'var(--border)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', background: 'var(--color-white)', fontFamily: 'var(--font-body)',
        }}>
          <option value="">Все роли</option>
          <option value="admin">Admin</option>
          <option value="operator">Operator</option>
        </select>
      </div>

      {isLoading ? <Loader /> : (
        <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius)', border: 'var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: 'var(--border)' }}>
                {['ID', 'Имя', 'Login', 'Email', 'Роль', 'Статус', 'Посл. вход', 'Действия'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, opacity: 0.6 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-muted)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>#{u.id}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{u.name}</td>
                  <td style={{ padding: '10px 14px' }}>{u.login}</td>
                  <td style={{ padding: '10px 14px', opacity: 0.7 }}>{u.email}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge status={u.role === 'admin' ? 'critical' : 'normal'} label={u.role} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge status={u.is_active ? 'normal' : 'offline'} label={u.is_active ? 'Активен' : 'Деактивирован'} />
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '12px', opacity: 0.5 }}>{formatDate(u.last_login_at)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (confirm('Сбросить пароль?')) resetPwd.mutate(u.id);
                      }}>🔑</Button>
                      {u.is_active ? (
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (confirm('Деактивировать пользователя?')) deactivate.mutate(u.id);
                        }}>⏸</Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => activate.mutate(u.id)}>▶</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateUserModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}

function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.add);
  const [form, setForm] = useState({ name: '', email: '', login: '', password: '', role: 'operator' });

  const create = useMutation({
    mutationFn: () => api.post('/admin/users', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      addToast('Пользователь создан', 'success');
      onClose();
      setForm({ name: '', email: '', login: '', password: '', role: 'operator' });
    },
    onError: () => addToast('Ошибка создания пользователя', 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="СОЗДАТЬ ПОЛЬЗОВАТЕЛЯ">
      <form onSubmit={e => { e.preventDefault(); create.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Input label="Имя" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <Input label="Login" value={form.login} onChange={e => setForm({ ...form, login: e.target.value })} required />
        <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <Input label="Пароль" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, display: 'block', marginBottom: '4px' }}>
            Роль
          </label>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{
            width: '100%', padding: '10px 14px', border: 'var(--border)', borderRadius: 'var(--radius)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)',
          }}>
            <option value="operator">Оператор</option>
            <option value="admin">Администратор</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Button variant="outline" type="button" onClick={onClose}>Отмена</Button>
          <Button type="submit">Создать</Button>
        </div>
      </form>
    </Modal>
  );
}
