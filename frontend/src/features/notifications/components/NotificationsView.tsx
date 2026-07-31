import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PrimaryButton } from '../../../components/shared/ui';
import { XIcon, SearchIcon } from '../../../components/shared/icons';
import type { ClassItem, User, NotificationItem } from '../../../types';
import { API_URL } from '../../../services/api';
import { StudentAnnouncements } from './StudentAnnouncements';

type NotificationsViewProps = {
    user: User;
    classes: ClassItem[];
};

type NotificationPriority = 'normal' | 'important' | 'urgent';
type NotificationTab = 'all' | 'system' | 'class';

const priorityMeta: Record<NotificationPriority, { label: string; shortLabel: string; tone: string; dot: string; icon: string; helper: string }> = {
    normal: {
        label: 'Thông báo thường',
        shortLabel: 'Thường',
        tone: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200',
        dot: 'bg-slate-400',
        icon: '💬',
        helper: 'Thông tin nhắc nhẹ, không cần xử lý ngay',
    },
    important: {
        label: 'Quan trọng',
        shortLabel: 'Quan trọng',
        tone: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200',
        dot: 'bg-amber-500',
        icon: '⭐',
        helper: 'Cần học viên chú ý trong ngày',
    },
    urgent: {
        label: 'Khẩn cấp',
        shortLabel: 'Khẩn',
        tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/60 dark:bg-rose-950/30 dark:text-rose-200',
        dot: 'bg-rose-500',
        icon: '⚡',
        helper: 'Ưu tiên cao, cần phản hồi nhanh',
    },
};

const sampleTitles = [
    'Nhắc học viên chuẩn bị bài trước buổi học',
    'Cập nhật lịch học bù tuần này',
    'Yêu cầu nộp bài tập cuối chương',
    'Thông báo tài liệu mới đã được đăng',
];

