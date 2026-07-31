import { memo, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge, Button, Panel, Progress } from '../../../components/shared/ui';
import {
    AlertCircleIcon,
    BellIcon,
    BookIcon,
    CalendarIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    ClockIcon,
    FileIcon,
    MessageIcon,
    StarIcon,
    TrendingUpIcon,
    WalletIcon,
    XIcon,
} from '../../../components/shared/icons';
import type { ClassItem, User, WorkspaceSummary } from '../../../types';

type StudentDashboardProps = {
    user: User;
    summary: WorkspaceSummary;
    classes: ClassItem[];
    onNavigate?: (module: string) => void;
};

type ModalType = 'study-plan' | 'support' | 'tuition' | null;

const dayFormatter = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

export const StudentDashboard = memo(function StudentDashboard({ user, summary, classes, onNavigate }: StudentDashboardProps) {
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [supportTopic, setSupportTopic] = useState('Xin tư vấn lộ trình ôn tập Toán - Lý tuần này');
    const [supportMessage, setSupportMessage] = useState('Em muốn được gợi ý thứ tự học bài, lịch luyện đề và phần cần ưu tiên trong 7 ngày tới.');
    const [submitted, setSubmitted] = useState(false);

    const activeClasses = useMemo(() => classes.filter(c => c.status !== 'completed' && c.status !== 'canceled'), [classes]);
    const primaryClass = activeClasses[0];
    const displayName = user.full_name || user.username;
    const todayLabel = dayFormatter.format(new Date());

    const studyCompletion = Math.min(96, Math.max(62, Number(summary.completion_rate ?? 84)));
    const attendanceRate = Math.min(100, Math.max(80, Number(summary.attendance_rate ?? 98)));
    const openTests = Number(summary.open_tests ?? 2);

    const stats = [
        {
            label: 'Lớp đang học',
            value: activeClasses.length,
            helper: primaryClass ? `Gần nhất: ${primaryClass.name}` : 'Đã sẵn sàng đăng ký lớp mới',
            icon: BookIcon,
            tone: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/50',
        },
        {
            label: 'Điểm danh',
            value: `${attendanceRate}%`,
            helper: 'Tỷ lệ tham gia tháng này',
            icon: CheckCircleIcon,
            tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/50',
        },
        {
            label: 'Tiến độ học',
            value: `${studyCompletion}%`,
            helper: 'Hoàn thành mục tiêu tuần',
            icon: TrendingUpIcon,
            tone: 'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:ring-violet-900/50',
        },
        {
            label: 'Việc cần làm',
            value: openTests,
            helper: openTests > 0 ? 'Ưu tiên xử lý hôm nay' : 'Không có việc quá hạn',
            icon: ClockIcon,
            tone: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/50',
        },
    ];

    const todayTimeline = [
        {
            time: '08:30',
            title: primaryClass?.name ?? 'Ôn tập Toán tư duy',
            meta: primaryClass?.teacher_name ? `GV ${primaryClass.teacher_name}` : 'Phòng học A2 • 90 phút',
            status: 'Sắp học',
            tone: 'primary' as const,
        },
        {
            time: '14:00',
            title: 'Luyện đề nhanh 25 câu',
            meta: 'Tự học có chấm điểm tự động',
            status: '25 phút',
            tone: 'info' as const,
        },
        {
            time: '20:00',
            title: 'Xem lại lỗi sai trong bài kiểm tra',
            meta: 'Hệ thống đã gợi ý 6 câu cần ôn',
            status: 'Cần làm',
            tone: 'warning' as const,
        },
    ];

    const learningTasks = [
        {
            title: 'Hoàn thành bài tập trọng tâm',
            description: '12 câu Đại số đã được cá nhân hoá theo năng lực hiện tại.',
            module: 'tests',
            action: 'Làm bài',
            tone: 'danger' as const,
        },
        {
            title: 'Xem tài liệu mới',
            description: 'Bộ ghi chú “Công thức cần nhớ” đã được giáo viên cập nhật.',
            module: 'materials',
            action: 'Mở tài liệu',
            tone: 'info' as const,
        },
        {
            title: 'Kiểm tra lịch học tuần này',
            description: 'Có 1 buổi học bù cần xác nhận để không bỏ lỡ.',
            module: 'schedule',
            action: 'Xem lịch',
            tone: 'warning' as const,
        },
    ];

    const quickActions = [
        { label: 'Lớp học', helper: 'Vào lớp nhanh', module: 'classes', icon: BookIcon },
        { label: 'Điểm danh', helper: 'Xem buổi học', module: 'attendance', icon: CheckCircleIcon },
        { label: 'Tài liệu', helper: 'Tệp mới nhất', module: 'materials', icon: FileIcon },
        { label: 'Thông báo', helper: 'Tin từ lớp', module: 'notifications', icon: BellIcon },
    ];

    const handleSubmitSupport = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitted(true);
    };

    return (
        <div className="mx-auto grid w-full max-w-7xl gap-5 pb-8 sm:gap-6">
            <section className="relative overflow-hidden rounded-[28px] border border-[var(--color-primary-border)] bg-gradient-to-br from-red-50 via-white to-amber-50 p-4 shadow-sm dark:from-red-950/20 dark:via-[var(--color-card)] dark:to-amber-950/10 sm:p-6 lg:p-7">
                <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />
                <div className="relative grid gap-5 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
                    <div className="min-w-0">
                        <Badge tone="primary">Tổng quan học sinh • {todayLabel}</Badge>
                        <h1 className="mt-4 max-w-3xl text-2xl font-black leading-tight tracking-[-0.04em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
                            Chào {displayName}, hôm nay mình học nhẹ nhàng nhưng đúng trọng tâm.
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)] sm:text-base">
                            Bảng tổng quan được sắp theo thói quen nhìn tự nhiên: việc quan trọng ở bên trái, hành động nhanh bên phải, mọi nút đều đủ lớn để bấm trên di động.
                        </p>
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={() => setActiveModal('study-plan')}
                                leftIcon={<StarIcon size={18} />}
                                className="min-h-12 w-full sm:w-auto"
                            >
                                Xem lộ trình hôm nay
                            </Button>
                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={() => onNavigate?.('schedule')}
                                leftIcon={<CalendarIcon size={18} />}
                                className="min-h-12 w-full sm:w-auto"
                            >
                                Mở thời khoá biểu
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-white/70 bg-white/78 p-4 shadow-lg shadow-red-100/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Mục tiêu tuần</p>
                                <p className="mt-1 text-xl font-black text-[var(--color-text)]">Hoàn thành {studyCompletion}%</p>
                            </div>
                            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary)]">
                                <TrendingUpIcon size={24} />
                            </span>
                        </div>
                        <div className="mt-4">
                            <Progress value={studyCompletion} label="Tiến độ cá nhân" />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-2xl bg-[var(--color-bg-soft)] p-3">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Buổi học</p>
                                <p className="mt-1 text-lg font-black text-[var(--color-text)]">2 hôm nay</p>
                            </div>
                            <div className="rounded-2xl bg-[var(--color-bg-soft)] p-3">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Nhắc việc</p>
                                <p className="mt-1 text-lg font-black text-[var(--color-text)]">{openTests} mục</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <button
                            key={stat.label}
                            type="button"
                            onClick={() => stat.label === 'Việc cần làm' ? onNavigate?.('tests') : undefined}
                            className="group min-h-[128px] rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary-border)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <span className={`grid h-11 w-11 place-items-center rounded-2xl ring-1 ${stat.tone}`}>
                                    <Icon size={22} />
                                </span>
                                <ChevronRightIcon size={18} className="mt-1 text-[var(--color-text-muted)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                            </div>
                            <p className="mt-4 text-2xl font-black tracking-[-0.03em] text-[var(--color-text)]">{stat.value}</p>
                            <p className="mt-1 text-sm font-bold text-[var(--color-text)]">{stat.label}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-secondary)]">{stat.helper}</p>
                        </button>
                    );
                })}
            </section>

            <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
                <Panel
                    title="Việc cần ưu tiên"
                    subtitle="Các thẻ được viết rõ hành động tiếp theo để giảm thời gian suy nghĩ và tránh bỏ sót."
                    action={<Button size="sm" variant="ghost" onClick={() => onNavigate?.('tests')}>Xem tất cả</Button>}
                    className="h-fit"
                >
                    <div className="grid gap-3">
                        {learningTasks.map((task, index) => (
                            <article key={task.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 transition hover:border-[var(--color-primary-border)] hover:bg-[var(--color-card)]">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex gap-3">
                                        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[var(--color-card)] font-black text-[var(--color-primary)] shadow-sm">
                                            {index + 1}
                                        </span>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-extrabold text-[var(--color-text)]">{task.title}</h3>
                                                <Badge tone={task.tone} size="sm">Ưu tiên</Badge>
                                            </div>
                                            <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{task.description}</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="secondary" onClick={() => onNavigate?.(task.module)} className="min-h-10 w-full sm:w-auto">
                                        {task.action}
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                </Panel>

                <Panel
                    title="Lịch học hôm nay"
                    subtitle="Dòng thời gian ngắn, dễ quét bằng mắt trên cả máy tính và điện thoại."
                    action={<Button size="sm" variant="ghost" onClick={() => onNavigate?.('schedule')}>Mở lịch</Button>}
                    className="h-fit"
                >
                    <div className="space-y-3">
                        {todayTimeline.map((item) => (
                            <div key={`${item.time}-${item.title}`} className="flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                                <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-[var(--color-bg-soft)] px-2 py-3 text-center">
                                    <ClockIcon size={16} className="text-[var(--color-primary)]" />
                                    <span className="mt-1 text-xs font-black text-[var(--color-text)]">{item.time}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="truncate font-extrabold text-[var(--color-text)]">{item.title}</h3>
                                        <Badge tone={item.tone} size="sm">{item.status}</Badge>
                                    </div>
                                    <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{item.meta}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Panel>
            </div>

            <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
                <Panel title="Truy cập nhanh" subtitle="Giữ menu bar nguyên trạng, thêm nút thao tác lớn trong vùng nội dung để dùng tiện hơn trên di động.">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                        {quickActions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={action.label}
                                    type="button"
                                    onClick={() => onNavigate?.(action.module)}
                                    className="group min-h-[116px] rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                                >
                                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm transition group-hover:scale-105">
                                        <Icon size={21} />
                                    </span>
                                    <p className="mt-3 font-black text-[var(--color-text)]">{action.label}</p>
                                    <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">{action.helper}</p>
                                </button>
                            );
                        })}
                    </div>
                </Panel>

                <Panel title="Hỗ trợ cá nhân" subtitle="Popup và form đã có sẵn dữ liệu mẫu để học sinh gửi nhanh khi cần trợ giúp.">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <button type="button" onClick={() => setActiveModal('support')} className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-left text-blue-800 transition hover:-translate-y-0.5 hover:shadow-md dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
                            <MessageIcon size={24} />
                            <p className="mt-3 font-black">Hỏi giáo viên</p>
                            <p className="mt-1 text-xs leading-5 opacity-80">Mẫu form đã điền sẵn nội dung.</p>
                        </button>
                        <button type="button" onClick={() => setActiveModal('tuition')} className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-left text-emerald-800 transition hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
                            <WalletIcon size={24} />
                            <p className="mt-3 font-black">Học phí</p>
                            <p className="mt-1 text-xs leading-5 opacity-80">Xem trạng thái thanh toán.</p>
                        </button>
                        <button type="button" onClick={() => onNavigate?.('feedbacks')} className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-left text-amber-800 transition hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                            <AlertCircleIcon size={24} />
                            <p className="mt-3 font-black">Góp ý</p>
                            <p className="mt-1 text-xs leading-5 opacity-80">Phản hồi trải nghiệm học.</p>
                        </button>
                    </div>
                </Panel>
            </div>

            <AnimatePresence>
                {activeModal && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-2xl sm:max-w-2xl sm:rounded-[28px] sm:p-6"
                            initial={{ y: 40, opacity: 0, scale: 0.98 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 30, opacity: 0, scale: 0.98 }}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <Badge tone="primary">VAT LMS</Badge>
                                    <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[var(--color-text)]">
                                        {activeModal === 'study-plan' && 'Lộ trình học hôm nay'}
                                        {activeModal === 'support' && 'Gửi yêu cầu hỗ trợ'}
                                        {activeModal === 'tuition' && 'Thông tin học phí'}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                                    aria-label="Đóng popup"
                                >
                                    <XIcon size={20} />
                                </button>
                            </div>

                            {activeModal === 'study-plan' && (
                                <div className="mt-5 grid gap-3">
                                    {todayTimeline.map((item, index) => (
                                        <div key={item.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                                            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Bước {index + 1} • {item.time}</p>
                                            <h3 className="mt-2 font-black text-[var(--color-text)]">{item.title}</h3>
                                            <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{item.meta}</p>
                                        </div>
                                    ))}
                                    <Button variant="primary" size="lg" onClick={() => { setActiveModal(null); onNavigate?.('tests'); }} className="mt-2 min-h-12 w-full">
                                        Bắt đầu từ bài ưu tiên
                                    </Button>
                                </div>
                            )}

                            {activeModal === 'support' && (
                                <form onSubmit={handleSubmitSupport} className="mt-5 grid gap-4">
                                    <label className="grid gap-2 text-sm font-bold text-[var(--color-text)]">
                                        Chủ đề cần hỗ trợ
                                        <input
                                            value={supportTopic}
                                            onChange={(event) => setSupportTopic(event.target.value)}
                                            className="min-h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                                        />
                                    </label>
                                    <label className="grid gap-2 text-sm font-bold text-[var(--color-text)]">
                                        Nội dung chi tiết
                                        <textarea
                                            value={supportMessage}
                                            onChange={(event) => setSupportMessage(event.target.value)}
                                            rows={5}
                                            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                                        />
                                    </label>
                                    {submitted && (
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
                                            Đã lưu bản nháp yêu cầu hỗ trợ. Giáo viên sẽ phản hồi trong mục Phản hồi.
                                        </div>
                                    )}
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Button type="button" size="lg" variant="secondary" onClick={() => setActiveModal(null)} className="min-h-12">Để sau</Button>
                                        <Button type="submit" size="lg" variant="primary" className="min-h-12">Gửi yêu cầu</Button>
                                    </div>
                                </form>
                            )}

                            {activeModal === 'tuition' && (
                                <div className="mt-5 grid gap-4">
                                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
                                        <p className="text-sm font-bold uppercase tracking-[0.14em] opacity-75">Trạng thái</p>
                                        <p className="mt-2 text-3xl font-black">Đã thanh toán</p>
                                        <p className="mt-2 text-sm leading-6 opacity-80">Kỳ tháng này không có khoản cần xử lý. Biên nhận mẫu: VAT-2026-0108.</p>
                                    </div>
                                    <Button variant="primary" size="lg" onClick={() => { setActiveModal(null); onNavigate?.('tuition'); }} className="min-h-12 w-full">
                                        Xem chi tiết học phí
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
