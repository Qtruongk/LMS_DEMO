import { memo, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../../../components/shared/Avatar';
import { Badge, EmptyState, Field, Panel, PrimaryButton } from '../../../components/shared/ui';
import { statusLabel } from '../../../constants/labels';
import { formatDate } from '../../../utils/format';
import { UsersIcon, CalendarIcon, FileIcon, CheckIcon, BookIcon, XIcon, ChartIcon } from '../../../components/shared/icons';
import type { ClassDetail, ClassItem, Material, SessionItem, TestItem, User } from '../../../types';
import { StudentClasses } from './StudentClasses';
import { TeacherClasses } from './TeacherClasses';
import { ClassSideDrawer } from '../../../components/shared/ClassSideDrawer';

type ClassesProps = {
    classes: ClassItem[];
    selectedClassId: number | null;
    setSelectedClassId: (id: number) => void;
    detail: ClassDetail | null;
    users?: User[];
    user?: User;
    userRole?: string;
    onOpenModule?: (module: string, classId?: number) => void;
    studentView?: 'todo' | 'class';
    teacherView?: 'review' | 'class';
    createClass?: (payload: Record<string, unknown>) => Promise<unknown>;
    deleteClass?: (id: number) => Promise<unknown>;
    updateClass?: (id: number, payload: Record<string, unknown>) => Promise<unknown>;
};

const statusOptions = [
    { value: 'upcoming', label: 'Sắp học' },
    { value: 'active', label: 'Đang học' },
    { value: 'archived', label: 'Lưu trữ' },
];

export const Classes = memo(function Classes({
    classes,
    selectedClassId,
    setSelectedClassId,
    detail,
    users = [],
    user,
    userRole = 'student',
    onOpenModule,
    studentView,
    teacherView,
    createClass,
    deleteClass,
    updateClass,
}: ClassesProps) {
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
    const [classQuery, setClassQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showDetail, setShowDetail] = useState(false);

    const isAdmin = userRole === 'admin' || userRole === 'owner';
    const locations = useMemo(() => Array.from(new Set(classes.map((item) => item.location || 'Cơ sở chính'))).sort((a, b) => a.localeCompare(b, 'vi')), [classes]);
    const subjects = useMemo(() => Array.from(new Set(classes.map((item) => item.subject))).sort((a, b) => a.localeCompare(b, 'vi')), [classes]);
    const visibleClasses = classes.filter((item) => {
        const keyword = classQuery.trim().toLowerCase();
        const matchesQuery = !keyword || [item.name, item.code, item.subject, item.teacher_name, item.location].some((value) => value?.toLowerCase().includes(keyword));
        return matchesQuery
            && (locationFilter === 'all' || (item.location || 'Cơ sở chính') === locationFilter)
            && (subjectFilter === 'all' || item.subject === subjectFilter)
            && (statusFilter === 'all' || item.status === statusFilter);
    });
    const activeClass = visibleClasses.find((item) => item.id === selectedClassId) ?? visibleClasses[0];
    const teachers = users.filter((u) => u.role === 'teacher');
    const activeDetail = detail && activeClass && detail.class.id === activeClass.id ? detail : null;
    const drawerUser = user || users.find((item) => item.role === userRole) || users.find((item) => item.role === 'admin') || users[0];

    if (userRole === 'student') return <StudentClasses classes={classes} selectedClassId={selectedClassId} setSelectedClassId={setSelectedClassId} detail={detail} studentView={studentView} user={user} onNavigate={onOpenModule} />;
    if (userRole === 'teacher') return <TeacherClasses classes={classes} selectedClassId={selectedClassId} setSelectedClassId={setSelectedClassId} detail={detail} teacherView={teacherView} user={user} onNavigate={onOpenModule} />;

    const selectClass = (id: number) => {
        setSelectedClassId(id);
        setShowDetail(true);
    };

    const openClassModule = (module: string, classId: number) => {
        setSelectedClassId(classId);
        onOpenModule?.(module, classId);
    };

    return (
        <div className="classes-workspace grid gap-5">
            <section className="overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
                <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex items-center gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary)] text-white shadow-sm"><BookIcon size={22} /></span>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">Quản trị đào tạo</p>
                                <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">BƯỚC 2</span>
                            </div>
                            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">Tạo lớp học & phân công</h2>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <div className="flex rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-1.5 shadow-inner" aria-label="Chọn kiểu hiển thị">
                            <button type="button" onClick={() => setViewMode('table')} aria-pressed={viewMode === 'table'} className={`flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black transition ${viewMode === 'table' ? 'border border-[var(--color-primary-border)] bg-[var(--color-card)] text-[var(--color-primary)] shadow-[0_12px_28px_rgba(15,23,42,0.14)] ring-2 ring-[var(--color-primary)]/10 dark:shadow-[0_14px_30px_rgba(0,0,0,0.35)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card)]/70 hover:text-[var(--color-text)]'}`}><ChartIcon size={17} /> Bảng</button>
                            <button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'} className={`flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black transition ${viewMode === 'grid' ? 'border border-[var(--color-primary-border)] bg-[var(--color-card)] text-[var(--color-primary)] shadow-[0_12px_28px_rgba(15,23,42,0.14)] ring-2 ring-[var(--color-primary)]/10 dark:shadow-[0_14px_30px_rgba(0,0,0,0.35)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card)]/70 hover:text-[var(--color-text)]'}`}><BookIcon size={17} /> Thẻ</button>
                        </div>
                        {isAdmin && <button type="button" onClick={() => setShowAddModal(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"><span className="text-base font-bold leading-none">+</span> Tạo lớp học</button>}
                    </div>
                </div>
                <div className="grid gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg-soft)]/55 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Tìm lớp học" placeholder="Tên, mã lớp, giáo viên..." value={classQuery} onChange={(event) => setClassQuery(event.target.value)} />
                    <FilterSelect label="Cơ sở" value={locationFilter} onChange={setLocationFilter} options={locations} />
                    <FilterSelect label="Môn học" value={subjectFilter} onChange={setSubjectFilter} options={subjects} />
                    <FilterSelect label="Trạng thái" value={statusFilter} onChange={setStatusFilter} options={statusOptions.map((item) => item.value)} labels={statusOptions.map((item) => item.label)} />
                </div>

            </section>

            {viewMode === 'table' ? <ClassesTableView classes={visibleClasses} selectedClassId={selectedClassId} onSelectClass={selectClass} deleteClass={deleteClass} onEditClass={isAdmin ? setEditingClass : undefined} userRole={userRole} /> : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleClasses.length ? visibleClasses.map((item) => <CourseCard key={item.id} item={item} active={selectedClassId === item.id} onClick={() => selectClass(item.id)} />) : <div className="sm:col-span-2 xl:col-span-3"><EmptyState title="Không tìm thấy lớp học phù hợp" /></div>}</div>
            )}

            <AnimatePresence>
                {showAddModal && <AddClassModal teachers={teachers} onClose={() => setShowAddModal(false)} onSubmit={async (payload) => { if (createClass) await createClass(payload); setShowAddModal(false); }} />}
                {isAdmin && editingClass && <EditClassModal item={editingClass} teachers={teachers} onClose={() => setEditingClass(null)} onSubmit={async (payload) => { if (updateClass) await updateClass(editingClass.id, payload); setEditingClass(null); }} />}
                {showDetail && activeClass && drawerUser && (
                    <ClassSideDrawer
                        classItem={activeClass}
                        onClose={() => setShowDetail(false)}
                        user={drawerUser}
                        onOpenModule={openClassModule}
                    />
                )}
                {showDetail && !drawerUser && activeDetail && <ClassDetailModal detail={activeDetail} onClose={() => setShowDetail(false)} />}
            </AnimatePresence>
        </div>
    );
});

