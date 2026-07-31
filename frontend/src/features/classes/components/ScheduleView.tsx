import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarIcon, ClockIcon, ChartIcon, XIcon } from '../../../components/shared/icons';
import { Badge, Field, Panel, PrimaryButton } from '../../../components/shared/ui';
import type { ClassItem, ScheduleAdjustment } from '../../../types';
import { ClassSideDrawer } from '../../../components/shared/ClassSideDrawer';
import { StudentScheduleView } from './StudentScheduleView';

const DAYS_OF_WEEK = [
    { key: 't2', label: 'Thứ 2', dayIndex: 2 },
    { key: 't3', label: 'Thứ 3', dayIndex: 3 },
    { key: 't4', label: 'Thứ 4', dayIndex: 4 },
    { key: 't5', label: 'Thứ 5', dayIndex: 5 },
    { key: 't6', label: 'Thứ 6', dayIndex: 6 },
    { key: 't7', label: 'Thứ 7', dayIndex: 7 },
    { key: 'cn', label: 'Chủ Nhật', dayIndex: 0 },
];

type ScheduleViewProps = {
    classes: ClassItem[];
    adjustments?: ScheduleAdjustment[];
    userRole?: string;
    createAdjustment?: (payload: Record<string, unknown>) => Promise<unknown>;
    deleteAdjustment?: (id: number) => Promise<unknown>;
};

