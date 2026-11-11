import { memo, useEffect, useMemo, useState } from 'react';
import { Badge, Button, EmptyState, Panel } from '../../../components/shared/ui';
import { BookIcon, CheckCircleIcon, ClockIcon, UsersIcon } from '../../../components/shared/icons';
import type { ClassItem, User, WorkspaceSummary } from '../../../types';
import { API_URL } from '../../../services/api';

type TeacherDashboardProps = {
    user: User;
    summary: WorkspaceSummary;
    classes: ClassItem[];
    onNavigate?: (module: string, classId?: number) => void;
};

type TeacherReviewItem = {
    id: number;
    title: string;
    student_name?: string;
    username?: string;
    class_name?: string;
    class_code?: string;
    submitted_at?: string;
};

function formatReviewTime(value?: string) {
    if (!value) return 'Vừa nộp';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Vừa nộp';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export const TeacherDashboard = memo(function TeacherDashboard({ user, summary, classes, onNavigate }: TeacherDashboardProps) {
    const activeClasses = useMemo(() => classes.filter((item) => item.status !== 'completed' && item.status !== 'canceled' && item.status !== 'archived'), [classes]);
    const [reviewItems, setReviewItems] = useState<TeacherReviewItem[]>([]);
    const [reviewLoading, setReviewLoading] = useState(false);
    const reviewRows = useMemo(() => reviewItems.map((item) => ({
        id: item.id,
        title: item.title,
        student: item.student_name || item.username || 'Học sinh',
        className: item.class_name || item.class_code || 'Lớp học',
        submittedAt: formatReviewTime(item.submitted_at),
    })), [reviewItems]);

    useEffect(() => {
        if (!user?.id) return;
        const controller = new AbortController();
        setReviewLoading(true);
        fetch(`${API_URL}/api/teacher/review-items`, {
            headers: { 'x-user-id': String(user.id) },
            signal: controller.signal,
        })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Không thể tải bài cần đánh giá.');
                setReviewItems(data.reviewItems ?? []);
            })
            .catch((error) => {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                setReviewItems([]);
            })
            .finally(() => setReviewLoading(false));
        return () => controller.abort();
    }, [user.id]);

    return (
        <div className="grid gap-6">
            <section className="overflow-hidden rounded-[32px] border border-red-100 bg-white shadow-sm dark:border-[var(--color-border)] dark:bg-[var(--color-card)]">
                <div className="p-6 text-slate-950 sm:p-8" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff5f5 42%, #fecaca 72%, #ef4444 100%)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-800">Tổng quan giáo viên</p>
                            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">Xin chào, {user.full_name || user.username}</h1>
                        </div>
                        <span className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-black text-red-700 shadow-sm">Giáo viên</span>
                    </div>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
                    <MetricTile icon={BookIcon} label="Lớp đang dạy" value={activeClasses.length || summary.my_classes || 0} />
                    <MetricTile icon={UsersIcon} label="Học sinh" value={summary.students || 0} />
                    <MetricTile icon={CheckCircleIcon} label="Cần đánh giá" value={reviewRows.length || summary.pending_grades || 0} />
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <Panel
                    title="Đến hạn gần đây"
                    action={<Button size="sm" onClick={() => onNavigate?.('classes')}>Cần đánh giá</Button>}
                >
                    {reviewLoading ? (
                        <div className="grid gap-3">
                            {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-[var(--color-bg-soft)]" />)}
                        </div>
                    ) : reviewRows.length ? (
                        <div className="grid gap-3">
                            {reviewRows.map((item) => (
                                <article key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="truncate text-base font-black text-[var(--color-text)]">{item.title}</h3>
                                            <p className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">{item.submittedAt}</p>
                                        </div>
                                        <Badge tone="warning">Cần đánh giá</Badge>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <EmptyState title="Không có bài tập nào gần đây để xem xét" />
                    )}
                </Panel>

                <Panel title="Lớp học" action={<Button size="sm" onClick={() => onNavigate?.('classes')}>Tất cả lớp</Button>}>
                    {activeClasses.length ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {activeClasses.map((item) => (
                                <button key={item.id} type="button" onClick={() => onNavigate?.('classes', item.id)} className="group rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-lg dark:border-[var(--color-border)] dark:bg-[var(--color-bg-soft)] dark:hover:border-blue-900/60 dark:hover:bg-[var(--color-card)]">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200"><BookIcon size={18} /></span>
                                        <Badge tone="neutral" size="sm">{item.code || 'Lớp học'}</Badge>
                                    </div>
                                    <h3 className="mt-4 line-clamp-1 text-base font-black text-slate-950 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-200">{item.name}</h3>
                                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-[var(--color-text-secondary)]"><ClockIcon size={15} /> {item.class_hours || 'Giờ học cập nhật sau'}</p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <EmptyState title="Chưa có lớp học" />
                    )}
                </Panel>
            </div>
        </div>
    );
});

function MetricTile({ icon: Icon, label, value }: { icon: (props: { size?: number; className?: string }) => JSX.Element; label: string; value: string | number }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-[var(--color-border)] dark:bg-[var(--color-bg-soft)]">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-blue-800 shadow-sm dark:bg-white/10 dark:text-blue-200"><Icon size={18} /></span>
            <p className="mt-4 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        </div>
    );
}
