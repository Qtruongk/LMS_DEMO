import { useEffect, useState } from 'react';
import { Panel } from '../../../components/shared/ui';
import { BookIcon, ChartIcon, DollarSignIcon, TrendingUpIcon, UsersIcon } from '../../../components/shared/icons';
import type { User } from '../../../types';
import { API_URL } from '../../../services/api';
import { formatMoney } from '../../../utils/format';

type Overview = {
    total_students: number;
    new_students_this_month: number;
    completed_classes_this_month: number;
    revenue_this_month: number;
    expenses_this_month: number;
};

export function OwnerOverview({ user }: { user: User }) {
    const [overview, setOverview] = useState<Overview | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        fetch(`${API_URL}/api/owner/general-report`, { headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) }, signal: controller.signal })
            .then(async (response) => {
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message || 'Không thể tải báo cáo chung');
                setOverview(payload.overview);
            })
            .catch((requestError) => { if (requestError.name !== 'AbortError') setError(requestError.message || 'Không thể tải báo cáo chung'); });
        return () => controller.abort();
    }, [user.id]);

    if (error) return <Panel title="Báo cáo chung"><div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div></Panel>;
    if (!overview) return <div className="grid gap-4"><div className="h-32 animate-pulse rounded-[28px] bg-[var(--color-bg-soft)]" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-[var(--color-bg-soft)]" />)}</div></div>;

    const profit = overview.revenue_this_month - overview.expenses_this_month;
    return <div className="grid gap-5 pb-8">
        <section className="overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-primary)] text-white"><ChartIcon size={22} /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">Owner workspace</p><h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">Báo cáo chung trung tâm</h2></div></div><span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-2 text-[11px] font-bold text-[var(--color-primary)]">BÁO CÁO THÁNG</span></div></section>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Tổng học viên" value={overview.total_students} helper="Toàn hệ thống" icon={UsersIcon} tone="blue" /><Metric label="Học viên mới" value={overview.new_students_this_month} helper="Trong tháng này" icon={TrendingUpIcon} tone="emerald" /><Metric label="Lớp kết thúc" value={overview.completed_classes_this_month} helper="Trong tháng này" icon={BookIcon} tone="violet" /><Metric label="Doanh thu tháng" value={formatMoney(String(overview.revenue_this_month))} helper="Khoản thu ghi nhận" icon={DollarSignIcon} tone="emerald" /><Metric label="Chi phí tháng" value={formatMoney(String(overview.expenses_this_month))} helper="Khoản chi ghi nhận" icon={DollarSignIcon} tone="rose" /></div>
        <Panel title="Tóm tắt dòng tiền tháng này"><div className="grid gap-4 sm:grid-cols-3"><Value label="Doanh thu" value={formatMoney(String(overview.revenue_this_month))} tone="text-emerald-700" /><Value label="Chi phí" value={formatMoney(String(overview.expenses_this_month))} tone="text-rose-700" /><Value label="Chênh lệch" value={formatMoney(String(profit))} tone={profit >= 0 ? 'text-[var(--color-primary)]' : 'text-rose-700'} /></div></Panel>
    </div>;
}

function Metric({ label, value, helper, icon: Icon, tone }: { label: string; value: number | string; helper: string; icon: (props: { size?: number }) => JSX.Element; tone: 'blue' | 'emerald' | 'violet' | 'rose' }) { const tones = { blue: 'border-blue-200 bg-blue-50/70 text-blue-700', emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-700', violet: 'border-violet-200 bg-violet-50/70 text-violet-700', rose: 'border-rose-200 bg-rose-50/70 text-rose-700' }; return <article className={`rounded-2xl border p-4 ${tones[tone]}`}><div className="flex items-center justify-between gap-3"><p className="text-[11px] font-bold uppercase tracking-wider">{label}</p><span className="grid h-8 w-8 place-items-center rounded-xl bg-white/75"><Icon size={16} /></span></div><p className="mt-3 text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">{value}</p><p className="mt-1 text-[11px] font-medium opacity-80">{helper}</p></article>; }
function Value({ label, value, tone }: { label: string; value: string; tone: string }) { return <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)]/50 p-4"><p className="text-xs font-bold text-[var(--color-text-secondary)]">{label}</p><p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p></article>; }
