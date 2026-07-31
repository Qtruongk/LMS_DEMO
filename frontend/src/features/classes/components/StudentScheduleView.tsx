import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarIcon, MapPinIcon, VideoIcon, FileIcon, InfoIcon } from '../../../components/shared/icons';
import { Badge, Panel, Button } from '../../../components/shared/ui';
import type { ClassItem, SessionItem } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../../../services/api';

type StudentScheduleViewProps = {
    classes: ClassItem[];
};

type StudentScheduleSession = SessionItem & {
    classRef?: ClassItem;
    title: string;
    type: 'online' | 'offline';
    room: string;
    dateLabel: string;
    timeLabel: string;
};

function getCurrentUserId() {
    try {
        const saved = localStorage.getItem('vat_user');
        return saved ? JSON.parse(saved).id : null;
    } catch {
        return null;
    }
}

function getDateLabel(value?: string) {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((startDate - startToday) / 86400000);
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Ngày mai';
    if (diffDays === -1) return 'Hôm qua';
    return date.toLocaleDateString('vi-VN');
}

function getTimeLabel(start?: string, end?: string) {
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) return 'Chưa cập nhật';
    const startText = startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (!endDate || Number.isNaN(endDate.getTime())) return startText;
    return `${startText} - ${endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

export const StudentScheduleView = memo(function StudentScheduleView({ classes }: StudentScheduleViewProps) {
    const [viewMode, setViewMode] = useState<'today' | 'week' | 'month' | 'agenda'>('agenda');
    const [selectedSession, setSelectedSession] = useState<StudentScheduleSession | null>(null);
    const [sessions, setSessions] = useState<StudentScheduleSession[]>([]);
    const [loading, setLoading] = useState(false);

    const loadSessions = useCallback(async () => {
        const userId = getCurrentUserId();
        if (!userId || classes.length === 0) {
            setSessions([]);
            return;
        }
        setLoading(true);
        try {
            const results = await Promise.all(classes.map(async (classItem) => {
                const response = await fetch(`${API_URL}/api/sessions/class/${classItem.id}`, {
                    headers: { 'Content-Type': 'application/json', 'x-user-id': String(userId) },
                });
                const data = await response.json();
                const classSessions = Array.isArray(data.sessions) ? data.sessions as SessionItem[] : [];
                return classSessions.map((session) => ({
                    ...session,
                    classRef: classItem,
                    title: session.title || classItem.name,
                    type: (classItem.location || '').toLowerCase().includes('zoom') || (classItem.location || '').toLowerCase().includes('online') ? 'online' as const : 'offline' as const,
                    room: classItem.location || 'Chưa cập nhật phòng học',
                    dateLabel: getDateLabel(session.start_time),
                    timeLabel: getTimeLabel(session.start_time, session.end_time),
                }));
            }));
            setSessions(results.flat().sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
        } catch (error) {
            console.error('Lỗi tải lịch học từ cơ sở dữ liệu:', error);
            setSessions([]);
        } finally {
            setLoading(false);
        }
    }, [classes]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const visibleSessions = useMemo(() => sessions.filter((session) => {
        const date = new Date(session.start_time);
        if (Number.isNaN(date.getTime())) return true;
        const now = new Date();
        const diffDays = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
        if (viewMode === 'today') return diffDays === 0;
        if (viewMode === 'week') return diffDays >= 0 && diffDays <= 7;
        if (viewMode === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        return true;
    }), [sessions, viewMode]);

    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <CalendarIcon size={20} />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-[var(--color-text)]">Lịch học của tôi</h2>
                        <p className="text-xs text-[var(--color-text-secondary)]">Dữ liệu lịch học lấy trực tiếp từ cơ sở dữ liệu lớp đã ghi danh</p>
                    </div>
                </div>

                <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-1">
                    {['today', 'week', 'month', 'agenda'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode as 'today' | 'week' | 'month' | 'agenda')}
                            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${viewMode === mode ? 'bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                                }`}
                        >
                            {mode === 'today' ? 'Hôm nay' : mode === 'week' ? 'Tuần' : mode === 'month' ? 'Tháng' : 'Danh sách'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <Panel>
                        <div className="py-10 text-center text-sm text-[var(--color-text-muted)]">Đang tải lịch học từ cơ sở dữ liệu...</div>
                    </Panel>
                ) : visibleSessions.length ? visibleSessions.map((session, index) => (
                    <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedSession(session)}
                        className="group cursor-pointer rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm transition hover:-translate-y-1 hover:border-[var(--color-primary-border)] hover:shadow-lg"
                    >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-[var(--color-bg-soft)] text-center">
                                    <span className="text-[10px] font-bold uppercase text-[var(--color-primary)]">{session.dateLabel}</span>
                                </div>
                                <div>
                                    <div className="mb-2 flex items-center gap-2">
                                        <Badge tone={session.status === 'completed' ? 'success' : 'info'}>{session.status === 'completed' ? 'Đã học' : 'Sắp học'}</Badge>
                                        <Badge tone="neutral">{session.type === 'online' ? 'Online' : 'Tại lớp'}</Badge>
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">{session.title}</h3>
                                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{session.classRef?.teacher_name || 'Giảng viên'} • {session.classRef?.subject || session.classRef?.name}</p>
                                </div>
                            </div>

                            <div className="grid gap-2 text-sm md:text-right">
                                <div className="flex items-center gap-2 font-bold text-[var(--color-text)] md:justify-end">
                                    <CalendarIcon size={16} className="text-[var(--color-text-muted)]" /> {session.dateLabel}
                                </div>
                                <div className="flex items-center gap-2 text-[var(--color-text-secondary)] md:justify-end">
                                    <MapPinIcon size={16} /> {session.room}
                                </div>
                                <div className="text-xs font-bold text-[var(--color-primary)]">{session.timeLabel}</div>
                            </div>
                        </div>
                    </motion.div>
                )) : (
                    <Panel>
                        <div className="py-10 text-center text-sm text-[var(--color-text-muted)]">Chưa có buổi học nào trong cơ sở dữ liệu cho bộ lọc hiện tại.</div>
                    </Panel>
                )}
            </div>

            <AnimatePresence>
                {selectedSession && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl sm:rounded-3xl"
                        >
                            <div className="bg-[var(--color-bg-soft)] p-6">
                                <div className="mb-4 flex items-start justify-between">
                                    <div>
                                        <Badge tone="info">{selectedSession.dateLabel}</Badge>
                                        <h3 className="mt-3 text-2xl font-black text-[var(--color-text)]">{selectedSession.title}</h3>
                                    </div>
                                    <button onClick={() => setSelectedSession(null)} className="rounded-full p-2 hover:bg-[var(--color-border)]">✕</button>
                                </div>
                                <p className="text-sm text-[var(--color-text-secondary)]">{selectedSession.description || 'Nội dung buổi học được cập nhật trong cơ sở dữ liệu.'}</p>
                            </div>

                            <div className="grid gap-5 p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-xl bg-[var(--color-bg-soft)] p-3">
                                        <p className="mb-1 text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Thời gian</p>
                                        <p className="text-sm font-bold">{selectedSession.timeLabel}</p>
                                    </div>
                                    <div className="rounded-xl bg-[var(--color-bg-soft)] p-3">
                                        <p className="mb-1 text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Địa điểm</p>
                                        <p className="text-sm font-bold">{selectedSession.room}</p>
                                    </div>
                                </div>

                                {selectedSession.type === 'online' && (
                                    <div>
                                        <h4 className="mb-3 text-sm font-bold">Link lớp học trực tuyến</h4>
                                        <Button className="w-full justify-center border-none bg-blue-600 text-white hover:bg-blue-700" leftIcon={<VideoIcon size={16} />}>Tham gia lớp online</Button>
                                    </div>
                                )}

                                <div>
                                    <h4 className="mb-3 text-sm font-bold">Ghi chú buổi học</h4>
                                    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] p-3 transition hover:border-blue-500">
                                        <InfoIcon size={20} className="text-blue-500" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold">{selectedSession.teacher_notes || 'Chưa có ghi chú từ giảng viên'}</p>
                                            <p className="text-[10px] text-[var(--color-text-secondary)]">Dữ liệu từ bảng buổi học</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="mb-3 text-sm font-bold">Tài liệu liên quan</h4>
                                    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] p-3 transition hover:border-blue-500">
                                        <FileIcon size={20} className="text-blue-500" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-bold">Xem trong mục Thư viện tài liệu</p>
                                            <p className="text-[10px] text-[var(--color-text-secondary)]">Tài liệu được lấy từ cơ sở dữ liệu theo lớp</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
});