export function ScheduleView({
    classes,
    adjustments = [],
    userRole = 'student',
    createAdjustment,
    deleteAdjustment,
}: ScheduleViewProps) {
    const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
    const [scheduleTab, setScheduleTab] = useState<'fixed' | 'date_specific'>('date_specific');
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [selectedDrawerClass, setSelectedDrawerClass] = useState<ClassItem | null>(null);

    if (userRole === 'student') {
        return <StudentScheduleView classes={classes} />;
    }

    // Extract unique branches/locations
    const branches = Array.from(
        new Set(classes.map((c) => c.location || 'Cơ sở chính').filter(Boolean))
    );

    const filteredClasses = selectedBranch === 'ALL'
        ? classes
        : classes.filter((c) => (c.location || 'Cơ sở chính') === selectedBranch);

    // Comprehensive day matcher function
    const isClassOnDay = (scheduleStr: string, dayIndex: number) => {
        if (!scheduleStr) return false;
        const str = scheduleStr.toLowerCase().trim();

        // Check Sunday (Chủ nhật / CN)
        if (dayIndex === 0) {
            return str.includes('chủ nhật') || str.includes('cn') || str.includes('thứ cn');
        }

        // Check text names
        const textNames: Record<number, string[]> = {
            2: ['thứ 2', 'thứ hai', 't2', 'hai'],
            3: ['thứ 3', 'thứ ba', 't3', 'ba'],
            4: ['thứ 4', 'thứ tư', 't4', 'tư'],
            5: ['thứ 5', 'thứ năm', 't5', 'năm'],
            6: ['thứ 6', 'thứ sáu', 't6', 'sáu'],
            7: ['thứ 7', 'thứ bảy', 't7', 'bảy'],
        };

        if (textNames[dayIndex]?.some((name) => str.includes(name))) {
            return true;
        }

        // Check digits in numbers list like "2,4,6", "2-4-6", "Thứ 2,4,6"
        const targetDigit = String(dayIndex);
        const matches = str.match(/\d+/g);
        if (matches && matches.includes(targetDigit)) {
            return true;
        }

        return false;
    };

    // Helper to get classes for recurring weekly days
    const getClassesForDayIndex = (dayIndex: number) => {
        return filteredClasses.filter((c) => isClassOnDay(c.schedule || 'Thứ 2, 4, 6', dayIndex));
    };

    // Generate upcoming 10 days for Date Specific View
    const generateUpcomingDays = () => {
        const days = [];
        const today = new Date();
        for (let i = 0; i < 10; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const isoDate = d.toISOString().split('T')[0];
            const dayOfWeekIndex = d.getDay(); // 0 is Sunday, 1 is Monday...
            const dayName = dayOfWeekIndex === 0 ? 'Chủ Nhật' : `Thứ ${dayOfWeekIndex + 1}`;
            const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            
            const dayClasses = getClassesForDayIndex(dayOfWeekIndex === 0 ? 0 : dayOfWeekIndex + 1);

            days.push({
                isoDate,
                dayName,
                formattedDate,
                dayClasses,
                isToday: i === 0,
            });
        }
        return days;
    };

    const upcomingDays = generateUpcomingDays();

    return (
        <div className="grid gap-6">
            {/* Header, Tab Switcher & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <CalendarIcon size={20} />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-[var(--color-text)]">Thời khóa biểu & Lịch Đột Xuất</h2>
                        <p className="text-xs text-[var(--color-text-secondary)]">Quản lý lịch học cố định và các điều chỉnh đột xuất theo ngày thực tế</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Schedule Type Tab Switcher */}
                    <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-1">
                        <button
                            type="button"
                            onClick={() => setScheduleTab('date_specific')}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                scheduleTab === 'date_specific'
                                    ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-xs'
                                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            <CalendarIcon size={14} /> Lịch Theo Ngày & Đột Xuất
                        </button>
                        <button
                            type="button"
                            onClick={() => setScheduleTab('fixed')}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                scheduleTab === 'fixed'
                                    ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-xs'
                                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            <ChartIcon size={14} /> Lịch Cố Định Hàng Tuần
                        </button>
                    </div>

                    {/* Filter by Branch */}
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-xs font-medium text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
                        >
                            <option value="ALL">Tất cả cơ sở ({classes.length} lớp)</option>
                            {branches.map((b) => (
                                <option key={b} value={b}>
                                    📍 {b}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Add Adjustment Button for Admin / Teacher */}
                    {(userRole === 'admin' || userRole === 'teacher') && (
                        <button
                            type="button"
                            onClick={() => setShowAdjustmentModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700 active:scale-95"
                        >
                            <span>+</span> Điều chỉnh lịch đột xuất
                        </button>
                    )}
                </div>
            </div>

            {/* TAB 1: DATE SPECIFIC & AD-HOC ADJUSTMENT SCHEDULE VIEW */}
            {scheduleTab === 'date_specific' ? (
                <Panel title={`Lịch Học Theo Ngày Thực Tế & Đổi Lịch Đột Xuất ${selectedBranch !== 'ALL' ? `- ${selectedBranch}` : ''}`} className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-5 py-4 w-44 border-r border-[var(--color-border)]">Ngày Cụ Thể</th>
                                    <th className="px-5 py-4">Lịch Học & Sự Kiện Đột Xuất Trực Tiếp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
                                {upcomingDays.map((day) => {
                                    // Find adjustments on this exact date
                                    const dayAdjustments = adjustments.filter((a) => {
                                        const adjDate = String(a.date).split('T')[0];
                                        return adjDate === day.isoDate;
                                    });

                                    return (
                                        <tr key={day.isoDate} className={`transition duration-150 ${day.isToday ? 'bg-amber-500/5 font-medium' : 'hover:bg-[var(--color-bg-soft)]/40'}`}>
                                            {/* Ngày Cụ Thể */}
                                            <td className="px-5 py-4 border-r border-[var(--color-border)] bg-[var(--color-bg-soft)]/20 align-top">
                                                <div className="flex items-center gap-2">
                                                    <span className={`grid h-8 w-8 place-items-center rounded-xl font-extrabold text-xs shadow-xs ${
                                                        day.isToday ? 'bg-amber-500 text-white' : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                                                    }`}>
                                                        {day.dayName.slice(0, 3)}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-sm text-[var(--color-text)] leading-tight">{day.dayName}</p>
                                                        <span className="font-mono text-xs text-[var(--color-text-muted)]">{day.formattedDate}</span>
                                                    </div>
                                                </div>
                                                {day.isToday && (
                                                    <span className="mt-2 inline-block rounded-md bg-amber-100 px-2 py-0.5 font-bold text-[10px] text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                                                        Hôm nay
                                                    </span>
                                                )}
                                            </td>

                                            {/* Các lớp học và điều chỉnh đột xuất */}
                                            <td className="px-5 py-4 align-top">
                                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                                    {/* Render Ad-hoc Adjustments first */}
                                                    {dayAdjustments.map((adj) => (
                                                        <div
                                                            key={`adj-${adj.id}`}
                                                            className={`relative rounded-2xl border p-3.5 shadow-sm transition ${
                                                                adj.type === 'canceled'
                                                                    ? 'border-red-300 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/40'
                                                                    : adj.type === 'rescheduled'
                                                                    ? 'border-amber-300 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/40'
                                                                    : 'border-blue-300 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/40'
                                                            }`}
                                                        >
                                                            {/* Action Delete Adjustment */}
                                                            {(userRole === 'admin' || userRole === 'teacher') && (
                                                                <button
                                                                    type="button"
                                                                    title="Xóa điều chỉnh này"
                                                                    onClick={() => deleteAdjustment?.(adj.id)}
                                                                    className="absolute top-2.5 right-2.5 rounded-full p-1 text-gray-400 hover:bg-black/10 hover:text-red-600 transition"
                                                                >
                                                                    <XIcon size={14} />
                                                                </button>
                                                            )}

                                                            <div className="mb-2 flex items-center gap-1.5">
                                                                <span className={`rounded-md px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider ${
                                                                    adj.type === 'canceled'
                                                                        ? 'bg-red-600 text-white'
                                                                        : adj.type === 'rescheduled'
                                                                        ? 'bg-amber-600 text-white'
                                                                        : 'bg-blue-600 text-white'
                                                                }`}>
                                                                    {adj.type === 'canceled' ? 'Báo Nghỉ / Hoãn' : adj.type === 'rescheduled' ? 'Đổi Giờ Đột Xuất' : 'Lịch Học Bù'}
                                                                </span>
                                                            </div>

                                                            <h4 className="font-bold text-xs text-[var(--color-text)] leading-snug">{adj.class_name || 'Lớp học'}</h4>
                                                            
                                                            {adj.custom_hours && (
                                                                <div className="my-1.5 font-mono text-xs font-bold text-amber-700 dark:text-amber-300">
                                                                    Giờ mới: {adj.custom_hours}
                                                                </div>
                                                            )}

                                                            {adj.reason && (
                                                                <p className="mt-1 text-[11px] font-medium text-[var(--color-text-secondary)] italic">
                                                                    💬 Lý do: {adj.reason}
                                                                </p>
                                                            )}
                                                            <div className="mt-2 text-[10px] text-[var(--color-text-muted)]">📍 {adj.location || 'Cơ sở chính'}</div>
                                                        </div>
                                                    ))}

                                                    {/* Render Regular Recurring Classes for this Day */}
                                                    {day.dayClasses.map((item) => (
                                                        <div
                                                            key={`reg-${day.isoDate}-${item.id}`}
                                                            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 shadow-xs transition hover:border-[var(--color-primary-border)] hover:shadow-md"
                                                        >
                                                            <div className="mb-2 flex items-start justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                                                                <div>
                                                                    <h4 className="font-bold text-xs text-[var(--color-text)] leading-snug">{item.name}</h4>
                                                                    <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{item.code}</span>
                                                                </div>
                                                                <Badge tone="neutral">{item.subject}</Badge>
                                                            </div>

                                                            <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary-soft)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--color-primary)]">
                                                                <ClockIcon size={13} /> {item.class_hours || '18:30 - 20:30'}
                                                            </div>

                                                            <div className="grid gap-1 text-[11px] text-[var(--color-text-secondary)]">
                                                                <div className="flex items-center gap-1.5 font-medium">
                                                                    <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">
                                                                        {(item.teacher_name || 'GV')[0]}
                                                                    </span>
                                                                    <span>{item.teacher_name || 'Chưa phân công'}</span>
                                                                </div>
                                                                <div className="text-[10px] text-[var(--color-text-muted)]">📍 {item.location || 'Cơ sở chính'}</div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {!dayAdjustments.length && !day.dayClasses.length && (
                                                        <span className="text-xs text-[var(--color-text-muted)] italic py-2">Không có lịch học trong ngày</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            ) : (
                /* TAB 2: RECURRING WEEKLY MATRIX VIEW */
                <Panel title={`Bảng Thời Khóa Biểu Cố Định Hàng Tuần ${selectedBranch !== 'ALL' ? `- ${selectedBranch}` : ''}`} className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-5 py-4 w-36 border-r border-[var(--color-border)]">Thứ Hàng Tuần</th>
                                    <th className="px-5 py-4">Lớp Học Cố Định (Tên lớp, Giờ học, Giảng viên & Cơ sở)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
                                {DAYS_OF_WEEK.map((day) => {
                                    const dayClasses = getClassesForDayIndex(day.dayIndex);
                                    return (
                                        <tr key={day.key} className="transition duration-150 hover:bg-[var(--color-bg-soft)]/40">
                                            <td className="px-5 py-4 font-bold text-sm border-r border-[var(--color-border)] bg-[var(--color-bg-soft)]/20 align-top">
                                                <div className="flex items-center gap-2">
                                                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-xs font-extrabold">
                                                        {day.label.slice(0, 3)}
                                                    </span>
                                                    <span>{day.label}</span>
                                                </div>
                                                <span className="mt-1 block text-[10px] font-medium text-[var(--color-text-muted)]">
                                                    {dayClasses.length} lớp học
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 align-top">
                                                {dayClasses.length ? (
                                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                                        {dayClasses.map((item) => (
                                                            <div
                                                                key={`${day.key}-${item.id}`}
                                                                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 shadow-xs transition hover:border-[var(--color-primary-border)] hover:shadow-md"
                                                            >
                                                                <div className="mb-2 flex items-start justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                                                                    <div>
                                                                        <h4 className="font-bold text-xs text-[var(--color-text)] leading-snug">{item.name}</h4>
                                                                        <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{item.code}</span>
                                                                    </div>
                                                                    <Badge tone="neutral">{item.subject}</Badge>
                                                                </div>

                                                                <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary-soft)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--color-primary)]">
                                                                    <ClockIcon size={13} /> {item.class_hours || '18:30 - 20:30'}
                                                                </div>

                                                                <div className="grid gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                                                                    <div className="flex items-center gap-1.5 font-medium">
                                                                        <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">
                                                                            {(item.teacher_name || 'GV')[0]}
                                                                        </span>
                                                                        <span>{item.teacher_name || 'Chưa phân công'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 font-medium text-[var(--color-text-muted)]">
                                                                        <span>📍 {item.location || 'Cơ sở chính'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-[var(--color-text-muted)] italic">Không có lịch học cố định</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            )}

            {/* AD-HOC ADJUSTMENT MODAL */}
            <AnimatePresence>
                {showAdjustmentModal && (
                    <AddAdjustmentModal
                        classes={classes}
                        onClose={() => setShowAdjustmentModal(false)}
                        onSubmit={async (payload) => {
                            if (createAdjustment) {
                                await createAdjustment(payload);
                            }
                            setShowAdjustmentModal(false);
                        }}
                    />
                )}
            </AnimatePresence>

            <ClassSideDrawer
                classItem={selectedDrawerClass}
                onClose={() => setSelectedDrawerClass(null)}
                user={{ id: 1, full_name: 'Giảng viên', role: (userRole as any) || 'teacher', username: 'teacher', status: 'active' }}
            />
        </div>
    );
}

function AddAdjustmentModal({
    classes,
    onClose,
    onSubmit,
}: {
    classes: ClassItem[];
    onClose: () => void;
    onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
    const [classId, setClassId] = useState<string>(classes[0] ? String(classes[0].id) : '');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<'rescheduled' | 'canceled' | 'makeup' | 'special'>('rescheduled');
    const [customHours, setCustomHours] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!classId || !date) return;
        setLoading(true);
        try {
            await onSubmit({
                class_id: Number(classId),
                date,
                type,
                custom_hours: customHours.trim() || undefined,
                reason: reason.trim() || undefined,
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
                className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-2xl"
            >
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)] mb-5">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-600 text-white shadow-md font-bold">
                            
                        </span>
                        <div>
                            <h3 className="text-xl font-bold text-[var(--color-text)]">Điều Chỉnh Lịch Đột Xuất</h3>
                            <p className="text-xs text-[var(--color-text-secondary)]">Đổi giờ học, hoãn lớp hoặc đăng ký lịch học bù cho một ngày cụ thể</p>
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
                    {/* Choose Class */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Lớp học áp dụng *</label>
                        <select
                            value={classId}
                            onChange={(e) => setClassId(e.target.value)}
                            required
                            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-xs text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
                        >
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.code}) - {c.location || 'Cơ sở chính'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* Select Date */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Ngày điều chỉnh *</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-xs text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
                            />
                        </div>

                        {/* Select Type */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Loại điều chỉnh *</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as any)}
                                className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-xs font-bold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
                            >
                                <option value="rescheduled">Đổi Giờ Đột Xuất</option>
                                <option value="canceled">Tạm Nghỉ / Hoãn Lớp</option>
                                <option value="makeup">Lịch Học Bù</option>
                            </select>
                        </div>
                    </div>

                    {type !== 'canceled' && (
                        <Field label="Giờ học mới đột xuất" value={customHours} onChange={(e) => setCustomHours(e.target.value)} placeholder="VD: 19:30 - 21:30" />
                    )}

                    <Field label="Lý do điều chỉnh (Thông báo tới học sinh)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Giảng viên bận đột xuất / Học bù nghỉ lễ" />

                    <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)]"
                        >
                            Hủy bỏ
                        </button>
                        <PrimaryButton disabled={loading || !classId || !date} className="h-10 px-6 text-xs font-bold bg-amber-600 hover:bg-amber-700">
                            {loading ? 'Đang lưu...' : 'Xác nhận Điều Chỉnh'}
                        </PrimaryButton>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
