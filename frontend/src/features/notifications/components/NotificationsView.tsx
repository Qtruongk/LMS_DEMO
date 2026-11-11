import { useState, useEffect, useCallback, useRef, type ChangeEvent, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PrimaryButton } from '../../../components/shared/ui';
import { XIcon, SearchIcon, UploadIcon } from '../../../components/shared/icons';
import type { ClassItem, User, NotificationItem, NotificationAttachment } from '../../../types';
import { API_URL } from '../../../services/api';
import { StudentAnnouncements } from './StudentAnnouncements';
import {
    MAX_NOTIFICATION_ATTACHMENTS,
    MAX_NOTIFICATION_ATTACHMENT_SIZE,
    NotificationAttachmentList,
    RichNotificationContent,
    escapeHtml,
    formatFileSize,
    getNotificationAttachments,
    readFileAsNotificationAttachment,
    stripHtml,
} from './notificationContent';

type NotificationsViewProps = {
    user: User;
    classes: ClassItem[];
    selectedClassId?: number | null;
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

export function NotificationsView({ user, classes, selectedClassId }: NotificationsViewProps) {
    const canManage = user.role === 'admin' || user.role === 'owner' || user.role === 'teacher';

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showPostModal, setShowPostModal] = useState<boolean>(false);
    const [alertMsg, setAlertMsg] = useState<string>('');
    const [activeTab, setActiveTab] = useState<NotificationTab>(selectedClassId ? 'class' : 'all');
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
        const matchesSelectedClass = !selectedClassId || type !== 'class' || n.class_id === selectedClassId;
        const matchesPriority = priorityFilter === 'ALL' || priority === priorityFilter;
        const matchesSearch = !query || [n.title, stripHtml(n.content_html) || n.content, n.class_name, n.created_by_name, n.sender_name]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
        return matchesTab && matchesSelectedClass && matchesPriority && matchesSearch;
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
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <MetricCard label="Khẩn cấp" value={urgentCount} tone="rose" />
                            <MetricCard label="Theo lớp" value={classCount} tone="blue" />
                            <MetricCard label="Hệ thống" value={systemCount} tone="emerald" />
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
                                Thông báo mới
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
                        <h2 className="text-base font-black text-[var(--color-text)]">Mức độ ưu tiên</h2>
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
                        selectedClassId={selectedClassId}
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

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'rose' | 'blue' | 'emerald' }) {
    const toneClass = {
        rose: 'border-rose-100 bg-rose-50/80 text-rose-700 shadow-rose-950/5',
        blue: 'border-sky-100 bg-sky-50/80 text-sky-700 shadow-sky-950/5',
        emerald: 'border-emerald-100 bg-emerald-50/80 text-emerald-700 shadow-emerald-950/5',
    }[tone];

    return (
        <div className={`rounded-2xl border ${toneClass} p-4 shadow-sm`}>
            <div className="text-2xl font-black tracking-[-0.04em]">{value}</div>
            <div className="mt-1 text-sm font-extrabold text-slate-900">{label}</div>
        </div>
    );
}

