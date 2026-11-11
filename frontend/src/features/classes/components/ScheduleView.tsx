import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarIcon, ChartIcon, XIcon } from '../../../components/shared/icons';
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

// Helper to format class time range with both start and end time
const formatClassTimeRange = (hours?: string | null): { start: string; end: string; display: string } => {
    if (!hours) {
        return { start: '18:30', end: '20:30', display: '18:30 - 20:30' };
    }
    const clean = hours.trim();
    if (clean.includes('-')) {
        const parts = clean.split('-').map((s) => s.trim());
        const start = parts[0] || '18:30';
        const end = parts[1] || '20:30';
        return { start, end, display: `${start} - ${end}` };
    }
    const match = clean.match(/(\d{1,2})[:h](\d{2})/);
    if (match) {
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const totalMin = h * 60 + m + 120; // default 2-hour duration
        const endH = Math.floor(totalMin / 60) % 24;
        const endM = totalMin % 60;
        const start = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const end = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        return { start, end, display: `${start} - ${end}` };
    }
    return { start: clean, end: '20:30', display: `${clean} - 20:30` };
};

// Convert "HH:MM" string to minutes from start of day
const timeStringToMinutes = (t: string): number => {
    const match = t.match(/(\d{1,2})[:h](\d{2})/);
    if (!match) return 0;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
};

type ScheduleViewProps = {
    classes: ClassItem[];
    adjustments?: ScheduleAdjustment[];
    userRole?: string;
    createAdjustment?: (payload: Record<string, unknown>) => Promise<unknown>;
    deleteAdjustment?: (id: number) => Promise<unknown>;
    onOpenModule?: (module: string, classId?: number) => void;
};