function normalizePriority(priority?: string): NotificationPriority {
    if (priority === 'urgent' || priority === 'important' || priority === 'normal') return priority;
    return 'normal';
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
    return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function getRelativeTime(value?: string) {
    if (!value) return 'Vừa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Vừa cập nhật';

    const diffMs = Date.now() - date.getTime();
    const minutes = Math.max(0, Math.round(diffMs / 60000));
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;

    const days = Math.round(hours / 24);
    if (days < 7) return `${days} ngày trước`;

    return formatDateTime(value);
}

export function NotificationsView({ user, classes }: NotificationsViewProps) {
    const canManage = user.role === 'admin' || user.role === 'teacher';

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showPostModal, setShowPostModal] = useState<boolean>(false);
    const [alertMsg, setAlertMsg] = useState<string>('');
    const [activeTab, setActiveTab] = useState<NotificationTab>('all');
    const [priorityFilter, setPriorityFilter] = useState<'ALL' | NotificationPriority>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const headers = {
        'Content-Type': 'application/json',
        'x-user-id': String(user.id),
        'x-user-role': user.role,
    };

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/notifications`, { headers });
            const data = await res.json();
            setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        } catch (err) {
            console.error('Lỗi tải thông báo:', err);
        } finally {
            setLoading(false);
        }
    }, [user.id, user.role]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    if (user.role === 'student') {
        return <StudentAnnouncements classes={classes} userId={user.id} />;
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('Xóa thông báo này? Học viên sẽ không còn nhìn thấy nội dung này.')) return;
        try {
            await fetch(`${API_URL}/api/notifications/${id}`, { method: 'DELETE', headers });
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            setAlertMsg('Đã xóa thông báo thành công.');
            setTimeout(() => setAlertMsg(''), 2500);
        } catch (err) {
            console.error('Lỗi xóa thông báo:', err);
        }
    };

    const filteredNotifications = notifications.filter((n) => {
        const type = (n.type || (n.class_id ? 'class' : 'general')).toLowerCase();
        const priority = normalizePriority(n.priority);
        const query = searchQuery.trim().toLowerCase();
        const matchesTab = activeTab === 'all' || (activeTab === 'system' ? type !== 'class' : type === 'class');
        const matchesPriority = priorityFilter === 'ALL' || priority === priorityFilter;
        const matchesSearch = !query || [n.title, n.content, n.class_name, n.created_by_name, n.sender_name]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
        return matchesTab && matchesPriority && matchesSearch;
    });

    const urgentCount = notifications.filter((n) => normalizePriority(n.priority) === 'urgent').length;
    const classCount = notifications.filter((n) => (n.type || (n.class_id ? 'class' : 'general')).toLowerCase() === 'class').length;
    const systemCount = notifications.length - classCount;
    const latestNotification = notifications[0];

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 pb-24 md:pb-8">
            <section className="overflow-hidden rounded-[2rem] border border-red-100 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_48%,#f8fafc_100%)] shadow-[0_18px_45px_rgba(127,29,29,0.08)]">
                <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:p-7">
                    <div className="flex min-w-0 flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary-border)] bg-[var(--color-card)] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Trung tâm thông báo
                            </span>
                            <span className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                                {notifications.length} thông báo đang hiển thị
                            </span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] md:text-4xl">Thông báo dành cho giảng viên</h1>
                            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-secondary)]">
                                Không gian quản trị được tối ưu cho mắt nhìn: ưu tiên nội dung quan trọng, thao tác nhanh bằng một tay trên di động và biểu mẫu có gợi ý sẵn để đăng thông báo chính xác hơn.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <MetricCard label="Khẩn cấp" value={urgentCount} hint="Cần xử lý trước" tone="rose" />
                            <MetricCard label="Theo lớp" value={classCount} hint="Gửi đúng nhóm học" tone="blue" />
                            <MetricCard label="Hệ thống" value={systemCount} hint="Thông tin chung" tone="emerald" />
                        </div>
                    </div>

                    <div className="flex w-full flex-col justify-between gap-4 rounded-[1.5rem] border border-red-100 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] md:w-80">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Gợi ý thao tác</p>
                            <p className="mt-2 text-sm font-bold leading-6 text-[var(--color-text)]">
                                Đăng thông báo ngắn, mở đầu bằng hành động cần làm và chọn mức ưu tiên đúng để học viên dễ tiếp nhận.
                            </p>
                        </div>
                        {latestNotification ? (
                            <div className="rounded-2xl bg-[var(--color-bg-soft)] p-3">
                                <p className="text-[11px] font-bold text-[var(--color-text-muted)]">Mới nhất · {getRelativeTime(latestNotification.created_at)}</p>
                                <p className="mt-1 line-clamp-2 text-sm font-extrabold text-[var(--color-text)]">{latestNotification.title}</p>
                            </div>
                        ) : null}
                        {canManage && (
                            <PrimaryButton onClick={() => setShowPostModal(true)} className="h-12 w-full rounded-2xl bg-[var(--color-primary)] text-sm font-black shadow-lg shadow-red-900/15 hover:bg-[var(--color-primary-hover)]">
                                + Đăng thông báo mới
                            </PrimaryButton>
                        )}
                    </div>
                </div>
            </section>

            {alertMsg && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                    {alertMsg}
                </motion.div>
            )}

            <Panel className="sticky top-3 z-10 rounded-[1.5rem] border border-slate-200 bg-white/95 p-3 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur md:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0" role="tablist" aria-label="Lọc thông báo">
                        {[
                            { id: 'all', label: 'Tất cả', count: notifications.length },
                            { id: 'system', label: 'Hệ thống', count: systemCount },
                            { id: 'class', label: 'Lớp học', count: classCount },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as NotificationTab)}
                                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-extrabold transition ${activeTab === tab.id
                                    ? 'bg-[var(--color-primary)] text-white shadow-md shadow-red-900/15'
                                    : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]'
                                    }`}
                            >
                                {tab.label}
                                <span className={`rounded-full px-2 py-0.5 text-[11px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[var(--color-card)] text-[var(--color-text-muted)]'}`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[180px_1fr] lg:w-[520px]">
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value as 'ALL' | NotificationPriority)}
                            className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-bold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-border)]"
                            aria-label="Lọc theo mức ưu tiên"
                        >
                            <option value="ALL">Tất cả ưu tiên</option>
                            <option value="urgent">Khẩn cấp</option>
                            <option value="important">Quan trọng</option>
                            <option value="normal">Thông báo thường</option>
                        </select>
                        <div className="relative">
                            <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm tiêu đề, nội dung, lớp học..."
                                className="min-h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] pl-10 pr-3 text-sm font-semibold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-border)]"
                                aria-label="Tìm kiếm thông báo"
                            />
                        </div>
                    </div>
                </div>
            </Panel>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex flex-col gap-3">
                    {loading ? (
                        <LoadingSkeleton />
                    ) : filteredNotifications.length === 0 ? (
                        <EmptyState onCreate={() => setShowPostModal(true)} canManage={canManage} />
                    ) : (
                        filteredNotifications.map((notification, index) => (
                            <NotificationCard
                                key={notification.id}
                                item={notification}
                                index={index}
                                canManage={canManage}
                                onDelete={() => handleDelete(notification.id)}
                            />
                        ))
                    )}
                </div>

                <aside className="hidden xl:flex xl:flex-col xl:gap-4">
                    <Panel className="rounded-[1.5rem] p-5">
                        <h2 className="text-base font-black text-[var(--color-text)]">Chuẩn UX khi đăng</h2>
                        <div className="mt-4 space-y-3">
                            {Object.entries(priorityMeta).map(([key, meta]) => (
                                <div key={key} className={`rounded-2xl border p-3 ${meta.tone}`}>
                                    <div className="flex items-center gap-2 text-sm font-black"><span>{meta.icon}</span>{meta.label}</div>
                                    <p className="mt-1 text-xs font-semibold opacity-80">{meta.helper}</p>
                                </div>
                            ))}
                        </div>
                    </Panel>
                    <Panel className="rounded-[1.5rem] p-5">
                        <h2 className="text-base font-black text-[var(--color-text)]">Mẫu tiêu đề nhanh</h2>
                        <div className="mt-3 flex flex-col gap-2">
                            {sampleTitles.map((title) => (
                                <button
                                    key={title}
                                    onClick={() => setSearchQuery(title.split(' ')[0])}
                                    className="rounded-2xl bg-[var(--color-bg-soft)] p-3 text-left text-xs font-bold leading-5 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                                >
                                    {title}
                                </button>
                            ))}
                        </div>
                    </Panel>
                </aside>
            </div>

            <AnimatePresence>
                {showPostModal && (
                    <PostNotificationModal
                        user={user}
                        classes={classes}
                        onClose={() => setShowPostModal(false)}
                        onSuccess={() => {
                            setShowPostModal(false);
                            setAlertMsg('Đã đăng thông báo. Nội dung đã sẵn sàng cho học viên.');
                            setTimeout(() => setAlertMsg(''), 3000);
                            loadNotifications();
                        }}
                        headers={headers}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function MetricCard({ label, value, hint, tone }: { label: string; value: number; hint: string; tone: 'rose' | 'blue' | 'emerald' }) {
    const toneClass = {
        rose: 'border-rose-100 bg-rose-50/80 text-rose-700 shadow-rose-950/5',
        blue: 'border-sky-100 bg-sky-50/80 text-sky-700 shadow-sky-950/5',
        emerald: 'border-emerald-100 bg-emerald-50/80 text-emerald-700 shadow-emerald-950/5',
    }[tone];

    return (
        <div className={`rounded-2xl border ${toneClass} p-4 shadow-sm`}>
            <div className="text-2xl font-black tracking-[-0.04em]">{value}</div>
            <div className="mt-1 text-sm font-extrabold text-slate-900">{label}</div>
            <div className="text-xs font-semibold text-slate-600">{hint}</div>
        </div>
    );
}

function NotificationCard({ item, index, canManage, onDelete }: { item: NotificationItem; index: number; canManage: boolean; onDelete: () => void }) {
    const priority = normalizePriority(item.priority);
    const meta = priorityMeta[priority];
    const type = (item.type || (item.class_id ? 'class' : 'general')).toLowerCase();
    const author = item.created_by_name || item.sender_name || 'VAT Academy';

    return (
        <motion.article
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.035, 0.25) }}
            className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-[0_16px_36px_rgba(127,29,29,0.08)]"
        >
            <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr_auto] md:p-5">
                <div className="flex sm:block">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl ${meta.tone}`} aria-hidden="true">
                        {meta.icon}
                    </div>
                </div>

                <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${meta.tone}`}>
                            <span className={`h-2 w-2 rounded-full ${meta.dot}`} /> {meta.shortLabel}
                        </span>
                        <span className="rounded-full bg-[var(--color-bg-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-text-secondary)]">
                            {type === 'class' ? item.class_name || 'Theo lớp học' : 'Thông báo hệ thống'}
                        </span>
                        <span className="text-[11px] font-bold text-[var(--color-text-muted)]">{getRelativeTime(item.created_at)}</span>
                    </div>

                    <h3 className="text-lg font-black leading-snug tracking-[-0.02em] text-[var(--color-text)] md:text-xl">{item.title}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-[var(--color-text-secondary)]">{item.content}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--color-text-muted)]">
                        <span>Người đăng: {author}</span>
                        <span className="hidden h-1 w-1 rounded-full bg-[var(--color-border)] sm:inline-block" />
                        <span>{formatDateTime(item.created_at)}</span>
                    </div>
                </div>

                {canManage && (
                    <div className="flex items-start justify-end">
                        <button
                            onClick={onDelete}
                            className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-transparent px-3 text-xs font-black text-[var(--color-text-muted)] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-800 dark:hover:bg-rose-950/30"
                            aria-label={`Xóa thông báo ${item.title}`}
                        >
                            Xóa
                        </button>
                    </div>
                )}
            </div>
        </motion.article>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-3">
            {[0, 1, 2].map((item) => (
                <div key={item} className="animate-pulse rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-card)] p-5">
                    <div className="h-4 w-28 rounded-full bg-[var(--color-bg-soft)]" />
                    <div className="mt-4 h-6 w-2/3 rounded-full bg-[var(--color-bg-soft)]" />
                    <div className="mt-3 h-4 w-full rounded-full bg-[var(--color-bg-soft)]" />
                    <div className="mt-2 h-4 w-4/5 rounded-full bg-[var(--color-bg-soft)]" />
                </div>
            ))}
        </div>
    );
}

