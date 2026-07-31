import { useCallback, useEffect, useMemo, useState } from 'react';
import { Panel, PrimaryButton } from '../../../components/shared/ui';
import { ClockIcon, SearchIcon, XIcon } from '../../../components/shared/icons';
import type { ClassItem, User } from '../../../types';
import { API_URL } from '../../../services/api';
import { StudentAttendanceView } from './StudentAttendanceView';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

type StudentAttendanceRecord = {
    student_id: number;
    full_name: string;
    username: string;
    student_code: string;
    status: AttendanceStatus;
    note: string;
};

type AttendancePanelProps = {
    user: User;
    classes: ClassItem[];
    selectedClassId: number | null;
    setSelectedClassId: (id: number) => void;
};

type TeacherAttendanceMode = 'take' | 'summary' | 'edit';

const today = new Date().toISOString().split('T')[0];

const demoRecords: StudentAttendanceRecord[] = [
    { student_id: 8101, full_name: 'Nguyễn Văn An', username: 'an.nguyen', student_code: 'VAT-S001', status: 'present', note: 'Có mặt đúng giờ' },
    { student_id: 8102, full_name: 'Trần Thị Bình', username: 'binh.tran', student_code: 'VAT-S002', status: 'present', note: 'Có mặt' },
    { student_id: 8103, full_name: 'Lê Minh Khang', username: 'khang.le', student_code: 'VAT-S003', status: 'absent', note: 'Chưa điểm danh' },
    { student_id: 8104, full_name: 'Phạm Gia Hân', username: 'han.pham', student_code: 'VAT-S004', status: 'late', note: 'Đến muộn 10 phút' },
    { student_id: 8105, full_name: 'Đặng Nhật Nam', username: 'nam.dang', student_code: 'VAT-S005', status: 'excused', note: 'Nghỉ có phép từ phụ huynh' },
];

