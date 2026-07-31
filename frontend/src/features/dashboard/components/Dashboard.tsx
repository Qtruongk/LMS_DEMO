import { memo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, Badge, Button, PrimaryButton, Skeleton, Field } from '../../../components/shared/ui';
import {
    BookIcon,
    UsersIcon,
    CalendarIcon,
    BellIcon,
    CheckIcon,
    ClockIcon,
    WalletIcon,
    FileIcon,
    XIcon,
    TrendIcon,
} from '../../../components/shared/icons';
import type { ClassItem, User, WorkspaceSummary } from '../../../types';
import { ClassSideDrawer } from '../../../components/shared/ClassSideDrawer';
import { StudentDashboard } from './StudentDashboard';

type DashboardProps = {
    user: User;
    summary: WorkspaceSummary;
    classes: ClassItem[];
    onNavigate?: (module: string) => void;
};

// Dummy interactive data for modals
const sampleStudents = [
    { id: 1, name: 'Nguyễn Văn An', code: 'VAT-9021', status: 'present', note: '' },
    { id: 2, name: 'Trần Thị Bích', code: 'VAT-9022', status: 'present', note: '' },
    { id: 3, name: 'Lê Hoàng Nam', code: 'VAT-9023', status: 'late', note: 'Đi muộn 10 phút' },
    { id: 4, name: 'Phạm Quốc Cường', code: 'VAT-9024', status: 'present', note: '' },
    { id: 5, name: 'Đỗ Minh Tuấn', code: 'VAT-9025', status: 'excused', note: 'Có đơn xin nghỉ ốm' },
    { id: 6, name: 'Vũ Thị Hoa', code: 'VAT-9026', status: 'present', note: '' },
    { id: 7, name: 'Hoàng Anh Đức', code: 'VAT-9027', status: 'present', note: '' },
    { id: 8, name: 'Bùi Ngọc Lan', code: 'VAT-9028', status: 'present', note: '' },
];

