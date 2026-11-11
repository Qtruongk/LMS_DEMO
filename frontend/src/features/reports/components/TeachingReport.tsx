import { useEffect, useMemo, useState } from 'react';
import { Panel } from '../../../components/shared/ui';
import { BookIcon, CheckCircleIcon, ChartIcon, ClockIcon, UsersIcon } from '../../../components/shared/icons';
import type { User } from '../../../types';
import { API_URL } from '../../../services/api';

type TeacherReportItem = {
    id: number;
    full_name: string;
    specialty: string | null;
    employment_started_at: string;
    total_sessions: number;
    completed_sessions: number;
    month_sessions: number;
    month_completed_sessions: number;
    replaced_sessions: number;
    rescheduled_sessions: number;
    graded_assignments: number;
    ungraded_assignments: number;
    sent_notifications: number;
    lessons_taught_this_month: number;
    taught_classes: number;
    taught_students: number;
    employment_days: number;
};

type TeachingReportData = { teachers: TeacherReportItem[] };

type Metric = { label: string; value: number | string; tone: string };


export function TeachingReport({ user }: { user: User }) {
    const [data, setData] = useState<TeachingReportData | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        fetch(`${API_URL}/api/owner/teaching-report`, {
            headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
            signal: controller.signal,
        })
            .then(async (response) => {
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message || 'Không thể tải báo cáo giảng dạy');
                setData(payload);
            })
            .catch((requestError) => {
                if (requestError.name !== 'AbortError') setError(requestError.message || 'Không thể tải báo cáo giảng dạy');
            });
        return () => controller.abort();
    }, [user.id]);

    const overview = useMemo(() => {
        const teachers = data?.teachers ?? [];
        return {
            teachers: teachers.length,
            completed: teachers.reduce((sum, teacher) => sum + teacher.completed_sessions, 0),
            monthCompleted: teachers.reduce((sum, teacher) => sum + teacher.month_completed_sessions, 0),
            students: teachers.reduce((sum, teacher) => sum + teacher.taught_students, 0),
        };
    }, [data]);

    if (error) return <Panel title="Báo cáo giảng dạy giáo viên"><div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div></Panel>;
    if (!data) return <TeachingReportLoading />;

    return <div className="grid gap-5 pb-8">
        <section className="overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-primary)] text-white shadow-sm"><ChartIcon size={22} /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">Owner workspace</p><h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">Báo cáo giảng dạy giáo viên</h2></div></div>
                <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-2 text-[11px] font-bold text-[var(--color-primary)]">THEO GIÁO VIÊN</span>
            </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Giáo viên đang hoạt động" value={overview.teachers} icon={UsersIcon} tone="blue" />
            <SummaryCard label="Tổng buổi đã dạy" value={overview.completed} icon={CheckCircleIcon} tone="emerald" />
            <SummaryCard label="Buổi đã dạy tháng này" value={overview.monthCompleted} icon={ClockIcon} tone="amber" />
            <SummaryCard label="Lượt học viên đã dạy" value={overview.students} icon={BookIcon} tone="violet" />
        </div>

        <Panel title="Hiệu suất giảng dạy từng giáo viên">
            <div className="grid gap-4">
                {data.teachers.length ? data.teachers.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />) : <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-secondary)]">Chưa có giáo viên đang hoạt động.</div>}
            </div>
        </Panel>
    </div>;
}

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: (props: { size?: number }) => JSX.Element; tone: 'blue' | 'emerald' | 'amber' | 'violet' }) {
    const tones = { blue: 'border-blue-200 bg-blue-50/70 text-blue-700', emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-700', amber: 'border-amber-200 bg-amber-50/70 text-amber-700', violet: 'border-violet-200 bg-violet-50/70 text-violet-700' };
    return <article className={`rounded-2xl border p-4 ${tones[tone]}`}><div className="flex items-center justify-between gap-3"><p className="text-[11px] font-bold uppercase tracking-wider">{label}</p><span className="grid h-8 w-8 place-items-center rounded-xl bg-white/75"><Icon size={16} /></span></div><p className="mt-3 text-2xl font-black tracking-[-0.03em] text-[var(--color-text)]">{value}</p></article>;
}

function TeacherCard({ teacher }: { teacher: TeacherReportItem }) {
    const metrics: Metric[] = [
        { label: 'Tổng buổi dạy', value: teacher.total_sessions, tone: 'text-blue-700' },
        { label: 'Buổi đã dạy', value: teacher.completed_sessions, tone: 'text-emerald-700' },
        { label: 'Buổi dạy tháng này', value: teacher.month_sessions, tone: 'text-blue-700' },
        { label: 'Đã dạy tháng này', value: teacher.month_completed_sessions, tone: 'text-emerald-700' },
        { label: 'Buổi bị thay thế', value: teacher.replaced_sessions, tone: 'text-rose-700' },
        { label: 'Buổi đổi lịch', value: teacher.rescheduled_sessions, tone: 'text-amber-700' },
        { label: 'Bài tập đã chấm', value: teacher.graded_assignments, tone: 'text-emerald-700' },
        { label: 'Bài tập chưa chấm', value: teacher.ungraded_assignments, tone: 'text-rose-700' },
        { label: 'Thông báo lớp đã gửi', value: teacher.sent_notifications, tone: 'text-violet-700' },
        { label: 'Bài học đã dạy tháng này', value: teacher.lessons_taught_this_month, tone: 'text-blue-700' },
        { label: 'Lớp đã tham gia dạy', value: teacher.taught_classes, tone: 'text-violet-700' },
        { label: 'Học sinh đã dạy', value: teacher.taught_students, tone: 'text-amber-700' },
    ];

    return <article className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)]/30">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-card)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="font-black text-[var(--color-text)]">{teacher.full_name}</h3></div>
            <span className="w-fit rounded-full bg-[var(--color-primary-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--color-primary)]">{teacher.taught_classes} lớp phụ trách</span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[var(--color-border)] sm:grid-cols-3 xl:grid-cols-4">{metrics.map((metric) => <div key={metric.label} className="flex flex-col justify-center min-h-[84px] bg-[var(--color-card)] p-3"><p className="text-[10px] font-bold uppercase leading-4 tracking-wide text-[var(--color-text-secondary)]">{metric.label}</p><p className={`mt-2 text-xl font-black ${metric.tone}`}>{metric.value}</p></div>)}</div>
    </article>;
}

function TeachingReportLoading() { return <div className="grid gap-5"><div className="h-32 animate-pulse rounded-[28px] bg-[var(--color-bg-soft)]" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-[var(--color-bg-soft)]" />)}</div><div className="h-72 animate-pulse rounded-2xl bg-[var(--color-bg-soft)]" /></div>; }
