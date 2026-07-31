import { memo } from 'react';
import { Panel, Button, Badge } from '../../../components/shared/ui';
import { BookIcon, FileIcon, CheckIcon, CheckCircleIcon, ClockIcon, WalletIcon, ChevronRightIcon, TrendingUpIcon } from '../../../components/shared/icons';
import type { ClassItem, User, WorkspaceSummary } from '../../../types';

type StudentDashboardProps = {
    user: User;
    summary: WorkspaceSummary;
    classes: ClassItem[];
    onNavigate?: (module: string) => void;
};

export const StudentDashboard = memo(function StudentDashboard({ user, summary, classes, onNavigate }: StudentDashboardProps) {
    const activeClasses = classes.filter(c => c.status !== 'completed' && c.status !== 'canceled');

    const todos = [
        { label: 'Hoàn thành bài tập Đại số', module: 'tests', type: 'urgent' },
        { label: 'Xem video Hóa học mới', module: 'materials', type: 'new' },
        { label: 'Đóng học phí tháng 10', module: 'tuition', type: 'warning' },
    ];

    const stats = [
        { label: 'Lớp đang học', value: activeClasses.length, icon: BookIcon, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Điểm danh tháng', value: '100%', icon: CheckCircleIcon, color: 'text-green-500', bg: 'bg-green-50' },
        { label: 'Điểm trung bình', value: '8.5', icon: TrendingUpIcon, color: 'text-purple-500', bg: 'bg-purple-50' },
        { label: 'Bài tập chờ', value: summary.open_tests ?? 2, icon: ClockIcon, color: 'text-orange-500', bg: 'bg-orange-50' },
        { label: 'Học phí nợ', value: '0đ', icon: WalletIcon, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="grid gap-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
                        Chào {user.full_name || user.username}, hôm nay học gì?
                    </h1>
                    <p className="mt-1.5 text-base text-[var(--color-text-secondary)]">
                        Hôm nay là Thứ Tư, 15 tháng 10. Bạn có <b>2 ca học</b> sắp diễn ra.
                    </p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
                {stats.map((stat, index) => (
                    <div key={index} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">{stat.label}</p>
                            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${stat.bg} ${stat.color}`}>
                                <stat.icon size={14} />
                            </span>
                        </div>
                        <b className="text-2xl font-black tracking-tight text-[var(--color-text)]">{stat.value}</b>
                    </div>
                ))}
            </div>

            {/* Main Content Layout */}
            <div className="grid gap-6 xl:grid-cols-3">
                {/* Left Col: Today & Todo */}
                <div className="xl:col-span-2 flex flex-col gap-6">
                    {/* Today's Schedule */}
                    <Panel title="Lịch học hôm nay" subtitle="Các ca học diễn ra trong ngày" action={<Button size="sm" onClick={() => onNavigate?.('schedule')}>Xem toàn bộ lịch</Button>}>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between p-4 rounded-xl border border-blue-200 bg-blue-50/50 relative overflow-hidden group cursor-pointer transition hover:bg-blue-50">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center justify-center min-w-16">
                                        <b className="text-lg font-black text-blue-700">18:00</b>
                                        <span className="text-xs font-semibold text-blue-600/70">120 phút</span>
                                    </div>
                                    <div className="h-10 w-px bg-blue-200" />
                                    <div>
                                        <h4 className="text-base font-bold text-[var(--color-text)] mb-0.5 group-hover:text-blue-700 transition">Tiếng Anh Giao Tiếp</h4>
                                        <p className="text-xs text-[var(--color-text-secondary)] font-medium flex items-center gap-2">
                                            <span>GV: Nguyễn Văn A</span> • <span>Phòng 101 (Offline)</span>
                                        </p>
                                    </div>
                                </div>
                                <Button size="sm" className="hidden sm:flex bg-blue-600 hover:bg-blue-700 text-white font-bold border-none shadow-md">
                                    Vào lớp
                                </Button>
                            </div>
                        </div>
                    </Panel>

                    {/* Continue Learning */}
                    <Panel title="Tiếp tục học" subtitle="Gần đây nhất">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div onClick={() => onNavigate?.('materials')} className="group flex items-start gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] cursor-pointer hover:border-[var(--color-primary)] transition">
                                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600">
                                    <FileIcon size={24} />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition">Đề cương Ôn tập Giữa kỳ</h4>
                                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">Đang xem dở trang 2/10</p>
                                </div>
                            </div>
                            <div onClick={() => onNavigate?.('timeline')} className="group flex items-start gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] cursor-pointer hover:border-[var(--color-primary)] transition">
                                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                                    <BookIcon size={24} />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition">Video: Giải tích 1</h4>
                                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">Đã xem 15 phút trước</p>
                                </div>
                            </div>
                        </div>
                    </Panel>
                </div>

                {/* Right Col: Todo & Quick Actions */}
                <div className="flex flex-col gap-6">
                    {/* Checklist */}
                    <Panel title="Việc cần làm" noPadding>
                        <div className="divide-y divide-[var(--color-border)]">
                            {todos.map((todo, i) => (
                                <div key={i} onClick={() => onNavigate?.(todo.module)} className="flex items-center gap-3 p-4 hover:bg-[var(--color-bg-soft)] cursor-pointer transition group">
                                    <div className="grid h-5 w-5 place-items-center rounded border-2 border-[var(--color-text-muted)] group-hover:border-[var(--color-primary)] transition">
                                        <CheckIcon size={12} className="opacity-0 group-hover:opacity-100 text-[var(--color-primary)] transition" />
                                    </div>
                                    <span className="flex-1 text-sm font-medium text-[var(--color-text)]">{todo.label}</span>
                                    {todo.type === 'urgent' && <Badge tone="danger" size="sm">Gấp</Badge>}
                                    {todo.type === 'new' && <Badge tone="info" size="sm">Mới</Badge>}
                                </div>
                            ))}
                        </div>
                    </Panel>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => onNavigate?.('classes')} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-soft)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition text-[var(--color-text-secondary)]">
                            <BookIcon size={24} />
                            <span className="text-xs font-bold">Lớp học</span>
                        </button>
                        <button onClick={() => onNavigate?.('tests')} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-soft)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition text-[var(--color-text-secondary)]">
                            <CheckCircleIcon size={24} />
                            <span className="text-xs font-bold">Kiểm tra</span>
                        </button>
                        <button onClick={() => onNavigate?.('materials')} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-soft)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition text-[var(--color-text-secondary)]">
                            <FileIcon size={24} />
                            <span className="text-xs font-bold">Tài liệu</span>
                        </button>
                        <button onClick={() => onNavigate?.('feedbacks')} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-soft)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition text-[var(--color-text-secondary)]">
                            <ChevronRightIcon size={24} />
                            <span className="text-xs font-bold">Phản hồi</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});
