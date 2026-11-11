import { useEffect, useState } from 'react';
import { Panel } from '../../../components/shared/ui';
import { BookIcon, ChartIcon, CheckCircleIcon, ClockIcon, UsersIcon } from '../../../components/shared/icons';
import type { User } from '../../../types';
import { API_URL } from '../../../services/api';

type ClassOption = { id: number; name: string; code: string; subject: string };
type MonthSession = { id: number; title: string; start_time: string; end_time: string; status: string };
type Score = { id: number; full_name: string; average_score: number; graded_count: number };
type Notification = { id: number; title: string; content: string; type: string; priority: string; created_at: string };
type Report = {
    class: ClassOption & { progress: number };
    sessions: { total: number; completed: number; remaining: number };
    monthSessions: MonthSession[];
    scores: Score[];
    assignments: { ongoing: number; finished: number };
    notifications: Notification[];
};
type Response = { classes: ClassOption[]; report: Report | null };

const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export function ClassReport({ user }: { user: User }) {
    const [data, setData] = useState<Response | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        const query = selectedClassId ? `?classId=${selectedClassId}` : '';
        fetch(`${API_URL}/api/owner/class-report${query}`, { headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) }, signal: controller.signal })
            .then(async (response) => {
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message || 'Không thể tải báo cáo lớp học');
                setData(payload);
            })
            .catch((requestError) => { if (requestError.name !== 'AbortError') setError(requestError.message || 'Không thể tải báo cáo lớp học'); });
        return () => controller.abort();
    }, [user.id, selectedClassId]);

    if (error) return <Panel title="Báo cáo lớp học"><div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div></Panel>;
    if (!data) return <Loading />;
    if (!data.report) return <Panel title="Báo cáo lớp học"><p className="p-4 text-sm text-[var(--color-text-secondary)]">Chưa có lớp học để báo cáo.</p></Panel>;

    const report = data.report;
    const maxScore = Math.max(...report.scores.map((item) => item.average_score), 10);
    const totalAssignments = report.assignments.ongoing + report.assignments.finished;
    const sessionTotal = report.sessions.completed + report.sessions.remaining;

    return <div className="grid gap-5 pb-8">
        <section className="overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-primary)] text-white"><ChartIcon size={22} /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">Owner workspace</p><h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">Báo cáo từng lớp học</h2></div></div><label className="flex flex-col gap-1 text-[11px] font-bold text-[var(--color-text-secondary)]">CHỌN LỚP<select value={report.class.id} onChange={(event) => setSelectedClassId(Number(event.target.value))} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm font-bold text-[var(--color-text)] outline-none"><>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</></select></label></div></section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Buổi đã học" value={`${report.sessions.completed}/${sessionTotal}`} icon={CheckCircleIcon} tone="emerald" /><Metric label="Tiến độ giáo trình" value={`${report.class.progress}%`} icon={BookIcon} tone="blue" /><Metric label="Bài tập đang diễn ra" value={report.assignments.ongoing} icon={ClockIcon} tone="amber" /><Metric label="Học viên có điểm" value={report.scores.filter((item) => item.graded_count > 0).length} icon={UsersIcon} tone="violet" /></div>

        <div className="grid gap-5 xl:grid-cols-5"><Panel title="Buổi học đã học / chưa học" className="xl:col-span-2"><div className="flex flex-col items-center justify-center gap-5 py-3 sm:flex-row"><Donut completed={report.sessions.completed} total={sessionTotal} /><div className="grid gap-2 text-sm"><Legend label="Đã học" value={report.sessions.completed} color="bg-emerald-500" /><Legend label="Chưa học" value={report.sessions.remaining} color="bg-slate-300" /></div></div></Panel><Panel title="Điểm trung bình tất cả học viên" className="xl:col-span-3"><div className="grid gap-3">{report.scores.length ? report.scores.map((item) => <div key={item.id}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="font-bold text-[var(--color-text)]">{item.full_name}</span><b className="text-[var(--color-primary)]">{item.graded_count ? item.average_score.toFixed(1) : 'Chưa có điểm'}</b></div><div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-bg-soft)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${item.graded_count ? Math.min(100, item.average_score / maxScore * 100) : 0}%` }} /></div></div>) : <Empty text="Chưa có học viên trong lớp." />}</div></Panel></div>

        <div className="grid gap-5 xl:grid-cols-5"><Panel title="Lịch buổi học trong tháng" className="xl:col-span-3"><div className="grid gap-2 sm:grid-cols-2">{report.monthSessions.length ? report.monthSessions.map((item) => <article key={item.id} className="flex gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)]/50 p-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-xs font-black text-[var(--color-primary)]">{new Date(item.start_time).getDate()}</div><div><p className="text-xs font-bold text-[var(--color-text)]">{item.title}</p><p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{formatDate(item.start_time)} · {item.status === 'completed' ? 'Đã học' : 'Chưa học'}</p></div></article>) : <Empty text="Không có buổi học trong tháng này." />}</div></Panel><Panel title="Trạng thái bài tập" className="xl:col-span-2"><div className="flex flex-col items-center justify-center gap-4 py-3 sm:flex-row xl:flex-col"><Donut completed={report.assignments.finished} total={totalAssignments} primary="bg-violet-500" /><div className="grid gap-2 text-sm"><Legend label="Đang diễn ra" value={report.assignments.ongoing} color="bg-amber-500" /><Legend label="Đã kết thúc" value={report.assignments.finished} color="bg-violet-500" /></div></div></Panel></div>

        <Panel title="5 thông báo mới nhất của lớp"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{report.notifications.length ? report.notifications.map((item) => <article key={item.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)]/40 p-3"><p className="line-clamp-2 text-xs font-black text-[var(--color-text)]">{item.title}</p><p className="mt-2 line-clamp-3 text-[11px] leading-5 text-[var(--color-text-secondary)]">{item.content}</p><p className="mt-3 text-[10px] font-bold text-[var(--color-primary)]">{formatDate(item.created_at)}</p></article>) : <Empty text="Lớp chưa có thông báo riêng." />}</div></Panel>
    </div>;
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: (props: { size?: number }) => JSX.Element; tone: 'emerald' | 'blue' | 'amber' | 'violet' }) { const tones = { emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-700', blue: 'border-blue-200 bg-blue-50/70 text-blue-700', amber: 'border-amber-200 bg-amber-50/70 text-amber-700', violet: 'border-violet-200 bg-violet-50/70 text-violet-700' }; return <article className={`rounded-2xl border p-4 ${tones[tone]}`}><div className="flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-wider">{label}</p><Icon size={16} /></div><p className="mt-3 text-2xl font-black text-[var(--color-text)]">{value}</p></article>; }
function Donut({ completed, total, primary = 'bg-emerald-500' }: { completed: number; total: number; primary?: string }) { const percent = total ? Math.round(completed / total * 100) : 0; return <div className="relative grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(${primary === 'bg-violet-500' ? '#8b5cf6' : '#10b981'} ${percent * 3.6}deg, #e5e7eb 0deg)` }}><div className="grid h-24 w-24 place-items-center rounded-full bg-[var(--color-card)]"><b className="text-xl text-[var(--color-text)]">{percent}%</b></div></div>; }
function Legend({ label, value, color }: { label: string; value: number; color: string }) { return <div className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${color}`} /><span className="text-[var(--color-text-secondary)]">{label}</span><b className="ml-auto text-[var(--color-text)]">{value}</b></div>; }
function Empty({ text }: { text: string }) { return <p className="rounded-xl border border-dashed border-[var(--color-border)] p-5 text-center text-xs text-[var(--color-text-secondary)]">{text}</p>; }
function Loading() { return <div className="grid gap-5"><div className="h-32 animate-pulse rounded-[28px] bg-[var(--color-bg-soft)]" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-[var(--color-bg-soft)]" />)}</div><div className="h-80 animate-pulse rounded-2xl bg-[var(--color-bg-soft)]" /></div>; }
