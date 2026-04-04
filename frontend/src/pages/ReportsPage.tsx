import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ReportSummary } from '@/types';

export function ReportsPage() {
  const [period, setPeriod] = useState(7);
  const [district, setDistrict] = useState('');
  const [siteId, setSiteId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-summary', period, district, siteId],
    queryFn: () => {
      const params = new URLSearchParams({ period_days: String(period) });
      if (district) params.set('district', district);
      if (siteId) params.set('site_id', siteId);
      return api.get<ReportSummary>(`/reports/summary?${params}`);
    },
  });

  const exportCSV = () => {
    if (!data) return;
    const rows = [['Дата', 'Кол-во тревог'], ...data.daily_alerts.map(d => [d.date, String(d.count)])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zarya_report_${period}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>ОТЧЁТЫ</h1>
        <button onClick={exportCSV} disabled={!data} style={{
          padding: '8px 16px', background: 'var(--color-accent)', color: 'var(--color-text-light)',
          border: 'none', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)',
          fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', opacity: data ? 1 : 0.5,
        }}>
          Экспорт CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select value={period} onChange={e => setPeriod(Number(e.target.value))} style={{
          padding: '10px 14px', border: 'var(--border)', borderRadius: 'var(--radius)',
          fontSize: 'var(--text-sm)', background: 'var(--color-white)', fontFamily: 'var(--font-body)',
        }}>
          <option value={7}>7 дней</option>
          <option value={14}>14 дней</option>
          <option value={30}>30 дней</option>
          <option value={60}>60 дней</option>
          <option value={90}>90 дней</option>
        </select>
        <select value={district} onChange={e => setDistrict(e.target.value)} style={{
          padding: '10px 14px', border: 'var(--border)', borderRadius: 'var(--radius)',
          fontSize: 'var(--text-sm)', background: 'var(--color-white)', fontFamily: 'var(--font-body)',
        }}>
          <option value="">Все районы</option>
          {['Центральный', 'Западный', 'Восточный', 'Северный', 'Южный'].map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <input
          type="number" placeholder="ID площадки" value={siteId} onChange={e => setSiteId(e.target.value)}
          style={{
            padding: '10px 14px', border: 'var(--border)', borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)', width: '140px', fontFamily: 'var(--font-body)',
          }}
        />
      </div>

      {isLoading ? <Loader /> : data && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
            <SummaryCard label="Всего тревог" value={data.total_alerts} />
            <SummaryCard label="Критических" value={data.critical_alerts} color="var(--color-status-critical)" />
            <SummaryCard label="Наблюдений" value={data.total_observations} />
            <SummaryCard label="Площадок" value={data.total_sites} />
            <SummaryCard label="Камер оффлайн" value={data.cameras_offline} color="var(--color-status-offline)" />
          </div>

          {/* Chart */}
          <Card>
            <h3 style={{ fontSize: 'var(--text-sm)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Тревоги по дням
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.daily_alerts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-muted)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-accent)" name="Тревоги" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Daily table */}
          <Card style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Детализация
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: 'var(--border)' }}>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', opacity: 0.6 }}>Дата</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', opacity: 0.6 }}>Тревоги</th>
                </tr>
              </thead>
              <tbody>
                {data.daily_alerts.map(d => (
                  <tr key={d.date} style={{ borderBottom: '1px solid var(--color-muted)' }}>
                    <td style={{ padding: '8px 14px' }}>{d.date}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600 }}>{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>{label}</div>
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, margin: '4px 0', color: color || 'var(--color-text)' }}>{value}</div>
    </Card>
  );
}