function NotificationCard({ item, index, canManage, onDelete }: { item: NotificationItem; index: number; canManage: boolean; onDelete: () => void }) {
    const priority = normalizePriority(item.priority);
    const meta = priorityMeta[priority];
    const type = (item.type || (item.class_id ? 'class' : 'general')).toLowerCase();
    const author = item.created_by_name || item.sender_name || 'VAT Academy';
    const attachments = getNotificationAttachments(item);

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
                    <RichNotificationContent html={item.content_html} fallback={item.content} className="mt-2" />

                    {attachments.length > 0 && (
                        <div className="mt-4">
                            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Tệp đính kèm ({attachments.length})</p>
                            <NotificationAttachmentList attachments={attachments} compact />
                        </div>
                    )}

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
    selectedClassId,
    onClose,
    onSuccess,
    headers,
}: {
    user: User;
    classes: ClassItem[];
    selectedClassId?: number | null;
    onClose: () => void;
    onSuccess: () => void;
    headers: Record<string, string>;
}) {
    const starterContent = 'Các em vui lòng xem lại nội dung đã học, chuẩn bị câu hỏi thắc mắc và hoàn thành bài tập trước 20:00 hôm nay. Giảng viên sẽ kiểm tra nhanh ở đầu buổi học.';
    const [title, setTitle] = useState('Nhắc lịch học và bài chuẩn bị cho buổi tiếp theo');
    const [contentHtml, setContentHtml] = useState(() => textToEditorHtml(starterContent));
    const [targetType, setTargetType] = useState<'all' | 'class'>('class');
    const [classId, setClassId] = useState<number>(selectedClassId ?? classes[0]?.id ?? 0);
    const [priority, setPriority] = useState<NotificationPriority>('important');
    const [attachments, setAttachments] = useState<NotificationAttachment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const editorRef = useRef<HTMLDivElement | null>(null);

    const selectedPriority = priorityMeta[priority];
    const canUseGlobalTarget = user.role === 'admin' || user.role === 'owner';
    const plainContent = stripHtml(contentHtml);
    const canSubmit = title.trim().length >= 8 && plainContent.length >= 20 && (targetType === 'all' ? canUseGlobalTarget : classId > 0);

    function textToEditorHtml(text: string) {
        return text.split('\n').map((line) => line.trim() ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>').join('');
    }

    const syncEditorContent = (html: string) => {
        setContentHtml(html);
        if (editorRef.current) editorRef.current.innerHTML = html;
    };

    const runEditorCommand = (command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList') => {
        editorRef.current?.focus();
        document.execCommand(command, false);
        setContentHtml(editorRef.current?.innerHTML || '');
    };

    const handleRecipientChange = (value: string) => {
        if (value === 'all' && canUseGlobalTarget) {
            setTargetType('all');
            setClassId(0);
            return;
        }

        setTargetType('class');
        setClassId(Number(value));
    };

    const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (!files.length) return;

        const availableSlots = MAX_NOTIFICATION_ATTACHMENTS - attachments.length;
        if (availableSlots <= 0) {
            setError(`Chỉ có thể tải tối đa ${MAX_NOTIFICATION_ATTACHMENTS} tệp cho mỗi thông báo.`);
            return;
        }

        const oversized = files.find((file) => file.size > MAX_NOTIFICATION_ATTACHMENT_SIZE);
        if (oversized) {
            setError(`Tệp "${oversized.name}" vượt quá ${formatFileSize(MAX_NOTIFICATION_ATTACHMENT_SIZE)}.`);
            return;
        }

        try {
            const selectedFiles = files.slice(0, availableSlots);
            const uploadedFiles = await Promise.all(selectedFiles.map(readFileAsNotificationAttachment));
            setAttachments((current) => [...current, ...uploadedFiles]);
            setError(files.length > availableSlots ? `Đã thêm ${availableSlots} tệp đầu tiên. Mỗi thông báo tối đa ${MAX_NOTIFICATION_ATTACHMENTS} tệp.` : '');
        } catch (err) {
            console.error('Lỗi đọc tệp thông báo:', err);
            setError(err instanceof Error ? err.message : 'Không thể đọc tệp tải lên.');
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const normalizedContent = stripHtml(contentHtml);
        if (!canSubmit) {
            setError('Vui lòng chọn lớp học, nhập tiêu đề tối thiểu 8 ký tự và nội dung tối thiểu 20 ký tự.');
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
                    content: normalizedContent,
                    content_html: contentHtml,
                    attachments,
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
        const nextContent = `Kính gửi học viên,\n\n${templateTitle}. Các em vui lòng đọc kỹ nội dung, thực hiện đúng thời hạn và phản hồi cho giảng viên nếu cần hỗ trợ.\n\nCảm ơn các em.`;
        setTitle(templateTitle);
        syncEditorContent(textToEditorHtml(nextContent));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                className="max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-t-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl sm:rounded-[2rem]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="post-notification-title"
            >
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] bg-gradient-to-br from-red-50 via-white to-slate-50 p-5 sm:p-6 dark:from-red-950/20 dark:via-slate-950 dark:to-slate-900">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/80">Bảng tin giáo viên</p>
                        <h2 id="post-notification-title" className="mt-1 text-xl font-black tracking-[-0.03em] text-white sm:text-2xl">Thông báo mới</h2>
                        <p className="mt-1 text-sm font-semibold text-white/90">Chọn lớp nhận tin, soạn nội dung có định dạng cơ bản và đính kèm tệp nếu cần.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-card)] text-[var(--color-text-secondary)] shadow-sm transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Đóng form đăng thông báo"
                    >
                        <XIcon size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="max-h-[calc(94vh-112px)] overflow-y-auto p-5 sm:p-6">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
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
                                    <label className="mb-2 block text-sm font-black text-[var(--color-text)]">Dành cho <span className="text-rose-500">*</span></label>
                                    <select
                                        value={targetType === 'all' ? 'all' : classId || 0}
                                        onChange={(e) => handleRecipientChange(e.target.value)}
                                        className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-border)]"
                                    >
                                        {canUseGlobalTarget && <option value="all">Toàn hệ thống</option>}
                                        <option value={0} disabled>Chọn lớp học</option>
                                        {classes.map((cls) => (
                                            <option key={cls.id} value={cls.id}>{cls.name} · {cls.code}</option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">Giáo viên chỉ đăng cho lớp mình phụ trách.</p>
                                </div>
                            </div>

                            <div>
                                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                                    <label className="block text-sm font-black text-[var(--color-text)]">Nội dung thông báo <span className="text-rose-500">*</span></label>
                                    <span className={`text-xs font-black ${plainContent.length >= 20 ? 'text-emerald-600' : 'text-[var(--color-text-muted)]'}`}>{plainContent.length}/20 ký tự</span>
                                </div>
                                <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] transition focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary-border)]">
                                    <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)] p-2">
                                        {[
                                            { command: 'bold', label: 'B', title: 'In đậm' },
                                            { command: 'italic', label: 'I', title: 'In nghiêng' },
                                            { command: 'underline', label: 'U', title: 'Gạch chân' },
                                            { command: 'insertUnorderedList', label: '• Danh sách', title: 'Danh sách gạch đầu dòng' },
                                        ].map((button) => (
                                            <button
                                                key={button.command}
                                                type="button"
                                                title={button.title}
                                                onMouseDown={(event) => event.preventDefault()}
                                                onClick={() => runEditorCommand(button.command as 'bold' | 'italic' | 'underline' | 'insertUnorderedList')}
                                                className="min-h-9 rounded-xl px-3 text-xs font-black text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                                            >
                                                <span className={button.command === 'italic' ? 'italic' : button.command === 'underline' ? 'underline' : button.command === 'bold' ? 'font-black' : ''}>{button.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div
                                        ref={editorRef}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onInput={() => setContentHtml(editorRef.current?.innerHTML || '')}
                                        className="min-h-44 w-full p-4 text-sm font-medium leading-7 text-[var(--color-text)] outline-none empty:before:text-[var(--color-text-muted)]"
                                        data-placeholder="Nhập nội dung rõ ràng: ai cần làm gì, thời hạn nào, phản hồi ở đâu..."
                                        dangerouslySetInnerHTML={{ __html: contentHtml }}
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-black text-[var(--color-text)]">Tệp đính kèm</p>
                                        <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">Lưu trực tiếp vào cơ sở dữ liệu, tối đa {MAX_NOTIFICATION_ATTACHMENTS} tệp, mỗi tệp {formatFileSize(MAX_NOTIFICATION_ATTACHMENT_SIZE)}.</p>
                                    </div>
                                    <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 text-sm font-black text-white shadow-lg shadow-red-900/15 transition hover:bg-[var(--color-primary-hover)]">
                                        <UploadIcon size={17} /> Tải tệp lên
                                        <input type="file" multiple className="hidden" onChange={handleFiles} />
                                    </label>
                                </div>
                                {attachments.length > 0 && (
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        {attachments.map((attachment, index) => (
                                            <div key={attachment.id || `${attachment.name}-${index}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                                                    <UploadIcon size={17} />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-xs font-black text-[var(--color-text)]">{attachment.name}</span>
                                                    <span className="text-[11px] font-bold text-[var(--color-text-muted)]">{formatFileSize(attachment.size)}</span>
                                                </span>
                                                <button type="button" onClick={() => removeAttachment(index)} className="rounded-xl px-2 py-1 text-[11px] font-black text-rose-600 transition hover:bg-rose-50">Xóa</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                                <p className="mt-2 line-clamp-4 text-xs font-semibold leading-5 opacity-80">{plainContent || 'Nội dung thông báo sẽ hiển thị tại đây.'}</p>
                                {attachments.length > 0 && <p className="mt-3 text-xs font-black opacity-90">📎 {attachments.length} tệp đính kèm</p>}
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
                            {loading ? 'Đang gửi...' : 'Đăng lên'}
                        </PrimaryButton>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
