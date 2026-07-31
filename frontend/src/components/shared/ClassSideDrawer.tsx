import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, UsersIcon, CheckIcon, FileIcon, CalendarIcon, BellIcon } from './icons';
import type { ClassItem, User, Material, SessionItem } from '../../types';
import { API_URL } from '../../services/api';

type ClassSideDrawerProps = {
    classItem: ClassItem | null;
    onClose: () => void;
    user: User;
    onOpenModule?: (module: string, classId: number) => void;
};

export function ClassSideDrawer({ classItem, onClose, user, onOpenModule }: ClassSideDrawerProps) {
    const [activeTab, setActiveTab] = useState<'students' | 'attendance' | 'materials' | 'timeline' | 'announcements'>('students');
    const [students, setStudents] = useState<User[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!classItem) return;
        let isMounted = true;
        setLoading(true);

        Promise.all([
            fetch(`${API_URL}/api/classes/${classItem.id}`, { headers: { 'x-user-id': String(user.id) } }).then(r => r.json()).catch(() => ({})),
            fetch(`${API_URL}/api/materials?class_id=${classItem.id}`, { headers: { 'x-user-id': String(user.id) } }).then(r => r.json()).catch(() => ({})),
            fetch(`${API_URL}/api/sessions?class_id=${classItem.id}`, { headers: { 'x-user-id': String(user.id) } }).then(r => r.json()).catch(() => ({}))
        ]).then(([detailData, materialsData, sessionsData]) => {
            if (!isMounted) return;
            setStudents(detailData.students || []);
            setMaterials(materialsData.materials || []);
            setSessions(sessionsData.sessions || []);
            setLoading(false);
        });

        return () => { isMounted = false; };
    }, [classItem, user.id]);

    if (!classItem) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs" onClick={onClose}>
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                    className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-[var(--color-primary-border)] bg-[var(--color-card)] shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Drawer Header */}
                    <div className="border-b border-[var(--color-primary-border)] bg-[linear-gradient(135deg,var(--color-primary-soft),var(--color-card))] p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <span className="mb-2 inline-block rounded-full border border-[var(--color-primary-border)] bg-[var(--color-card)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-primary-text)]">
                                    {classItem.subject} • Mã: {classItem.code}
                                </span>
                                <h2 className="text-2xl font-black tracking-[-0.035em] text-[var(--color-text)]">{classItem.name}</h2>
                                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                    GV: {classItem.teacher_name || user.full_name} • {classItem.student_count || students.length} Học sinh • Lịch: {classItem.schedule || 'Chưa xếp'}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition"
                            >
                                <XIcon size={20} />
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex gap-2 mt-5 overflow-x-auto pb-1">
                            {[
                                { id: 'students', label: 'Học sinh', icon: <UsersIcon size={14} />, count: students.length },
                                { id: 'attendance', label: 'Điểm danh', icon: <CheckIcon size={14} /> },
                                { id: 'materials', label: 'Tài liệu', icon: <FileIcon size={14} />, count: materials.length },
                                { id: 'timeline', label: 'Timeline', icon: <CalendarIcon size={14} />, count: sessions.length },
                                { id: 'announcements', label: 'Thông báo', icon: <BellIcon size={14} /> },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${activeTab === tab.id
                                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                                            : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]'}`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Drawer Body Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">Đang tải dữ liệu lớp học...</div>
                        ) : activeTab === 'students' ? (
                            <div className="grid gap-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-[var(--color-text)]">Danh sách Học viên ({students.length})</h3>
                                    {onOpenModule && (
                                        <button
                                            onClick={() => { onOpenModule('students', classItem.id); onClose(); }}
                                            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                                        >
                                            Quản lý chi tiết →
                                        </button>
                                    )}
                                </div>
                                {students.length === 0 ? (
                                    <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">Chưa có học sinh nào trong lớp này.</p>
                                ) : (
                                    students.map((st, i) => (
                                        <div key={st.id || i} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3 bg-[var(--color-card)]">
                                            <div className="flex items-center gap-3">
                                                <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-xs font-bold">
                                                    {(st.full_name || st.username || 'H').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <b className="block text-xs text-[var(--color-text)]">{st.full_name || st.username}</b>
                                                    <span className="text-[11px] text-[var(--color-text-muted)]">Mã SV: {st.student_code || 'N/A'} • {st.phone || 'Chưa có SĐT'}</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">Đang học</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : activeTab === 'attendance' ? (
                            <div className="grid gap-4">
                                <div className="p-4 rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] text-center">
                                    <h4 className="text-sm font-bold text-[var(--color-text)] mb-1">Điểm danh nhanh hôm nay</h4>
                                    <p className="text-xs text-[var(--color-text-secondary)] mb-4">Lớp {classItem.name} hiện có {students.length} học viên</p>
                                    {onOpenModule && (
                                        <button
                                            onClick={() => { onOpenModule('attendance', classItem.id); onClose(); }}
                                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90 transition"
                                        >
                                            <CheckIcon size={16} /> Mở Trang Điểm Danh Siêu Tốc →
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : activeTab === 'materials' ? (
                            <div className="grid gap-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-[var(--color-text)]">Tài liệu lớp học ({materials.length})</h3>
                                    {onOpenModule && (
                                        <button
                                            onClick={() => { onOpenModule('materials', classItem.id); onClose(); }}
                                            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                                        >
                                            Quản lý kho tài liệu →
                                        </button>
                                    )}
                                </div>
                                {materials.length === 0 ? (
                                    <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">Chưa có tài liệu nào tải lên.</p>
                                ) : (
                                    materials.map((m) => (
                                        <div key={m.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3 bg-[var(--color-card)]">
                                            <div className="flex items-center gap-3">
                                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-bg-soft)] text-[var(--color-primary)] font-bold text-xs">📄</span>
                                                <div>
                                                    <b className="block text-xs text-[var(--color-text)]">{m.title}</b>
                                                    <span className="text-[11px] text-[var(--color-text-muted)]">{m.file_name || m.external_link || 'Đính kèm'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : activeTab === 'timeline' ? (
                            <div className="grid gap-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-[var(--color-text)]">Timeline Buổi Học ({sessions.length})</h3>
                                    {onOpenModule && (
                                        <button
                                            onClick={() => { onOpenModule('timeline', classItem.id); onClose(); }}
                                            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                                        >
                                            Xem chi tiết Timeline →
                                        </button>
                                    )}
                                </div>
                                {sessions.length === 0 ? (
                                    <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">Chưa có buổi học nào trên timeline.</p>
                                ) : (
                                    sessions.map((s, idx) => (
                                        <div key={s.id || idx} className="rounded-xl border border-[var(--color-border)] p-3 bg-[var(--color-card)]">
                                            <b className="block text-xs font-bold text-[var(--color-text)]">{s.title}</b>
                                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">{s.description || 'Chưa có mô tả'}</p>
                                            <span className="inline-block mt-2 text-[10px] text-[var(--color-text-muted)] font-mono">
                                                ⏱ {new Date(s.start_time).toLocaleString('vi-VN')}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4 text-center py-8">
                                <p className="text-xs text-[var(--color-text-muted)]">Gửi thông báo nhanh đến cho tất cả học viên lớp {classItem.name}</p>
                                {onOpenModule && (
                                    <button
                                        onClick={() => { onOpenModule('notifications', classItem.id); onClose(); }}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white shadow-[var(--shadow-primary)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)]"
                                    >
                                        <BellIcon size={16} /> Soạn Thông Báo Lớp →
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
