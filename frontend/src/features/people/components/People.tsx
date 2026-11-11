import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode, ChangeEvent } from 'react';
import { Avatar } from '../../../components/shared/Avatar';
import { Badge, EmptyState, Field, Panel, PrimaryButton } from '../../../components/shared/ui';
import { BellIcon, CalendarIcon, ChartIcon, CheckCircleIcon, ClockIcon, FileIcon, SearchIcon } from '../../../components/shared/icons';
import type { User } from '../../../types';
import { StudentProfileModal } from '../../../components/shared/StudentProfileModal';

type AccountForm = { username: string; password: string; full_name?: string; };

type PeopleProps = {
    userRole?: string;
    users: User[];
    studentForm?: AccountForm;
    setStudentForm?: (value: AccountForm) => void;
    createStudent?: (event: FormEvent) => void;
    teacherForm?: AccountForm;
    setTeacherForm?: (value: AccountForm) => void;
    createTeacher?: (event: FormEvent) => void;
    importUsersCsv?: (csvContent: string, defaultRole?: string) => Promise<unknown>;
    [key: string]: any;
};

export function Students(props: PeopleProps) {
    if (props.userRole === 'teacher') {
        return <TeacherStudentsExperience students={props.users.filter((item) => item.role === 'student')} />;
    }

    return (
        <PeopleForm
            title="Tạo tài khoản học sinh"
           
            form={props.studentForm!}
            setForm={props.setStudentForm!}
            onSubmit={props.createStudent!}
            button="Tạo học sinh"
            defaultRole="student"
            importUsersCsv={props.importUsersCsv}
        >
            <People title="Danh sách học sinh" users={props.users.filter((item) => item.role === 'student')} />
        </PeopleForm>
    );
}

export function Teachers(props: PeopleProps) {
    return (
        <PeopleForm
            title="Tạo tài khoản giáo viên"
           
            form={props.teacherForm!}
            setForm={props.setTeacherForm!}
            onSubmit={props.createTeacher!}
            button="Tạo giáo viên"
            defaultRole="teacher"
            importUsersCsv={props.importUsersCsv}
        >
            <People title="Danh sách giáo viên" users={props.users.filter((item) => item.role === 'teacher')} />
        </PeopleForm>
    );
}