const statusOptions: { id: AttendanceStatus; label: string; activeClass: string; softClass: string }[] = [
    { id: 'present', label: 'Có mặt', activeClass: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20', softClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'late', label: 'Đi muộn', activeClass: 'bg-amber-600 text-white shadow-lg shadow-amber-600/20', softClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'absent', label: 'Vắng', activeClass: 'bg-red-600 text-white shadow-lg shadow-red-600/20', softClass: 'bg-red-50 text-red-700 border-red-200' },
    { id: 'excused', label: 'Có phép', activeClass: 'bg-blue-600 text-white shadow-lg shadow-blue-600/20', softClass: 'bg-blue-50 text-blue-700 border-blue-200' },
];

export function AttendancePanel({ user, classes, selectedClassId, setSelectedClassId }: AttendancePanelProps) {
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
    const [mode, setMode] = useState<TeacherAttendanceMode>('take');
    const [savedClassIds, setSavedClassIds] = useState<number[]>([]);
    const [showSavePopup, setShowSavePopup] = useState(false);
    const [missingOnly, setMissingOnly] = useState(false);

    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        'x-user-id': String(user.id),
    }), [user.id]);

    const loadClassAttendance = useCallback(async (classId: number, dateStr: string) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/attendance/class/${classId}?date=${dateStr}`, { headers });
            const data = await response.json();
            const loadedRecords = (data.records?.length ? data.records : demoRecords) as StudentAttendanceRecord[];
            setInitialRecords(JSON.parse(JSON.stringify(loadedRecords)));
            setRecords(loadedRecords);
            const alreadySaved = Boolean(data.has_saved || data.saved_count > 0);
            setSavedClassIds((previous) => alreadySaved && !previous.includes(classId) ? [...previous, classId] : previous);
            setMode(alreadySaved ? 'summary' : 'take');
        } catch (error) {
            console.error('Lỗi tải danh sách điểm danh:', error);
            setInitialRecords(JSON.parse(JSON.stringify(demoRecords)));
            setRecords(demoRecords);
            setMode(savedClassIds.includes(classId) ? 'summary' : 'take');
        } finally {
            setLoading(false);
        }
    }, [headers, savedClassIds]);

    useEffect(() => {
        if (!isStudent && effectiveClassId) {
            if (!selectedClassId && classes[0]?.id) {
                setSelectedClassId(classes[0].id);
            }
            loadClassAttendance(effectiveClassId, attendanceDate);
            setMissingOnly(false);
            setSearchStudent('');
        }
    }, [isStudent, effectiveClassId, selectedClassId, attendanceDate, classes, loadClassAttendance, setSelectedClassId, savedClassIds]);

    const hasUnsavedChanges = JSON.stringify(records) !== JSON.stringify(initialRecords);

    const stats = useMemo(() => ({
        present: records.filter((item) => item.status === 'present').length,
        absent: records.filter((item) => item.status === 'absent').length,
        late: records.filter((item) => item.status === 'late').length,
        excused: records.filter((item) => item.status === 'excused').length,
    }), [records]);

    const missingCount = stats.absent + stats.late;

    const filteredRecords = useMemo(() => records.filter((record) => {
        const keyword = searchStudent.trim().toLowerCase();
        const matchesKeyword = !keyword || [record.full_name, record.username, record.student_code, record.note].some((value) => value?.toLowerCase().includes(keyword));
        const matchesMissing = !missingOnly || record.status === 'absent' || record.status === 'late';
        return matchesKeyword && matchesMissing;
    }), [records, searchStudent, missingOnly]);

    const updateStatus = (studentId: number, status: AttendanceStatus) => {
        setRecords((previous) => previous.map((record) => record.student_id === studentId ? { ...record, status, note: status === 'present' && record.note === 'Chưa điểm danh' ? 'Có mặt' : record.note } : record));
    };

    const updateNote = (studentId: number, note: string) => {
        setRecords((previous) => previous.map((record) => record.student_id === studentId ? { ...record, note } : record));
    };

    const markAllPresent = () => {
        setRecords((previous) => previous.map((record) => ({ ...record, status: 'present', note: record.note || 'Có mặt' })));
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
                    })),
                }),
            });
            const data = await response.json();
            setInitialRecords(JSON.parse(JSON.stringify(records)));
            setSavedClassIds((previous) => previous.includes(effectiveClassId) ? previous : [...previous, effectiveClassId]);
            setMode('summary');
            setMissingOnly(false);
            setSearchStudent('');
            setAlertMsg(data.message || 'Đã lưu điểm danh và quay về danh sách lớp.');
            setShowSavePopup(true);
            setTimeout(() => setAlertMsg(''), 3500);
        } catch (error) {
            console.error('Lỗi lưu điểm danh:', error);
            setInitialRecords(JSON.parse(JSON.stringify(records)));
            setSavedClassIds((previous) => previous.includes(effectiveClassId) ? previous : [...previous, effectiveClassId]);
            setMode('summary');
            setShowSavePopup(true);
            setAlertMsg('Đã lưu điểm danh ở giao diện demo.');
        } finally {
            setSaving(false);
        }
    };

    if (isStudent) {
        return <StudentAttendanceView classes={classes} />;
    }

    const className = selectedClass?.name || 'Lớp demo VAT';
    const classCode = selectedClass?.code || 'VAT-ATT01';

    return (
        <div className="grid gap-4 pb-8">
            {alertMsg && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-800 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                    <span>{alertMsg}</span>
                    <button type="button" onClick={() => setAlertMsg('')} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-emerald-800 transition hover:bg-white dark:bg-white/10 dark:text-emerald-100">×</button>
                </div>
            )}

            <section className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                            <ClockIcon size={24} />
                        </span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">Điểm danh giảng viên</p>
                            <h2 className="text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">{mode === 'summary' ? 'Danh sách lớp đã điểm danh' : mode === 'edit' ? 'Sửa điểm danh học sinh thiếu' : 'Điểm danh lớp học'}</h2>
                            <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{mode === 'summary' ? 'Sau khi lưu, hệ thống chỉ hiển thị tên lớp. Khi cần cập nhật, bấm sửa điểm danh để bổ sung em còn thiếu.' : 'Đầu tiên hiển thị danh sách học sinh để điểm danh. Nút lưu nằm bên dưới danh sách, dễ thao tác trên di động.'}</p>
                        </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[420px]">
                        <select
                            value={effectiveClassId ?? ''}
                            onChange={(event) => setSelectedClassId(Number(event.target.value))}
                            className="min-h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm font-black text-slate-950 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-white dark:text-slate-950"
                        >
                            {classes.length ? classes.map((item) => (
                                <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                            )) : <option value="">Lớp demo VAT-ATT01</option>}
                        </select>
                        <input
                            type="date"
                            value={attendanceDate}
                            onChange={(event) => setAttendanceDate(event.target.value)}
                            className="min-h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm font-black text-slate-950 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-white dark:text-slate-950"
                        />
                    </div>
                </div>
            </section>

            {mode === 'summary' ? (
                <Panel title="Lớp đã lưu điểm danh" subtitle="Giao diện tối giản sau khi lưu: chỉ hiện tên lớp và nút sửa khi cần cập nhật.">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <article className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-[var(--color-text-muted)]">{classCode}</p>
                                    <h3 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[var(--color-text)]">{className}</h3>
                                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Ngày {new Date(attendanceDate).toLocaleDateString('vi-VN')} • {records.length} học sinh</p>
                                </div>
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Đã lưu</span>
                            </div>
                            <div className="mt-5 grid grid-cols-4 gap-2">
                                <StatPill label="Có mặt" value={stats.present} tone="emerald" />
                                <StatPill label="Muộn" value={stats.late} tone="amber" />
                                <StatPill label="Vắng" value={stats.absent} tone="red" />
                                <StatPill label="Có phép" value={stats.excused} tone="blue" />
                            </div>
                            <PrimaryButton type="button" onClick={() => { setMode('edit'); setMissingOnly(true); }} className="mt-5 min-h-12 w-full text-sm font-black">
                                Sửa điểm danh
                            </PrimaryButton>
                        </article>
                    </div>
                </Panel>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-4">
                        <StatCard title="Có mặt" value={stats.present} description={`${records.length ? Math.round((stats.present / records.length) * 100) : 0}% tổng số`} tone="emerald" />
                        <StatCard title="Đi muộn" value={stats.late} description="Cần ghi chú lý do" tone="amber" />
                        <StatCard title="Vắng" value={stats.absent} description="Ưu tiên cập nhật" tone="red" />
                        <StatCard title="Có phép" value={stats.excused} description="Đã có thông tin" tone="blue" />
                    </div>

                    <Panel title={mode === 'edit' ? `Cập nhật học sinh thiếu (${missingCount})` : `Danh sách để điểm danh (${filteredRecords.length})`} subtitle={mode === 'edit' ? 'Mặc định chỉ lọc học sinh vắng/đi muộn. Học sinh đã điểm danh được giữ nguyên trong dữ liệu.' : 'Chọn trạng thái từng học sinh, sau đó bấm Save ở cuối danh sách.'}>
                        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div className="relative">
                                <SearchIcon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <input
                                    type="text"
                                    value={searchStudent}
                                    onChange={(event) => setSearchStudent(event.target.value)}
                                    placeholder="Tìm tên, mã học sinh, ghi chú..."
                                    className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-white dark:text-slate-950"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:flex">
                                <button type="button" onClick={markAllPresent} className="min-h-11 rounded-2xl bg-emerald-600 px-4 text-xs font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700">Tất cả có mặt</button>
                                {mode === 'edit' && (
                                    <button type="button" onClick={() => setMissingOnly((value) => !value)} className={`min-h-11 rounded-2xl border px-4 text-xs font-black transition ${missingOnly ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)]'}`}>
                                        {missingOnly ? 'Đang xem em thiếu' : 'Xem tất cả'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid gap-3">
                                {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-3xl bg-[var(--color-bg-soft)]" />)}
                            </div>
                        ) : filteredRecords.length ? (
                            <div className="grid gap-3">
                                {filteredRecords.map((record, index) => {
                                    const changed = initialRecords.some((item) => item.student_id === record.student_id && (item.status !== record.status || item.note !== record.note));
                                    return (
                                        <article key={record.student_id} className={`rounded-3xl border p-4 shadow-sm transition ${changed ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border-[var(--color-border)] bg-[var(--color-card)]'}`}>
                                            <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr_1fr] xl:items-center">
                                                <div className="flex items-center gap-3">
                                                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-sm font-black text-[var(--color-primary)]">{index + 1}</span>
                                                    <div className="min-w-0">
                                                        <h3 className="truncate text-base font-black text-[var(--color-text)]">{record.full_name || record.username}</h3>
                                                        <p className="truncate text-xs font-bold text-[var(--color-text-muted)]">{record.student_code || 'Chưa có mã'} • @{record.username}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                    {statusOptions.map((status) => (
                                                        <button
                                                            key={status.id}
                                                            type="button"
                                                            onClick={() => updateStatus(record.student_id, status.id)}
                                                            className={`min-h-11 rounded-2xl border px-3 text-xs font-black transition ${record.status === status.id ? status.activeClass : `${status.softClass} hover:scale-[1.02]`}`}
                                                        >
                                                            {status.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={record.note || ''}
                                                    onChange={(event) => updateNote(record.student_id, event.target.value)}
                                                    placeholder="Ghi chú: lý do vắng, đi muộn..."
                                                    className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-white dark:text-slate-950"
                                                />
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] p-8 text-center">
                                <h3 className="text-lg font-black text-[var(--color-text)]">Không còn học sinh cần cập nhật</h3>
                                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Các em đã điểm danh vẫn được giữ nguyên. Có thể tắt bộ lọc để xem toàn bộ danh sách.</p>
                            </div>
                        )}

                        <div className="mt-5 grid gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
                            <p className="text-xs font-bold text-[var(--color-text-secondary)]">{hasUnsavedChanges ? 'Có thay đổi chưa lưu. Bấm Save để lưu và quay ra danh sách lớp.' : 'Danh sách hiện đã đồng bộ. Bấm Save để hoàn tất và ra ngoài.'}</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {mode === 'edit' && <button type="button" onClick={() => setMode('summary')} className="min-h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-5 text-sm font-black text-[var(--color-text)]">Ra ngoài</button>}
                                <PrimaryButton type="button" onClick={handleSaveAttendance} disabled={saving} className="min-h-12 px-8 text-sm font-black">
                                    {saving ? 'Đang lưu...' : 'Save điểm danh'}
                                </PrimaryButton>
                            </div>
                        </div>
                    </Panel>
                </>
            )}

            {showSavePopup && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center">
                    <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Đã lưu thành công</p>
                                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">{className}</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-600">Điểm danh ngày {new Date(attendanceDate).toLocaleDateString('vi-VN')} đã được lưu. Màn hình sẽ chỉ hiện tên lớp, khi cần bổ sung hãy bấm “Sửa điểm danh”.</p>
                            </div>
                            <button type="button" onClick={() => setShowSavePopup(false)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-950" aria-label="Đóng popup">
                                <XIcon size={18} />
                            </button>
                        </div>
                        <div className="mt-5 grid grid-cols-4 gap-2">
                            <StatPill label="Có mặt" value={stats.present} tone="emerald" />
                            <StatPill label="Muộn" value={stats.late} tone="amber" />
                            <StatPill label="Vắng" value={stats.absent} tone="red" />
                            <StatPill label="Có phép" value={stats.excused} tone="blue" />
                        </div>
                        <PrimaryButton type="button" onClick={() => setShowSavePopup(false)} className="mt-5 min-h-12 w-full text-sm font-black">Đã hiểu</PrimaryButton>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, description, tone }: { title: string; value: number; description: string; tone: 'emerald' | 'amber' | 'red' | 'blue' }) {
    const toneMap = {
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        amber: 'border-amber-200 bg-amber-50 text-amber-800',
        red: 'border-red-200 bg-red-50 text-red-800',
        blue: 'border-blue-200 bg-blue-50 text-blue-800',
    };

    return (
        <div className={`rounded-3xl border p-4 ${toneMap[tone]}`}>
            <p className="text-xs font-black uppercase tracking-wide opacity-80">{title}</p>
            <p className="mt-1 text-3xl font-black">{value}</p>
            <p className="mt-1 text-xs font-bold opacity-75">{description}</p>
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
