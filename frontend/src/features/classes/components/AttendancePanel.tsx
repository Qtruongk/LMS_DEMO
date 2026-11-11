import { useCallback, useEffect, useMemo, useState } from 'react';
import { Panel, PrimaryButton } from '../../../components/shared/ui';
import { ClockIcon, SearchIcon, XIcon, ChartIcon, CheckIcon } from '../../../components/shared/icons';
import type { ClassItem, User } from '../../../types';
import { API_URL } from '../../../services/api';
import { StudentAttendanceView } from './StudentAttendanceView';
import { formatStudentName, compareStudentNames } from '../../../utils/format';

type AttendanceStatus = 'present' | 'absent' | 'late';
type HomeworkStatus = '100' | 'incomplete' | 'none';

type StudentAttendanceRecord = {
    student_id: number;
    full_name: string;
    username: string;
    student_code: string;
    status: AttendanceStatus;
    note: string;
    homework_status?: HomeworkStatus | null;
    homework_note?: string;
};

type AttendancePanelProps = {
    user: User;
    classes: ClassItem[];
    selectedClassId: number | null;
    setSelectedClassId: (id: number) => void;
    embedded?: boolean;
    groupByClass?: boolean;
    hideNote?: boolean;
};

const today = new Date().toISOString().split('T')[0];