function TeacherStudentsExperience({ students }: { students: User[] }) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [showCarePopup, setShowCarePopup] = useState(false);
    const [showDetailPopup, setShowDetailPopup] = useState(false);
    const enrichedStudents = useMemo(() => students.map((student, index) => ({
        ...student,
        attendance: [96, 88, 72, 91, 84][index % 5],
        progress: [82, 76, 61, 93, 70][index % 5],
        lastSeen: ['Hôm nay, 09:30', 'Hôm qua, 20:15', '2 ngày trước', 'Hôm nay, 14:10', 'Tuần trước'][index % 5],
        nextAction: ['Gửi nhận xét buổi học', 'Nhắc hoàn thiện bài tập', 'Hẹn trao đổi phụ huynh', 'Giao bài nâng cao', 'Kiểm tra tiến độ'][index % 5],
        risk: [false, false, true, false, true][index % 5],
    })), [students]);

    const filteredStudents = useMemo(() => enrichedStudents.filter((student) => {
        const keyword = query.trim().toLowerCase();
        const matchQuery = !keyword || [student.full_name, student.username, student.student_code, student.phone].some((value) => value?.toLowerCase().includes(keyword));
        const matchStatus = statusFilter === 'all' || student.status === statusFilter;
        return matchQuery && matchStatus;
    }), [enrichedStudents, query, statusFilter]);

    const focusedStudent = selectedStudent ?? filteredStudents[0] ?? enrichedStudents[0];
    const riskCount = enrichedStudents.filter((student) => student.risk).length;

    const openStudentDetail = (student: User) => {
        setSelectedStudent(student);
        setShowDetailPopup(true);
    };

    const openCarePopup = (student: User) => {
        setSelectedStudent(student);
        setShowCarePopup(true);
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
                <Panel title="Bộ lọc thông minh">
                    <div className="grid gap-3">
                        <div className="relative">
                            <SearchIcon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                            <Field
                                label="Tìm học sinh"
                                aria-label="Tìm học sinh"
                                className="pl-9"
                                placeholder="Tìm tên, mã, số điện thoại..."
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                helperText="Ví dụ: Nguyễn Văn An, VAT-S001, 0912..."
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { key: 'all', label: 'Tất cả' },
                                { key: 'active', label: 'Đang học' },
                                { key: 'inactive', label: 'Cần chú ý' },
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setStatusFilter(item.key as 'all' | 'active' | 'inactive')}
                                    className={`min-h-11 rounded-2xl border px-3 text-xs font-black transition ${statusFilter === item.key ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary)]' : 'border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-border)] hover:text-[var(--color-primary)]'}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                            <div className="flex items-center gap-2 text-sm font-black"><BellIcon size={18} /> {riskCount} học sinh cần nhắc</div>
                            <p className="mt-1 text-xs leading-5 opacity-80">Ưu tiên xử lý các em có chuyên cần hoặc tiến độ thấp trước cuối ngày.</p>
                        </div>
                    </div>
                </Panel>

                <Panel title="Danh sách học sinh">
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                        {filteredStudents.map((student) => (
                            <article key={student.id} className="group rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-sm transition hover:-translate-y-1 hover:border-[var(--color-primary-border)] hover:shadow-xl">
                                <div className="flex items-start gap-3">
                                    <Avatar user={student} />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-base font-black text-[var(--color-text)]">{student.full_name || student.username}</h3>
                                        <p className="truncate text-xs font-semibold text-[var(--color-text-muted)]">{student.student_code || `@${student.username}`} • {student.phone || 'Chưa có SĐT'}</p>
                                    </div>
                                    <Badge tone={student.status === 'active' ? 'success' : 'warning'}>{student.status === 'active' ? 'Đang học' : 'Cần chú ý'}</Badge>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <ProgressTile label="Chuyên cần" value={student.attendance} />
                                    <ProgressTile label="Tiến độ" value={student.progress} />
                                </div>
                                <div className="mt-4 rounded-2xl bg-[var(--color-bg-soft)] p-3">
                                    <p className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)]"><ClockIcon size={15} /> Hoạt động: {student.lastSeen}</p>
                                    <p className="mt-1 text-sm font-black text-[var(--color-text)]">{student.nextAction}</p>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => openStudentDetail(student)} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-xs font-black text-[var(--color-text)] transition hover:border-[var(--color-primary-border)] hover:text-[var(--color-primary)]">Xem hồ sơ</button>
                                    <PrimaryButton type="button" onClick={() => openCarePopup(student)} className="min-h-11 text-xs">Gửi nhắc</PrimaryButton>
                                </div>
                            </article>
                        ))}
                    </div>
                    {!filteredStudents.length && <EmptyState title="Không tìm thấy học sinh" />}
                </Panel>
            </div>

            {focusedStudent && (
                <Panel title="Không gian hành động nhanh">
                    <div className="grid gap-3 md:grid-cols-3">
                        <ActionTile icon={<CalendarIcon size={18} />} title="Lịch hẹn" value="Thứ 5, 19:30" />
                        <ActionTile icon={<FileIcon size={18} />} title="Bài tập" value="2 bài còn thiếu" />
                        <ActionTile icon={<BellIcon size={18} />} title="Thông báo" value="Mẫu đã soạn" />
                    </div>
                </Panel>
            )}

            {showDetailPopup && selectedStudent && (
                <StudentPopup title="Hồ sơ học sinh" onClose={() => setShowDetailPopup(false)}>
                    <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
                        <Avatar user={selectedStudent} size="lg" />
                        <div>
                            <h3 className="text-2xl font-black text-[var(--color-text)]">{selectedStudent.full_name || selectedStudent.username}</h3>
                            <p className="text-sm font-semibold text-[var(--color-text-muted)]">{selectedStudent.student_code || `@${selectedStudent.username}`} • {selectedStudent.phone || 'Chưa cập nhật số điện thoại'}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Badge tone={selectedStudent.status === 'active' ? 'success' : 'warning'}>{selectedStudent.status === 'active' ? 'Đang học' : 'Cần chú ý'}</Badge>
                                <Badge>Nhóm Toán tư duy</Badge>
                                <Badge>Ưu tiên theo dõi tuần này</Badge>
                            </div>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <ActionTile icon={<CheckCircleIcon size={18} />} title="Chuyên cần" value="92%" />
                        <ActionTile icon={<ChartIcon size={18} />} title="Tiến bộ" value="+14%" />
                        <ActionTile icon={<ClockIcon size={18} />} title="Thời lượng" value="8.5 giờ" />
                    </div>
                </StudentPopup>
            )}

            {showCarePopup && selectedStudent && (
                <StudentPopup title="Gửi nhắc học tập" onClose={() => setShowCarePopup(false)}>
                    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); setShowCarePopup(false); }}>
                        <Field label="Người nhận" value={`${selectedStudent.full_name || selectedStudent.username} - ${selectedStudent.phone || '0912 000 000'}`} readOnly />
                        <Field label="Tiêu đề" defaultValue="Nhắc hoàn thiện bài tập trước buổi học tiếp theo" />
                        <div>
                            <label className="mb-1 block text-xs font-bold text-[var(--color-text-secondary)]">Nội dung tin nhắn</label>
                            <textarea
                                rows={5}
                                defaultValue={`Chào ${selectedStudent.full_name || selectedStudent.username}, thầy/cô nhắc em hoàn thiện bài tập còn thiếu và xem lại ghi chú buổi học. Nếu gặp khó khăn, hãy phản hồi ngay trong hôm nay nhé.`}
                                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                            />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <button type="button" onClick={() => setShowCarePopup(false)} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 text-sm font-black text-[var(--color-text)]">Lưu nháp</button>
                            <PrimaryButton type="submit" className="min-h-11">Gửi thông báo</PrimaryButton>
                        </div>
                    </form>
                </StudentPopup>
            )}
        </div>
    );
}

function ProgressTile({ label, value }: { label: string; value: number }) {
    return <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3"><div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-secondary)]"><span>{label}</span><span>{value}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-border)]"><span className="block h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${value}%` }} /></div></div>;
}

