import { memo, useEffect, useMemo, useState } from 'react';
import { Badge, EmptyState, Panel } from '../../../components/shared/ui';
import { BookIcon, CalendarIcon, ClockIcon, FileIcon } from '../../../components/shared/icons';
import type { ClassItem, User, WorkspaceSummary } from '../../../types';
import { API_URL } from '../../../services/api';
import { StudentScoreProgressChart } from './StudentScoreProgressChart';

type StudentDashboardProps = {
    user: User;
    summary: WorkspaceSummary;
    classes: ClassItem[];
    onNavigate?: (module: string) => void;
};

type DueTask = {
    id: number;
    title: string;
    description?: string;
    type?: string;
    due_date?: string;
    class_id: number;
    class_name?: string;
    class_code?: string;
    status?: string;
};



function formatDeadline(value?: string) {
    if (!value) return 'Chưa đặt hạn';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa đặt hạn';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export const StudentDashboard = memo(function StudentDashboard({ user, classes, onNavigate }: StudentDashboardProps) {
    const [dueTasks, setDueTasks] = useState<DueTask[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    const activeClasses = useMemo(() => classes.filter((item) => item.status !== 'completed' && item.status !== 'canceled' && item.status !== 'archived'), [classes]);
    const displayName = user.full_name || user.username;
        useEffect(() => {
        let mounted = true;
        setLoadingTasks(true);
        fetch(`${API_URL}/api/student/deadlines`, { headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) } })
            .then((response) => response.json())
            .then((data) => {
                if (mounted) setDueTasks(data.deadlines ?? []);
            })
            .catch(() => {
                if (mounted) setDueTasks([]);
            })
            .finally(() => {
                if (mounted) setLoadingTasks(false);
            });
        return () => { mounted = false; };
    }, [user.id]);

    return (
        <div className="grid gap-6">
            <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm dark:border-[var(--color-border)] dark:bg-[var(--color-card)]">
                <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-900 dark:text-red-200">Màn hình chính</p>
                        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">Xin chào, {displayName}</h1>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <MetricTile icon={BookIcon} label="Lớp đang học" value={activeClasses.length} />
                        <MetricTile icon={ClockIcon} label="Sắp đến hạn" value={dueTasks.length} />
                    </div>
                </div>
            </section>

            <div className="grid gap-6">
                <Panel
                    title="Việc cần làm"
                    action={<button type="button" onClick={() => onNavigate?.('classes')} className="text-sm font-black text-blue-700 transition hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">Xem trong lớp học</button>}
                    className="!border-amber-200 !bg-amber-50/70 dark:!border-amber-900/40 dark:!bg-amber-950/10"
                >
                    {loadingTasks ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:border-[var(--color-border)] dark:bg-[var(--color-bg-soft)] dark:text-[var(--color-text-secondary)]">Đang tải việc cần làm...</div>
                    ) : dueTasks.length ? (
                        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                            {dueTasks.map((task) => (
                                <article key={task.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                                    <div className="flex items-start gap-3">
                                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-amber-700 shadow-sm dark:bg-white/10 dark:text-amber-300"><FileIcon size={18} /></span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-sm font-black text-slate-950 dark:text-white">{task.title}</h3>
                                                <Badge tone="warning" size="sm">{formatDeadline(task.due_date)}</Badge>
                                            </div>
                                            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-[var(--color-text-secondary)]">{task.class_name || 'Lớp học'}{task.class_code ? ` • ${task.class_code}` : ''}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500 dark:border-[var(--color-border)] dark:bg-[var(--color-bg-soft)] dark:text-[var(--color-text-secondary)]">
                            Bạn không có bài tập nào đến hạn trong 7 ngày tới
                        </div>
                    )}
                </Panel>

                <Panel
                    title="Lớp học"
                    className="!border-slate-200 !bg-white dark:!border-[var(--color-border)] dark:!bg-[var(--color-card)]"
                >
                    {activeClasses.length ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {activeClasses.map((item) => (
                                <button key={item.id} type="button" onClick={() => onNavigate?.('classes')} className="group rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50/40 hover:shadow-md dark:border-[var(--color-border)] dark:bg-[var(--color-bg-soft)] dark:hover:border-red-900/60">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-900 text-white shadow-sm"><BookIcon size={19} /></span>
                                        <Badge tone="primary" size="sm">{item.status_label || item.status}</Badge>
                                    </div>
                                    <h3 className="mt-4 line-clamp-2 text-base font-black text-slate-950 dark:text-white">{item.name}</h3>
                                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{item.code || 'Chưa có mã lớp'}</p>
                                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-[var(--color-text-secondary)]"><CalendarIcon size={15} /> {item.schedule || 'Đang cập nhật lịch'}</p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <EmptyState title="Chưa có lớp học" />
                    )}
                </Panel>
            </div>

            {/* Tiến trình học tập đặt ở dưới cùng */}
            <StudentScoreProgressChart
                userId={user.id}
                title="Tiến trình học tập"
            />
        </div>
    );
});

function MetricTile({ icon: Icon, label, value }: { icon: (props: { size?: number; className?: string }) => JSX.Element; label: string; value: string | number }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-[var(--color-border)] dark:bg-[var(--color-bg-soft)]">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-red-900 shadow-sm dark:bg-white/10 dark:text-red-200"><Icon size={18} /></span>
            <p className="mt-4 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        </div>
    );
}
