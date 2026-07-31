import { memo, useState } from 'react';
import { CalendarIcon, MapPinIcon, VideoIcon, FileIcon, InfoIcon } from '../../../components/shared/icons';
import { Badge, Panel, Button } from '../../../components/shared/ui';
import type { ClassItem } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';

type StudentScheduleViewProps = {
    classes: ClassItem[];
};

export const StudentScheduleView = memo(function StudentScheduleView({ classes }: StudentScheduleViewProps) {
    const [viewMode, setViewMode] = useState<'today' | 'week' | 'month' | 'agenda'>('agenda');
    const [selectedSession, setSelectedSession] = useState<any>(null);

    // Mock sessions for demonstration
    const sessions = [
        { id: 1, title: 'Tiếng Anh Giao Tiếp', teacher: 'Nguyễn Văn A', room: 'Phòng 101', type: 'offline', time: '18:00 - 20:00', date: 'Hôm nay', status: 'upcoming', classRef: classes[0] },
        { id: 2, title: 'Đại số tuyến tính', teacher: 'Lê Thị B', room: 'Zoom Mtg', type: 'online', time: '09:00 - 11:00', date: 'Ngày mai', status: 'upcoming', classRef: classes[1] },
        { id: 3, title: 'Hóa học Hữu cơ', teacher: 'Trần Văn C', room: 'Phòng 202', type: 'offline', time: '14:00 - 16:00', date: 'Hôm qua', status: 'completed', classRef: classes[0] },
    ];

    return (
        <div className="grid gap-6">
            {/* Header Area */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <CalendarIcon size={20} />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-[var(--color-text)]">Lịch học của tôi</h2>
                        <p className="text-xs text-[var(--color-text-secondary)]">Xem chi tiết các ca học, sự kiện và phòng học</p>
                    </div>
                </div>

                <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-1">
                    {['today', 'week', 'month', 'agenda'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode as any)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                                viewMode === mode ? 'bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            {mode === 'today' ? 'Hôm nay' : mode === 'week' ? 'Tuần' : mode === 'month' ? 'Tháng' : 'Agenda'}
                        </button>
                    ))}
                </div>
            </div>

            <Panel title="Danh sách ca học" className="p-0">
                <div className="divide-y divide-[var(--color-border)]">
                    {sessions.map((session) => (
                        <div key={session.id} onClick={() => setSelectedSession(session)} className="flex items-start gap-4 p-4 hover:bg-[var(--color-bg-soft)] cursor-pointer transition">
                            <div className="flex flex-col items-center justify-center min-w-16">
                                <b className="text-sm font-black text-[var(--color-text)]">{session.time.split(' - ')[0]}</b>
                                <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">{session.date}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-bold text-[var(--color-text)]">{session.title}</h4>
                                    {session.type === 'online' ? <Badge tone="info" size="sm">Online</Badge> : <Badge tone="neutral" size="sm">Offline</Badge>}
                                    {session.status === 'completed' && <Badge tone="success" size="sm">Đã học</Badge>}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)] font-medium mt-1">
                                    <span className="flex items-center gap-1"><InfoIcon size={12} /> {session.teacher}</span>
                                    <span className="flex items-center gap-1"><MapPinIcon size={12} /> {session.room}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Panel>

            <AnimatePresence>
                {selectedSession && (
                    <SessionDrawer session={selectedSession} onClose={() => setSelectedSession(null)} />
                )}
            </AnimatePresence>
        </div>
    );
});

function SessionDrawer({ session, onClose }: { session: any, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-md h-full bg-[var(--color-card)] border-l border-[var(--color-border)] shadow-2xl flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)]">
                    <h3 className="text-base font-bold">Chi tiết ca học</h3>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--color-border)] rounded-full transition text-[var(--color-text-muted)]">
                        <CalendarIcon size={18} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 grid gap-6">
                    <div>
                        <div className="flex gap-2 mb-2">
                            {session.type === 'online' ? <Badge tone="info">Online</Badge> : <Badge tone="neutral">Offline</Badge>}
                            <Badge tone="success">{session.status === 'completed' ? 'Đã học' : 'Sắp tới'}</Badge>
                        </div>
                        <h2 className="text-2xl font-black mb-1 text-[var(--color-text)]">{session.title}</h2>
                        <p className="text-sm text-[var(--color-text-secondary)] font-medium">{session.date} • {session.time}</p>
                    </div>

                    <div className="grid gap-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)]">
                            <InfoIcon size={18} className="text-[var(--color-text-muted)]" />
                            <div>
                                <p className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">Giáo viên</p>
                                <p className="text-sm font-semibold">{session.teacher}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)]">
                            <MapPinIcon size={18} className="text-[var(--color-text-muted)]" />
                            <div>
                                <p className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">Phòng học</p>
                                <p className="text-sm font-semibold">{session.room}</p>
                            </div>
                        </div>
                    </div>

                    {session.type === 'online' && (
                        <div>
                            <h4 className="text-sm font-bold mb-3">Link lớp học trực tuyến</h4>
                            <Button className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white border-none" leftIcon={<VideoIcon size={16} />}>Tham gia Zoom</Button>
                        </div>
                    )}

                    <div>
                        <h4 className="text-sm font-bold mb-3">Tài liệu đính kèm</h4>
                        <div className="flex items-center gap-3 p-3 border border-[var(--color-border)] rounded-xl hover:border-blue-500 cursor-pointer transition">
                            <FileIcon size={20} className="text-blue-500" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">Slide_Bai_1.pdf</p>
                                <p className="text-[10px] text-[var(--color-text-secondary)]">2.4 MB</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