function FilterSelect({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: string[] }) {
    return <label className="grid gap-1 text-xs font-bold text-[var(--color-text-secondary)]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-sm font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"> <option value="all">Tất cả</option>{options.map((option, index) => <option key={option} value={option}>{labels?.[index] ?? option}</option>)}</select></label>;
}

function ClassesTableView({ classes, selectedClassId, onSelectClass, deleteClass, onEditClass, userRole }: { classes: ClassItem[]; selectedClassId: number | null; onSelectClass: (id: number) => void; deleteClass?: (id: number) => Promise<unknown>; onEditClass?: (item: ClassItem) => void; userRole: string }) {
    const canAdminister = userRole === 'admin' || userRole === 'owner';
    if (!classes.length) return <EmptyState title="Không có lớp học" />;
    return <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold"><tr><th className="px-4 py-3.5">Lớp & Mã lớp</th><th className="px-4 py-3.5">Môn học</th><th className="px-4 py-3.5">Cơ sở</th><th className="px-4 py-3.5">Giảng viên</th><th className="px-4 py-3.5">Thời gian học</th><th className="px-4 py-3.5">Giờ học</th><th className="px-4 py-3.5">Sĩ số</th><th className="px-4 py-3.5 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">{classes.map((item) => { const isSelected = selectedClassId === item.id; return <tr key={item.id} onClick={() => onSelectClass(item.id)} className={`cursor-pointer transition hover:bg-[var(--color-primary-soft)]/20 ${isSelected ? 'bg-[var(--color-primary-soft)]/30 font-medium' : ''}`}><td className="px-4 py-3.5"><div className="flex items-center gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold text-xs">{item.name.slice(0, 2).toUpperCase()}</div><div><p className="font-bold leading-tight">{item.name}</p><p className="mt-1 font-mono text-[10px] text-[var(--color-text-muted)]">{item.code || 'Chưa có mã'}</p></div></div></td><td className="px-4 py-3.5"><Badge tone="neutral">{item.subject}</Badge></td><td className="px-4 py-3.5">{item.location || 'Cơ sở chính'}</td><td className="px-4 py-3.5">{item.teacher_name || 'Chưa phân công'}</td><td className="px-4 py-3.5">{item.schedule || 'Linh hoạt'}</td><td className="px-4 py-3.5">{item.class_hours || 'Chưa cập nhật'}</td><td className="px-4 py-3.5 font-bold">{item.student_count ?? 0} HV</td><td className="px-4 py-3.5 text-right">{canAdminister ? <div className="flex justify-end gap-1.5"><button type="button" onClick={(event) => { event.stopPropagation(); onEditClass?.(item); }} className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-[11px] font-bold hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">Sửa</button><button type="button" onClick={async (event) => { event.stopPropagation(); if (window.confirm(`Xóa lớp ${item.name}?`)) await deleteClass?.(item.id); }} className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50">Xóa</button></div> : <span className="rounded-lg bg-[var(--color-bg-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-text-muted)]">Chỉ xem</span>}</td></tr>; })}</tbody></table></div></div>;
}