export function ScheduleView({
    classes,
    adjustments = [],
    userRole = 'student',
    createAdjustment,
    deleteAdjustment,
    onOpenModule,
}: ScheduleViewProps) {
    const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
    const [scheduleTab, setScheduleTab] = useState<'fixed' | 'date_specific'>('fixed');
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [selectedDrawerClass, setSelectedDrawerClass] = useState<ClassItem | null>(null);
    const [now, setNow] = useState<Date>(new Date());
    const [simulationMode, setSimulationMode] = useState<boolean>(false);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

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

    // Current minutes of the day (either real-time or simulated to 19:00 for demo)
    const currentMinutes = simulationMode ? (19 * 60) : (now.getHours() * 60 + now.getMinutes());
    const todayDayIndex = now.getDay() === 0 ? 0 : now.getDay() + 1;

    const isClassHappeningWeekly = (classHours?: string | null, dayIndex?: number) => {
        if (simulationMode) {
            // In simulation mode, activate any class that occurs on this day and matches simulated time 19:00
            const { start, end } = formatClassTimeRange(classHours);
            const startMin = timeStringToMinutes(start);
            const endMin = timeStringToMinutes(end);
            return currentMinutes >= startMin && currentMinutes <= endMin;
        }
        if (dayIndex !== todayDayIndex) return false;
        const { start, end } = formatClassTimeRange(classHours);
        const startMin = timeStringToMinutes(start);
        const endMin = timeStringToMinutes(end);
        return currentMinutes >= startMin && currentMinutes <= endMin;
    };

    const isClassHappeningDateSpecific = (classHours?: string | null, isToday?: boolean) => {
        if (!isToday && !simulationMode) return false;
        const { start, end } = formatClassTimeRange(classHours);
        const startMin = timeStringToMinutes(start);
        const endMin = timeStringToMinutes(end);
        return currentMinutes >= startMin && currentMinutes <= endMin;
    };

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

    const weeklyOverview = useMemo(() => DAYS_OF_WEEK.map((day) => ({
        ...day,
        classes: getClassesForDayIndex(day.dayIndex).sort((a, b) => (a.class_hours || '').localeCompare(b.class_hours || '')),
    })), [filteredClasses]);

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
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Schedule Type Tab Switcher */}
                    <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-1">
                        <button
                            type="button"
                            onClick={() => setScheduleTab('date_specific')}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${scheduleTab === 'date_specific'
                                ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-xs'
                                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                                }`}
                        >
                            <CalendarIcon size={14} /> Lịch Theo Ngày & Đột Xuất
                        </button>
                        <button
                            type="button"
                            onClick={() => setScheduleTab('fixed')}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${scheduleTab === 'fixed'
                                ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-xs'
                                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                                }`}
                        >
                            <ChartIcon size={14} /> Lịch Cố Định Hàng Tuần
                        </button>
                    </div>

                    {/* Live time indicator / Test toggle */}
                    <button
                        type="button"
                        onClick={() => setSimulationMode(!simulationMode)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                            simulationMode
                                ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/30'
                                : 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                        }`}
                        title="Bật để xem trước hiệu ứng lớp học đang diễn ra (19:00)"
                    >
                        {simulationMode ? (
                            <>
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                                </span>
                                <span>Đang test giờ học (19:00)</span>
                            </>
                        ) : (
                            <>
                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                                <span>Thử nghiệm: Đến giờ học</span>
                            </>
                        )}
                    </button>

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
                    {(userRole === 'admin' || userRole === 'owner' || userRole === 'teacher') && (
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

            {scheduleTab === 'fixed' ? (
                <Panel title={`Tổng quan thời khóa biểu tuần ${selectedBranch !== 'ALL' ? `- ${selectedBranch}` : ''}`}>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
                        {weeklyOverview.map((day) => (
                            <section key={day.key} className="min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)]/50 p-3">
                                <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                                    <span className="text-sm font-black text-[var(--color-text)]">{day.label}</span>
                                    <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--color-primary)]">{day.classes.length}</span>
                                </div>
                                <div className="grid gap-2">
                                    {day.classes.length ? day.classes.map((item) => {
                                        const isHappening = isClassHappeningWeekly(item.class_hours, day.dayIndex);
                                        const timeInfo = formatClassTimeRange(item.class_hours);

                                        return (
                                            <button
                                                key={`${day.key}-${item.id}`}
                                                type="button"
                                                onClick={() => setSelectedDrawerClass(item)}
                                                className={`min-w-0 w-full overflow-hidden rounded-xl border p-2.5 text-left shadow-xs transition ${
                                                    isHappening
                                                        ? 'border-emerald-500 bg-emerald-50/90 dark:border-emerald-500 dark:bg-emerald-950/40 ring-2 ring-emerald-500/40 shadow-md'
                                                        : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-soft)] hover:shadow-sm'
                                                }`}
                                            >
                                                <div className="flex min-w-0 items-center justify-between gap-1.5">
                                                    <span className={`min-w-0 flex-1 truncate text-xs font-black ${isHappening ? 'text-emerald-900 dark:text-emerald-100' : 'text-[var(--color-text)]'}`}>
                                                        {item.name}
                                                    </span>
                                                    <span
                                                        className={`shrink-0 truncate rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black transition ${
                                                            isHappening
                                                                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                                                : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                                                        }`}
                                                        title={timeInfo.display}
                                                    >
                                                        {timeInfo.display}
                                                    </span>
                                                </div>
                                                {isHappening && (
                                                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                                        </span>
                                                        <span>🟢 ĐANG DIỄN RA</span>
                                                    </div>
                                                )}
                                                <p className="mt-1 truncate text-[10px] font-semibold text-[var(--color-text-muted)]">{item.subject || item.code} • {item.location || 'Cơ sở chính'}</p>
                                            </button>
                                        );
                                    }) : (
                                        <p className="py-3 text-center text-[11px] italic text-[var(--color-text-muted)]">Không có lớp</p>
                                    )}
                                </div>
                            </section>
                        ))}
                    </div>
                </Panel>
            ) : (
                <Panel
                    title={`Lịch Học Theo Ngày Thực Tế & Đổi Lịch Đột Xuất ${selectedBranch !== 'ALL' ? `- ${selectedBranch}` : ''}`}
                >
                    {upcomingDays.some((day) => day.dayClasses.length || adjustments.some((adjustment) => String(adjustment.date).split('T')[0] === day.isoDate)) ? (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {upcomingDays.map((day) => {
                                const dayAdjustments = adjustments.filter((adjustment) => String(adjustment.date).split('T')[0] === day.isoDate);
                                if (!day.dayClasses.length && !dayAdjustments.length) return null;

                                return (
                                    <section
                                        key={day.isoDate}
                                        className={`min-w-0 overflow-hidden rounded-2xl border p-3 ${day.isToday
                                            ? 'border-amber-300 bg-amber-50/60 dark:border-amber-700/60 dark:bg-amber-950/20'
                                            : 'border-[var(--color-border)] bg-[var(--color-bg-soft)]/50'
                                            }`}
                                    >
                                        <div className="mb-3 flex min-w-0 items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black text-[var(--color-text)]">{day.dayName}</p>
                                                <p className="font-mono text-[11px] font-bold text-[var(--color-text-muted)]">{day.formattedDate}</p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                                {day.isToday && <Badge tone="warning" size="sm">Hôm nay</Badge>}
                                                <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--color-primary)]">
                                                    {day.dayClasses.length + dayAdjustments.length}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            {dayAdjustments.map((adjustment) => {
                                                const tone = adjustment.type === 'canceled'
                                                    ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                                                    : adjustment.type === 'rescheduled'
                                                        ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
                                                        : 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200';
                                                const label = adjustment.type === 'canceled' ? 'Nghỉ học' : adjustment.type === 'rescheduled' ? 'Đổi lịch' : adjustment.type === 'makeup' ? 'Học bù' : 'Đột xuất';
                                                return (
                                                    <article key={`adjustment-${adjustment.id}`} className={`min-w-0 overflow-hidden rounded-xl border p-2.5 ${tone}`}>
                                                        <div className="flex min-w-0 items-center justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <span className="text-[10px] font-black uppercase tracking-wide">{label}</span>
                                                                <p className="mt-0.5 truncate text-xs font-black">{adjustment.class_name || adjustment.class_code || 'Lớp học'}</p>
                                                            </div>
                                                            {deleteAdjustment && ['teacher', 'admin', 'owner'].includes(userRole || '') && (
                                                                <button type="button" onClick={() => deleteAdjustment(adjustment.id)} className="shrink-0 rounded-lg px-1.5 py-1 text-[10px] font-black hover:bg-white/60" title="Xóa điều chỉnh">Xóa</button>
                                                            )}
                                                        </div>
                                                        <p className="mt-1 truncate text-[10px] font-bold opacity-80">{adjustment.custom_hours || 'Theo lịch cập nhật'} • {adjustment.location || 'Cơ sở chính'}</p>
                                                        {adjustment.reason && <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed opacity-80">{adjustment.reason}</p>}
                                                    </article>
                                                );
                                            })}

                                            {day.dayClasses.map((item) => {
                                                const isHappening = isClassHappeningDateSpecific(item.class_hours, day.isToday);
                                                const timeInfo = formatClassTimeRange(item.class_hours);

                                                return (
                                                    <button
                                                        key={`class-${day.isoDate}-${item.id}`}
                                                        type="button"
                                                        onClick={() => setSelectedDrawerClass(item)}
                                                        className={`min-w-0 overflow-hidden rounded-xl border p-2.5 text-left shadow-xs transition ${
                                                            isHappening
                                                                ? 'border-emerald-500 bg-emerald-50/90 dark:border-emerald-500 dark:bg-emerald-950/40 ring-2 ring-emerald-500/40 shadow-md'
                                                                : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-soft)]'
                                                        }`}
                                                    >
                                                        <div className="flex min-w-0 items-center justify-between gap-1.5">
                                                            <span className={`min-w-0 flex-1 truncate text-xs font-black ${isHappening ? 'text-emerald-900 dark:text-emerald-100' : 'text-[var(--color-text)]'}`}>
                                                                {item.name}
                                                            </span>
                                                            <span
                                                                className={`shrink-0 truncate rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black transition ${
                                                                    isHappening
                                                                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                                                        : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                                                                }`}
                                                                title={timeInfo.display}
                                                            >
                                                                {timeInfo.display}
                                                            </span>
                                                        </div>
                                                        {isHappening && (
                                                            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                                                                <span className="relative flex h-2 w-2">
                                                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                                                </span>
                                                                <span>🟢 ĐANG DIỄN RA</span>
                                                            </div>
                                                        )}
                                                        <p className="mt-1 truncate text-[10px] font-semibold text-[var(--color-text-muted)]">{item.subject || item.code} • {item.location || 'Cơ sở chính'}</p>
                                                        <p className="mt-1 truncate text-[10px] text-[var(--color-text-secondary)]">{item.teacher_name || 'Chưa phân công'}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] p-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
                            Không có lớp hoặc lịch đột xuất trong 10 ngày tới.
                        </div>
                    )}
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
                onOpenModule={onOpenModule}
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
