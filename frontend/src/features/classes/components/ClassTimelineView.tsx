import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Panel, PrimaryButton } from '../../../components/shared/ui';
import { BellIcon, CalendarIcon, ChartIcon, CheckCircleIcon, ClockIcon, FileIcon, SearchIcon, XIcon } from '../../../components/shared/icons';
import type { ClassItem, SessionItem, User } from '../../../types';
import { API_URL } from '../../../services/api';

type ClassTimelineViewProps = {
    user: User;
    classes: ClassItem[];
    selectedClassId: number | null;
    setSelectedClassId: (id: number) => void;
};

type TimelineFilter = 'all' | 'upcoming' | 'done' | 'pinned';

type SessionForm = {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
};

const now = new Date();
const toInputDateTime = (date: Date) => {
    const cloned = new Date(date);
    cloned.setMinutes(cloned.getMinutes() - cloned.getTimezoneOffset());
    return cloned.toISOString().slice(0, 16);
};

const addDays = (days: number, hour = 19, minute = 30) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hour, minute, 0, 0);
    return date;
};

const demoSessions: SessionItem[] = [
    {
        id: 9101,
        title: 'Buổi 1: Khởi động lộ trình học cá nhân',
        description: 'Giới thiệu mục tiêu lớp học, kiểm tra đầu vào nhanh, thống nhất quy tắc tương tác và giao nhiệm vụ chuẩn bị cho buổi tiếp theo.',
        start_time: addDays(-5).toISOString(),
        end_time: addDays(-5, 21, 0).toISOString(),
        status: 'completed',
        teacher_notes: '3 học sinh cần hỗ trợ thêm phần nền tảng.',
    },
    {
        id: 9102,
        title: 'Buổi 2: Luyện tập trọng tâm và sửa lỗi thường gặp',
        description: 'Ôn lại phần kiến thức cốt lõi, chia nhóm luyện tập theo mức độ, giáo viên ghi chú các lỗi lặp lại để phản hồi cá nhân.',
        start_time: addDays(1).toISOString(),
        end_time: addDays(1, 21, 0).toISOString(),
        status: 'not_started',
        teacher_notes: 'Chuẩn bị phiếu bài tập mức cơ bản và nâng cao.',
    },
    {
        id: 9103,
        title: 'Buổi 3: Mini test và phản hồi tiến độ',
        description: 'Làm bài kiểm tra 20 phút, chấm nhanh theo nhóm năng lực, gửi nhận xét cho học sinh/phụ huynh ngay sau buổi học.',
        start_time: addDays(3).toISOString(),
        end_time: addDays(3, 21, 0).toISOString(),
        status: 'not_started',
        teacher_notes: 'Cần chuẩn bị rubric nhận xét ngắn gọn.',
    },
];

