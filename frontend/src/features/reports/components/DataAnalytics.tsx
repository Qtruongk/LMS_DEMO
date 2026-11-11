import { useEffect, useState } from 'react';
import { Panel } from '../../../components/shared/ui';
import { AlertCircleIcon, CheckCircleIcon, DollarSignIcon, TrendingUpIcon, UsersIcon } from '../../../components/shared/icons';
import type { User } from '../../../types';
import { formatMoney } from '../../../utils/format';
import { API_URL } from '../../../services/api';

type MonthlyRevenue = { month: string; revenue: number };
type AnalyticsData = {
    forecast: { nextMonthRevenue: number; nextQuarterRevenue: number; growthRate: number; trendPerMonth: number };
    monthly: MonthlyRevenue[];
    metrics: { leadConversionRate: number; multiCourseRate: number; tuitionDebtRate: number; absenceRate: number };
};

const percentage = (value: number) => `${Math.round(value)}%`;
const monthName = (month: string) => { const [, value] = month.split('-'); return value ? `T${Number(value)}` : month; };

export function DataAnalytics({ user }: { user: User }) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        fetch(`${API_URL}/api/owner/data-analytics`, { headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) }, signal: controller.signal })
            .then(async (response) => {
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message || 'Không thể tải báo cáo phân tích');
                setData(payload);
            })
            .catch((requestError) => { if (requestError.name !== 'AbortError') setError(requestError.message || 'Không thể tải báo cáo phân tích'); });
        return () => controller.abort();
    }, [user.id]);

    if (error) return <Panel title="Báo cáo phân tích dữ liệu"><div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div></Panel>;
    if (!data) return <AnalyticsLoading />;

    return <div className="grid gap-5 pb-8">
        <section className="overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-primary)] text-white shadow-sm"><TrendingUpIcon size={22} /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">Owner workspace</p><h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">Báo cáo phân tích dữ liệu</h2></div></div><span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-2 text-[11px] font-bold text-[var(--color-primary)]">PHÂN TÍCH</span></div></section>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><ForecastCard title="Dự đoán doanh thu tháng tới" value={formatMoney(String(data.forecast.nextMonthRevenue))} helper={`Xu hướng ${percentage(data.forecast.growthRate)} so với tháng trước`} icon={DollarSignIcon} tone="emerald" /><ForecastCard title="Dự đoán doanh thu quý tới" value={formatMoney(String(data.forecast.nextQuarterRevenue))} helper="Tổng dự báo 3 tháng kế tiếp" icon={TrendingUpIcon} tone="blue" /><ForecastCard title="Dự đoán tăng trưởng" value={percentage(data.forecast.growthRate)} helper={`${formatMoney(String(Math.abs(data.forecast.trendPerMonth)))} thay đổi trung bình/tháng`} icon={CheckCircleIcon} tone={data.forecast.growthRate >= 0 ? 'emerald' : 'rose'} /></div>
        <div className="grid gap-5 xl:grid-cols-5"><Panel title="Xu hướng doanh thu và dự báo" className="xl:col-span-3"><RevenueTrend items={data.monthly} forecast={data.forecast.nextMonthRevenue} /></Panel><Panel title="KPI tăng trưởng" className="xl:col-span-2"><div className="grid gap-4"><KpiRow label="Convert khách tiềm năng → học viên" value={data.metrics.leadConversionRate} color="bg-emerald-500" /><KpiRow label="Học viên từ 2 khóa trở lên" value={data.metrics.multiCourseRate} color="bg-blue-500" /><KpiRow label="Tỷ lệ nợ học phí" value={data.metrics.tuitionDebtRate} color="bg-amber-500" /><KpiRow label="Tỷ lệ học viên vắng mặt" value={data.metrics.absenceRate} color="bg-rose-500" /></div></Panel></div>
        <Panel title="Diễn giải chỉ số"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Insight title="Tuyển sinh" value={percentage(data.metrics.leadConversionRate)} note="Tỷ lệ khách tiềm năng đã chuyển thành học viên." icon={UsersIcon} /><Insight title="Giữ chân" value={percentage(data.metrics.multiCourseRate)} note="Học viên tiếp tục đăng ký ít nhất khóa thứ hai." icon={CheckCircleIcon} /><Insight title="Thu hồi công nợ" value={percentage(data.metrics.tuitionDebtRate)} note="Học viên còn khoản học phí chưa thanh toán đủ." icon={AlertCircleIcon} /><Insight title="Chất lượng lớp học" value={percentage(data.metrics.absenceRate)} note="Lượt vắng mặt trên toàn bộ bản ghi điểm danh." icon={TrendingUpIcon} /></div></Panel>
    </div>;
}

function ForecastCard({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: (props: { size?: number }) => JSX.Element; tone: 'emerald' | 'blue' | 'rose' }) { const tones = { emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-700', blue: 'border-blue-200 bg-blue-50/70 text-blue-700', rose: 'border-rose-200 bg-rose-50/70 text-rose-700' }; return <article className={`rounded-2xl border p-4 ${tones[tone]}`}><div className="flex items-center justify-between gap-3"><p className="text-[11px] font-bold uppercase tracking-wider">{title}</p><span className="grid h-8 w-8 place-items-center rounded-xl bg-white/75"><Icon size={16} /></span></div><p className="mt-3 text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">{value}</p><p className="mt-1 text-[11px] font-medium opacity-80">{helper}</p></article>; }
function RevenueTrend({ items, forecast }: { items: MonthlyRevenue[]; forecast: number }) { const all = [...items, { month: 'Dự báo', revenue: forecast }]; const max = Math.max(...all.map((item) => item.revenue), 1); return <div className="flex h-60 items-end gap-2 pt-4 sm:gap-4">{all.map((item, index) => <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className="text-center text-[10px] font-bold text-[var(--color-text-secondary)]">{formatMoney(String(item.revenue))}</span><div className="flex h-40 w-full items-end rounded-t-xl bg-[var(--color-bg-soft)]"><div className={`w-full rounded-t-xl ${index === all.length - 1 ? 'border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'bg-[var(--color-primary)]'}`} style={{ height: `${Math.max(5, item.revenue / max * 100)}%` }} /></div><span className="text-[10px] font-bold text-[var(--color-text-muted)]">{index === all.length - 1 ? 'Dự báo' : monthName(item.month)}</span></div>)}</div>; }
function KpiRow({ label, value, color }: { label: string; value: number; color: string }) { return <div><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="font-semibold text-[var(--color-text-secondary)]">{label}</span><b className="text-[var(--color-text)]">{percentage(value)}</b></div><div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-bg-soft)]"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div></div>; }
function Insight({ title, value, note, icon: Icon }: { title: string; value: string; note: string; icon: (props: { size?: number }) => JSX.Element }) { return <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)]/50 p-4"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Icon size={15} /></span><p className="mt-3 text-xs font-bold text-[var(--color-text)]">{title}</p><p className="mt-1 text-xl font-black text-[var(--color-primary)]">{value}</p><p className="mt-2 text-[11px] leading-5 text-[var(--color-text-secondary)]">{note}</p></article>; }
function AnalyticsLoading() { return <div className="grid gap-5"><div className="h-32 animate-pulse rounded-[28px] bg-[var(--color-bg-soft)]" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-[var(--color-bg-soft)]" />)}</div></div>; }