function EmptyState({ canManage, onCreate }: { canManage: boolean; onCreate: () => void }) {
    return (
        <div className="rounded-[1.5rem] border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[var(--color-primary-soft)] text-2xl">📭</div>
            <h3 className="mt-4 text-lg font-black text-[var(--color-text)]">Không tìm thấy thông báo phù hợp</h3>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[var(--color-text-secondary)]">
                Thử đổi bộ lọc hoặc tìm bằng từ khóa ngắn hơn. Thiết kế này giữ vùng đọc thoáng để mắt dễ quét nội dung chính.
            </p>
            {canManage && (
                <PrimaryButton onClick={onCreate} className="mt-5 rounded-2xl px-5 py-3 text-sm font-black">
                    Tạo thông báo mới
                </PrimaryButton>
            )}
        </div>
    );
}

function PostNotificationModal({
    user,
    classes,
    onClose,
    onSuccess,
    headers,
}: {
    user: User;
    classes: ClassItem[];
    onClose: () => void;
    onSuccess: () => void;
    headers: Record<string, string>;
}) {
    const [title, setTitle] = useState('Nhắc lịch học và bài chuẩn bị cho buổi tiếp theo');
    const [content, setContent] = useState('Các em vui lòng xem lại nội dung đã học, chuẩn bị câu hỏi thắc mắc và hoàn thành bài tập trước 20:00 hôm nay. Giảng viên sẽ kiểm tra nhanh ở đầu buổi học.');
    const [targetType, setTargetType] = useState<'all' | 'class'>('class');
    const [classId, setClassId] = useState<number>(classes[0]?.id ?? 0);
    const [priority, setPriority] = useState<NotificationPriority>('important');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const selectedPriority = priorityMeta[priority];
    const canSubmit = title.trim().length >= 8 && content.trim().length >= 20 && (targetType === 'all' || classId > 0);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmit) {
            setError('Vui lòng nhập tiêu đề tối thiểu 8 ký tự, nội dung tối thiểu 20 ký tự và chọn lớp nhận thông báo.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/notifications`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: title.trim(),
                    content: content.trim(),
                    priority,
                    type: targetType === 'class' ? 'class' : 'general',
                    receiver_type: targetType === 'all' ? 'all' : 'class',
                    receiver_ids: targetType === 'class' ? [classId] : [],
                    class_id: targetType === 'class' ? classId : null,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'Không thể tạo thông báo');
            }

            onSuccess();
        } catch (err) {
            console.error('Lỗi tạo thông báo:', err);
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo thông báo.');
        } finally {
            setLoading(false);
        }
    };

    const applyTemplate = (templateTitle: string) => {
        setTitle(templateTitle);
        setContent(`Kính gửi học viên,\n\n${templateTitle}. Các em vui lòng đọc kỹ nội dung, thực hiện đúng thời hạn và phản hồi cho giảng viên nếu cần hỗ trợ.\n\nCảm ơn các em.`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                className="max-h-[94vh] w-full max-w-3xl overflow-hidden rounded-t-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl sm:rounded-[2rem]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="post-notification-title"
            >
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] p-5 sm:p-6">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--color-primary)]">Biểu mẫu thông minh</p>
                        <h2 id="post-notification-title" className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">Đăng thông báo mới</h2>
                        <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">Dữ liệu mẫu đã được điền sẵn để giảng viên chỉnh nhanh và gửi chính xác.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-card)] text-[var(--color-text-secondary)] transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Đóng form đăng thông báo"
                    >
                        <XIcon size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="max-h-[calc(94vh-112px)] overflow-y-auto p-5 sm:p-6">
                    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-black text-[var(--color-text)]">Tiêu đề <span className="text-rose-500">*</span></label>
                                <input
                                    required
                                    minLength={8}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-border)]"
                                    placeholder="VD: Nhắc lịch học và bài chuẩn bị"
                                />
                                <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">Nên bắt đầu bằng hành động: Nhắc, Cập nhật, Yêu cầu, Thông báo.</p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-black text-[var(--color-text)]">Nội dung chi tiết <span className="text-rose-500">*</span></label>
                                <textarea
                                    required
                                    minLength={20}
                                    rows={7}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full resize-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 text-sm font-medium leading-6 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-border)]"
                                    placeholder="Nhập nội dung rõ ràng: ai cần làm gì, thời hạn nào, phản hồi ở đâu..."
                                />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-black text-[var(--color-text)]">Đối tượng nhận</label>
                                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--color-bg-soft)] p-1">
                                        {[
                                            { id: 'class', label: 'Theo lớp' },
                                            { id: 'all', label: user.role === 'admin' ? 'Toàn hệ thống' : 'Tất cả' },
                                        ].map((option) => (
                                            <button
                                                type="button"
                                                key={option.id}
                                                onClick={() => setTargetType(option.id as 'all' | 'class')}
                                                className={`min-h-11 rounded-xl text-sm font-black transition ${targetType === option.id ? 'bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-black text-[var(--color-text)]">Lớp học</label>
                                    <select
                                        value={classId}
                                        onChange={(e) => setClassId(Number(e.target.value))}
                                        disabled={targetType === 'all'}
                                        className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition disabled:cursor-not-allowed disabled:opacity-55 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-border)]"
                                    >
                                        {classes.length === 0 ? <option value={0}>Chưa có lớp</option> : null}
                                        {classes.map((cls) => (
                                            <option key={cls.id} value={cls.id}>{cls.name} · {cls.code}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <aside className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-black text-[var(--color-text)]">Mức ưu tiên</label>
                                <div className="space-y-2">
                                    {(Object.keys(priorityMeta) as NotificationPriority[]).map((level) => {
                                        const meta = priorityMeta[level];
                                        return (
                                            <button
                                                type="button"
                                                key={level}
                                                onClick={() => setPriority(level)}
                                                className={`w-full rounded-2xl border p-3 text-left transition ${priority === level ? `${meta.tone} ring-2 ring-[var(--color-primary-border)]` : 'border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-soft)]'}`}
                                            >
                                                <div className="flex items-center gap-2 text-sm font-black"><span>{meta.icon}</span>{meta.label}</div>
                                                <p className="mt-1 text-xs font-semibold opacity-80">{meta.helper}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className={`rounded-2xl border p-4 ${selectedPriority.tone}`}>
                                <p className="text-xs font-extrabold uppercase tracking-[0.12em] opacity-80">Xem trước</p>
                                <h3 className="mt-2 line-clamp-2 text-sm font-black">{title || 'Tiêu đề thông báo'}</h3>
                                <p className="mt-2 line-clamp-4 text-xs font-semibold leading-5 opacity-80">{content || 'Nội dung thông báo sẽ hiển thị tại đây.'}</p>
                            </div>
                        </aside>
                    </div>

                    <div className="mt-5 rounded-2xl bg-[var(--color-bg-soft)] p-3">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Mẫu nhanh</p>
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                            {sampleTitles.map((template) => (
                                <button
                                    type="button"
                                    key={template}
                                    onClick={() => applyTemplate(template)}
                                    className="min-h-10 shrink-0 rounded-xl bg-[var(--color-card)] px-3 text-xs font-bold text-[var(--color-text-secondary)] shadow-sm transition hover:text-[var(--color-primary)]"
                                >
                                    {template}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}

                    <div className="sticky bottom-0 -mx-5 mt-6 flex flex-col-reverse gap-3 border-t border-[var(--color-border)] bg-[var(--color-card)] px-5 py-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
                        <button type="button" onClick={onClose} className="min-h-12 rounded-2xl px-5 text-sm font-black text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)]">Hủy</button>
                        <PrimaryButton disabled={loading || !canSubmit} type="submit" className="min-h-12 rounded-2xl px-6 text-sm font-black">
                            {loading ? 'Đang gửi...' : 'Đăng thông báo'}
                        </PrimaryButton>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
