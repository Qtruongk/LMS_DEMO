import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge, GhostButton, Panel, PrimaryButton } from '../../../components/shared/ui';
import {
    AlertCircleIcon,
    BellIcon,
    BookIcon,
    CalendarIcon,
    ChartIcon,
    CheckCircleIcon,
    ClockIcon,
    DownloadIcon,
    FileIcon,
    InfoIcon,
    MessageIcon,
    SearchIcon,
    UploadIcon,
    UsersIcon,
    VideoIcon,
} from '../../../components/shared/icons';
import type { ClassItem, User } from '../../../types';

const tabs = [
    'Lịch dạy',
    'Lớp dạy',
    'Tài liệu',
    'Điểm danh',
    'Thông báo',
    'Dòng thời gian',
    'Nghỉ phép',
    'Kiểm tra',
    'Thư viện',
    'Phản hồi',
    'Tiêu chuẩn',
] as const;

type EnterpriseTab = typeof tabs[number];

type TeacherPortalEnterpriseViewProps = {
    user: User;
    classes: ClassItem[];
    onNavigate?: (module: string) => void;
};

const scheduleStatuses = [
    { label: 'Sắp diễn ra', tone: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800' },
    { label: 'Đang diễn ra', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800' },
    { label: 'Đã hoàn thành', tone: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700' },
    { label: 'Đã hủy', tone: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800' },
    { label: 'Đã đổi lịch', tone: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800' },
];

const materialTypes = ['PDF', 'DOCX', 'PPTX', 'XLSX', 'Hình ảnh', 'Âm thanh', 'Video', 'Tệp ZIP', 'Liên kết'];
const questionTypes = ['Một đáp án', 'Nhiều đáp án', 'Đúng/Sai', 'Sắp xếp', 'Kéo thả', 'Điền khuyết', 'Sơ đồ tư duy', 'Nói', 'Viết'];
const feedbackCategories = ['Kỹ thuật', 'Giảng dạy', 'Khóa học', 'Thanh toán', 'Góp ý'];
const libraryCategories = ['Sách', 'Videos', 'Bài trình chiếu', 'Nghiên cứu', 'Biểu mẫu', 'Kiểm tra'];

const capabilityGroups = [
    {
        title: 'Lịch giảng dạy',
        icon: CalendarIcon,
        points: ['Xem theo ngày / tuần / tháng / danh sách', 'Lớp, môn học, phòng, hình thức, số học viên, trạng thái', 'Ngăn chi tiết một chạm: học viên, tài liệu, điểm danh, dòng thời gian, thông báo, bài tập, bài kiểm tra', 'Tìm kiếm, bộ lọc, xuất lịch, nhắc việc'],
    },
    {
        title: 'Tài liệu giảng dạy',
        icon: FileIcon,
        points: ['Xem trước, tải xuống, tải lên, kéo thả', 'Lịch sử phiên bản, gần đây, yêu thích', 'Tìm kiếm, thẻ, thư mục', 'Tệp và liên kết ngoài được bảo mật'],
    },
    {
        title: 'Điểm danh',
        icon: CheckCircleIcon,
        points: ['Xem dạng bảng, lịch và phân tích', 'Thống kê có mặt, đi muộn, có phép, vắng', 'Điểm danh hàng loạt, tự lưu nháp, hoàn tác trước khi nộp', 'Nút lưu cố định và quy trình tối ưu cho di động'],
    },
    {
        title: 'Trao đổi trong lớp',
        icon: MessageIcon,
        points: ['Thông báo đa nội dung: văn bản, ảnh, âm thanh, video, tệp đính kèm', 'Hẹn lịch, lưu nháp, ghim, bình luận, trạng thái đã đọc', 'Dòng thời gian cho buổi học, bài tập, điểm danh, tệp, bài kiểm tra, điểm số', 'Cảm xúc, bình luận, tìm kiếm và bộ lọc'],
    },
    {
        title: 'Quản lý nghỉ phép',
        icon: ClockIcon,
        points: ['Nháp → Chờ duyệt → Đã duyệt → Từ chối → Đã hủy', 'Chống tạo trùng và kiểm tra xung đột', 'Nghỉ phép đã duyệt tự động chặn lịch dạy', 'Thông báo phòng đào tạo, gợi ý giáo viên thay thế, đổi lịch lớp bị ảnh hưởng'],
    },
    {
        title: 'Hệ thống kiểm tra',
        icon: BookIcon,
        points: ['Ngân hàng câu hỏi hỗ trợ văn bản định dạng, đa phương tiện, LaTeX, đoạn mã, bảng', 'Tạo đề với trộn câu hỏi, nhóm câu, cấu hình điểm, thời gian mở, số lần làm', 'Đếm giờ, tự lưu, đánh dấu câu, bảng câu hỏi, tiếp tục sau khi kết nối lại', 'Chấm tự động, chấm theo rubric, giao bài, trung tâm kết quả, xếp hạng, hàng đợi chấm'],
    },
];

const nonFunctional = ['Tương thích máy tính / máy tính bảng / điện thoại', 'Đáp ứng truy cập WCAG', 'Tự động lưu', 'Hiển thị khung chờ tải', 'Thông báo nhanh', 'Hoàn tác khi phù hợp', 'Tìm kiếm toàn hệ thống', 'Tải lười', 'Phân quyền theo vai trò', 'Ghi nhật ký hoạt động', 'Tải tệp lên an toàn'];

export function TeacherPortalEnterpriseView({ user, classes, onNavigate }: TeacherPortalEnterpriseViewProps) {
    const [activeTab, setActiveTab] = useState<EnterpriseTab>('Lịch dạy');
    const [query, setQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('Tất cả');

    const teacherClasses = useMemo(() => {
        const scoped = user.role === 'teacher' ? classes.filter((item) => item.teacher_id === user.id || item.teacher_name === user.full_name) : classes;
        return scoped.length ? scoped : classes;
    }, [classes, user]);

    const filteredClasses = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return teacherClasses;
        return teacherClasses.filter((item) => [item.name, item.code, item.subject, item.teacher_name, item.location].filter(Boolean).join(' ').toLowerCase().includes(normalized));
    }, [query, teacherClasses]);

    const totalStudents = teacherClasses.reduce((sum, item) => sum + Number(item.student_count || 0), 0);
    const avgAttendance = teacherClasses.length ?Math.round(teacherClasses.reduce((sum, item, index) => sum + Math.min(98, 82 + ((item.progress + index * 3) % 16)), 0) / teacherClasses.length) : 0;

    const sampleSchedule = (filteredClasses.length ?filteredClasses: teacherClasses).slice(0, 5).map((item, index) => ({
        ...item,
        time: item.class_hours || ['07:30 - 09:00', '09:15 - 10:45', '13:30 - 15:00', '18:00 - 20:00'][index % 4],
        room: item.location || ['Phòng A204', 'Zoom VAT-02', 'Phòng thực hành C101'][index % 3],
        modality: index % 2 === 0 ? 'Trực tiếp' : 'Trực tuyến',
        status: scheduleStatuses[index % scheduleStatuses.length],
    }));

    const tabButtonClass = (tab: EnterpriseTab) => `rounded-2xl px-3.5 py-2 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${activeTab === tab ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-red-900/20' : 'border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`;

    return (
        <div className="space-y-5">
            <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[#7F1D1D] via-[#991B1B] to-[#450A0A] p-5 text-white shadow-xl sm:p-7">
                <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
                <div className="relative grid gap-5 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur">
                            <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" /> Cổng giáo viên VAT
                        </div>
                        <h2 className="text-2xl font-black tracking-tight sm:text-4xl">Không gian làm việc cho giáo viên: lịch dạy, lớp học, tài liệu, nghỉ phép, kiểm tra và chấm điểm.</h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-red-100/90">
                            Bảng điều khiển tập trung cho giáo viên với bố cục linh hoạt, thao tác theo vai trò, dữ liệu dễ tìm kiếm, quy trình tự lưu và xử lý tệp an toàn.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <PrimaryButton onClick={() => onNavigate?.('schedule')} className="bg-white text-[#7F1D1D] hover:bg-red-50 font-bold shadow-md">Mở lịch dạy</PrimaryButton>
                            <GhostButton onClick={() => onNavigate?.('tests')} className="border border-white/20 bg-white/10 text-white hover:bg-white/20">Tạo bài kiểm tra</GhostButton>
                            <GhostButton onClick={() => onNavigate?.('materials')} className="border border-white/20 bg-white/10 text-white hover:bg-white/20">Kho tài liệu</GhostButton>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                            <BookIcon size={18} className="mb-2 text-red-200" />
                            <p className="text-[11px] font-bold uppercase tracking-wider text-red-200">Lớp học</p>
                            <p className="mt-1 text-2xl font-black">{teacherClasses.length}</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                            <UsersIcon size={18} className="mb-2 text-red-200" />
                            <p className="text-[11px] font-bold uppercase tracking-wider text-red-200">Học viên</p>
                            <p className="mt-1 text-2xl font-black">{totalStudents}</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                            <CheckCircleIcon size={18} className="mb-2 text-red-200" />
                            <p className="text-[11px] font-bold uppercase tracking-wider text-red-200">Điểm danh</p>
                            <p className="mt-1 text-2xl font-black">{avgAttendance}%</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                            <MessageIcon size={18} className="mb-2 text-red-200" />
                            <p className="text-[11px] font-bold uppercase tracking-wider text-red-200">Phiếu hỗ trợ</p>
                            <p className="mt-1 text-2xl font-black">8</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="sticky top-0 z-20 -mx-1 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/90 p-2 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-bg)]/75">
                <div className="flex min-w-max gap-2">
                    {tabs.map((tab) => (
                        <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={tabButtonClass(tab)}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <Panel title="Bản đồ tính năng" subtitle="Tất cả phân hệ dành cho giáo viên đã được thể hiện trong lớp giao diện này.">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {capabilityGroups.map(({ title, icon: Icon, points }) => (
                        <div key={title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Icon size={18} /></span>
                                <h3 className="font-black text-[var(--color-text)]">{title}</h3>
                            </div>
                            <ul className="space-y-1.5 text-xs font-semibold leading-5 text-[var(--color-text-secondary)]">
                                {points.map((point) => <li key={point}>• {point}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            </Panel>

            <Panel title="Tìm kiếm toàn hệ thống và lọc nhanh" subtitle="Mẫu tương tác dùng chung cho các phân hệ giáo viên.">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
                    <label className="relative block">
                        <SearchIcon size={16} className="absolute left-3 top-3 text-[var(--color-text-muted)]" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] pl-10 pr-3 text-sm font-medium text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                            placeholder="Tìm lớp, học viên, tệp, bài kiểm tra, thông báo..."
                        />
                    </label>
                    <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-bold text-[var(--color-text)] outline-none">
                        {['Tất cả', ...scheduleStatuses.map((item) => item.label)].map((status) => <option key={status}>{status}</option>)}
                    </select>
                    <select className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-bold text-[var(--color-text)] outline-none">
                        <option>Tất cả hình thức</option>
                        <option>Trực tuyến</option>
                        <option>Trực tiếp</option>
                    </select>
                    <PrimaryButton><DownloadIcon size={16} /> Xuất dữ liệu</PrimaryButton>
                </div>
            </Panel>

            {activeTab === 'Lịch dạy' && (
                <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                    <Panel title="Lịch giảng dạy" subtitle="Thẻ lịch hỗ trợ xem theo ngày, tuần, tháng và danh sách với màu trạng thái.">
                        <div className="mb-4 flex flex-wrap gap-2">
                            {['Ngày', 'Tuần', 'Tháng', 'Danh sách'].map((view) => <Badge key={view}>{view}</Badge>)}
                        </div>
                        <div className="space-y-3">
                            {sampleSchedule.map((item) => (
                            <motion.div key={`${item.id}-${item.status.label}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${item.status.tone}`}>{item.status.label}</span>
                                            <span className="rounded-full bg-[var(--color-card)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-text-secondary)]">{item.modality}</span>
                                        </div>
                                        <h3 className="mt-2 text-base font-black text-[var(--color-text)]">{item.name}</h3>
                                        <p className="text-xs font-semibold text-[var(--color-text-secondary)]">{item.subject} • {item.room} • {item.student_count || 0} học viên</p>
                                    </div>
                                    <div className="rounded-2xl bg-[var(--color-card)] px-4 py-2 text-right shadow-sm">
                                        <p className="text-[11px] font-bold uppercase text-[var(--color-text-muted)]">Hôm nay</p>
                                        <p className="text-sm font-black text-[var(--color-primary)]">{item.time}</p>
                                    </div>
                                </div>
                                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                                    {['Học viên', 'Tài liệu', 'Điểm danh', 'Dòng thời gian'].map((drawerItem) => (
                                        <button key={drawerItem} type="button" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
                                            {drawerItem}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                            ))}
                        </div>
                    </Panel>
                    <Panel title="Trung tâm nhắc việc" subtitle="Thông báo và phát hiện rủi ro lịch dạy.">
                        <div className="space-y-3">
                            {[
                                ['Khẩn cấp', 'Phát hiện trùng phòng VAT-A204 lúc 18:00', AlertCircleIcon, 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'],
                                ['Cảnh báo', 'Đơn nghỉ phép trùng với hai lớp đang hoạt động', BellIcon, 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'],
                                ['Thông tin', 'Đã cập nhật 3 tài liệu cho buổi học tới', InfoIcon, 'text-blue-600 bg-blue-50 dark:bg-blue-950/40'],
                                ['Thành công', 'Điểm danh draft autosaved 2 minutes ago', CheckCircleIcon, 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'],
                            ].map(([priority, text, Icon, tone]) => (
                                <div key={priority as string} className={`rounded-2xl p-4 ${tone as string}`}>
                                    <div className="flex items-start gap-3">
                                        <Icon size={18} />
                                        <div>
                                            <p className="text-xs font-black uppercase">{priority as string}</p>
                                            <p className="text-sm font-semibold text-[var(--color-text)]">{text as string}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            )}

            {activeTab === 'Lớp dạy' && (
                <Panel title="Lớp đang giảng dạy" subtitle="Dạng thẻ/danh sách với tiến độ, điểm danh, buổi học tiếp theo và thao tác nhanh.">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {filteredClasses.slice(0, 6).map((item, index) => (
                        <div key={item.id} className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-wider text-[var(--color-primary)]">{item.code}</p>
                                    <h3 className="mt-1 text-base font-black text-[var(--color-text)]">{item.name}</h3>
                                    <p className="text-xs font-semibold text-[var(--color-text-muted)]">Buổi tiếp theo: {item.class_hours || '18:30 - 20:30'}</p>
                                </div>
                                <button className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">★ Ghim</button>
                            </div>
                            <div className="mt-4 space-y-3">
                                {[['Tiến độ', item.progress || 42 + index * 8], ['Điểm danh', Math.min(98, 82 + ((item.progress + index * 3) % 16))]].map(([label, value]) => (
                                    <div key={label as string}>
                                        <div className="mb-1 flex justify-between text-[11px] font-bold text-[var(--color-text-secondary)]"><span>{label as string}</span><span>{value as number}%</span></div>
                                        <div className="h-2 rounded-full bg-[var(--color-border)]"><div className="h-2 rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.min(Number(value), 100)}%` }} /></div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-2">
                                {['Dòng thời gian', 'Tệp', 'Kiểm tra'].map((action) => <button key={action} className="rounded-xl bg-[var(--color-card)] px-2 py-2 text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">{action}</button>)}
                            </div>
                        </div>
                        ))}
                    </div>
                </Panel>
            )}

            {activeTab === 'Tài liệu' && (
                <Panel title="Kho tài liệu giảng dạy" subtitle="Tài nguyên an toàn, có tổ chức và quản lý phiên bản.">
                    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                        <div className="rounded-3xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] p-6 text-center">
                            <UploadIcon size={36} className="mx-auto text-[var(--color-primary)]" />
                            <h3 className="mt-3 font-black text-[var(--color-text)]">Kéo thả để tải lên</h3>
                            <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">Theo dõi lịch sử phiên bản, thẻ, thư mục, yêu thích và tệp gần đây.</p>
                            <PrimaryButton className="mt-4"><UploadIcon size={16} /> Tải tệp lên</PrimaryButton>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {materialTypes.map((type) => <div key={type} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"><FileIcon size={20} className="text-[var(--color-primary)]" /><p className="mt-3 text-sm font-black text-[var(--color-text)]">{type}</p><p className="text-[11px] text-[var(--color-text-muted)]">Xem trước • Tải xuống • Gắn thẻ</p></div>)}
                        </div>
                    </div>
                </Panel>
            )}

            {activeTab === 'Điểm danh' && (
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <Panel title="Student Điểm danh Workflow" subtitle="Chọn lớp → danh sách học viên → đánh dấu điểm danh → lưu.">
                        <div className="space-y-3">
                            {['Chọn lớp', 'Tải danh sách học viên', 'Đánh dấu Có mặt / Muộn / Có phép / Vắng', 'Tự lưu nháp', 'Hoàn tác trước khi gửi', 'Nút lưu cố định'].map((step, index) => (
                                <div key={step} className="flex items-center gap-3 rounded-2xl bg-[var(--color-bg-soft)] p-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary)] text-xs font-black text-white">{index + 1}</span>
                                    <span className="text-sm font-bold text-[var(--color-text)]">{step}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                    <Panel title="Điểm danh History" subtitle="Xem dạng bảng, lịch và phân tích, hỗ trợ xuất Excel/PDF.">
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                ['Có mặt', 92, 'emerald'],
                                ['Muộn', 5, 'amber'],
                                ['Có phép', 2, 'blue'],
                                ['Vắng', 1, 'rose'],
                            ].map(([label, value, color]) => <div key={label as string} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4"><p className="text-xs font-bold text-[var(--color-text-secondary)]">{label as string}</p><p className={`mt-1 text-3xl font-black ${color === 'emerald' ? 'text-emerald-600' : color === 'amber' ? 'text-amber-600' : color === 'blue' ? 'text-blue-600' : 'text-rose-600'}`}>{value as number}%</p></div>)}
                        </div>
                    </Panel>
                </div>
            )}

            {activeTab === 'Thông báo' && (
                <Panel title="Thông báo lớp học" subtitle="Trình soạn thảo hỗ trợ hẹn lịch, nháp, ghim, bình luận và trạng thái đã đọc.">
                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                            <div className="mb-3 flex flex-wrap gap-2">{['Văn bản', 'Hình ảnh', 'Âm thanh', 'Video', 'Tệp đính kèm'].map((tool) => <Badge key={tool}>{tool}</Badge>)}</div>
                            <textarea className="min-h-36 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm text-[var(--color-text)] outline-none" placeholder="Nhập nội dung thông báo..." />
                            <div className="mt-3 flex flex-wrap justify-end gap-2"><GhostButton>Lưu nháp</GhostButton><GhostButton>Hẹn lịch</GhostButton><PrimaryButton>Đăng và thông báo</PrimaryButton></div>
                        </div>
                        <div className="space-y-3">
                            {['Ghimned exam reminder • 96% read', 'Thời gian nộp bài tập mở tối nay', 'Đã đính kèm video hướng dẫn cho lớp trực tuyến'].map((item) => <div key={item} className="rounded-2xl bg-[var(--color-bg-soft)] p-4 text-sm font-bold text-[var(--color-text)]"><MessageIcon size={16} className="mb-2 text-[var(--color-primary)]" />{item}</div>)}
                        </div>
                    </div>
                </Panel>
            )}

            {activeTab === 'Dòng thời gian' && (
                <Panel title="Dòng thời gian lớp học" subtitle="Luồng tổng hợp buổi học, bài tập, điểm danh, thông báo, tệp, bài kiểm tra và điểm số.">
                    <div className="space-y-3">
                        {['Đã hoàn thành buổi học: Bài 04 Luyện nói', 'Đã giao bài tập kèm 3 tệp', 'Điểm danh finalized: 28 present, 2 late', 'Kiểm tra score released with comments'].map((item, index) => (
                            <div key={item} className="flex gap-3 rounded-2xl bg-[var(--color-bg-soft)] p-4">
                                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><ChartIcon size={18} /></span>
                                <div><p className="font-bold text-[var(--color-text)]">{item}</p><p className="text-xs text-[var(--color-text-muted)]">{index + 1}giờ trước • cảm xúc • bình luận • thẻ tìm kiếm</p></div>
                            </div>
                        ))}
                    </div>
                </Panel>
            )}

            {activeTab === 'Nghỉ phép' && (
                <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <Panel title="Quản lý nghỉ phép giáo viên" subtitle="Kiểm tra dữ liệu giúp tránh đơn trùng và phát hiện xung đột lịch.">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {['Loại nghỉ phép', 'Khoảng thời gian', 'Lý do', 'Tệp đính kèm', 'Liên hệ khẩn cấp', 'Kiểm tra xung đột'].map((field) => <div key={field} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-sm font-bold text-[var(--color-text)]">{field}</div>)}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">{['Nháp', 'Chờ xử lý', 'Đã duyệt', 'Từ chối', 'Đã hủy'].map((status) => <Badge key={status}>{status}</Badge>)}</div>
                    </Panel>
                    <Panel title="Quy trình duyệt và thống kê tháng" subtitle="Phòng đào tạo duyệt, phân công thay thế và tự động thông báo học viên.">
                        <div className="grid gap-3 sm:grid-cols-4">
                            {['Ngày nghỉ', 'Đã duyệt', 'Chờ xử lý', 'Từ chối'].map((metric, index) => <div key={metric} className="rounded-2xl bg-[var(--color-bg-soft)] p-4"><p className="text-xs font-bold text-[var(--color-text-muted)]">{metric}</p><p className="text-2xl font-black text-[var(--color-text)]">{[4, 2, 1, 1][index]}</p></div>)}
                        </div>
                        <div className="mt-4 rounded-2xl bg-[var(--color-bg-soft)] p-4 text-sm font-semibold text-[var(--color-text-secondary)]">If teaching schedule exists: notify academic office → require approval → suggest substitute teacher → reschedule affected classes → notify học viên automatically.</div>
                    </Panel>
                </div>
            )}

            {activeTab === 'Kiểm tra' && (
                <div className="space-y-4">
                    <Panel title="Question Bank & Tạo bài kiểm tra" subtitle="Soạn câu hỏi có phiên bản và cấu hình bài kiểm tra linh hoạt.">
                        <div className="mb-4 flex flex-wrap gap-2">{questionTypes.map((type) => <Badge key={type}>{type}</Badge>)}</div>
                        <div className="grid gap-4 lg:grid-cols-3">
                            {[
                                ['Thông tin câu hỏi', 'Độ khó, chủ đề, thẻ, thời gian dự kiến, điểm, tác giả, lịch sử phiên bản'],
                                ['Nội dung đa dạng', 'Hình ảnh, âm thanh, video, công thức toán, đoạn mã và bảng'],
                                ['Cấu hình', 'Thời lượng, hướng dẫn, điểm đạt, số lần làm, thời gian mở, trộn đề, tự nộp'],
                            ].map(([title, text]) => <div key={title} className="rounded-2xl bg-[var(--color-bg-soft)] p-4"><h3 className="font-black text-[var(--color-text)]">{title}</h3><p className="mt-2 text-xs font-semibold text-[var(--color-text-secondary)]">{text}</p></div>)}
                        </div>
                    </Panel>
                    <div className="grid gap-4 lg:grid-cols-3">
                        {[
                            ['Student Kiểm tra', 'Đếm ngược, tự lưu, đánh dấu câu, điều hướng, bảng câu hỏi, tiếp tục sau khi kết nối lại, tùy chọn toàn màn hình, tự nộp khi hết giờ.'],
                            ['Chấm điểm', 'Tự chấm câu khách quan; chấm theo rubric/thủ công cho nói, viết và câu tự luận kèm chú thích, nhận xét âm thanh.'],
                            ['Kết quả và xếp hạng', 'Lịch sử làm bài, phân tích điểm, công bố sau khi chấm, bảng xếp hạng theo bài/lớp/khóa với quyền hiển thị.'],
                        ].map(([title, text]) => <Panel key={title} title={title}><p className="text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">{text}</p></Panel>)}
                    </div>
                    <Panel title="Chấm điểm Assignment" subtitle="Hàng đợi cho giáo viên chính, giáo viên phụ và người chấm ngoài.">
                        <div className="grid gap-3 sm:grid-cols-4">{['Một bài nộp → một người chấm', 'Tiến độ dashboard', 'Chấm điểm queue', 'Phân công lại trước khi chấm'].map((rule) => <div key={rule} className="rounded-2xl bg-[var(--color-bg-soft)] p-3 text-xs font-black text-[var(--color-text)]">{rule}</div>)}</div>
                    </Panel>
                </div>
            )}

            {activeTab === 'Thư viện' && (
                <Panel title="Thư viện trực tuyến" subtitle="Tìm kiếm, lọc, xem trước, yêu thích, tải xuống và tài liệu đã xem gần đây.">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{libraryCategories.map((category) => <div key={category} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-5"><VideoIcon size={20} className="text-[var(--color-primary)]" /><h3 className="mt-3 font-black text-[var(--color-text)]">{category}</h3><p className="text-xs text-[var(--color-text-muted)]">Xem trước • Yêu thích • Tải xuống • Gần đây</p></div>)}</div>
                </Panel>
            )}

            {activeTab === 'Phản hồi' && (
                <Panel title="Trung tâm phản hồi" subtitle="Phiếu hỗ trợ giáo viên có tệp đính kèm và quy trình trạng thái.">
                    <div className="mb-4 flex flex-wrap gap-2">{feedbackCategories.map((category) => <Badge key={category}>{category}</Badge>)}</div>
                    <div className="grid gap-3 sm:grid-cols-4">{['Chờ xử lý', 'Đang xử lý', 'Đã giải quyết', 'Đã đóng'].map((status, index) => <div key={status} className="rounded-2xl bg-[var(--color-bg-soft)] p-4"><p className="text-xs font-bold text-[var(--color-text-muted)]">{status}</p><p className="text-2xl font-black text-[var(--color-text)]">{[5, 3, 12, 24][index]}</p></div>)}</div>
                </Panel>
            )}

            {activeTab === 'Tiêu chuẩn' && (
                <Panel title="Yêu cầu vận hành" subtitle="Trải nghiệm cấp doanh nghiệp và các tiêu chuẩn kỹ thuật bảo vệ hệ thống.">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{nonFunctional.map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4"><CheckCircleIcon size={18} className="text-emerald-600" /><span className="text-sm font-bold text-[var(--color-text)]">{item}</span></div>)}</div>
                </Panel>
            )}
        </div>
    );
}