function CourseCard({ item, active, onClick }: { item: ClassItem; active: boolean; onClick: () => void }) {
    return <button type="button" onClick={onClick} className={`group overflow-hidden rounded-[24px] border bg-[var(--color-card)] text-left shadow-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${active ? 'border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/10' : 'border-[var(--color-border)] hover:border-[var(--color-primary-border)]'}`}><div className="relative min-h-28 overflow-hidden p-4" style={{ background: 'linear-gradient(135deg, var(--color-primary-soft), var(--color-primary-subtle))' }}><div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/30 blur-sm" /><div className="relative flex items-center justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/85 text-[var(--color-primary)] shadow-xs"><BookIcon size={18} /></span><Badge tone="neutral">{item.subject}</Badge></div><h3 className="relative mt-5 line-clamp-2 text-lg font-black leading-tight tracking-[-0.02em] text-[var(--color-text)]">{item.name}</h3><p className="relative mt-1 font-mono text-[11px] font-bold text-[var(--color-text-muted)]">{item.code || 'Chưa có mã lớp'}</p></div><div className="grid gap-3 p-4"><div className="flex items-center gap-2 rounded-2xl bg-[var(--color-bg-soft)] p-2.5"><span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-xs font-black text-blue-700">{(item.teacher_name || 'GV')[0]}</span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Giảng viên</p><p className="truncate text-xs font-semibold text-[var(--color-text)]">{item.teacher_name || 'Chưa phân công'}</p></div></div><div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-2xl border border-[var(--color-border)] p-2.5"><p className="mb-1 text-[10px] font-bold text-[var(--color-text-muted)]">Sĩ số</p><span className="inline-flex items-center gap-1 font-black text-[var(--color-text)]"><UsersIcon size={12} /> {item.student_count ?? 0} HV</span></div><div className="rounded-2xl border border-[var(--color-border)] p-2.5"><p className="mb-1 text-[10px] font-bold text-[var(--color-text-muted)]">Lịch học</p><span className="line-clamp-1 font-black text-[var(--color-text)]">{item.schedule || 'Linh hoạt'}</span></div></div><div className="rounded-2xl border border-[var(--color-border)] p-2.5 text-xs text-[var(--color-text-secondary)]"><div className="flex items-center justify-between gap-2"><span>{item.location || 'Cơ sở chính'}</span><span className="font-mono font-bold text-[var(--color-primary)]">{item.class_hours || '18:30 - 20:30'}</span></div></div><span className="text-center text-[11px] font-bold text-[var(--color-primary)]">Chạm để xem chi tiết lớp →</span></div></button>;
}