const statusOptions: { id: AttendanceStatus; label: string; activeClass: string; softClass: string }[] = [
    { id: 'present', label: 'Có mặt', activeClass: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20', softClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'late', label: 'Đi muộn', activeClass: 'bg-amber-600 text-white shadow-lg shadow-amber-600/20', softClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'absent', label: 'Vắng', activeClass: 'bg-red-600 text-white shadow-lg shadow-red-600/20', softClass: 'bg-red-50 text-red-700 border-red-200' },
];

const homeworkOptions: { id: HomeworkStatus; label: string; activeClass: string; softClass: string }[] = [
    { id: '100', label: 'Hoàn thành', activeClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20', softClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
    { id: 'incomplete', label: 'Chưa hoàn thành', activeClass: 'bg-amber-600 text-white shadow-md shadow-amber-600/20', softClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
    { id: 'none', label: 'Chưa nộp bài', activeClass: 'bg-rose-600 text-white shadow-md shadow-rose-600/20', softClass: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
];

export function AttendancePanel({ user, classes, selectedClassId, setSelectedClassId, embedded, hideNote }: AttendancePanelProps) {
    const isStudent = user.role === 'student';
    const effectiveClassId = selectedClassId ?? (classes[0] ? classes[0].id : null);
    const selectedClass = classes.find((item) => item.id === effectiveClassId) ?? classes[0];

    const [attendanceDate, setAttendanceDate] = useState(today);
    const [initialRecords, setInitialRecords] = useState<StudentAttendanceRecord[]>([]);
    const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [alertMsg, setAlertMsg] = useState('');
    const [searchStudent, setSearchStudent] = useState('');
    const [alreadySaved, setAlreadySaved] = useState(false);
    const [showSavePopup, setShowSavePopup] = useState(false);
    const [missingOnly, setMissingOnly] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
    const [selectedStatusModal, setSelectedStatusModal] = useState<AttendanceStatus | null>(null);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [copyNotification, setCopyNotification] = useState(false);

    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        'x-user-id': String(user.id),
    }), [user.id]);

    const loadClassAttendance = useCallback(async (classId: number, dateStr: string) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/attendance/class/${classId}?date=${dateStr}`, { headers });
            const data = await response.json();
            const loadedRecords = (data.records ?? []) as StudentAttendanceRecord[];
            setInitialRecords(JSON.parse(JSON.stringify(loadedRecords)));
            setRecords(loadedRecords);
            const isSaved = Boolean(data.has_saved || data.saved_count > 0);
            setAlreadySaved(isSaved);
        } catch (error) {
            console.error('Lỗi tải danh sách điểm danh:', error);
            setInitialRecords([]);
            setRecords([]);
            setAlreadySaved(false);
        } finally {
            setLoading(false);
        }
    }, [headers]);

    useEffect(() => {
        if (!selectedClassId && classes[0]?.id) {
            setSelectedClassId(classes[0].id);
        }
    }, [selectedClassId, classes, setSelectedClassId]);

    useEffect(() => {
        if (!isStudent && effectiveClassId) {
            loadClassAttendance(effectiveClassId, attendanceDate);
            setMissingOnly(false);
            setStatusFilter('all');
            setSearchStudent('');
        }
    }, [isStudent, effectiveClassId, attendanceDate, loadClassAttendance]);

    const hasUnsavedChanges = JSON.stringify(records) !== JSON.stringify(initialRecords);

    const stats = useMemo(() => ({
        present: records.filter((item) => item.status === 'present').length,
        absent: records.filter((item) => item.status === 'absent').length,
        late: records.filter((item) => item.status === 'late').length,
    }), [records]);

    const missingCount = stats.absent + stats.late;

    const filteredRecords = useMemo(() => records.filter((record) => {
        const keyword = searchStudent.trim().toLowerCase();
        const matchesKeyword = !keyword || [record.full_name, record.username, record.student_code, record.note].some((value) => value?.toLowerCase().includes(keyword));
        const matchesMissing = !missingOnly || record.status === 'absent' || record.status === 'late';
        const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
        return matchesKeyword && matchesMissing && matchesStatus;
    }), [records, searchStudent, missingOnly, statusFilter]);

    const updateStatus = (studentId: number, status: AttendanceStatus) => {
        setRecords((previous) => previous.map((record) => record.student_id === studentId ? { ...record, status, note: status === 'present' && record.note === 'Chưa điểm danh' ? 'Có mặt' : record.note } : record));
    };

    const updateNote = (studentId: number, note: string) => {
        setRecords((previous) => previous.map((record) => record.student_id === studentId ? { ...record, note } : record));
    };

    const updateHomework = (studentId: number, hwStatus: HomeworkStatus) => {
        setRecords((previous) => previous.map((record) => record.student_id === studentId ? { ...record, homework_status: record.homework_status === hwStatus ? null : hwStatus } : record));
    };

    const markAllPresent = () => {
        setRecords((previous) => previous.map((record) => ({ ...record, status: 'present', note: record.note || 'Có mặt' })));
    };

    const sortedFilteredRecords = useMemo(() => {
        return [...filteredRecords].sort((a, b) => compareStudentNames(a.full_name, b.full_name));
    }, [filteredRecords]);

    const attendanceSummaryText = useMemo(() => {
        const dParts = attendanceDate.split('-');
        const formattedDate = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}/${dParts[0]}` : attendanceDate;
        const cName = selectedClass?.name || 'LỚP HỌC';

        const absentStudents = records.filter(r => r.status === 'absent').map(r => formatStudentName(r.full_name));
        const lateStudents = records.filter(r => r.status === 'late').map(r => formatStudentName(r.full_name));

        let detailText = 'Lớp đi học đầy đủ.';
        if (absentStudents.length > 0 && lateStudents.length > 0) {
            detailText = `Lớp đi học đầy đủ ngoại trừ ${absentStudents.join(', ')} vắng và ${lateStudents.join(', ')} đi trễ`;
        } else if (absentStudents.length > 0) {
            detailText = `Lớp đi học đầy đủ ngoại trừ ${absentStudents.join(', ')} vắng`;
        } else if (lateStudents.length > 0) {
            detailText = `Lớp đi học đầy đủ ngoại trừ ${lateStudents.join(', ')} đi trễ`;
        }

        return `ĐIỂM DANH LỚP [${cName.toUpperCase()}] NGÀY [${formattedDate}]\n${detailText}`;
    }, [selectedClass?.name, attendanceDate, records]);

    const handleCopySummary = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(attendanceSummaryText);
        }
        setCopyNotification(true);
        setTimeout(() => setCopyNotification(false), 2500);
    };

    const handleSaveAttendance = async () => {
        if (!effectiveClassId || !attendanceDate) return;
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/api/attendance/save`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    class_id: effectiveClassId,
                    date: attendanceDate,
                    records: records.map((record) => ({
                        student_id: record.student_id,
                        status: record.status,
                        note: record.note,
                        homework_status: record.homework_status,
                    })),
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                alert(data.message || 'Lỗi lưu điểm danh');
                return;
            }
            setInitialRecords(JSON.parse(JSON.stringify(records)));
            setAlreadySaved(true);
            setMissingOnly(false);
            setSearchStudent('');
            setAlertMsg(data.message || 'Đã lưu điểm danh thành công.');
            setShowSavePopup(true);
            setTimeout(() => setAlertMsg(''), 3500);
        } catch (error) {
            console.error('Lỗi lưu điểm danh:', error);
            alert('Không thể lưu điểm danh. Vui lòng thử lại sau.');
        } finally {
            setSaving(false);
        }
    };

    if (isStudent) {
        return <StudentAttendanceView classes={classes} />;
    }

    const className = selectedClass?.name || 'Chưa có lớp trong cơ sở dữ liệu';
    const classCode = selectedClass?.code || 'DB-EMPTY';

    return (
        <div className="grid gap-4 pb-8">
            {alertMsg && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-800 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                    <span>{alertMsg}</span>
                    <button type="button" onClick={() => setAlertMsg('')} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-emerald-800 transition hover:bg-white dark:bg-white/10 dark:text-emerald-100">×</button>
                </div>
            )}

            {embedded ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 shadow-xs">
                    <div className="flex items-center gap-2">
                        <ClockIcon size={16} className="text-[var(--color-primary)] shrink-0" />
                        <span className="text-xs font-black text-[var(--color-text)]">Ngày điểm danh:</span>
                    </div>
                    <input
                        type="date"
                        value={attendanceDate}
                        onChange={(event) => setAttendanceDate(event.target.value)}
                        className="min-h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-black text-slate-950 outline-none transition focus:border-[var(--color-primary)] dark:bg-white dark:text-slate-950"
                    />
                </div>
            ) : (
                <section className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                                <ClockIcon size={24} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">{user.role === 'admin' ? 'Quản lý đào tạo' : 'Điểm danh giảng viên'}</p>
                                <h2 className="text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">Điểm danh siêu tốc: {className}</h2>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={effectiveClassId ?? ''}
                                onChange={(event) => setSelectedClassId(Number(event.target.value))}
                                className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-white px-3 text-xs font-black text-slate-950 outline-none transition focus:border-[var(--color-primary)] dark:bg-white dark:text-slate-950"
                            >
                                {classes.length ? classes.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                                )) : <option value="">Chưa có lớp trong cơ sở dữ liệu</option>}
                            </select>
                            <input
                                type="date"
                                value={attendanceDate}
                                onChange={(event) => setAttendanceDate(event.target.value)}
                                className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-white px-3 text-xs font-black text-slate-950 outline-none transition focus:border-[var(--color-primary)] dark:bg-white dark:text-slate-950"
                            />
                        </div>
                    </div>
                </section>
            )}

            {alreadySaved && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs font-bold text-emerald-800 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-xs">✓</span>
                        <span>Lớp <b>{className}</b> ({classCode}) đã có dữ liệu điểm danh ngày <b>{attendanceDate}</b>. Bạn có thể cập nhật trực tiếp danh sách bên dưới và bấm "Save điểm danh" để lưu thay đổi.</span>
                    </div>
                </div>
            )}

            {/* Định dạng thông báo điểm danh */}
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">
                        Thông báo nhanh
                    </span>
                    <button
                        type="button"
                        onClick={handleCopySummary}
                        className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:opacity-90 cursor-pointer"
                    >
                        <CheckIcon size={14} />
                        {copyNotification ? 'Đã sao chép!' : 'Sao chép'}
                    </button>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3.5 text-xs font-mono font-bold leading-relaxed text-[var(--color-text)] whitespace-pre-line select-all">
                    {attendanceSummaryText}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <StatCard
                    title="Có mặt"
                    value={stats.present}
                    description={`${records.length ? Math.round((stats.present / records.length) * 100) : 0}% tổng số`}
                    tone="emerald"
                    isActive={statusFilter === 'present'}
                    onClick={() => setSelectedStatusModal('present')}
                />
                <StatCard
                    title="Đi muộn"
                    value={stats.late}
                    description="Cần ghi chú lý do"
                    tone="amber"
                    isActive={statusFilter === 'late'}
                    onClick={() => setSelectedStatusModal('late')}
                />
                <StatCard
                    title="Vắng"
                    value={stats.absent}
                    description="Ưu tiên cập nhật"
                    tone="red"
                    isActive={statusFilter === 'absent'}
                    onClick={() => setSelectedStatusModal('absent')}
                />
            </div>

            <div id="attendance-student-list">
                <Panel
                    title={
                        statusFilter !== 'all'
                            ? `Danh sách học sinh - ${statusFilter === 'present' ? 'Có mặt' : statusFilter === 'late' ? 'Đi muộn' : 'Vắng'} (${filteredRecords.length}/${records.length})`
                            : missingOnly
                                ? `Danh sách học sinh thiếu (${filteredRecords.length}/${records.length})`
                                : `Danh sách học sinh điểm danh (${filteredRecords.length}/${records.length})`
                    }
                >
                    <div className="mb-4 flex flex-col gap-3">
                        <div className="relative w-full">
                            <SearchIcon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                            <input
                                type="text"
                                value={searchStudent}
                                onChange={(event) => setSearchStudent(event.target.value)}
                                placeholder="Tìm tên, mã học sinh..."
                                className="min-h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-white dark:text-slate-950"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-1 text-xs font-black">
                                <button
                                    type="button"
                                    onClick={() => { setStatusFilter('all'); setMissingOnly(false); }}
                                    className={`rounded-xl px-3 py-1.5 transition ${statusFilter === 'all' && !missingOnly ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                >
                                    Tất cả ({records.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setStatusFilter('present'); setMissingOnly(false); }}
                                    className={`rounded-xl px-3 py-1.5 transition ${statusFilter === 'present' ? 'bg-emerald-600 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                >
                                    Có mặt ({stats.present})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setStatusFilter('late'); setMissingOnly(false); }}
                                    className={`rounded-xl px-3 py-1.5 transition ${statusFilter === 'late' ? 'bg-amber-600 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                >
                                    Đi muộn ({stats.late})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setStatusFilter('absent'); setMissingOnly(false); }}
                                    className={`rounded-xl px-3 py-1.5 transition ${statusFilter === 'absent' ? 'bg-red-600 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                >
                                    Vắng ({stats.absent})
                                </button>
                            </div>

                            <button type="button" onClick={markAllPresent} className="min-h-11 rounded-2xl bg-emerald-600 px-4 text-xs font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700">Tất cả có mặt</button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMissingOnly((value) => !value);
                                    setStatusFilter('all');
                                }}
                                className={`min-h-11 rounded-2xl border px-4 text-xs font-black transition ${missingOnly ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)]'}`}
                            >
                                {missingOnly ? 'Đang xem em thiếu' : `Xem thiếu (${missingCount})`}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowStatsModal(true)}
                                className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 text-xs font-black text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                            >
                                <ChartIcon size={16} />
                                Thống kê
                            </button>
                        </div>
                    </div>

                    {(statusFilter !== 'all' || missingOnly) && (
                        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-xs font-bold text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                            <div className="flex items-center gap-2">
                                <span className="inline-block h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                                <span>
                                    Đang lọc: <b>{missingOnly ? 'Học sinh thiếu (Đi muộn / Vắng)' : statusFilter === 'present' ? 'Có mặt' : statusFilter === 'late' ? 'Đi muộn' : 'Vắng'}</b> ({filteredRecords.length}/{records.length} học sinh)
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setStatusFilter('all'); setMissingOnly(false); }}
                                className="rounded-xl bg-white px-3 py-1 font-black text-blue-700 shadow-xs transition hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-200"
                            >
                                Xóa lọc (Xem tất cả)
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="grid gap-3">
                            {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-3xl bg-[var(--color-bg-soft)]" />)}
                        </div>
                    ) : sortedFilteredRecords.length ? (
                        <div className="grid gap-4">
                            {sortedFilteredRecords.map((record, index) => {
                                const changed = initialRecords.some(
                                    (item) =>
                                        item.student_id === record.student_id &&
                                        (item.status !== record.status ||
                                            item.note !== record.note ||
                                            item.homework_status !== record.homework_status)
                                );
                                return (
                                    <article
                                        key={record.student_id}
                                        className={`rounded-2xl border p-4 shadow-sm transition ${
                                            changed
                                                ? 'border-amber-300 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10'
                                                : 'border-[var(--color-border)] bg-[var(--color-card)]'
                                        }`}
                                    >
                                        {/* 1. Thông tin học sinh */}
                                        <div className="flex items-center gap-3 mb-3 pb-2.5 border-b border-[var(--color-border)]/60">
                                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-xs font-black text-[var(--color-primary)]">
                                                {index + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="truncate text-sm font-black text-[var(--color-text)]">
                                                    {formatStudentName(record.full_name || record.username)}
                                                </h3>
                                                <p className="truncate text-[11px] font-semibold text-[var(--color-text-muted)]">
                                                    {record.student_code || 'Chưa có mã'} • @{record.username}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 2. Hai cụm: Điểm danh (trái) và Bài tập về nhà (phải) */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 sm:divide-x sm:divide-[var(--color-border)]/60">
                                            {/* Điểm danh */}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                                                        Điểm danh
                                                    </span>
                                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
                                                        {record.status === 'present' ? 'Có mặt' : record.status === 'late' ? 'Đi muộn' : 'Vắng'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1.5">
                                                    {statusOptions.map((status) => (
                                                        <button
                                                            key={status.id}
                                                            type="button"
                                                            onClick={() => updateStatus(record.student_id, status.id)}
                                                            className={`min-h-10 rounded-xl border px-1.5 text-center text-xs font-black transition cursor-pointer ${
                                                                record.status === status.id
                                                                    ? status.activeClass
                                                                    : `${status.softClass} hover:scale-[1.02]`
                                                            }`}
                                                        >
                                                            {status.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                {!hideNote && (
                                                    <input
                                                        type="text"
                                                        value={record.note || ''}
                                                        onChange={(event) => updateNote(record.student_id, event.target.value)}
                                                        placeholder="Ghi chú: lý do..."
                                                        className="min-h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] dark:bg-white dark:text-slate-950"
                                                    />
                                                )}
                                            </div>

                                            {/* Bài tập về nhà */}
                                            <div className="flex flex-col gap-2 sm:pl-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                                                        Bài tập về nhà
                                                    </span>
                                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
                                                        {record.homework_status === '100'
                                                            ? 'Hoàn thành'
                                                            : record.homework_status === 'incomplete'
                                                            ? 'Chưa hoàn thành'
                                                            : record.homework_status === 'none'
                                                            ? 'Chưa nộp bài'
                                                            : 'Chưa đánh giá'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1.5">
                                                    {homeworkOptions.map((hw) => (
                                                        <button
                                                            key={hw.id}
                                                            type="button"
                                                            onClick={() => updateHomework(record.student_id, hw.id)}
                                                            className={`min-h-10 rounded-xl border px-1 text-center text-[11px] font-black transition cursor-pointer ${
                                                                record.homework_status === hw.id
                                                                    ? hw.activeClass
                                                                    : `${hw.softClass} hover:scale-[1.02]`
                                                            }`}
                                                        >
                                                            {hw.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] p-8 text-center">
                            <h3 className="text-lg font-black text-[var(--color-text)]">
                                {missingOnly
                                    ? 'Không có học sinh nào vắng hoặc đi muộn'
                                    : statusFilter !== 'all'
                                        ? `Không có học sinh nào thuộc trạng thái "${statusFilter === 'present' ? 'Có mặt' : statusFilter === 'late' ? 'Đi muộn' : 'Vắng'}"`
                                        : 'Không có học sinh phù hợp'}
                            </h3>
                            {(missingOnly || statusFilter !== 'all') && (
                                <button
                                    type="button"
                                    onClick={() => { setMissingOnly(false); setStatusFilter('all'); }}
                                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95"
                                >
                                    Xem toàn bộ danh sách lớp ({records.length} học sinh)
                                </button>
                            )}
                        </div>
                    )}

                    <div className="mt-5 grid gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
                        <p className="text-xs font-bold text-[var(--color-text-secondary)]">{hasUnsavedChanges ? 'Có thay đổi chưa lưu. Bấm Save để lưu điểm danh.' : 'Danh sách hiện đã đồng bộ. Bấm Save để hoàn tất lưu.'}</p>
                        <div className="flex justify-end">
                            <PrimaryButton type="button" onClick={handleSaveAttendance} disabled={saving} className="min-h-12 px-8 text-sm font-black">
                                {saving ? 'Đang lưu...' : 'Save điểm danh'}
                            </PrimaryButton>
                        </div>
                    </div>
                </Panel>
            </div>

            {showSavePopup && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center">
                    <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Đã lưu thành công</p>
                                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">{className}</h2>
                            </div>
                            <button type="button" onClick={() => setShowSavePopup(false)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-950" aria-label="Đóng popup">
                                <XIcon size={18} />
                            </button>
                        </div>
                        <div className="mt-5 grid grid-cols-3 gap-2">
                            <StatPill label="Có mặt" value={stats.present} tone="emerald" />
                            <StatPill label="Muộn" value={stats.late} tone="amber" />
                            <StatPill label="Vắng" value={stats.absent} tone="red" />
                        </div>
                        <PrimaryButton type="button" onClick={() => setShowSavePopup(false)} className="mt-5 min-h-12 w-full text-sm font-black">Đã hiểu</PrimaryButton>
                    </div>
                </div>
            )}

            <AttendanceStatsModal
                isOpen={showStatsModal}
                onClose={() => setShowStatsModal(false)}
                className={className}
                classId={effectiveClassId}
                headers={headers}
            />

            {selectedStatusModal && (
                <StatusStudentListModal
                    isOpen={Boolean(selectedStatusModal)}
                    onClose={() => setSelectedStatusModal(null)}
                    currentStatus={selectedStatusModal}
                    onChangeStatus={(newStatus) => setSelectedStatusModal(newStatus)}
                    records={records}
                    className={className}
                    classCode={classCode}
                    attendanceDate={attendanceDate}
                    stats={stats}
                    onUpdateStatus={updateStatus}
                    onApplyFilterToTable={(status) => {
                        setStatusFilter(status);
                        setMissingOnly(false);
                        setSelectedStatusModal(null);
                        const el = document.getElementById('attendance-student-list');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                />
            )}
        </div>
    );
}

function StatCard({
    title,
    value,
    description,
    tone,
    isActive = false,
    onClick,
}: {
    title: string;
    value: number;
    description: string;
    tone: 'emerald' | 'amber' | 'red' | 'blue';
    isActive?: boolean;
    onClick?: () => void;
}) {
    const toneMap = {
        emerald: {
            base: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
            hover: 'hover:border-emerald-300 hover:shadow-emerald-500/10',
            active: 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-100/80 dark:bg-emerald-500/20',
            badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        },
        amber: {
            base: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
            hover: 'hover:border-amber-300 hover:shadow-amber-500/10',
            active: 'ring-2 ring-amber-500 border-amber-400 bg-amber-100/80 dark:bg-amber-500/20',
            badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        },
        red: {
            base: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
            hover: 'hover:border-red-300 hover:shadow-red-500/10',
            active: 'ring-2 ring-red-500 border-red-400 bg-red-100/80 dark:bg-red-500/20',
            badge: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
        },
        blue: {
            base: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
            hover: 'hover:border-blue-300 hover:shadow-blue-500/10',
            active: 'ring-2 ring-blue-500 border-blue-400 bg-blue-100/80 dark:bg-blue-500/20',
            badge: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
        },
    };

    const cfg = toneMap[tone];

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.();
                }
            }}
            className={`group relative cursor-pointer rounded-3xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] select-none ${cfg.base} ${cfg.hover} ${isActive ? cfg.active : ''}`}
            title={`Nhấn để xem danh sách học sinh: ${title}`}
        >
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-wide opacity-80">{title}</p>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-black transition-all group-hover:scale-105 ${cfg.badge}`}>
                    <span>Xem danh sách ({value})</span>
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
            </div>
            <p className="mt-1 text-3xl font-black">{value}</p>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs font-bold opacity-75">
                <p>{description}</p>
                {isActive && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Đang lọc trên bảng ✓
                    </span>
                )}
            </div>
        </div>
    );
}

function StatusStudentListModal({
    isOpen,
    onClose,
    currentStatus,
    onChangeStatus,
    records,
    className,
    classCode,
    attendanceDate,
    stats,
    onUpdateStatus,
    onApplyFilterToTable,
}: {
    isOpen: boolean;
    onClose: () => void;
    currentStatus: AttendanceStatus;
    onChangeStatus: (status: AttendanceStatus) => void;
    records: StudentAttendanceRecord[];
    className: string;
    classCode: string;
    attendanceDate: string;
    stats: { present: number; absent: number; late: number };
    onUpdateStatus: (studentId: number, status: AttendanceStatus) => void;
    onApplyFilterToTable: (status: AttendanceStatus) => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const statusConfig = {
        present: {
            title: 'Có mặt',
            badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
            activeTab: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20',
            count: stats.present,
            emptyText: 'Chưa có học sinh nào được đánh dấu có mặt trong buổi học này.',
        },
        late: {
            title: 'Đi muộn',
            badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
            activeTab: 'bg-amber-600 text-white shadow-md shadow-amber-600/20',
            count: stats.late,
            emptyText: 'Không có học sinh nào đi muộn trong buổi học này.',
        },
        absent: {
            title: 'Vắng',
            badgeBg: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300',
            activeTab: 'bg-red-600 text-white shadow-md shadow-red-600/20',
            count: stats.absent,
            emptyText: 'Tuyệt vời! Không có học sinh nào vắng mặt trong buổi học này.',
        },
    }[currentStatus];

    const matchingStudents = records.filter((r) => r.status === currentStatus);
    const displayedStudents = matchingStudents.filter((r) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return [r.full_name, r.username, r.student_code, r.note].some((v) => v?.toLowerCase().includes(q));
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] p-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-black uppercase tracking-wider ${statusConfig.badgeBg}`}>
                                {statusConfig.title}
                            </span>
                            <span className="text-xs font-bold text-[var(--color-text-muted)]">
                                ({matchingStudents.length} học sinh)
                            </span>
                        </div>
                        <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-[var(--color-text)] sm:text-2xl">
                            Danh sách học sinh {statusConfig.title.toLowerCase()}
                        </h2>
                        <p className="mt-0.5 text-xs font-bold text-[var(--color-text-secondary)]">
                            Lớp: <b>{className}</b> ({classCode}) • Ngày: <b>{attendanceDate}</b>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)] transition hover:bg-[var(--color-border)]"
                        aria-label="Đóng"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                {/* Status Switcher Tabs */}
                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3">
                    <span className="text-xs font-bold text-[var(--color-text-muted)] pl-1">Xem trạng thái:</span>
                    <button
                        type="button"
                        onClick={() => onChangeStatus('present')}
                        className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${currentStatus === 'present' ? 'bg-emerald-600 text-white shadow-sm' : 'border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}`}
                    >
                        Có mặt ({stats.present})
                    </button>
                    <button
                        type="button"
                        onClick={() => onChangeStatus('late')}
                        className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${currentStatus === 'late' ? 'bg-amber-600 text-white shadow-sm' : 'border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] hover:bg-amber-50 dark:hover:bg-amber-950/30'}`}
                    >
                        Đi muộn ({stats.late})
                    </button>
                    <button
                        type="button"
                        onClick={() => onChangeStatus('absent')}
                        className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${currentStatus === 'absent' ? 'bg-red-600 text-white shadow-sm' : 'border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] hover:bg-red-50 dark:hover:bg-red-950/30'}`}
                    >
                        Vắng ({stats.absent})
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 pb-2 border-b border-[var(--color-border)]">
                    <div className="relative">
                        <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm học sinh theo tên, mã số, ghi chú..."
                            className="min-h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white pl-10 pr-4 text-xs font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-white dark:text-slate-950"
                        />
                    </div>
                </div>

                {/* Students list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {displayedStudents.length > 0 ? (
                        displayedStudents.map((student, index) => (
                            <div
                                key={student.student_id}
                                className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3.5 transition hover:border-[var(--color-primary)]/40 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-xs font-black text-[var(--color-primary)]">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-[var(--color-text)]">
                                            {student.full_name || student.username}
                                        </p>
                                        <p className="truncate text-xs font-bold text-[var(--color-text-muted)]">
                                            {student.student_code || 'Chưa có mã'} • @{student.username}
                                        </p>
                                        {student.note && (
                                            <p className="mt-0.5 truncate text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                                Ghi chú: {student.note}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    {statusOptions.map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => onUpdateStatus(student.student_id, opt.id)}
                                            className={`rounded-xl border px-2.5 py-1 text-[11px] font-black transition ${student.status === opt.id ? opt.activeClass : `${opt.softClass} hover:scale-105`}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center">
                            <p className="text-sm font-bold text-[var(--color-text-secondary)]">
                                {searchQuery ? `Không tìm thấy học sinh nào khớp với "${searchQuery}"` : statusConfig.emptyText}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-2 border-t border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-bold text-[var(--color-text-muted)]">
                        Hiển thị <b>{displayedStudents.length}</b> / <b>{matchingStudents.length}</b> học sinh
                    </p>
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            type="button"
                            onClick={() => onApplyFilterToTable(currentStatus)}
                            className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 text-xs font-black text-[var(--color-text)] transition hover:bg-[var(--color-border)]"
                        >
                            Lọc trên bảng chính
                        </button>
                        <PrimaryButton
                            type="button"
                            onClick={onClose}
                            className="min-h-11 px-5 text-xs font-black"
                        >
                            Đóng
                        </PrimaryButton>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'amber' | 'red' | 'blue' }) {
    const toneMap = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
    };

    return (
        <div className={`rounded-2xl border p-3 text-center ${toneMap[tone]}`}>
            <p className="text-xl font-black">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-wide">{label}</p>
        </div>
    );
}

type AbsentDateItem = {
    date: string;
    status: string;
    status_text?: string;
    note?: string;
    session_id?: number | null;
    session_title?: string | null;
    start_time?: string | null;
    end_time?: string | null;
};

type StudentStatItem = {
    student_id: number;
    full_name: string;
    username: string;
    student_code: string;
    present_count: number;
    absent_count: number;
    late_count: number;
    total_recorded: number;
    rate: number;
    category: 'good' | 'warning' | 'danger';
    absent_dates?: AbsentDateItem[];
    late_dates?: AbsentDateItem[];
    attendance_history?: AbsentDateItem[];
};

type ClassStatsResponse = {
    class_id: number;
    summary: {
        total_students: number;
        total_sessions: number;
        good_count: number;
        warning_count: number;
        danger_count: number;
    };
    students: StudentStatItem[];
};

function formatDateVN(dateStr: string) {
    if (!dateStr) return '';
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

function AttendanceStatsModal({
    isOpen,
    onClose,
    className,
    classId,
    headers,
}: {
    isOpen: boolean;
    onClose: () => void;
    className: string;
    classId: number | null;
    headers: Record<string, string>;
}) {
    const [statsData, setStatsData] = useState<ClassStatsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [filterCategory, setFilterCategory] = useState<'all' | 'danger' | 'warning' | 'good'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<StudentStatItem | null>(null);
    const [studentDetailLoading, setStudentDetailLoading] = useState(false);
    const [studentDetailData, setStudentDetailData] = useState<{
        student?: { id: number; full_name: string; username: string; student_code: string; phone?: string | null };
        summary?: { total_recorded: number; present_count: number; absent_count: number; late_count: number; rate: number };
        absent_dates?: AbsentDateItem[];
        late_dates?: AbsentDateItem[];
        records?: AbsentDateItem[];
    } | null>(null);

    useEffect(() => {
        if (!isOpen || !classId) return;
        let isMounted = true;
        setLoading(true);

        fetch(`${API_URL}/api/attendance/class/${classId}/stats`, { headers })
            .then((res) => res.json())
            .then((data) => {
                if (isMounted) {
                    setStatsData(data);
                }
            })
            .catch((err) => {
                console.error('Lỗi tải thống kê điểm danh:', err);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, classId, headers]);

    // Reset drill-down selection when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedStudent(null);
            setStudentDetailData(null);
        }
    }, [isOpen]);

    const handleSelectStudent = (st: StudentStatItem) => {
        setSelectedStudent(st);
        setStudentDetailLoading(true);
        fetch(`${API_URL}/api/attendance/class/${classId}/student/${st.student_id}`, { headers })
            .then((res) => res.json())
            .then((data) => {
                setStudentDetailData(data);
            })
            .catch((err) => {
                console.error('Lỗi truy xuất dữ liệu học sinh:', err);
            })
            .finally(() => {
                setStudentDetailLoading(false);
            });
    };

    if (!isOpen) return null;

    const summary = statsData?.summary || {
        total_students: 0,
        total_sessions: 0,
        good_count: 0,
        warning_count: 0,
        danger_count: 0,
    };

    const students = statsData?.students || [];

    const filteredStudents = students.filter((s) => {
        const matchesCategory = filterCategory === 'all' || s.category === filterCategory;
        const q = searchQuery.trim().toLowerCase();
        const matchesQuery = !q || [s.full_name, s.username, s.student_code].some((v) => v?.toLowerCase().includes(q));
        return matchesCategory && matchesQuery;
    });

    // Resolved student data for drilldown
    const activeAbsentDates = studentDetailData?.absent_dates ?? selectedStudent?.absent_dates ?? [];
    const activeLateDates = studentDetailData?.late_dates ?? selectedStudent?.late_dates ?? [];
    const activeHistory = studentDetailData?.records ?? selectedStudent?.attendance_history ?? [];
    const activeRate = studentDetailData?.summary?.rate ?? selectedStudent?.rate ?? 0;
    const activePresentCount = studentDetailData?.summary?.present_count ?? selectedStudent?.present_count ?? 0;
    const activeAbsentCount = studentDetailData?.summary?.absent_count ?? selectedStudent?.absent_count ?? 0;
    const activeLateCount = studentDetailData?.summary?.late_count ?? selectedStudent?.late_count ?? 0;
    const activeTotalRecorded = studentDetailData?.summary?.total_recorded ?? selectedStudent?.total_recorded ?? 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-sm">
            <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl">
                {/* Header - STRICTLY NO SUBTITLE */}
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3 min-w-0">
                        {selectedStudent ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedStudent(null);
                                    setStudentDetailData(null);
                                }}
                                className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-xs font-black text-[var(--color-text)] transition hover:bg-[var(--color-border)]"
                            >
                                ← Quay lại danh sách
                            </button>
                        ) : (
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <ChartIcon size={20} />
                            </span>
                        )}
                        <h2 className="truncate text-lg font-black text-[var(--color-text)] sm:text-xl">
                            {selectedStudent ? `Dữ liệu điểm danh: ${selectedStudent.full_name}` : `Thống kê điểm danh: ${className}`}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)] transition hover:bg-[var(--color-border)]"
                        aria-label="Đóng"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                {/* Content body */}
                <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                    {selectedStudent ? (
                        /* STUDENT ATTENDANCE DRILL-DOWN VIEW */
                        <div className="space-y-5 animate-in fade-in duration-200">
                            {/* Student Profile Card */}
                            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-5">
                                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-lg font-black text-white shadow-md shadow-indigo-600/20">
                                            {selectedStudent.full_name.charAt(0).toUpperCase()}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-xl font-black text-[var(--color-text)]">{selectedStudent.full_name}</h3>
                                                <span
                                                    className={`rounded-md border px-2.5 py-0.5 text-xs font-black ${
                                                        selectedStudent.category === 'danger'
                                                            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300'
                                                            : selectedStudent.category === 'warning'
                                                            ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300'
                                                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                    }`}
                                                >
                                                    {selectedStudent.category === 'danger'
                                                        ? `Vắng nhiều (${activeAbsentCount} buổi)`
                                                        : selectedStudent.category === 'warning'
                                                        ? `Vắng ít (${activeAbsentCount} buổi)`
                                                        : 'Học đều'}
                                                </span>
                                            </div>
                                            <p className="truncate text-xs font-bold text-[var(--color-text-muted)]">
                                                Mã HS: <span className="font-mono text-[var(--color-text)]">{selectedStudent.student_code || 'Chưa có'}</span> • @{selectedStudent.username}
                                                {studentDetailData?.student?.phone ? ` • SĐT: ${studentDetailData.student.phone}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-center">
                                            <p className="text-xl font-black text-slate-800 dark:text-slate-200">{activeTotalRecorded}</p>
                                            <p className="text-[10px] font-black uppercase text-[var(--color-text-muted)]">Tổng buổi</p>
                                        </div>
                                        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-center">
                                            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{activeRate}%</p>
                                            <p className="text-[10px] font-black uppercase text-[var(--color-text-muted)]">Chuyên cần</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                        <p className="text-xl font-black text-emerald-800 dark:text-emerald-200">{activePresentCount}</p>
                                        <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">Có mặt</p>
                                    </div>
                                    <div className="rounded-2xl border border-red-200 bg-red-50/70 p-3 text-center dark:border-red-900/40 dark:bg-red-950/20">
                                        <p className="text-xl font-black text-red-800 dark:text-red-200">{activeAbsentCount}</p>
                                        <p className="text-[10px] font-black uppercase text-red-700 dark:text-red-300">Nghỉ / Vắng</p>
                                    </div>
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
                                        <p className="text-xl font-black text-amber-800 dark:text-amber-200">{activeLateCount}</p>
                                        <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300">Đi muộn</p>
                                    </div>
                                </div>
                            </div>

                            {studentDetailLoading ? (
                                <div className="grid gap-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-16 animate-pulse rounded-2xl bg-[var(--color-bg-soft)]" />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    {/* SECTION 1: CÁC NGÀY NGHỈ (VẮNG) */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-base font-black text-[var(--color-text)] flex items-center gap-2">
                                                <span className="flex h-3 w-3 rounded-full bg-red-500" />
                                                Danh sách ngày nghỉ ({activeAbsentDates.length} buổi)
                                            </h3>
                                        </div>

                                        {activeAbsentDates.length === 0 ? (
                                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs font-bold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300 flex items-center gap-2">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black">✓</span>
                                                <span>Học sinh không có buổi nghỉ nào trong các buổi học đã ghi nhận (Chuyên cần 100%).</span>
                                            </div>
                                        ) : (
                                            <div className="grid gap-2.5">
                                                {activeAbsentDates.map((absentItem, idx) => (
                                                    <div
                                                        key={`${absentItem.date}-${idx}`}
                                                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4 transition dark:border-red-900/50 dark:bg-red-950/20"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-600 text-xs font-black text-white">
                                                                {idx + 1}
                                                            </span>
                                                            <div>
                                                                <p className="text-sm font-black text-red-900 dark:text-red-200">
                                                                    Ngày nghỉ: {formatDateVN(absentItem.date)}
                                                                </p>
                                                                <p className="text-xs font-bold text-red-700 dark:text-red-300">
                                                                    {absentItem.session_title ? `Buổi học: ${absentItem.session_title}` : 'Buổi học tiêu chuẩn'}
                                                                    {absentItem.note ? ` • Ghi chú: ${absentItem.note}` : ' • Không có ghi chú lý do'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="rounded-xl border border-red-300 bg-red-600 px-3 py-1 text-xs font-black text-white shadow-sm shadow-red-600/20">
                                                            Vắng mặt
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* SECTION 2: CÁC NGÀY ĐI MUỘN (NẾU CÓ) */}
                                    {activeLateDates.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-base font-black text-[var(--color-text)] flex items-center gap-2">
                                                <span className="flex h-3 w-3 rounded-full bg-amber-500" />
                                                Danh sách ngày đi muộn ({activeLateDates.length} buổi)
                                            </h3>
                                            <div className="grid gap-2.5">
                                                {activeLateDates.map((lateItem, idx) => (
                                                    <div
                                                        key={`${lateItem.date}-${idx}`}
                                                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 transition dark:border-amber-900/50 dark:bg-amber-950/20"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-xs font-black text-white">
                                                                {idx + 1}
                                                            </span>
                                                            <div>
                                                                <p className="text-sm font-black text-amber-900 dark:text-amber-200">
                                                                    Ngày đi muộn: {formatDateVN(lateItem.date)}
                                                                </p>
                                                                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                                                    {lateItem.session_title ? `Buổi học: ${lateItem.session_title}` : 'Buổi học tiêu chuẩn'}
                                                                    {lateItem.note ? ` • Ghi chú: ${lateItem.note}` : ' • Không có ghi chú'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="rounded-xl border border-amber-300 bg-amber-500 px-3 py-1 text-xs font-black text-white shadow-sm shadow-amber-500/20">
                                                            Đi muộn
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* SECTION 3: LỊCH SỬ ĐIỂM DANH TẤT CẢ CÁC BUỔI */}
                                    <div className="space-y-3">
                                        <h3 className="text-base font-black text-[var(--color-text)] flex items-center gap-2">
                                            <span className="flex h-3 w-3 rounded-full bg-indigo-500" />
                                            Lịch sử điểm danh toàn bộ ({activeHistory.length} buổi)
                                        </h3>

                                        {activeHistory.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center text-xs font-bold text-[var(--color-text-muted)]">
                                                Chưa có dữ liệu điểm danh nào được lưu cho học sinh này
                                            </div>
                                        ) : (
                                            <div className="grid gap-2">
                                                {activeHistory.map((item, idx) => {
                                                    const isAbs = item.status === 'absent';
                                                    const isLate = item.status === 'late';

                                                    const badge = isAbs
                                                        ? { label: 'Vắng', cls: 'bg-red-600 text-white' }
                                                        : isLate
                                                        ? { label: 'Đi muộn', cls: 'bg-amber-500 text-white' }
                                                        : { label: 'Có mặt', cls: 'bg-emerald-600 text-white' };

                                                    return (
                                                        <div
                                                            key={`${item.date}-${idx}`}
                                                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 transition"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-black text-[var(--color-text-muted)] w-6 text-right">
                                                                    #{idx + 1}
                                                                </span>
                                                                <div>
                                                                    <p className="text-sm font-black text-[var(--color-text)]">
                                                                        {formatDateVN(item.date)}
                                                                        {item.session_title && (
                                                                            <span className="ml-2 font-normal text-xs text-[var(--color-text-muted)]">
                                                                                ({item.session_title})
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                    {item.note && (
                                                                        <p className="text-xs font-bold text-[var(--color-text-muted)]">
                                                                            Ghi chú: {item.note}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className={`rounded-xl px-3 py-1 text-xs font-black shadow-sm ${badge.cls}`}>
                                                                {badge.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        /* MAIN OVERVIEW & STUDENT LIST */
                        <>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <button
                                    type="button"
                                    onClick={() => setFilterCategory('good')}
                                    className={`rounded-2xl border p-3.5 text-left transition ${
                                        filterCategory === 'good'
                                            ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30'
                                            : 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">Học đều</span>
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                    </div>
                                    <p className="mt-1 text-2xl font-black text-emerald-800 dark:text-emerald-200">{summary.good_count}</p>
                                    <span className="mt-1 inline-block rounded-lg bg-emerald-600/10 px-2 py-0.5 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                                        0 buổi vắng
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFilterCategory('warning')}
                                    className={`rounded-2xl border p-3.5 text-left transition ${
                                        filterCategory === 'warning'
                                            ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30'
                                            : 'border-amber-200 bg-amber-50/70 hover:bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-300">Vắng ít</span>
                                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                                    </div>
                                    <p className="mt-1 text-2xl font-black text-amber-800 dark:text-amber-200">{summary.warning_count}</p>
                                    <span className="mt-1 inline-block rounded-lg bg-amber-600/10 px-2 py-0.5 text-[11px] font-black text-amber-700 dark:text-amber-300">
                                        Vắng 1 buổi / trễ
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFilterCategory('danger')}
                                    className={`rounded-2xl border p-3.5 text-left transition ${
                                        filterCategory === 'danger'
                                            ? 'border-red-500 bg-red-500/15 ring-2 ring-red-500/30'
                                            : 'border-red-200 bg-red-50/70 hover:bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase text-red-700 dark:text-red-300">Vắng nhiều</span>
                                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                                    </div>
                                    <p className="mt-1 text-2xl font-black text-red-800 dark:text-red-200">{summary.danger_count}</p>
                                    <span className="mt-1 inline-block rounded-lg bg-red-600/10 px-2 py-0.5 text-[11px] font-black text-red-700 dark:text-red-300">
                                        Cần nhắc nhở
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFilterCategory('all')}
                                    className={`rounded-2xl border p-3.5 text-left transition ${
                                        filterCategory === 'all'
                                            ? 'border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-500/30'
                                            : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Tổng học sinh</span>
                                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                                    </div>
                                    <p className="mt-1 text-2xl font-black text-slate-800 dark:text-slate-200">{summary.total_students}</p>
                                    <span className="mt-1 inline-block rounded-lg bg-slate-500/10 px-2 py-0.5 text-[11px] font-black text-slate-700 dark:text-slate-300">
                                        {summary.total_sessions} buổi học
                                    </span>
                                </button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                                <div className="relative">
                                    <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Tìm kiếm tên, mã học sinh..."
                                        className="min-h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] pl-9 pr-3 text-xs font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setFilterCategory('all')}
                                        className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                                            filterCategory === 'all'
                                                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                                                : 'border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)] hover:bg-[var(--color-border)]'
                                        }`}
                                    >
                                        Tất cả ({summary.total_students})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilterCategory('danger')}
                                        className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                                            filterCategory === 'danger'
                                                ? 'bg-red-600 text-white shadow-sm'
                                                : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
                                        }`}
                                    >
                                        Vắng nhiều ({summary.danger_count})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilterCategory('warning')}
                                        className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                                            filterCategory === 'warning'
                                                ? 'bg-amber-600 text-white shadow-sm'
                                                : 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300'
                                        }`}
                                    >
                                        Vắng ít ({summary.warning_count})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilterCategory('good')}
                                        className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                                            filterCategory === 'good'
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                                        }`}
                                    >
                                        Học đều ({summary.good_count})
                                    </button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="grid gap-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="h-20 animate-pulse rounded-2xl bg-[var(--color-bg-soft)]" />
                                    ))}
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm font-bold text-[var(--color-text-muted)]">
                                    Không tìm thấy học sinh nào phù hợp
                                </div>
                            ) : (
                                <div className="grid gap-2.5">
                                    {filteredStudents.map((st, idx) => {
                                        const isDanger = st.category === 'danger';
                                        const isWarning = st.category === 'warning';

                                        const badgeClass = isDanger
                                            ? 'bg-red-500/10 text-red-700 border-red-200 dark:border-red-900/40 dark:text-red-300'
                                            : isWarning
                                            ? 'bg-amber-500/10 text-amber-700 border-amber-200 dark:border-amber-900/40 dark:text-amber-300'
                                            : 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:border-emerald-900/40 dark:text-emerald-300';

                                        const barColor = isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';

                                        return (
                                            <div
                                                key={st.student_id}
                                                onClick={() => handleSelectStudent(st)}
                                                className={`group cursor-pointer rounded-2xl border p-3.5 transition hover:border-indigo-400 hover:shadow-md ${
                                                    isDanger
                                                        ? 'border-red-300/80 bg-red-50/40 hover:bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/10'
                                                        : isWarning
                                                        ? 'border-amber-300/80 bg-amber-50/40 hover:bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/10'
                                                        : 'border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-bg-soft)]'
                                                }`}
                                            >
                                                <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-center">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <span
                                                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-black ${
                                                                isDanger
                                                                    ? 'bg-red-600 text-white'
                                                                    : isWarning
                                                                    ? 'bg-amber-500 text-white'
                                                                    : 'bg-emerald-600 text-white'
                                                            }`}
                                                        >
                                                            {idx + 1}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="truncate text-sm font-black text-[var(--color-text)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                                                    {st.full_name}
                                                                </h4>
                                                                <span className={`rounded-md border px-2 py-0.5 text-[11px] font-black ${badgeClass}`}>
                                                                    {isDanger ? `Vắng nhiều (${st.absent_count} buổi)` : isWarning ? `Vắng ít (${st.absent_count} buổi)` : 'Học đều'}
                                                                </span>
                                                            </div>
                                                            <div className="truncate text-xs font-bold text-[var(--color-text-muted)]">
                                                                {st.student_code || 'Chưa có mã'} • @{st.username}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-[11px] font-black">
                                                            <span className="text-[var(--color-text-muted)]">Chuyên cần</span>
                                                            <span className={isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}>
                                                                {st.rate}%
                                                            </span>
                                                        </div>
                                                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-soft)]">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                                                style={{ width: `${Math.max(5, st.rate)}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                                                        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                            Có mặt: <b>{st.present_count}</b>
                                                        </span>
                                                        <span
                                                            className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                                                                st.absent_count > 0
                                                                    ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                            }`}
                                                        >
                                                            Vắng: <b>{st.absent_count}</b>
                                                        </span>
                                                        <span
                                                            className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                                                                st.late_count > 0
                                                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                            }`}
                                                        >
                                                            Trễ: <b>{st.late_count}</b>
                                                        </span>
                                                        <span className="ml-1 hidden rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700 transition group-hover:bg-indigo-600 group-hover:text-white dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 lg:inline-block">
                                                            Xem ngày nghỉ →
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-[var(--color-border)] p-4 sm:px-6">
                    {selectedStudent ? (
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedStudent(null);
                                setStudentDetailData(null);
                            }}
                            className="min-h-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-5 text-xs font-black text-[var(--color-text)] transition hover:bg-[var(--color-border)]"
                        >
                            ← Quay lại danh sách
                        </button>
                    ) : (
                        <div className="text-xs font-bold text-[var(--color-text-muted)]">
                            Nhấn vào học sinh để xem chi tiết các ngày nghỉ
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-10 rounded-2xl bg-[var(--color-bg-soft)] px-5 text-xs font-black text-[var(--color-text)] transition hover:bg-[var(--color-border)]"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
