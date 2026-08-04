import { memo, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarIcon, MessageIcon, SearchIcon, XIcon } from '../../../components/shared/icons';
import type { ClassItem, NotificationItem } from '../../../types';
import { API_URL } from '../../../services/api';

type StudentAnnouncementsProps = {
    classes: ClassItem[];
    userId: number;
};

type StudentFilter = 'all' | 'unread' | 'urgent' | 'class' | 'system';
type Priority = 'normal' | 'important' | 'urgent';

type QuickReply = {
    mood: string;
    message: string;
};

const priorityMeta: Record<Priority, { label: string; badge: string; card: string; dot: string; icon: string; helper: string }> = {
    urgent: {
        label: 'Khẩn cấp',
        badge: 'bg-rose-50 text-rose-700 ring-rose-200',
        card: 'border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 text-slate-900 shadow-rose-100/60',
        dot: 'bg-rose-500 shadow-rose-500/40',
        icon: '🚨',
        helper: 'Ưu tiên đọc ngay',
    },
    important: {
        label: 'Quan trọng',
        badge: 'bg-amber-50 text-amber-700 ring-amber-200',
        card: 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50 text-slate-900 shadow-amber-100/60',
        dot: 'bg-amber-500 shadow-amber-500/40',
        icon: '⭐',
        helper: 'Nên xử lý sớm',
    },
    normal: {
        label: 'Thông báo',
        badge: 'bg-sky-50 text-sky-700 ring-sky-200',
        card: 'border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 text-slate-900 shadow-sky-100/60',
        dot: 'bg-blue-500 shadow-blue-500/40',
        icon: '🔔',
        helper: 'Thông tin cần biết',
    },
};

const quickReplyTemplates = [
    'Em đã đọc thông báo và sẽ thực hiện đúng hướng dẫn.',
    'Em cần giáo viên hỗ trợ thêm về nội dung thông báo này.',
    'Em xác nhận đã nắm lịch và sẽ tham gia đúng giờ.',
];

function normalizePriority(value?: string): Priority {
    return value === 'urgent' || value === 'important' || value === 'normal' ? value : 'normal';
}

function getNotificationType(item: NotificationItem) {
    return (item.type || (item.class_id ? 'class' : 'general')).toLowerCase() === 'class' ? 'class' : 'system';
}

