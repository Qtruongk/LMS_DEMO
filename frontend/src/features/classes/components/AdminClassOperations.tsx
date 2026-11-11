import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Panel } from '../../../components/shared/ui';
import { BookIcon, ChartIcon, CheckCircleIcon, ClockIcon, FileIcon, UsersIcon } from '../../../components/shared/icons';
import { API_URL } from '../../../services/api';
import type { ClassDetail, ClassItem, TestItem, User } from '../../../types';
import { AttendancePanel } from './AttendancePanel';
import { TeacherClasses } from './TeacherClasses';
import { QuestionBankPanel } from './QuestionBankPanel';

type AdminOperationTab = 'attendance' | 'assignments' | 'question-bank';

type AdminClassOperationsProps = {
    user: User;
    classes: ClassItem[];
    selectedClassId: number | null;
    setSelectedClassId: (id: number) => void;
    detail: ClassDetail | null;
};

type AdminAssignmentItem = TestItem & {
    class_id: number;
    class_name?: string;
    class_code?: string;
    class_subject?: string;
    teacher_id?: number;
    teacher_name?: string;
    created_by?: number;
    created_by_name?: string;
    created_at?: string;
};

const operationTabs: { id: AdminOperationTab; label: string; icon: typeof ClockIcon }[] = [
    { id: 'attendance', label: 'Điểm danh', icon: ClockIcon },
    { id: 'assignments', label: 'Bài tập', icon: BookIcon },
    { id: 'question-bank', label: 'Ngân hàng câu hỏi', icon: FileIcon },
];

function formatAssignmentDate(value?: string) {
    if (!value) return 'Không hạn nộp';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Không hạn nộp';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function assignmentKindLabel(kind?: string) {
    return kind === 'essay' ? 'Tự luận' : 'Trắc nghiệm';
}

function assignmentStatusLabel(status?: string) {
    if (status === 'published') return 'Đã giao';
    if (status === 'draft') return 'Nháp';
    if (status === 'closed') return 'Đã đóng';
    return status || 'Đang cập nhật';
}

function assignmentStatusTone(status?: string) {
    if (status === 'published') return 'success';
    if (status === 'closed') return 'danger';
    if (status === 'draft') return 'warning';
    return 'neutral';
}

function getSubmittedPercent(item: AdminAssignmentItem) {
    const enrolled = Number(item.enrolled_count || 0);
    const submitted = Number(item.submitted_count || 0);
    if (!enrolled) return 0;
    return Math.min(100, Math.max(0, Math.round((submitted / enrolled) * 100)));
}

