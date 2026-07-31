import { memo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../../../components/shared/Avatar';
import { Badge, EmptyState, Field, Panel, PrimaryButton } from '../../../components/shared/ui';
import { statusLabel } from '../../../constants/labels';
import { formatDate } from '../../../utils/format';
import { UsersIcon, CalendarIcon, FileIcon, CheckIcon, BookIcon, XIcon, ChartIcon } from '../../../components/shared/icons';
import type { ClassDetail, ClassItem, Material, SessionItem, TestItem, User } from '../../../types';
import { StudentClasses } from './StudentClasses';

type ClassesProps = {
    classes: ClassItem[];
    selectedClassId: number | null;
    setSelectedClassId: (id: number) => void;
    detail: ClassDetail | null;
    users?: User[];
    userRole?: string;
    createClass?: (payload: Record<string, unknown>) => Promise<unknown>;
    deleteClass?: (id: number) => Promise<unknown>;
    updateClass?: (id: number, payload: Record<string, unknown>) => Promise<unknown>;
};

export const Classes = memo(function Classes({
    classes,
    selectedClassId,
    setSelectedClassId,
    detail: _detail,
    users = [],
    userRole = 'student',
    createClass,
    deleteClass,
    updateClass,
}: ClassesProps) {
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

    const isAdmin = userRole === 'admin';
    const activeClass = classes.find((item) => item.id === selectedClassId) ?? classes[0];
    const teachers = users.filter((u) => u.role === 'teacher');

    if (userRole === 'student') {
        return <StudentClasses classes={classes} />;
    }

    return (
        <div className="grid gap-5">
            {/* Action Bar */}
            <div className="overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
                <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex items-center gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary)] text-white shadow-sm">
                            <BookIcon size={22} />
                        </span>
                        <div>
                            <h2 className="text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">Không gian lớp học</h2>
                            <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                                {isAdmin ? `Quản lý ${classes.length} lớp học trong hệ thống` : `${classes.length} lớp đang phụ trách • chỉ xem thông tin, không chỉnh sửa lớp học`}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {/* View Switcher */}
                        <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'table'
                                    ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-xs'
                                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                                    }`}
                            >
                                <ChartIcon size={14} /> Dạng Bảng
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'grid'
                                    ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-xs'
                                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                                    }`}
                            >
                                <BookIcon size={14} /> Dạng Thẻ
                            </button>
                        </div>

                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => setShowAddModal(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90 hover:shadow-md"
                            >
                                <span className="text-base font-bold leading-none">+</span> Thêm lớp học
                            </button>
                        )}
                    </div>
                </div>

                {activeClass && (
                    <div className="grid gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg-soft)]/55 p-4 sm:grid-cols-2 lg:grid-cols-3">
                        <MetricPill icon={BookIcon} label="Lớp đang xem" value={activeClass.name} helper={activeClass.code} />
                        <MetricPill icon={UsersIcon} label="Sĩ số" value={`${activeClass.student_count ?? 0} học viên`} helper="Theo danh sách hiện tại" />
                        <MetricPill icon={CalendarIcon} label="Lịch học" value={activeClass.schedule || 'Lịch linh hoạt'} helper={activeClass.class_hours || 'Giờ học cập nhật sau'} />
                    </div>
                )}
            </div>

            {/* Main content */}
            <div className="w-full">
                {viewMode === 'table' ? (
                    <ClassesTableView
                        classes={classes}
                        selectedClassId={selectedClassId}
                        onSelectClass={setSelectedClassId}
                        deleteClass={deleteClass}
                        onEditClass={(item) => setEditingClass(item)}
                        userRole={userRole}
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {classes.length ? (
                            classes.map((item) => (
                                <CourseCard
                                    key={item.id}
                                    item={item}
                                    active={selectedClassId === item.id}
                                    onClick={() => setSelectedClassId(item.id)}
                                />
                            ))
                        ) : (
                            <EmptyState />
                        )}
                    </div>
                )}
            </div>

            {/* Add Class Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <AddClassModal
                        teachers={teachers}
                        onClose={() => setShowAddModal(false)}
                        onSubmit={async (payload) => {
                            if (createClass) {
                                await createClass(payload);
                            }
                            setShowAddModal(false);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Edit Class Modal */}
            <AnimatePresence>
                {isAdmin && editingClass && (
                    <EditClassModal
                        item={editingClass}
                        teachers={teachers}
                        onClose={() => setEditingClass(null)}
                        onSubmit={async (payload) => {
                            if (updateClass) {
                                await updateClass(editingClass.id, payload);
                            }
                            setEditingClass(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
});

function ClassesTableView({
    classes,
    selectedClassId,
    onSelectClass,
    deleteClass,
    onEditClass,
    userRole,
}: {
    classes: ClassItem[];
    selectedClassId: number | null;
    onSelectClass: (id: number) => void;
    deleteClass?: (id: number) => Promise<unknown>;
    onEditClass?: (item: ClassItem) => void;
    userRole: string;
}) {
    if (!classes.length) return <EmptyState />;

    return (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="px-4 py-3.5">Lớp & Mã lớp</th>
                            <th className="px-4 py-3.5">Môn học</th>
                            <th className="px-4 py-3.5">Cơ sở</th>
                            <th className="px-4 py-3.5">Giảng viên</th>
                            <th className="px-4 py-3.5">Thời gian học</th>
                            <th className="px-4 py-3.5">Giờ học</th>
                            <th className="px-4 py-3.5">Sĩ số</th>
                            <th className="px-4 py-3.5 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
                        {classes.map((item) => {
                            const isSelected = selectedClassId === item.id;
                            return (
                                <tr
                                    key={item.id}
                                    onClick={() => onSelectClass(item.id)}
                                    className={`cursor-pointer transition duration-150 hover:bg-[var(--color-primary-soft)]/20 ${isSelected ? 'bg-[var(--color-primary-soft)]/30 font-medium' : ''
                                        }`}
                                >
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold text-xs">
                                                {item.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[var(--color-text)] leading-tight">{item.name}</p>
                                                <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{item.code}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                        <Badge tone="neutral">{item.subject}</Badge>
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap text-[var(--color-text-secondary)] font-medium">
                                        {item.location || 'Cơ sở chính'}
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                                                {(item.teacher_name || 'GV')[0]}
                                            </span>
                                            <span className="text-[var(--color-text-secondary)]">{item.teacher_name || 'Chưa phân công'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap text-[var(--color-text-secondary)]">
                                        {item.schedule || 'Thứ 2, 4, 6'}
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[var(--color-primary)] font-semibold">
                                        {item.class_hours || '18:30 - 20:30'}
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-text)]">
                                            <UsersIcon size={12} /> {item.student_count} HV
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                        {userRole === 'admin' ? (
                                            <div className="inline-flex items-center gap-1.5 justify-end">
                                                <button
                                                    type="button"
                                                    title="Chỉnh sửa lớp học"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEditClass?.(item);
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 hover:border-blue-300 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300"
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    type="button"
                                                    title="Xóa lớp học"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm(`Bạn có chắc chắn muốn xóa lớp ${item.name}?`)) {
                                                            deleteClass?.(item.id);
                                                        }
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 hover:border-red-300 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300"
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="inline-flex rounded-lg bg-[var(--color-bg-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-text-muted)]">Chỉ xem</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MetricPill({ icon: Icon, label, value, helper }: { icon: (props: { size?: number }) => JSX.Element; label: string; value: string; helper: string }) {
    return (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-xs">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                <span className="grid h-7 w-7 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Icon size={14} />
                </span>
                {label}
            </div>
            <p className="truncate text-sm font-black text-[var(--color-text)]">{value}</p>
            <p className="mt-1 truncate text-[11px] text-[var(--color-text-secondary)]">{helper}</p>
        </div>
    );
}

function CourseCard({ item, active, onClick }: { item: ClassItem; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`group overflow-hidden rounded-[24px] border bg-[var(--color-card)] text-left shadow-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${active
                ? 'border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/10'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary-border)]'
                }`}
        >
            <div className="relative min-h-28 overflow-hidden p-4" style={{ background: `linear-gradient(135deg, var(--color-primary-soft), var(--color-primary-subtle))` }}>
                <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/30 blur-sm" />
                <div className="relative flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/85 text-[var(--color-primary)] shadow-xs backdrop-blur-xs">
                        <BookIcon size={18} />
                    </span>
                    <Badge tone="neutral">{item.subject}</Badge>
                </div>
                <h3 className="relative mt-5 line-clamp-2 text-lg font-black leading-tight tracking-[-0.02em] text-[var(--color-text)]">{item.name}</h3>
                <p className="relative mt-1 font-mono text-[11px] font-bold text-[var(--color-text-muted)]">{item.code}</p>
            </div>

            <div className="grid gap-3 p-4">
                <div className="flex items-center gap-2 rounded-2xl bg-[var(--color-bg-soft)] p-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-xs font-black text-blue-700">{(item.teacher_name || 'GV')[0]}</span>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Giảng viên</p>
                        <p className="truncate text-xs font-semibold text-[var(--color-text)]">{item.teacher_name || 'Chưa phân công'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-2xl border border-[var(--color-border)] p-2.5">
                        <p className="mb-1 text-[10px] font-bold text-[var(--color-text-muted)]">Sĩ số</p>
                        <span className="inline-flex items-center gap-1 font-black text-[var(--color-text)]"><UsersIcon size={12} /> {item.student_count ?? 0} HV</span>
                    </div>
                    <div className="rounded-2xl border border-[var(--color-border)] p-2.5">
                        <p className="mb-1 text-[10px] font-bold text-[var(--color-text-muted)]">Lịch học</p>
                        <span className="line-clamp-1 font-black text-[var(--color-text)]">{item.schedule || 'Linh hoạt'}</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-[var(--color-border)] p-2.5 text-xs text-[var(--color-text-secondary)]">
                    <div className="flex items-center justify-between gap-2">
                        <span>{item.location || 'Cơ sở chính'}</span>
                        <span className="font-mono font-bold text-[var(--color-primary)]">{item.class_hours || '18:30 - 20:30'}</span>
                    </div>
                </div>
            </div>
        </button>
    );
}

export function ClassDetailPanel({ detail }: { detail: ClassDetail }) {
    return (
        <Panel>
            <div className="mb-4">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">{detail.class.name}</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{detail.class.description || 'Chưa có mô tả chi tiết cho lớp học này.'}</p>
            </div>
            <div className="mb-5 flex flex-wrap gap-2">
                <Badge>{detail.class.subject}</Badge>
                <Badge tone="primary">{statusLabel[detail.class.status] ?? detail.class.status}</Badge>
                {detail.class.schedule && <Badge>{detail.class.schedule}</Badge>}
            </div>

            <div className="grid gap-4">
                {/* Students List */}
                <Panel
                    title="Học sinh trong lớp"
                    className="shadow-none"
                    action={
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2.5 py-1 rounded-lg">
                            <UsersIcon size={14} /> {detail.students.length} Học sinh
                        </span>
                    }
                >
                    {detail.students.length ? (
                        <ul className="grid gap-2 max-h-[260px] overflow-y-auto pr-1">
                            {detail.students.map((student) => (
                                <li key={student.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-2.5 transition hover:border-[var(--color-primary-border)] hover:bg-[var(--color-bg-soft)]">
                                    <div className="flex items-center gap-3">
                                        <Avatar user={student} size="sm" />
                                        <div>
                                            <span className="block font-medium text-xs text-[var(--color-text)]">{student.full_name || student.username}</span>
                                            <span className="text-[10px] text-[var(--color-text-muted)]">{student.student_code || student.username}</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">Đang học</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState title="Chưa có học sinh nào trong lớp" />
                    )}
                </Panel>

                {/* Sessions */}
                <SessionsPanel items={detail.sessions} />

                {/* Materials & Tests */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <MaterialsPanel items={detail.materials} />
                    <TestsPanel items={detail.tests} />
                </div>
            </div>
        </Panel>
    );
}

function AddClassModal({
    teachers,
    onClose,
    onSubmit,
}: {
    teachers: User[];
    onClose: () => void;
    onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [subject, setSubject] = useState('');
    const [teacherId, setTeacherId] = useState<string>('');
    const [schedule, setSchedule] = useState('');
    const [classHours, setClassHours] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [studentsCsv, setStudentsCsv] = useState('');
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);

    const sampleCsv = `Họ và tên, Tên đăng nhập, Mật khẩu, Số điện thoại
Trần Học Sinh, hocsinh01, 123456, 0911223344
Lê Văn Nam, namle, 123456, 0988776655`;

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) setStudentsCsv(content);
        };
        reader.readAsText(file);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            await onSubmit({
                name,
                code: code.trim() || undefined,
                subject: subject.trim() || 'Chưa phân loại',
                teacher_id: teacherId ? Number(teacherId) : null,
                schedule: schedule.trim() || undefined,
                class_hours: classHours.trim() || undefined,
                location: location.trim() || undefined,
                description: description.trim() || undefined,
                students_csv: studentsCsv.trim() || undefined,
            });
        } finally {
            setLoading(false);
        }
    };

    const parsedStudents = studentsCsv
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 5);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-2xl"
            >
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)] mb-5">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-primary)] text-white shadow-sm font-bold text-lg">
                            +
                        </span>
                        <div>
                            <h3 className="text-lg font-bold text-[var(--color-text)]">Thêm lớp học mới</h3>
                            <p className="text-xs text-[var(--color-text-secondary)]">Nhập thông tin cơ bản và phân công giảng viên</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)] transition"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                <form className="grid gap-5" onSubmit={handleSubmit}>
                    {/* Basic Info */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Tên lớp học *" value={name} onChange={(e) => setName(e.target.value)} required placeholder="VD: Lớp Tiếng Anh A1" />
                        <Field label="Mã lớp (Tùy chọn)" value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: ENG-A1-2026" />
                        <Field label="Môn học *" value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="VD: Tiếng Anh" />

                        {/* Teacher selection */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Giảng viên phụ trách</label>
                            <select
                                value={teacherId}
                                onChange={(e) => setTeacherId(e.target.value)}
                                className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-xs text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                            >
                                <option value="">-- Chưa phân công --</option>
                                {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.full_name || t.username} ({t.specialty || 'Giảng viên'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Thời gian học (Thứ)" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="VD: Thứ 2, 4, 6" />
                        <Field label="Giờ học" value={classHours} onChange={(e) => setClassHours(e.target.value)} placeholder="VD: 18:30 - 20:30" />
                        <Field label="Cơ sở / Địa điểm" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="VD: Cơ sở 1 - Quận 1" />
                    </div>

                    <Field label="Mô tả lớp học" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả ngắn gọn về lộ trình khóa học..." />

                    {/* CSV Student Import */}
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-[var(--color-text)]">
                                <FileIcon size={14} /> Tải lên danh sách học sinh (File CSV)
                            </span>
                            <button
                                type="button"
                                onClick={() => setStudentsCsv(sampleCsv)}
                                className="text-xs text-blue-600 font-semibold hover:underline"
                            >
                                Dán mẫu CSV
                            </button>
                        </div>

                        <div className="grid gap-3">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="w-full cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2 text-xs text-[var(--color-text)] file:mr-2 file:rounded-lg file:border-0 file:bg-blue-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-200"
                            />
                            {fileName && <p className="text-xs text-blue-600 font-medium">Đã chọn: {fileName}</p>}

                            <textarea
                                rows={4}
                                value={studentsCsv}
                                onChange={(e) => setStudentsCsv(e.target.value)}
                                placeholder="Họ và tên, Tên đăng nhập, Mật khẩu, Số điện thoại..."
                                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2.5 text-xs font-mono text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                            />

                            {parsedStudents.length > 0 && (
                                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2.5 text-xs">
                                    <p className="font-bold text-[var(--color-text)] mb-1">Xem trước danh sách ({parsedStudents.length} mẫu đầu):</p>
                                    {parsedStudents.map((line, idx) => (
                                        <p key={idx} className="truncate font-mono text-[var(--color-text-secondary)]">
                                            {line}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)]"
                        >
                            Hủy bỏ
                        </button>
                        <PrimaryButton disabled={loading || !name.trim()} className="h-10 px-6 text-xs font-bold">
                            {loading ? 'Đang tạo lớp...' : 'Khởi tạo Lớp học mới'}
                        </PrimaryButton>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

function EditClassModal({
    item,
    teachers,
    onClose,
    onSubmit,
}: {
    item: ClassItem;
    teachers: User[];
    onClose: () => void;
    onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
    const [name, setName] = useState(item.name);
    const [code, setCode] = useState(item.code || '');
    const [subject, setSubject] = useState(item.subject || '');
    const initialTeacherId = teachers.find((t) => (t.full_name || t.username) === item.teacher_name)?.id;
    const [teacherId, setTeacherId] = useState<string>(initialTeacherId ? String(initialTeacherId) : '');
    const [schedule, setSchedule] = useState(item.schedule || '');
    const [classHours, setClassHours] = useState(item.class_hours || '');
    const [location, setLocation] = useState(item.location || '');
    const [description, setDescription] = useState(item.description || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            await onSubmit({
                name,
                code: code.trim() || undefined,
                subject: subject.trim() || 'Chưa phân loại',
                teacher_id: teacherId ? Number(teacherId) : null,
                schedule: schedule.trim() || undefined,
                class_hours: classHours.trim() || undefined,
                location: location.trim() || undefined,
                description: description.trim() || undefined,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-2xl"
            >
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)] mb-5">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
                            <BookIcon size={18} />
                        </span>
                        <div>
                            <h3 className="text-lg font-bold text-[var(--color-text)]">Cập nhật lớp học</h3>
                            <p className="text-xs text-[var(--color-text-secondary)]">Chỉnh sửa thông tin phân công và lịch học</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)] transition"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                <form className="grid gap-5" onSubmit={handleSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Tên lớp học *" value={name} onChange={(e) => setName(e.target.value)} required placeholder="VD: Lớp Tiếng Anh A1" />
                        <Field label="Mã lớp" value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: ENG-A1-2026" />
                        <Field label="Môn học *" value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="VD: Tiếng Anh" />

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Giảng viên phụ trách</label>
                            <select
                                value={teacherId}
                                onChange={(e) => setTeacherId(e.target.value)}
                                className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-xs text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                            >
                                <option value="">-- Chưa phân công --</option>
                                {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.full_name || t.username} ({t.specialty || 'Giảng viên'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Thời gian học (Thứ)" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="VD: Thứ 2, 4, 6" />
                        <Field label="Giờ học" value={classHours} onChange={(e) => setClassHours(e.target.value)} placeholder="VD: 18:30 - 20:30" />
                        <Field label="Cơ sở / Địa điểm" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="VD: Cơ sở 1 - Quận 1" />
                    </div>

                    <Field label="Mô tả lớp học" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả lớp học..." />

                    <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)]"
                        >
                            Hủy bỏ
                        </button>
                        <PrimaryButton disabled={loading || !name.trim()} className="h-10 px-6 text-xs font-bold">
                            {loading ? 'Đang lưu...' : 'Cập nhật thay đổi'}
                        </PrimaryButton>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

export function ListPanel<T extends { id: number; title: string; description?: string }>({
    title,
    icon: Icon,
    items,
    render,
}: {
    title: string;
    icon?: (props: { size?: number }) => JSX.Element;
    items: T[];
    render: (item: T) => string;
}) {
    return (
        <Panel
            title={title}
            className="shadow-none"
            action={
                Icon && (
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <Icon size={14} />
                    </span>
                )
            }
        >
            {items.length ? (
                <div className="grid gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {items.map((item) => (
                        <article key={item.id} className="rounded-xl border border-[var(--color-border)] p-2.5 transition hover:border-[var(--color-primary-border)] hover:bg-[var(--color-bg-soft)]">
                            <p className="text-[10px] font-bold text-[var(--color-primary)]">{render(item)}</p>
                            <h3 className="mt-0.5 font-semibold text-xs text-[var(--color-text)]">{item.title}</h3>
                            {item.description && <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">{item.description}</p>}
                        </article>
                    ))}
                </div>
            ) : (
                <EmptyState />
            )}
        </Panel>
    );
}

export function SessionsPanel({ items }: { items: SessionItem[] }) {
    return <ListPanel title="Buổi học trong lớp" icon={CalendarIcon} items={items} render={(item) => `${formatDate(item.start_time)} - ${statusLabel[item.status] ?? item.status}`} />;
}

export function MaterialsPanel({ items }: { items: Material[] }) {
    return <ListPanel title="Tài liệu học tập" icon={FileIcon} items={items} render={(item) => item.uploaded_by_name ?? 'VAT'} />;
}

export function TestsPanel({ items }: { items: TestItem[] }) {
    return <ListPanel title="Bài kiểm tra và bài tập" icon={CheckIcon} items={items} render={(item) => `${statusLabel[item.status] ?? item.status} - hạn ${formatDate(item.due_date)}`} />;
}