function ClassDetailModal({ detail, onClose }: { detail: ClassDetail; onClose: () => void }) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"><motion.button type="button" aria-label="Đóng chi tiết lớp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-xs" /><motion.div role="dialog" aria-modal="true" aria-labelledby="class-detail-title" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }} className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-2xl sm:p-6"><div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]">Chi tiết lớp học</p><h2 id="class-detail-title" className="mt-1 text-xl font-black text-[var(--color-text)]">{detail.class.name}</h2></div><button type="button" aria-label="Đóng" onClick={onClose} className="rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]"><XIcon size={18} /></button></div><div className="mt-4 flex flex-wrap gap-2"><Badge>{detail.class.subject}</Badge><Badge tone="primary">{statusLabel[detail.class.status] ?? detail.class.status}</Badge>{detail.class.schedule && <Badge>{detail.class.schedule}</Badge>}</div><div className="mt-5 grid gap-4"><Panel title="Học sinh trong lớp" className="shadow-none" action={<span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)]"><UsersIcon size={14} /> {detail.students.length} học viên</span>}>{detail.students.length ? <ul className="grid max-h-[260px] gap-2 overflow-y-auto pr-1">{detail.students.map((student) => <li key={student.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-2.5"><div className="flex items-center gap-3"><Avatar user={student} size="sm" /><div><span className="block text-xs font-medium text-[var(--color-text)]">{student.full_name || student.username}</span><span className="text-[10px] text-[var(--color-text-muted)]">{student.student_code || student.username}</span></div></div><span className="rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">Đang học</span></li>)}</ul> : <EmptyState title="Chưa có học viên nào trong lớp" />}</Panel><SessionsPanel items={detail.sessions} /><div className="grid gap-4 sm:grid-cols-2"><MaterialsPanel items={detail.materials} /><TestsPanel items={detail.tests} /></div></div></motion.div></div>;
}

function ModalShell({ title, icon, onClose, children }: { title: string; subtitle?: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"><motion.button type="button" aria-label="Đóng cửa sổ" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-xs" /><motion.div role="dialog" aria-modal="true" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }} className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-2xl sm:p-6"><div className="mb-5 flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-primary)] text-white">{icon}</span><div><h3 className="text-lg font-bold text-[var(--color-text)]">{title}</h3></div></div><button type="button" aria-label="Đóng" onClick={onClose} className="rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]"><XIcon size={18} /></button></div>{children}</motion.div></div>;
}

function TeacherSelect({ teachers, value, onChange }: { teachers: User[]; value: string; onChange: (value: string) => void }) {
    return <label className="grid gap-1 text-xs font-bold text-[var(--color-text-secondary)]">Giảng viên<select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-medium text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"><option value="">Chưa phân công</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name || teacher.username}</option>)}</select></label>;
}

function ClassForm({ initial, teachers, submitLabel, loadingLabel, onSubmit, onClose, includeStudents = false }: { initial?: Partial<ClassItem>; teachers: User[]; submitLabel: string; loadingLabel: string; onSubmit: (payload: Record<string, unknown>) => Promise<void>; onClose: () => void; includeStudents?: boolean }) {
    const [name, setName] = useState(initial?.name || '');
    const [code, setCode] = useState(initial?.code || '');
    const [subject, setSubject] = useState(initial?.subject || '');
    const [teacherId, setTeacherId] = useState('');
    const [schedule, setSchedule] = useState(initial?.schedule || '');
    const [classHours, setClassHours] = useState(initial?.class_hours || '');
    const [location, setLocation] = useState(initial?.location || 'Cơ sở chính');
    const [description, setDescription] = useState(initial?.description || '');
    const [studentsCsv, setStudentsCsv] = useState('');
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const parsedStudents = studentsCsv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 5);

    const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = () => setStudentsCsv(String(reader.result || ''));
        reader.readAsText(file);
    };
    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!name.trim() || !subject.trim()) { setError('Vui lòng điền tên lớp và môn học.'); return; }
        setError(''); setLoading(true);
        try { await onSubmit({ name: name.trim(), code: code.trim() || undefined, subject: subject.trim(), teacher_id: teacherId ? Number(teacherId) : null, schedule: schedule.trim() || undefined, class_hours: classHours.trim() || undefined, location: location.trim() || undefined, description: description.trim() || undefined, ...(includeStudents ? { students_csv: studentsCsv.trim() || undefined } : {}) }); } finally { setLoading(false); }
    };
    return <form onSubmit={handleSubmit} className="grid gap-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Tên lớp học" required placeholder="Ví dụ: Toán 9 nâng cao" value={name} onChange={(event) => setName(event.target.value)} /><Field label="Mã lớp" placeholder="Ví dụ: TOAN9-2026" value={code} onChange={(event) => setCode(event.target.value)} /><Field label="Môn học" required placeholder="Ví dụ: Toán" value={subject} onChange={(event) => setSubject(event.target.value)} /><TeacherSelect teachers={teachers} value={teacherId} onChange={setTeacherId} /><Field label="Lịch học" placeholder="Thứ 3, Thứ 5" value={schedule} onChange={(event) => setSchedule(event.target.value)} /><Field label="Giờ học" placeholder="18:30 - 20:30" value={classHours} onChange={(event) => setClassHours(event.target.value)} /><Field label="Cơ sở / phòng học" placeholder="Cơ sở chính - Phòng 203" value={location} onChange={(event) => setLocation(event.target.value)} /></div><label className="grid gap-1 text-xs font-bold text-[var(--color-text-secondary)]">Mô tả lớp<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Mục tiêu, ghi chú vận hành..." className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm font-medium text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" /></label>{includeStudents && <div className="rounded-2xl border border-dashed border-[var(--color-primary-border)] bg-[var(--color-primary-soft)]/30 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold text-[var(--color-text)]">Nhập danh sách học viên</p><p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">Mỗi dòng 1 học viên (chỉ cần Họ tên)</p></div><label className="cursor-pointer rounded-xl bg-[var(--color-card)] px-3 py-2 text-[11px] font-bold text-[var(--color-primary)] shadow-xs"><input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="sr-only" />{fileName || 'Chọn CSV'}</label></div><textarea value={studentsCsv} onChange={(event) => setStudentsCsv(event.target.value)} rows={4} placeholder="Trần Học Sinh&#10;Nguyễn Học Trò" className="mt-3 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 font-mono text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" />{parsedStudents.length > 0 && <div className="mt-2 rounded-xl bg-[var(--color-card)] p-2 text-[11px] text-[var(--color-text-secondary)]"><p className="font-bold text-[var(--color-text)]">Xem trước ({parsedStudents.length} dòng)</p>{parsedStudents.map((line, index) => <p key={index} className="truncate">{line}</p>)}</div>}</div>}{error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}<div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[var(--color-border)] px-4 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)]">Hủy bỏ</button><PrimaryButton type="submit" disabled={loading} className="min-h-11 px-5 text-xs font-bold">{loading ? loadingLabel : submitLabel}</PrimaryButton></div></form>;
}