function ActionTile({ icon, title, value }: { icon: ReactNode; title: string; value: string; }) {
    return <div className="flex flex-col justify-center rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4"><div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">{icon}</div><p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{title}</p><h4 className="mt-1 text-lg font-black text-[var(--color-text)]">{value}</h4></div>;
}

function StudentPopup({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-[2rem] border border-slate-200 bg-white p-4 text-slate-950 shadow-2xl sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">Popup thao tác nhanh</p>
                        <h2 className="text-xl font-black text-slate-950">{title}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xl font-black text-slate-950">×</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function PeopleForm({
    title,
    
    form,
    setForm,
    onSubmit,
    button,
    defaultRole,
    importUsersCsv,
    children,
}: {
    title: string;
    
    form: AccountForm;
    setForm: (value: AccountForm) => void;
    onSubmit: (event: FormEvent) => void;
    button: string;
    defaultRole: string;
    importUsersCsv?: (csvContent: string, defaultRole?: string) => Promise<unknown>;
    children: ReactNode;
}) {
    const [mode, setMode] = useState<'single' | 'csv'>('single');
    const [csvText, setCsvText] = useState('');
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState('');

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) setCsvText(content);
        };
        reader.readAsText(file);
    };

    const handleCsvSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!csvText.trim() || !importUsersCsv) return;
        setLoading(true);
        try {
            await importUsersCsv(csvText, defaultRole);
            setCsvText('');
            setFileName('');
        } finally {
            setLoading(false);
        }
    };

    const sampleCsv = `Họ và tên, Tên đăng nhập, Mật khẩu, Vai trò, Số điện thoại
Nguyễn Văn An, nguyenvanan, matkhau123, ${defaultRole}, 0912345678
Trần Thị Bình, tranthibinh, matkhau123, ${defaultRole}, 0987654321`;

    const parsedRows = csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5);

    return (
        <div className="grid gap-4 xl:grid-cols-[440px_1fr]">
            <Panel title={title}>
                <div className="mb-4 flex rounded-lg bg-[var(--color-bg-soft)] p-1">
                    <button
                        type="button"
                        onClick={() => setMode('single')}
                        className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${mode === 'single' ? 'bg-[var(--color-bg-card)] shadow-xs text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'
                            }`}
                    >
                        Tạo đơn lẻ
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('csv')}
                        className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${mode === 'csv' ? 'bg-[var(--color-bg-card)] shadow-xs text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'
                            }`}
                    >
                        Nhập hàng loạt (CSV)
                    </button>
                </div>

                {mode === 'single' ? (
                    <form className="grid gap-4" onSubmit={onSubmit}>
                        <Field label="Tên đăng nhập" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                        <Field label="Mật khẩu" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                        <PrimaryButton>{button}</PrimaryButton>
                    </form>
                ) : (
                    <form className="grid gap-3" onSubmit={handleCsvSubmit}>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Chọn file .CSV</label>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="w-full cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2 text-xs text-[var(--color-text)] file:mr-2 file:rounded-md file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {fileName && <p className="mt-1 text-xs text-blue-600 font-medium">File đã chọn: {fileName}</p>}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Hoặc dán nội dung CSV</label>
                                <button
                                    type="button"
                                    onClick={() => setCsvText(sampleCsv)}
                                    className="text-xs text-blue-600 hover:underline font-medium"
                                >
                                    Dán mẫu CSV
                                </button>
                            </div>
                            <textarea
                                rows={5}
                                value={csvText}
                                onChange={(e) => setCsvText(e.target.value)}
                                placeholder="Họ và tên, Tên đăng nhập, Mật khẩu, Vai trò, Số điện thoại..."
                                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2 text-xs font-mono text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        {parsedRows.length > 0 && (
                            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-2 text-xs">
                                <p className="font-semibold text-[var(--color-text)] mb-1">Xem trước (tối đa 5 dòng):</p>
                                {parsedRows.map((row, idx) => (
                                    <p key={idx} className="truncate text-[var(--color-text-secondary)] font-mono">
                                        {row}
                                    </p>
                                ))}
                            </div>
                        )}

                        <PrimaryButton disabled={loading || !csvText.trim()}>
                            {loading ? 'Đang tạo hàng loạt...' : 'Xác nhận tạo hàng loạt'}
                        </PrimaryButton>
                    </form>
                )}
            </Panel>
            {children}
        </div>
    );
}