export function AdminClassOperations({ user, classes, selectedClassId, setSelectedClassId, detail }: AdminClassOperationsProps) {
    const [activeTask, setActiveTask] = useState<AdminOperationTab>('attendance');
    const [assignmentFeed, setAssignmentFeed] = useState<AdminAssignmentItem[]>([]);
    const [assignmentLoading, setAssignmentLoading] = useState(false);
    const [assignmentError, setAssignmentError] = useState('');
    const [lastSyncedAt, setLastSyncedAt] = useState('');
    const assignmentEditorRef = useRef<HTMLDivElement>(null);
    const activeClasses = useMemo(() => classes.filter((item) => item.status !== 'completed' && item.status !== 'canceled' && item.status !== 'archived'), [classes]);
    const selectedClass = classes.find((item) => item.id === selectedClassId) ?? activeClasses[0] ?? null;
    const selectedTab = operationTabs.find((item) => item.id === activeTask) ?? operationTabs[0];
    const headers = useMemo(() => ({ 'Content-Type': 'application/json', 'x-user-id': String(user.id) }), [user.id]);

    const loadAdminAssignments = useCallback(async () => {
        setAssignmentLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/admin/assignments`, { headers });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Không thể đồng bộ danh sách bài tập.');
            setAssignmentFeed(data.assignments ?? []);
            setAssignmentError('');
            setLastSyncedAt(new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()));
        } catch (error) {
            setAssignmentError(error instanceof Error ? error.message : 'Không thể đồng bộ danh sách bài tập.');
        } finally {
            setAssignmentLoading(false);
        }
    }, [headers]);

    const assignmentStats = useMemo(() => {
        const teacherKeys = new Set(assignmentFeed.map((item) => item.teacher_id ? `id-${item.teacher_id}` : item.teacher_name || 'unknown'));
        return {
            total: assignmentFeed.length,
            teachers: teacherKeys.size,
            submitted: assignmentFeed.reduce((sum, item) => sum + Number(item.submitted_count || 0), 0),
            ungraded: assignmentFeed.reduce((sum, item) => sum + Number(item.ungraded_count || 0), 0),
        };
    }, [assignmentFeed]);

    const openAssignmentClass = (classId: number) => {
        setSelectedClassId(classId);
        window.setTimeout(() => {
            assignmentEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
    };

    useEffect(() => {
        if (!selectedClassId && activeClasses[0]?.id) {
            setSelectedClassId(activeClasses[0].id);
        }
    }, [activeClasses, selectedClassId, setSelectedClassId]);

    useEffect(() => {
        if (activeTask !== 'assignments') return;
        void loadAdminAssignments();
        const timer = window.setInterval(() => void loadAdminAssignments(), 20000);
        return () => window.clearInterval(timer);
    }, [activeTask, loadAdminAssignments]);

    return (
        <div className="mx-auto grid w-full max-w-7xl gap-5 pb-24 md:pb-8">
            <section className="overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
                <div className="p-4 sm:p-5">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">Vận hành lớp học</p>
                        <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] text-[var(--color-text)]">Điểm danh và giao bài trong cùng một nơi</h2>
                    </div>
                </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
                {operationTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTask === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTask(tab.id)}
                            className={`group flex flex-col justify-center min-h-[118px] gap-3 rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${isActive ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] hover:border-[var(--color-primary-border)]'}`}
                        >
                            <span className="flex items-center gap-3">
                                <span className={`grid h-10 w-10 place-items-center rounded-2xl ${isActive ? 'bg-white text-[var(--color-primary)]' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)]'}`}>
                                    <Icon size={18} strokeWidth={2.8} />
                                </span>
                                <span className="text-base font-black">{tab.label}</span>
                            </span>
                            </button>
                    );
                })}
            </div>

            <Panel title={selectedTab.label} noPadding>
                <div className="p-4 sm:p-5">
                    {activeTask === 'attendance' && (
                        <AttendancePanel
                            user={user}
                            classes={activeClasses}
                            selectedClassId={selectedClassId}
                            setSelectedClassId={setSelectedClassId}
                            embedded
                            groupByClass
                        />
                    )}
                    {activeTask === 'assignments' && (
                        <div className="grid gap-4">
                            <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">Theo dõi bài tập toàn hệ thống</p>
                                        <h3 className="mt-1 text-lg font-black text-[var(--color-text)]">Đã đồng bộ bài tập của tất cả giáo viên</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void loadAdminAssignments()}
                                        disabled={assignmentLoading}
                                        className="min-h-10 rounded-2xl bg-[var(--color-primary)] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {assignmentLoading ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
                                    </button>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <AssignmentMetric icon={BookIcon} label="Tổng bài tập" value={assignmentStats.total} />
                                    <AssignmentMetric icon={UsersIcon} label="Giáo viên có bài" value={assignmentStats.teachers} />
                                    <AssignmentMetric icon={CheckCircleIcon} label="Lượt đã nộp" value={assignmentStats.submitted} />
                                    <AssignmentMetric icon={ChartIcon} label="Bài chờ chấm" value={assignmentStats.ungraded} />
                                </div>

                                {lastSyncedAt && <p className="mt-3 text-[11px] font-bold text-[var(--color-text-muted)]">Đồng bộ lần cuối: {lastSyncedAt}</p>}
                                {assignmentError && <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-black text-red-700">{assignmentError}</p>}

                                <div className="mt-4 overflow-x-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)]">
                                    <table className="w-full min-w-[920px] border-collapse text-left text-xs">
                                        <thead className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]">
                                            <tr>
                                                <th className="px-4 py-3 font-black uppercase tracking-wide">Bài tập</th>
                                                <th className="px-4 py-3 font-black uppercase tracking-wide">Lớp</th>
                                                <th className="px-4 py-3 font-black uppercase tracking-wide">Giáo viên</th>
                                                <th className="px-4 py-3 font-black uppercase tracking-wide">Tiến độ nộp</th>
                                                <th className="px-4 py-3 font-black uppercase tracking-wide">Chấm điểm</th>
                                                <th className="px-4 py-3 font-black uppercase tracking-wide">Hạn nộp</th>
                                                <th className="px-4 py-3 font-black uppercase tracking-wide">Trạng thái</th>
                                                <th className="px-4 py-3 text-right font-black uppercase tracking-wide">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assignmentFeed.length ? assignmentFeed.map((item) => {
                                                const percent = getSubmittedPercent(item);
                                                return (
                                                    <tr key={item.id} className={`border-t border-[var(--color-border)] align-top transition ${selectedClassId === item.class_id ? 'bg-[var(--color-primary-soft)]/45' : ''}`}>
                                                        <td className="px-4 py-4">
                                                            <p className="max-w-[260px] truncate text-sm font-black text-[var(--color-text)]">{item.title}</p>
                                                            <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">{assignmentKindLabel(item.assignment_kind)} • {item.topic_title || 'Chưa gắn chủ đề'} • {item.max_score ?? 10} điểm</p>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <p className="font-black text-[var(--color-text)]">{item.class_name || 'Chưa có lớp'}</p>
                                                            <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">{item.class_code || '—'} • {item.class_subject || 'Chưa có môn'}</p>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <p className="font-black text-[var(--color-text)]">{item.teacher_name || 'Chưa phân công'}</p>
                                                            <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">Người tạo: {item.created_by_name || 'Hệ thống'}</p>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center justify-between gap-2 text-[11px] font-black text-[var(--color-text-secondary)]">
                                                                <span>{Number(item.submitted_count || 0)}/{Number(item.enrolled_count || 0)}</span>
                                                                <span>{percent}%</span>
                                                            </div>
                                                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-bg-soft)]">
                                                                <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${percent}%` }} />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <p className="font-black text-emerald-700">Đã chấm: {Number(item.graded_count || 0)}</p>
                                                            <p className="mt-1 font-black text-amber-700">Chờ chấm: {Number(item.ungraded_count || 0)}</p>
                                                        </td>
                                                        <td className="px-4 py-4 font-bold text-[var(--color-text-secondary)]">{formatAssignmentDate(item.due_date)}</td>
                                                        <td className="px-4 py-4"><Badge tone={assignmentStatusTone(item.status)}>{assignmentStatusLabel(item.status)}</Badge></td>
                                                        <td className="px-4 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const link = `${window.location.origin}/?exam=${item.id}`;
                                                                        if (navigator.clipboard) navigator.clipboard.writeText(link);
                                                                        alert(`Đã sao chép link làm bài tập:\n${link}`);
                                                                    }}
                                                                    className="rounded-2xl border border-[var(--color-border)] px-3 py-2 text-xs font-black text-slate-700 transition hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-soft)] dark:text-slate-300"
                                                                    title="Sao chép link làm bài gửi học sinh"
                                                                >
                                                                    📋 Link làm bài
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openAssignmentClass(item.class_id)}
                                                                    className="rounded-2xl border border-[var(--color-border)] px-3 py-2 text-xs font-black text-[var(--color-primary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
                                                                >
                                                                    {selectedClassId === item.class_id ? 'Đang mở' : 'Mở lớp'}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-10 text-center text-sm font-bold text-[var(--color-text-secondary)]">
                                                        {assignmentLoading ? 'Đang tải danh sách bài tập...' : 'Chưa có bài tập nào từ giáo viên.'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section ref={assignmentEditorRef} className="scroll-mt-24 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 shadow-sm">
                                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,380px)] lg:items-end">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">Chọn lớp trước khi tạo bài</p>
                                        <h3 className="mt-1 text-lg font-black text-[var(--color-text)]">Bài tập sẽ được thêm vào lớp đang chọn</h3>
                                    </div>
                                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                        Lớp học
                                        <select
                                            value={selectedClass?.id ?? ''}
                                            disabled={!activeClasses.length}
                                            onChange={(event) => setSelectedClassId(Number(event.target.value))}
                                            className="h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-black text-[var(--color-text)] shadow-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {!activeClasses.length && <option value="">Chưa có lớp</option>}
                                            {activeClasses.map((item) => (
                                                <option key={item.id} value={item.id}>{item.name} • {item.code}</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">Đang thêm vào</p>
                                    <p className="mt-1 text-sm font-black text-[var(--color-text)]">{selectedClass ? selectedClass.name : 'Chưa chọn lớp'}</p>
                                    <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-secondary)]">{selectedClass ? `${selectedClass.code} • ${selectedClass.subject || 'Chưa có môn học'} • ${selectedClass.student_count || 0} học sinh` : 'Hãy tạo lớp trước khi giao bài.'}</p>
                                </div>
                            </section>

                            <TeacherClasses
                                classes={selectedClass ? [selectedClass] : activeClasses}
                                selectedClassId={selectedClass?.id ?? selectedClassId}
                                setSelectedClassId={setSelectedClassId}
                                detail={detail}
                                teacherView="class"
                                initialTab="assignments"
                                hideClassTabs
                                user={user}
                                onClassworkChanged={loadAdminAssignments}
                            />
                        </div>
                    )}
                    {activeTask === 'question-bank' && (
                        <QuestionBankPanel
                            user={user}
                            classes={activeClasses}
                            selectedClassId={selectedClass?.id ?? selectedClassId}
                            setSelectedClassId={setSelectedClassId}
                        />
                    )}
                </div>
            </Panel>
        </div>
    );
}

function AssignmentMetric({ icon: Icon, label, value }: { icon: typeof BookIcon; label: string; value: number }) {
    return (
        <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Icon size={18} strokeWidth={2.8} /></span>
            <p className="mt-3 text-2xl font-black text-[var(--color-text)]">{value}</p>
            <p className="text-[11px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
        </article>
    );
}