export function ClassTimelineView({ user, classes, selectedClassId, setSelectedClassId }: ClassTimelineViewProps) {
    const canManage = user.role === 'admin' || user.role === 'teacher';
    const effectiveClassId = selectedClassId ?? (classes[0]?.id || null);

    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingSession, setEditingSession] = useState<SessionItem | null>(null);
    const [focusedSession, setFocusedSession] = useState<SessionItem | null>(null);
    const [alertMsg, setAlertMsg] = useState('');
    const [filterType, setFilterType] = useState<TimelineFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [pinnedIds, setPinnedIds] = useState<number[]>([9102]);
    const [form, setForm] = useState<SessionForm>({
        title: 'Buổi học mới: Luyện tập trọng tâm theo nhóm năng lực',
        description: 'Mục tiêu: ôn phần kiến thức cốt lõi, giải 5 bài mẫu, ghi nhận học sinh cần hỗ trợ và gửi nhắc học tập sau buổi học.',
        start_time: toInputDateTime(addDays(1)),
        end_time: toInputDateTime(addDays(1, 21, 0)),
    });

    const loadSessions = useCallback(async (classId: number) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/sessions/class/${classId}`, {
                headers: { 'x-user-id': String(user.id) },
            });
            const data = await response.json();
            setSessions(data.sessions || []);
        } catch (error) {
            console.error('Error loading sessions:', error);
            setSessions([]);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        if (effectiveClassId) {
            if (!selectedClassId && classes[0]?.id) {
                setSelectedClassId(classes[0].id);
            }
            loadSessions(effectiveClassId);
        }
    }, [effectiveClassId, selectedClassId, classes, loadSessions, setSelectedClassId]);

    const selectedClass = classes.find((item) => item.id === effectiveClassId);
    const displaySessions = sessions.length ? sessions : demoSessions;

    const enrichedSessions = useMemo(() => displaySessions.map((session, index) => {
        const endDate = new Date(session.end_time || session.start_time);
        const isDone = session.status === 'completed' || endDate < new Date();
        const isPinned = pinnedIds.includes(session.id);
        return {
            ...session,
            isDone,
            isPinned,
            activityType: isDone ? 'Đã hoàn thành' : 'Sắp diễn ra',
            priority: isPinned ? 'Ưu tiên' : index === 0 ? 'Theo dõi' : 'Bình thường',
            completion: isDone ? 100 : [45, 60, 72, 85][index % 4],
        };
    }), [displaySessions, pinnedIds]);

    const filteredSessions = useMemo(() => enrichedSessions.filter((session) => {
        const keyword = searchQuery.trim().toLowerCase();
        const matchesSearch = !keyword || [session.title, session.description, session.teacher_notes, session.status].some((value) => value?.toLowerCase().includes(keyword));
        const matchesFilter = filterType === 'all'
            || (filterType === 'upcoming' && !session.isDone)
            || (filterType === 'done' && session.isDone)
            || (filterType === 'pinned' && session.isPinned);
        return matchesSearch && matchesFilter;
    }).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    }), [enrichedSessions, filterType, searchQuery]);

    const upcomingCount = enrichedSessions.filter((session) => !session.isDone).length;
    const doneCount = enrichedSessions.filter((session) => session.isDone).length;
    const pinnedCount = enrichedSessions.filter((session) => session.isPinned).length;
    const nextSession = enrichedSessions.find((session) => !session.isDone) ?? enrichedSessions[0];

    const togglePin = (id: number) => {
        setPinnedIds((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
    };

    const handleOpenModal = (session?: SessionItem) => {
        if (session) {
            setEditingSession(session);
            setForm({
                title: session.title,
                description: session.description || 'Nội dung buổi học, mục tiêu chính, bài tập và ghi chú phản hồi học sinh.',
                start_time: session.start_time ? toInputDateTime(new Date(session.start_time)) : toInputDateTime(addDays(1)),
                end_time: session.end_time ? toInputDateTime(new Date(session.end_time)) : toInputDateTime(addDays(1, 21, 0)),
            });
        } else {
            setEditingSession(null);
            setForm({
                title: 'Buổi học mới: Luyện tập trọng tâm theo nhóm năng lực',
                description: 'Mục tiêu: ôn phần kiến thức cốt lõi, giải 5 bài mẫu, ghi nhận học sinh cần hỗ trợ và gửi nhắc học tập sau buổi học.',
                start_time: toInputDateTime(addDays(1)),
                end_time: toInputDateTime(addDays(1, 21, 0)),
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!effectiveClassId) return;

        try {
            const method = editingSession ? 'PUT' : 'POST';
            const url = editingSession ? `${API_URL}/api/sessions/${editingSession.id}` : `${API_URL}/api/sessions`;
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(user.id),
                },
                body: JSON.stringify({
                    class_id: effectiveClassId,
                    ...form,
                    status: editingSession ? editingSession.status : 'not_started',
                }),
            });
            const data = await response.json();
            setAlertMsg(data.message || (editingSession ? 'Đã cập nhật timeline thành công!' : 'Đã thêm buổi học vào timeline!'));
            setTimeout(() => setAlertMsg(''), 3500);
            setShowModal(false);
            loadSessions(effectiveClassId);
        } catch (error) {
            console.error('Error saving session:', error);
            setAlertMsg('Không thể lưu buổi học. Vui lòng thử lại.');
        }
    };

    const requestDelete = (session: SessionItem) => {
        setFocusedSession(session);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!focusedSession) return;
        try {
            const response = await fetch(`${API_URL}/api/sessions/${focusedSession.id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': String(user.id) },
            });
            const data = await response.json();
            setAlertMsg(data.message || 'Đã xoá buổi học khỏi timeline');
            setTimeout(() => setAlertMsg(''), 3500);
            setShowDeleteModal(false);
            if (effectiveClassId) loadSessions(effectiveClassId);
        } catch (error) {
            console.error('Error deleting session:', error);
            setAlertMsg('Không thể xoá buổi học. Vui lòng thử lại.');
        }
    };

    const openDetail = (session: SessionItem) => {
        setFocusedSession(session);
        setShowDetailModal(true);
    };

    return (
        <div className="grid gap-4">
            {alertMsg && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-800 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                    <span>{alertMsg}</span>
                    <button type="button" onClick={() => setAlertMsg('')} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-emerald-800 transition hover:bg-white dark:bg-white/10 dark:text-emerald-100">×</button>
                </div>
            )}

            <section className="grid gap-4 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm lg:grid-cols-[1.2fr_0.8fr] lg:p-5">
                <div className="flex flex-col justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/10 text-xl font-black text-indigo-600">⏱</span>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">Timeline giảng viên</p>
                                <h2 className="text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">Lộ trình lớp học rõ ràng, dễ thao tác</h2>
                            </div>
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">Sắp xếp theo hành vi nhìn: chọn lớp ở đầu, chỉ số nhanh ở cạnh, bộ lọc và nút chính luôn dễ chạm trên di động.</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <select
                            value={effectiveClassId ?? ''}
                            onChange={(event) => setSelectedClassId(Number(event.target.value))}
                            className="min-h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm font-black text-slate-950 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-white dark:text-slate-950"
                        >
                            {classes.length ? classes.map((item) => (
                                <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                            )) : <option value="">Lớp demo - VAT-TL01</option>}
                        </select>
                        {canManage && (
                            <PrimaryButton type="button" onClick={() => handleOpenModal()} className="min-h-12 px-5 text-sm font-black">
                                + Thêm buổi học
                            </PrimaryButton>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <TimelineStat icon={<CalendarIcon size={18} />} label="Sắp học" value={upcomingCount} />
                    <TimelineStat icon={<CheckCircleIcon size={18} />} label="Đã xong" value={doneCount} />
                    <TimelineStat icon={<BellIcon size={18} />} label="Đã ghim" value={pinnedCount} />
                </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
                <Panel title="Điều khiển timeline" subtitle="Bộ lọc đặt gần ngón cái, giảm thao tác thừa trên mobile.">
                    <div className="grid gap-3">
                        <div className="relative">
                            <SearchIcon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                            <input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Tìm buổi học, ghi chú, nội dung..."
                                className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-white dark:text-slate-950"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { key: 'all', label: 'Tất cả' },
                                { key: 'upcoming', label: 'Sắp diễn ra' },
                                { key: 'done', label: 'Đã xong' },
                                { key: 'pinned', label: 'Đã ghim' },
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setFilterType(item.key as TimelineFilter)}
                                    className={`min-h-11 rounded-2xl border px-3 text-xs font-black transition ${filterType === item.key ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary)]' : 'border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-border)] hover:text-[var(--color-primary)]'}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        {nextSession && (
                            <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100">
                                <div className="flex items-center gap-2 text-sm font-black"><ClockIcon size={18} /> Việc tiếp theo</div>
                                <p className="mt-2 text-sm font-black">{nextSession.title}</p>
                                <p className="mt-1 text-xs leading-5 opacity-80">{new Date(nextSession.start_time).toLocaleString('vi-VN')} • {selectedClass?.name || 'Lớp đang chọn'}</p>
                            </div>
                        )}
                    </div>
                </Panel>

                <Panel title="Dòng thời gian lớp học" subtitle="Mỗi buổi học là một thẻ riêng, dễ quét mắt và có hành động nhanh.">
                    {loading ? (
                        <div className="grid gap-3">
                            {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-3xl bg-[var(--color-bg-soft)]" />)}
                        </div>
                    ) : filteredSessions.length ? (
                        <div className="relative grid gap-4 pl-4 sm:pl-8">
                            <div className="absolute bottom-5 left-2 top-5 w-px bg-gradient-to-b from-indigo-500 via-[var(--color-border)] to-transparent sm:left-4" />
                            {filteredSessions.map((session, index) => (
                                <motion.article
                                    key={session.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    className={`relative rounded-[1.75rem] border p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${session.isPinned ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border-[var(--color-border)] bg-[var(--color-card)]'}`}
                                >
                                    <span className={`absolute -left-[23px] top-7 h-4 w-4 rounded-full ring-4 ring-[var(--color-bg)] sm:-left-[31px] ${session.isDone ? 'bg-emerald-500' : 'bg-indigo-600'}`} />
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-black text-indigo-700">Buổi {index + 1}</span>
                                                <span className={`rounded-full px-3 py-1 text-[11px] font-black ${session.isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{session.activityType}</span>
                                                {session.isPinned && <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-700">Đã ghim</span>}
                                            </div>
                                            <h3 className="mt-3 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">{session.title}</h3>
                                            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{session.description || 'Chưa có nội dung mô tả buổi học.'}</p>
                                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                                <InfoPill icon={<CalendarIcon size={15} />} label="Bắt đầu" value={new Date(session.start_time).toLocaleString('vi-VN')} />
                                                <InfoPill icon={<ClockIcon size={15} />} label="Kết thúc" value={new Date(session.end_time).toLocaleTimeString('vi-VN')} />
                                                <InfoPill icon={<ChartIcon size={15} />} label="Tiến độ" value={`${session.completion}%`} />
                                            </div>
                                        </div>
                                        <div className="grid min-w-[160px] grid-cols-2 gap-2 lg:grid-cols-1">
                                            <button type="button" onClick={() => openDetail(session)} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-xs font-black text-[var(--color-text)] transition hover:border-[var(--color-primary-border)] hover:text-[var(--color-primary)]">Chi tiết</button>
                                            <button type="button" onClick={() => togglePin(session.id)} className="min-h-11 rounded-2xl border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-700 transition hover:bg-amber-100">{session.isPinned ? 'Bỏ ghim' : 'Ghim'}</button>
                                            {canManage && <button type="button" onClick={() => handleOpenModal(session)} className="min-h-11 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-100">Sửa</button>}
                                            {canManage && <button type="button" onClick={() => requestDelete(session)} className="min-h-11 rounded-2xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 transition hover:bg-red-100">Xoá</button>}
                                        </div>
                                    </div>
                                </motion.article>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] p-8 text-center">
                            <FileIcon size={36} className="mx-auto text-[var(--color-text-muted)]" />
                            <h3 className="mt-3 text-lg font-black text-[var(--color-text)]">Chưa có mục timeline phù hợp</h3>
                            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Hãy xoá bộ lọc hoặc thêm buổi học mới với dữ liệu mẫu có sẵn.</p>
                        </div>
                    )}
                </Panel>
            </div>

            <AnimatePresence>
                {showModal && (
                    <TimelinePopup title={editingSession ? 'Chỉnh sửa buổi học' : 'Thêm buổi học vào timeline'} onClose={() => setShowModal(false)}>
                        <form onSubmit={handleSubmit} className="grid gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-black text-slate-600">Tiêu đề buổi học <span className="text-red-500">*</span></label>
                                <input required type="text" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-black text-slate-600">Thời gian bắt đầu <span className="text-red-500">*</span></label>
                                    <input required type="datetime-local" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-black text-slate-600">Thời gian kết thúc <span className="text-red-500">*</span></label>
                                    <input required type="datetime-local" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-black text-slate-600">Nội dung / Mô tả <span className="text-red-500">*</span></label>
                                <textarea required rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                            </div>
                            <div className="grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2">
                                <button type="button" onClick={() => setShowModal(false)} className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-800 transition hover:bg-slate-100">Hủy</button>
                                <PrimaryButton type="submit" className="min-h-12 text-sm font-black">Lưu timeline</PrimaryButton>
                            </div>
                        </form>
                    </TimelinePopup>
                )}

                {showDetailModal && focusedSession && (
                    <TimelinePopup title="Chi tiết buổi học" onClose={() => setShowDetailModal(false)}>
                        <div className="grid gap-4">
                            <div className="rounded-3xl bg-indigo-50 p-4 text-indigo-950">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">{selectedClass?.name || 'Lớp đang chọn'}</p>
                                <h3 className="mt-1 text-2xl font-black tracking-[-0.03em]">{focusedSession.title}</h3>
                                <p className="mt-2 text-sm leading-6 opacity-80">{focusedSession.description}</p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <DetailCard title="Bắt đầu" value={new Date(focusedSession.start_time).toLocaleString('vi-VN')} />
                                <DetailCard title="Kết thúc" value={new Date(focusedSession.end_time).toLocaleString('vi-VN')} />
                                <DetailCard title="Ghi chú" value={focusedSession.teacher_notes || 'Chuẩn bị tài liệu và phản hồi sau buổi học.'} />
                            </div>
                            {canManage && <PrimaryButton type="button" onClick={() => { setShowDetailModal(false); handleOpenModal(focusedSession); }} className="min-h-12">Chỉnh sửa buổi học này</PrimaryButton>}
                        </div>
                    </TimelinePopup>
                )}

                {showDeleteModal && focusedSession && (
                    <TimelinePopup title="Xác nhận xoá timeline" onClose={() => setShowDeleteModal(false)}>
                        <div className="grid gap-4">
                            <p className="text-sm leading-6 text-slate-700">Bạn sắp xoá <b>{focusedSession.title}</b>. Thao tác này giúp giữ timeline gọn hơn nhưng không thể hoàn tác sau khi xác nhận.</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <button type="button" onClick={() => setShowDeleteModal(false)} className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-800">Giữ lại</button>
                                <button type="button" onClick={confirmDelete} className="min-h-12 rounded-2xl bg-red-600 px-5 text-sm font-black text-white shadow-lg shadow-red-600/20">Xoá buổi học</button>
                            </div>
                        </div>
                    </TimelinePopup>
                )}
            </AnimatePresence>
        </div>
    );
}

function TimelineStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">{icon}</div>
            <p className="text-2xl font-black text-[var(--color-text)]">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
        </div>
    );
}

function InfoPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-[var(--color-bg-soft)] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">{icon} {label}</p>
            <p className="mt-1 text-xs font-black text-[var(--color-text)]">{value}</p>
        </div>
    );
}

function DetailCard({ title, value }: { title: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-1 text-sm font-black leading-5 text-slate-950">{value}</p>
        </div>
    );
}

function TimelinePopup({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                initial={{ y: 28, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 28, opacity: 0, scale: 0.98 }}
                className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-[2rem] border border-slate-200 bg-white p-4 text-slate-950 shadow-2xl sm:p-6"
            >
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Popup thao tác nhanh</p>
                        <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">{title}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-950 transition hover:bg-slate-100" aria-label="Đóng popup">
                        <XIcon size={18} />
                    </button>
                </div>
                {children}
            </motion.div>
        </motion.div>
    );
}