function People({ users, title, user }: { users: User[]; title?: string; user?: User; [key: string]: any }) {
    const [profileId, setProfileId] = useState<number | null>(null);
    const canOpen = (item: User) => Boolean(user) && item.role === 'student';
    return (
        <Panel title={title}>
            {users.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                    {users.map((item) => {
                        const clickable = canOpen(item);
                        return (
                            <article
                                key={item.id}
                                role={clickable ? 'button' : undefined}
                                tabIndex={clickable ? 0 : undefined}
                                onClick={clickable ? () => setProfileId(item.id) : undefined}
                                onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProfileId(item.id); } } : undefined}
                                className={`flex items-center gap-3 rounded-xl border border-[var(--color-border)] p-4 transition hover:border-[var(--color-primary-border)] hover:shadow-sm ${clickable ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30' : ''}`}
                            >
                                <Avatar user={item} />
                                <div className="min-w-0 flex-1">
                                    <h3 className="truncate font-semibold text-[var(--color-text)]">{item.full_name || item.username}</h3>
                                    {item.role === 'student' && item.student_code && (
                                        <p className="truncate text-xs text-[var(--color-text-muted)]">{item.student_code}</p>
                                    )}
                                </div>
                                <Badge tone={item.status === 'active' ? 'success' : 'warning'}>
                                    {item.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa'}
                                </Badge>
                            </article>
                        );
                    })}
                </div>
            ) : <EmptyState />}
            {user && <StudentProfileModal studentId={profileId} viewerId={user.id} onClose={() => setProfileId(null)} />}
        </Panel>
    );
}
export const Accounts = People;
