export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTimeAgo(iso: string | null | undefined): string {
  if (!iso) return 'нет данных';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} д назад`;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    normal: 'Норма',
    warning: 'Внимание',
    critical: 'Критично',
    no_data: 'Нет данных',
    offline: 'Оффлайн',
    online: 'Онлайн',
    error: 'Ошибка',
    maintenance: 'Обслуживание',
  };
  return map[status] || status;
}

export function alertTypeLabel(type: string): string {
  const map: Record<string, string> = {
    overflow: 'Переполнение',
    litter: 'Мусор вне контейнера',
    degradation: 'Ухудшение состояния',
    camera_offline: 'Камера оффлайн',
    no_data: 'Нет данных',
    ai_error: 'Ошибка AI',
  };
  return map[type] || type;
}

export function alertStatusLabel(status: string): string {
  const map: Record<string, string> = {
    new: 'Новый',
    viewed: 'Просмотрен',
    confirmed: 'Подтверждён',
    closed: 'Закрыт',
    false_positive: 'Ложный',
  };
  return map[status] || status;
}

export function severityLabel(s: string): string {
  const map: Record<string, string> = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
    critical: 'Критический',
  };
  return map[s] || s;
}