export const Dashboard = memo(function Dashboard({ user, summary, classes, onNavigate }: DashboardProps) {
    const isAdmin = user.role === 'admin';
    const isStudent = user.role === 'student';

    const [selectedDrawerClass, setSelectedDrawerClass] = useState<ClassItem | null>(null);

    // Interactive Modals State
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [showGradingModal, setShowGradingModal] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Attendance State
    const [attendanceList, setAttendanceList] = useState(sampleStudents);
    const [attendanceNote, setAttendanceNote] = useState('Bài học hôm nay: Đường tròn ngoại tiếp tam giác. Cả lớp tiếp thu tốt, Lê Hoàng Nam đi muộn 10 phút.');

    // Announcement State
    const [announcementClass, setAnnouncementClass] = useState('Hình Học 9 — CS1');
    const [announcementTitle, setAnnouncementTitle] = useState('Nộp bài tập phần Hình Học Không Gian trước 22:00 hôm nay');
    const [announcementContent, setAnnouncementContent] = useState('Chào các em, thầy đã tải lên tài liệu tham khảo cho bài học sáng nay. Các em vui lòng xem lại và hoàn thành bài tập số 3, 4 trang 45 trước 22h tối nay nhé.');
    const [announcementPriority, setAnnouncementPriority] = useState('important');

    // Grading State
    const [gradingScore, setGradingScore] = useState('9.5');
    const [gradingFeedback, setGradingFeedback] = useState('Bài làm xuất sắc! Lập luận chứng minh đường tròn ngoại tiếp rất rõ ràng. Cần chú ý rút gọn biểu thức ở câu 4b.');

    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    if (isStudent) {
        return <StudentDashboard user={user} summary={summary} classes={classes} onNavigate={onNavigate} />;
    }

    const cards = isAdmin
        ? [
            ['Tổng số lớp học', summary.classes, BookIcon, '+12% so với tháng trước'],
            ['Giáo viên', summary.teachers, UsersIcon, '100% hoạt động'],
            ['Học sinh', summary.students, UsersIcon, '+24 học sinh mới'],
            ['Cảnh báo học phí', summary.tuition_alerts, WalletIcon, '2 trường hợp cần xử lý'],
        ]
        : [
            ['Lớp phụ trách', summary.my_classes || 4, BookIcon, '+1 lớp kỳ này'],
            ['Tổng Học sinh', summary.students || 128, UsersIcon, '100% tài khoản hoạt động'],
            ['Buổi dạy tuần này', summary.week_sessions || 12, CalendarIcon, 'Hoàn thành 4/12 buổi'],
            ['Bài tập cần chấm', summary.pending_grades || 5, CheckIcon, 'Cần xử lý trong 24h'],
        ];

    const activeClasses = classes.filter((c) => c.status !== 'completed' && c.status !== 'canceled');

    const todaySchedule = [
        { id: 101, code: 'HH9-CS1', name: 'Hình Học 9 — Cơ sở 1', time: '08:00 - 09:30', room: 'Phòng A204', status: 'ongoing', statusText: 'Đang diễn ra' },
        { id: 102, code: 'DS10-CS1', name: 'Đại Số 10 — Cơ sở 1', time: '10:00 - 11:30', room: 'Phòng A205', status: 'upcoming', statusText: 'Sắp diễn ra' },
        { id: 103, code: 'TA-CB', name: 'Tiếng Anh Giao Tiếp', time: '14:00 - 15:30', room: 'Phòng B102', status: 'upcoming', statusText: 'Chiều nay' },
    ];

    return (
        <div className="grid gap-6">
            {/* Toast Notification */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-5 right-5 z-[200] flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-600 px-4 py-3 text-white shadow-xl"
                    >
                        <CheckIcon size={20} />
                        <span className="text-sm font-semibold">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <section className="relative overflow-hidden rounded-[32px] border border-[var(--color-primary-border)] bg-[var(--color-card)] shadow-lg">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-primary-soft),transparent_34%),linear-gradient(135deg,var(--color-primary-subtle),transparent_46%)]" />
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--color-primary)]/10 blur-2xl" />
                <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-primary-hover)] to-transparent" />

                <div className="relative grid gap-6 p-5 sm:p-7 xl:grid-cols-[1.35fr_0.65fr] xl:items-stretch">
                    <div className="flex flex-col justify-between gap-6">
                        <div>
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-primary-border)] bg-[var(--color-card)]/75 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-primary)] shadow-xs backdrop-blur">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" />
                                Học kỳ I • Trực tuyến ổn định
                            </div>
                            <h1 className="max-w-3xl text-3xl font-black leading-[1.05] tracking-[-0.045em] text-[var(--color-text)] sm:text-5xl">
                                Xin chào, {user.full_name || user.username}
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)] sm:text-base">
                                Bảng tổng quan được tối ưu theo luồng hành vi: việc cần làm trước, lớp đang dạy tiếp theo và dữ liệu quan trọng được đặt trong vùng mắt dễ quét.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <button
                                type="button"
                                onClick={() => setShowAttendanceModal(true)}
                                className="group min-h-24 rounded-3xl border border-[var(--color-primary-border)] bg-[var(--color-primary)] p-4 text-left text-white shadow-[var(--shadow-primary)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:translate-y-0"
                            >
                                <span className="mb-3 grid h-9 w-9 place-items-center rounded-2xl bg-white/18"><CheckIcon size={17} /></span>
                                <span className="block text-sm font-black">Điểm danh nhanh</span>
                                <span className="mt-1 block text-xs text-white/80">Mở danh sách có sẵn</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAnnouncementModal(true)}
                                className="group min-h-24 rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)]/80 p-4 text-left shadow-xs backdrop-blur transition hover:-translate-y-0.5 hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-soft)] active:translate-y-0"
                            >
                                <span className="mb-3 grid h-9 w-9 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><BellIcon size={17} /></span>
                                <span className="block text-sm font-black text-[var(--color-text)]">Tạo thông báo</span>
                                <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">Form đã có dữ liệu mẫu</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowGradingModal(true)}
                                className="group min-h-24 rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)]/80 p-4 text-left shadow-xs backdrop-blur transition hover:-translate-y-0.5 hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-soft)] active:translate-y-0"
                            >
                                <span className="mb-3 grid h-9 w-9 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><FileIcon size={17} /></span>
                                <span className="block text-sm font-black text-[var(--color-text)]">Chấm bài nhanh</span>
                                <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">Xử lý bài ưu tiên</span>
                            </button>
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)]/82 p-4 shadow-sm backdrop-blur">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Ca tiếp theo</p>
                                <h3 className="mt-1 text-lg font-black text-[var(--color-text)]">{todaySchedule[0]?.name}</h3>
                            </div>
                            <Badge tone="success">Sẵn sàng</Badge>
                        </div>
                        <div className="grid gap-3">
                            <div className="rounded-2xl bg-[var(--color-bg-soft)] p-3">
                                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                                    <span className="inline-flex items-center gap-1.5"><ClockIcon size={13} /> {todaySchedule[0]?.time}</span>
                                    <span className="font-bold text-[var(--color-primary)]">{todaySchedule[0]?.room}</span>
                                </div>
                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                                    <div className="h-full w-[72%] rounded-full bg-[var(--color-primary)]" />
                                </div>
                                <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">72% nội dung buổi học đã được chuẩn bị</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-[var(--color-border)] p-3">
                                    <p className="text-2xl font-black text-[var(--color-text)]">{summary.students || 128}</p>
                                    <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">Học viên theo dõi</p>
                                </div>
                                <div className="rounded-2xl border border-[var(--color-border)] p-3">
                                    <p className="text-2xl font-black text-[var(--color-text)]">{summary.pending_grades || 5}</p>
                                    <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">Bài cần chấm</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(([label, value, Icon, trend], index) => (
                    <div
                        key={index}
                        className="group relative overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-[var(--color-primary-border)] hover:shadow-lg"
                    >
                        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--color-primary-soft)] opacity-70 transition group-hover:scale-125" />
                        <div className="relative flex items-start justify-between gap-3">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] transition group-hover:bg-[var(--color-primary)] group-hover:text-white">
                                {/* @ts-ignore */}
                                <Icon size={20} />
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                <TrendIcon size={10} /> {trend as string}
                            </span>
                        </div>
                        <p className="relative mt-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{label as string}</p>
                        <b className="relative mt-1 block text-3xl font-black tracking-[-0.04em] text-[var(--color-text)]">{value as ReactNode}</b>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
                <div className="grid gap-6">
                    <Panel
                        title="Timeline giảng dạy hôm nay"
                        subtitle="Ưu tiên hành động theo thời gian thực"
                        action={<Button size="sm" onClick={() => onNavigate?.('schedule')}>Xem lịch</Button>}
                    >
                        <div className="relative grid gap-3 before:absolute before:left-5 before:top-5 before:h-[calc(100%-2.5rem)] before:w-px before:bg-[var(--color-border)]">
                            {todaySchedule.map((s, index) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setShowAttendanceModal(true)}
                                    className="group relative grid gap-3 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--color-primary-border)] hover:bg-[var(--color-card)] hover:shadow-md sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-4"
                                >
                                    <span className={`relative z-10 grid h-10 w-10 place-items-center rounded-2xl text-xs font-black ${index === 0 ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'}`}>
                                        {index + 1}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-black text-[var(--color-text)]">{s.name}</span>
                                        <span className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--color-text-secondary)]">
                                            <span className="inline-flex items-center gap-1"><ClockIcon size={13} /> {s.time}</span>
                                            <span className="inline-flex items-center gap-1"><BookIcon size={13} /> {s.room}</span>
                                        </span>
                                    </span>
                                    <span className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3 sm:border-t-0 sm:pt-0">
                                        <Badge tone={s.status === 'ongoing' ? 'success' : 'info'} size="md">{s.statusText}</Badge>
                                        <span className="rounded-xl bg-[var(--color-primary-soft)] px-3 py-2 text-xs font-black text-[var(--color-primary)] transition group-hover:bg-[var(--color-primary)] group-hover:text-white">Mở</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </Panel>

                    <Panel
                        title="Lớp học phụ trách"
                        subtitle="Thẻ lớp giàu thông tin, dễ chạm trên di động"
                        action={<Button size="sm" onClick={() => onNavigate?.('classes')}>Tất cả lớp</Button>}
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            {activeClasses.length > 0 ? (
                                activeClasses.slice(0, 4).map((item, index) => (
                                    <article
                                        key={item.id}
                                        onClick={() => setSelectedDrawerClass(item)}
                                        className="group cursor-pointer overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs transition hover:-translate-y-0.5 hover:border-[var(--color-primary-border)] hover:shadow-lg"
                                    >
                                        <div className="relative min-h-24 p-4" style={{ background: 'linear-gradient(135deg, var(--color-primary-soft), transparent)' }}>
                                            <div className="absolute right-4 top-4 rounded-full bg-[var(--color-card)]/80 px-2.5 py-1 text-[10px] font-black text-[var(--color-primary)] shadow-xs">#{index + 1}</div>
                                            <Badge tone="neutral" size="sm">{item.code}</Badge>
                                            <h3 className="mt-3 line-clamp-1 text-lg font-black tracking-[-0.02em] text-[var(--color-text)] group-hover:text-[var(--color-primary)]">{item.name}</h3>
                                            <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">{item.subject}</p>
                                        </div>
                                        <div className="grid gap-3 p-4">
                                            <div className="flex items-center justify-between gap-3 text-xs">
                                                <span className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]"><CalendarIcon size={14} /> {item.schedule || 'Thứ 2, 4, 6'}</span>
                                                <span className="font-mono font-black text-[var(--color-primary)]">{item.class_hours || '18:30 - 20:30'}</span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-2xl bg-[var(--color-bg-soft)] p-3">
                                                <span className="text-xs font-bold text-[var(--color-text)]">{item.location || 'Cơ sở chính'}</span>
                                                <span className="inline-flex items-center gap-1 text-xs font-black text-[var(--color-text)]"><UsersIcon size={14} /> {item.student_count || 32} HV</span>
                                            </div>
                                        </div>
                                    </article>
                                ))
                            ) : (
                                <div className="md:col-span-2">
                                    <Skeleton variant="rectangular" className="mb-4 h-32" />
                                    <Skeleton variant="rectangular" className="h-32" />
                                </div>
                            )}
                        </div>
                    </Panel>
                </div>

                <div className="grid gap-6 content-start">
                    <div className="overflow-hidden rounded-[28px] border border-amber-200 bg-amber-50 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/30">
                        <div className="p-5">
                            <div className="mb-4 flex items-start gap-3">
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200"><CheckIcon size={20} /></span>
                                <div>
                                    <h3 className="text-base font-black text-amber-950 dark:text-amber-100">Cần hoàn tất điểm danh</h3>
                                    <p className="mt-1 text-xs leading-5 text-amber-800/80 dark:text-amber-100/75">Ca dạy <b>Hình Học 9 — Cơ sở 1</b> vừa kết thúc. Chốt sĩ số giúp báo cáo chính xác hơn.</p>
                                </div>
                            </div>
                            <PrimaryButton size="sm" onClick={() => setShowAttendanceModal(true)} className="w-full">Mở bảng điểm danh</PrimaryButton>
                        </div>
                    </div>

                    <Panel title="Bài tập chờ chấm" subtitle="Ưu tiên theo thời điểm nộp" action={<Badge tone="primary">5 bài</Badge>}>
                        <div className="grid gap-3">
                            {[
                                ['Nguyễn Văn An', 'Hình học', 'Nộp lúc 07:45 sáng nay'],
                                ['Trần Thị Bích', 'Đại số', 'Nộp lúc 22:15 hôm qua'],
                            ].map(([name, subject, time]) => (
                                <div key={name} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-black text-[var(--color-text)]">{name} — {subject}</p>
                                        <span className="text-[10px] text-[var(--color-text-muted)]">{time}</span>
                                    </div>
                                    <Button size="sm" onClick={() => setShowGradingModal(true)}>Chấm</Button>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    <Panel title="Thông báo hệ thống" subtitle="Thông tin cần nắm trong ngày">
                        <div className="grid gap-3">
                            {[
                                ['Nhập điểm thi giữa kỳ', 'Hạn cuối nhập điểm thi là ngày 25/10/2026.', '2 giờ trước', true],
                                ['Cập nhật lịch phòng học A204', 'Phòng A204 đã được bổ sung thiết bị máy chiếu mới.', '1 ngày trước', false],
                            ].map(([title, desc, time, active]) => (
                                <div key={title as string} className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 pl-4">
                                    <span className={`absolute left-0 top-4 h-8 w-1 rounded-r-full ${active ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
                                    <h4 className="text-xs font-black text-[var(--color-text)]">{title as string}</h4>
                                    <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{desc as string}</p>
                                    <span className="mt-2 block text-[10px] font-semibold text-[var(--color-text-muted)]">{time as string}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </div>

            {/* ─── MODAL 1: Điểm danh nhanh (Pre-populated Data) ─── */}
            {showAttendanceModal && (
                <div className="fixed inset-0 z-[150] grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-primary-soft)] px-6 py-4">
                            <div className="flex items-center gap-3">
                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-primary)] text-white">
                                    <CheckIcon size={18} />
                                </span>
                                <div>
                                    <h3 className="text-base font-extrabold text-[var(--color-text)]">Điểm danh nhanh: Hình Học 9 — Cơ sở 1</h3>
                                    <p className="text-xs text-[var(--color-text-secondary)]">Ca dạy 08:00 - 09:30 | Sĩ số: 8/8 học viên</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAttendanceModal(false)}
                                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>

                        {/* Roster Table */}
                        <div className="max-h-[50vh] overflow-y-auto p-6 space-y-3">
                            {attendanceList.map((st) => (
                                <div key={st.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                                    <div>
                                        <b className="text-sm text-[var(--color-text)]">{st.name}</b>
                                        <span className="ml-2 text-xs font-mono text-[var(--color-text-muted)]">({st.code})</span>
                                        {st.note && <p className="text-xs text-amber-600 font-medium mt-0.5">⚠️ {st.note}</p>}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {(['present', 'late', 'excused', 'absent'] as const).map((mode) => {
                                            const labels = { present: 'Có mặt', late: 'Muộn', excused: 'Có phép', absent: 'Vắng' };
                                            const colors = {
                                                present: st.status === 'present' ? 'bg-emerald-600 text-white' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]',
                                                late: st.status === 'late' ? 'bg-amber-500 text-white' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]',
                                                excused: st.status === 'excused' ? 'bg-blue-600 text-white' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]',
                                                absent: st.status === 'absent' ? 'bg-rose-600 text-white' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]',
                                            };
                                            return (
                                                <button
                                                    key={mode}
                                                    type="button"
                                                    onClick={() => {
                                                        setAttendanceList(attendanceList.map((item) => (item.id === st.id ? { ...item, status: mode } : item)));
                                                    }}
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${colors[mode]}`}
                                                >
                                                    {labels[mode]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            <div className="mt-4">
                                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">Ghi chú chung buổi học</label>
                                <textarea
                                    rows={2}
                                    value={attendanceNote}
                                    onChange={(e) => setAttendanceNote(e.target.value)}
                                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                />
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] p-4 bg-[var(--color-bg-soft)]">
                            <Button onClick={() => setShowAttendanceModal(false)}>Hủy</Button>
                            <PrimaryButton
                                onClick={() => {
                                    setShowAttendanceModal(false);
                                    triggerToast('Đã chốt điểm danh lớp Hình Học 9 — CS1 (8/8)');
                                }}
                            >
                                Lưu điểm danh (8/8)
                            </PrimaryButton>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ─── MODAL 2: Tạo thông báo nhanh (Pre-populated Data) ─── */}
            {showAnnouncementModal && (
                <div className="fixed inset-0 z-[150] grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-primary-soft)] px-6 py-4">
                            <div className="flex items-center gap-3">
                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-primary)] text-white">
                                    <BellIcon size={18} />
                                </span>
                                <div>
                                    <h3 className="text-base font-extrabold text-[var(--color-text)]">Gửi thông báo lớp học</h3>
                                    <p className="text-xs text-[var(--color-text-secondary)]">Thông báo sẽ được gửi tức thì đến ứng dụng học viên</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAnnouncementModal(false)} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]">
                                <XIcon size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">Gửi tới lớp</label>
                                <select
                                    value={announcementClass}
                                    onChange={(e) => setAnnouncementClass(e.target.value)}
                                    className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs font-semibold text-[var(--color-text)]"
                                >
                                    <option value="Hình Học 9 — CS1">Hình Học 9 — CS1</option>
                                    <option value="Đại Số 10 — CS1">Đại Số 10 — CS1</option>
                                    <option value="Tất cả các lớp">Tất cả các lớp phụ trách</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">Mức độ ưu tiên</label>
                                <select
                                    value={announcementPriority}
                                    onChange={(e) => setAnnouncementPriority(e.target.value)}
                                    className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs font-semibold text-[var(--color-text)]"
                                >
                                    <option value="important">🔴 Quan trọng (Thông báo nổi bật)</option>
                                    <option value="normal">🔵 Bình thường (Bảng tin chung)</option>
                                    <option value="urgent">⚡ Khẩn cấp (Gửi SMS & Email)</option>
                                </select>
                            </div>

                            <Field
                                label="Tiêu đề thông báo"
                                value={announcementTitle}
                                onChange={(e) => setAnnouncementTitle(e.target.value)}
                                required
                            />

                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">Nội dung chi tiết</label>
                                <textarea
                                    rows={4}
                                    value={announcementContent}
                                    onChange={(e) => setAnnouncementContent(e.target.value)}
                                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                />
                            </div>

                            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-xs text-[var(--color-text-secondary)]">
                                <FileIcon size={16} className="text-[var(--color-primary)] shrink-0" />
                                <span className="truncate font-semibold">Đính kèm: Tai_Lieu_Hinh_Hoc_Chuyen_De.pdf (1.2 MB)</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] p-4 bg-[var(--color-bg-soft)]">
                            <Button onClick={() => setShowAnnouncementModal(false)}>Hủy</Button>
                            <PrimaryButton
                                onClick={() => {
                                    setShowAnnouncementModal(false);
                                    triggerToast('Đã gửi thông báo tới các học viên lớp ' + announcementClass);
                                }}
                            >
                                Gửi thông báo ngay
                            </PrimaryButton>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ─── MODAL 3: Chấm bài nhanh (Pre-populated Data) ─── */}
            {showGradingModal && (
                <div className="fixed inset-0 z-[150] grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-primary-soft)] px-6 py-4">
                            <div className="flex items-center gap-3">
                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-primary)] text-white">
                                    <FileIcon size={18} />
                                </span>
                                <div>
                                    <h3 className="text-base font-extrabold text-[var(--color-text)]">Chấm bài: Nguyễn Văn An (VAT-9021)</h3>
                                    <p className="text-xs text-[var(--color-text-secondary)]">Bài kiểm tra giữa kỳ môn Hình Học 9</p>
                                </div>
                            </div>
                            <button onClick={() => setShowGradingModal(false)} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]">
                                <XIcon size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-xs">
                                <div className="flex items-center gap-2">
                                    <FileIcon size={16} className="text-red-600" />
                                    <b className="text-[var(--color-text)]">Bai_Lam_Nguyen_Van_An_De2.pdf</b>
                                </div>
                                <span className="text-[var(--color-text-muted)] font-mono">Nộp 07:45 AM</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">Điểm số (Thang điểm 10)</label>
                                <input
                                    type="text"
                                    value={gradingScore}
                                    onChange={(e) => setGradingScore(e.target.value)}
                                    className="h-11 w-32 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 font-extrabold text-lg text-[var(--color-primary)] outline-none focus:border-[var(--color-primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">Nhận xét của giáo viên</label>
                                <textarea
                                    rows={4}
                                    value={gradingFeedback}
                                    onChange={(e) => setGradingFeedback(e.target.value)}
                                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] p-4 bg-[var(--color-bg-soft)]">
                            <Button onClick={() => setShowGradingModal(false)}>Đóng</Button>
                            <PrimaryButton
                                onClick={() => {
                                    setShowGradingModal(false);
                                    triggerToast(`Đã lưu điểm ${gradingScore}/10 cho học sinh Nguyễn Văn An`);
                                }}
                            >
                                Lưu & Nộp điểm
                            </PrimaryButton>
                        </div>
                    </motion.div>
                </div>
            )}

            <ClassSideDrawer
                classItem={selectedDrawerClass}
                onClose={() => setSelectedDrawerClass(null)}
                user={user}
                onOpenModule={(mod) => {
                    if (onNavigate) onNavigate(mod);
                }}
            />
        </div>
    );
});