function formatDateTime(value: string) {
    return new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function relativeTime(value: string) {
    const diffMs = Date.now() - new Date(value).getTime();
    const minutes = Math.max(1, Math.round(diffMs / 60000));
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    return formatDateTime(value);
}

export const StudentAnnouncements = memo(function StudentAnnouncements({ userId }: StudentAnnouncementsProps) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<StudentFilter>('all');
    const [selected, setSelected] = useState<NotificationItem | null>(null);
    const [readIds, setReadIds] = useState<number[]>(() => {
        const saved = localStorage.getItem(`vat_student_read_notifications_${userId}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [likedIds, setLikedIds] = useState<number[]>(() => {
        const saved = localStorage.getItem(`vat_student_liked_notifications_${userId}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [quickReply, setQuickReply] = useState<QuickReply>({
        mood: 'Em đã hiểu nội dung',
        message: quickReplyTemplates[0],
    });
    const [sentReply, setSentReply] = useState('');

    useEffect(() => {
        localStorage.setItem(`vat_student_read_notifications_${userId}`, JSON.stringify(readIds));
    }, [readIds, userId]);

    useEffect(() => {
        localStorage.setItem(`vat_student_liked_notifications_${userId}`, JSON.stringify(likedIds));
    }, [likedIds, userId]);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/notifications`, {
                    headers: { 'x-user-id': String(userId), 'x-user-role': 'student' },
                });
                const data = await res.json();
                setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
            } catch (err) {
                console.error('Lỗi tải thông báo học sinh:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnnouncements();
    }, [userId]);

    const stats = useMemo(() => {
        const unread = notifications.filter((item) => !readIds.includes(item.id)).length;
        const urgent = notifications.filter((item) => normalizePriority(item.priority) === 'urgent').length;
        const classCount = notifications.filter((item) => getNotificationType(item) === 'class').length;
        const latest = notifications[0]?.created_at;
        return {
            unread,
            urgent,
            classCount,
            latest: latest ? relativeTime(latest) : 'Chưa có thông báo',
        };
    }, [notifications, readIds]);

    const filteredNotifications = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return notifications.filter((item) => {
            const priority = normalizePriority(item.priority);
            const type = getNotificationType(item);
            const isUnread = !readIds.includes(item.id);
            const matchesFilter =
                filter === 'all' ||
                (filter === 'unread' && isUnread) ||
                (filter === 'urgent' && priority === 'urgent') ||
                (filter === 'class' && type === 'class') ||
                (filter === 'system' && type === 'system');
            const matchesSearch = !query || [item.title, item.content, item.class_name, item.created_by_name, item.sender_name]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
            return matchesFilter && matchesSearch;
        });
    }, [filter, notifications, readIds, searchQuery]);

    const openDetail = (item: NotificationItem) => {
        setSelected(item);
        setSentReply('');
        setQuickReply({ mood: 'Em đã hiểu nội dung', message: quickReplyTemplates[0] });
        if (!readIds.includes(item.id)) {
            setReadIds((prev) => [...prev, item.id]);
        }
    };

    const markAllRead = () => {
        setReadIds((prev) => Array.from(new Set([...prev, ...notifications.map((item) => item.id)])));
    };

    const toggleLike = (id: number) => {
        setLikedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
    };

    const filterOptions: { id: StudentFilter; label: string; count: number }[] = [
        { id: 'all', label: 'Tất cả', count: notifications.length },
        { id: 'unread', label: 'Chưa đọc', count: stats.unread },
        { id: 'urgent', label: 'Khẩn cấp', count: stats.urgent },
        { id: 'class', label: 'Theo lớp', count: stats.classCount },
        { id: 'system', label: 'Hệ thống', count: notifications.length - stats.classCount },
    ];

    return (
        <div className="mx-auto grid w-full max-w-7xl gap-5 pb-24 md:pb-8">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/60 sm:p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="relative">
                        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Tìm thông báo, lớp học, giáo viên..."
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={markAllRead}
                        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                    >
                        Đánh dấu đã đọc tất cả
                    </button>
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {filterOptions.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setFilter(item.id)}
                            className={`min-h-11 shrink-0 rounded-2xl px-4 text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${filter === item.id
                                ? 'bg-sky-600 text-white shadow-sm shadow-sky-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                                }`}
                        >
                            {item.label} <span className="ml-1 opacity-80">({item.count})</span>
                        </button>
                    ))}
                </div>
            </section>

            {loading ? (
                <div className="grid gap-3">
                    {[0, 1, 2].map((item) => <SkeletonCard key={item} />)}
                </div>
            ) : filteredNotifications.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                    {filteredNotifications.map((item, index) => {
                        const priority = normalizePriority(item.priority);
                        const meta = priorityMeta[priority];
                        const isUnread = !readIds.includes(item.id);
                        const type = getNotificationType(item);
                        const isLiked = likedIds.includes(item.id);

                        return (
                            <motion.article
                                key={item.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(index * 0.04, 0.2) }}
                                className={`group overflow-hidden rounded-[1.75rem] border p-4 text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${priority === 'urgent'
                                    ? 'border-rose-200 shadow-rose-100/70'
                                    : priority === 'important'
                                        ? 'border-amber-200 shadow-amber-100/70'
                                        : 'border-sky-100 shadow-sky-100/70'
                                    }`}
                                style={{
                                    background: priority === 'urgent'
                                        ? 'linear-gradient(135deg, #fff7f7 0%, #ffffff 52%, #fff7ed 100%)'
                                        : priority === 'important'
                                            ? 'linear-gradient(135deg, #fffbeb 0%, #ffffff 52%, #fefce8 100%)'
                                            : 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 52%, #eef2ff 100%)',
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-xl ring-1 ring-slate-200 shadow-sm">
                                        {meta.icon}
                                        {isUnread && <span className={`absolute -right-1 -top-1 h-3 w-3 rounded-full shadow-lg ${meta.dot}`} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${meta.badge}`}>{meta.label}</span>
                                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                                                {type === 'class' ? item.class_name || 'Lớp học' : 'Hệ thống'}
                                            </span>
                                        </div>
                                        <h3 className="mt-3 line-clamp-2 text-base font-black leading-6 text-slate-950">{item.title}</h3>
                                        <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-600">{item.content}</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
                                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
                                        <span className="inline-flex items-center gap-1"><CalendarIcon size={13} /> {relativeTime(item.created_at)}</span>
                                        <span>•</span>
                                        <span>{item.created_by_name || item.sender_name || 'Trung tâm'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => toggleLike(item.id)}
                                            className={`h-10 rounded-2xl px-3 text-xs font-black transition ${isLiked ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-600'}`}
                                        >
                                            👍 {isLiked ? 'Đã thích' : 'Thích'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openDetail(item)}
                                            className="h-10 rounded-2xl bg-sky-600 px-4 text-xs font-black text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                        >
                                            Xem chi tiết
                                        </button>
                                    </div>
                                </div>
                            </motion.article>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-[2rem] border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center shadow-sm">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[var(--color-primary-soft)] text-3xl">📭</div>
                    <h3 className="mt-4 text-lg font-black text-[var(--color-text)]">Chưa có thông báo phù hợp</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">
                        Thử đổi bộ lọc hoặc xoá từ khoá tìm kiếm để xem toàn bộ thông báo của bạn.
                    </p>
                </div>
            )}

            <AnimatePresence>
                {selected && (
                    <NotificationDetailModal
                        item={selected}
                        liked={likedIds.includes(selected.id)}
                        quickReply={quickReply}
                        sentReply={sentReply}
                        onClose={() => setSelected(null)}
                        onLike={() => toggleLike(selected.id)}
                        onQuickReplyChange={setQuickReply}
                        onSendReply={() => setSentReply('Đã lưu phản hồi mẫu của bạn. Giáo viên có thể xem khi tính năng phản hồi được kết nối.')}
                    />
                )}
            </AnimatePresence>
        </div>
    );
});

function SkeletonCard() {
    return (
        <div className="animate-pulse rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
            <div className="flex gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[var(--color-bg-soft)]" />
                <div className="flex-1">
                    <div className="h-4 w-32 rounded-full bg-[var(--color-bg-soft)]" />
                    <div className="mt-4 h-5 w-2/3 rounded-full bg-[var(--color-bg-soft)]" />
                    <div className="mt-3 h-4 w-full rounded-full bg-[var(--color-bg-soft)]" />
                    <div className="mt-2 h-4 w-4/5 rounded-full bg-[var(--color-bg-soft)]" />
                </div>
            </div>
        </div>
    );
}

function NotificationDetailModal({
    item,
    liked,
    quickReply,
    sentReply,
    onClose,
    onLike,
    onQuickReplyChange,
    onSendReply,
}: {
    item: NotificationItem;
    liked: boolean;
    quickReply: QuickReply;
    sentReply: string;
    onClose: () => void;
    onLike: () => void;
    onQuickReplyChange: (value: QuickReply) => void;
    onSendReply: () => void;
}) {
    const priority = normalizePriority(item.priority);
    const meta = priorityMeta[priority];
    const type = getNotificationType(item);

    return (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" role="dialog" aria-modal="true">
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-2xl sm:max-w-3xl sm:rounded-[2rem] sm:p-6"
            >
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${meta.badge}`}>{meta.icon} {meta.label}</span>
                            <span className="rounded-full bg-[var(--color-bg-soft)] px-3 py-1 text-[11px] font-bold text-[var(--color-text-secondary)]">
                                {type === 'class' ? item.class_name || 'Thông báo lớp' : 'Thông báo hệ thống'}
                            </span>
                        </div>
                        <h3 className="mt-3 text-xl font-black leading-7 text-[var(--color-text)] sm:text-2xl">{item.title}</h3>
                        <p className="mt-2 text-xs font-bold text-[var(--color-text-muted)]">
                            {formatDateTime(item.created_at)} • {item.created_by_name || item.sender_name || 'Trung tâm'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--color-border)] text-[var(--color-text)] transition hover:bg-[var(--color-bg-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                        aria-label="Đóng thông báo"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_18rem]">
                    <div className="space-y-4">
                        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                            <b className="text-sm text-[var(--color-text)]">Nội dung thông báo</b>
                            <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-[var(--color-text-secondary)]">{item.content}</p>
                        </div>

                        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-100">
                            <b className="text-sm">Phản hồi nhanh có sẵn dữ liệu</b>
                            <div className="mt-3 grid gap-3">
                                <select
                                    value={quickReply.mood}
                                    onChange={(event) => onQuickReplyChange({ ...quickReply, mood: event.target.value })}
                                    className="h-11 rounded-2xl border border-blue-200 bg-white px-3 text-sm font-bold text-blue-950 outline-none focus:ring-2 focus:ring-blue-300 dark:border-blue-900 dark:bg-slate-950 dark:text-blue-100"
                                >
                                    <option>Em đã hiểu nội dung</option>
                                    <option>Em cần hỗ trợ thêm</option>
                                    <option>Em xác nhận sẽ tham gia</option>
                                </select>
                                <textarea
                                    value={quickReply.message}
                                    onChange={(event) => onQuickReplyChange({ ...quickReply, message: event.target.value })}
                                    rows={4}
                                    className="rounded-2xl border border-blue-200 bg-white p-3 text-sm font-semibold leading-6 text-blue-950 outline-none focus:ring-2 focus:ring-blue-300 dark:border-blue-900 dark:bg-slate-950 dark:text-blue-100"
                                />
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {quickReplyTemplates.map((template) => (
                                        <button
                                            key={template}
                                            type="button"
                                            onClick={() => onQuickReplyChange({ ...quickReply, message: template })}
                                            className="min-h-10 shrink-0 rounded-xl bg-white px-3 text-xs font-black text-blue-700 shadow-sm transition hover:bg-blue-100 dark:bg-slate-950 dark:text-blue-100 dark:hover:bg-blue-950"
                                        >
                                            {template.slice(0, 34)}...
                                        </button>
                                    ))}
                                </div>
                                {sentReply && <div className="rounded-2xl bg-emerald-100 p-3 text-xs font-black text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-100">{sentReply}</div>}
                            </div>
                        </div>
                    </div>

                    <aside className="space-y-3">
                        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                            <b className="text-sm text-[var(--color-text)]">Tóm tắt nhanh</b>
                            <div className="mt-3 grid gap-2 text-xs font-bold text-[var(--color-text-secondary)]">
                                <span>Ưu tiên: {meta.label}</span>
                                <span>Loại: {type === 'class' ? 'Theo lớp' : 'Hệ thống'}</span>
                                <span>Lớp: {item.class_name || 'Tất cả học sinh'}</span>
                                <span>Gợi ý: {meta.helper}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onLike}
                            className={`h-12 w-full rounded-2xl text-sm font-black transition ${liked ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-100' : 'bg-[var(--color-bg-soft)] text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]'}`}
                        >
                            👍 {liked ? 'Đã thích thông báo' : 'Thích thông báo'}
                        </button>
                        <button
                            type="button"
                            onClick={onSendReply}
                            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] text-sm font-black text-white transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-card)]"
                        >
                            <MessageIcon size={16} /> Gửi phản hồi mẫu
                        </button>
                    </aside>
                </div>
            </motion.div>
        </div>
    );
}