function AddClassModal({ teachers, onClose, onSubmit }: { teachers: User[]; onClose: () => void; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
    return <ModalShell title="Tạo lớp học mới" icon={<BookIcon size={18} />} onClose={onClose}><ClassForm teachers={teachers} submitLabel="Khởi tạo lớp học" loadingLabel="Đang tạo lớp..." onSubmit={onSubmit} onClose={onClose} includeStudents /></ModalShell>;
}

function EditClassModal({ item, teachers, onClose, onSubmit }: { item: ClassItem; teachers: User[]; onClose: () => void; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
    return <ModalShell title="Cập nhật lớp học" icon={<BookIcon size={18} />} onClose={onClose}><ClassForm initial={item} teachers={teachers} submitLabel="Lưu thay đổi" loadingLabel="Đang lưu..." onSubmit={onSubmit} onClose={onClose} /></ModalShell>;
}

function ListPanel<T extends { id: number; title: string; description?: string }>({ title, icon: Icon, items, render }: { title: string; icon?: (props: { size?: number }) => JSX.Element; items: T[]; render: (item: T) => string }) {
    return <Panel title={title} action={Icon && <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Icon size={14} /></span>}>{items.length ? <div className="grid max-h-[220px] gap-2 overflow-y-auto pr-1">{items.map((item) => <article key={item.id} className="rounded-xl border border-[var(--color-border)] p-2.5 transition hover:border-[var(--color-primary-border)] hover:bg-[var(--color-bg-soft)]"><p className="text-[10px] font-bold text-[var(--color-primary)]">{render(item)}</p><h3 className="mt-0.5 text-xs font-semibold text-[var(--color-text)]">{item.title}</h3>{item.description && <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">{item.description}</p>}</article>)}</div> : <EmptyState title="Chưa có dữ liệu" />}</Panel>;
}

export function SessionsPanel({ items }: { items: SessionItem[] }) { return <ListPanel title="Buổi học trong lớp" icon={CalendarIcon} items={items} render={(item) => `${formatDate(item.start_time)} - ${statusLabel[item.status] ?? item.status}`} />; }
export function MaterialsPanel({ items }: { items: Material[] }) { return <ListPanel title="Tài liệu học tập" icon={FileIcon} items={items} render={(item) => item.uploaded_by_name ?? 'VAT'} />; }
export function TestsPanel({ items }: { items: TestItem[] }) { return <ListPanel title="Bài tập trên lớp" icon={CheckIcon} items={items} render={(item) => `${statusLabel[item.status] ?? item.status} - hạn ${formatDate(item.due_date)}`} />; }
