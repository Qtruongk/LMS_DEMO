import { memo, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircleIcon, CheckCircleIcon, XIcon } from '../../../components/shared/icons';
import { Badge, Button } from '../../../components/shared/ui';
import { API_URL } from '../../../services/api';
import type { ClassItem } from '../../../types';

type StudentAttendanceViewProps = {
    classes: ClassItem[];
};

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
type SlotStatus = 'present' | 'missing' | 'upcoming';

type StudentAttendanceRecord = {
    id: number;
    class_id: number;
    class_name: string;
    date: string;
    status: AttendanceStatus;
    note?: string;
    created_at?: string;
    session_id?: number;
    session_title?: string;
    session_start_time?: string;
    session_end_time?: string;
    session_number?: number;
};

type AttendanceCalendarSlot = {
    id: string;
    class_id: number;
    class_name: string;
    date: Date;
    start: Date;
    end: Date;
    time: string;
    status: SlotStatus;
    label: string;
    note: string;
    record?: StudentAttendanceRecord;
};

const weekLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function getCurrentUserId() {
    try {
        const saved = localStorage.getItem('vat_user') || localStorage.getItem('lms_user');
        if (!saved) return null;
        return JSON.parse(saved).id as number | null;
    } catch {
        return null;
    }
}

const formatDate = (value?: string | Date) => {
    if (!value) return 'Chưa cập nhật';
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
};

const formatShortDate = (value: Date) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(value);

const dateKey = (value: string | Date) => {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getWeekStart = (date = new Date()) => {
    const base = new Date(date);
    base.setHours(0, 0, 0, 0);
    const day = base.getDay();
    base.setDate(base.getDate() - (day === 0 ? 6 : day - 1));
    return base;
};

const getWeekEnd = (weekStart: Date) => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
};

const weekInputValue = (weekStart: Date) => {
    const yearStart = new Date(weekStart.getFullYear(), 0, 1);
    const days = Math.floor((weekStart.getTime() - yearStart.getTime()) / 86400000) + 1;
    const weekNumber = Math.ceil((days + yearStart.getDay()) / 7);
    return `${weekStart.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

const weekStartFromInput = (value: string) => {
    const [yearValue, weekValue] = value.split('-W');
    const year = Number(yearValue);
    const week = Number(weekValue);
    const firstDay = new Date(year, 0, 1 + (week - 1) * 7);
    const monday = getWeekStart(firstDay);
    if (monday.getFullYear() < year) monday.setDate(monday.getDate() + 7);
    return monday;
};

const parseScheduleDays = (schedule: string, fallbackIndex: number) => {
    const normalized = schedule.toLowerCase();
    const days: number[] = [];
    const dayPattern = /thứ\s*([2-7])/g;
    let match: RegExpExecArray | null;
    while ((match = dayPattern.exec(normalized))) {
        days.push(Number(match[1]) - 2);
    }
    if (normalized.includes('chủ nhật')) days.push(6);
    return days.length ? [...new Set(days)] : [fallbackIndex % 6];
};

const parseScheduleTime = (schedule: string, classHours?: string) => {
    const source = `${schedule} ${classHours || ''}`;
    const match = source.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    return { start: match?.[1] || '19:30', end: match?.[2] || '21:00' };
};

const setTimeOnDate = (date: Date, time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const next = new Date(date);
    next.setHours(hour || 0, minute || 0, 0, 0);
    return next;
};

const statusLabel: Record<AttendanceStatus, string> = {
    present: 'Có mặt',
    late: 'Đi muộn',
    excused: 'Nghỉ phép',
    absent: 'Vắng mặt',
};

const slotStatusCopy: Record<SlotStatus, string> = {
    present: 'Có mặt',
    missing: 'Chưa có mặt',
    upcoming: 'Chưa đến giờ',
};

export const StudentAttendanceView = memo(function StudentAttendanceView({ classes }: StudentAttendanceViewProps) {
    const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<number | 'all'>('all');
    const [selectedWeekStart, setSelectedWeekStart] = useState(() => getWeekStart());
    const [focusedSlot, setFocusedSlot] = useState<AttendanceCalendarSlot | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const loadAttendance = useCallback(async () => {
        const userId = getCurrentUserId();
        if (!userId) return;
        try {
            setLoading(true);
            setError('');
            const response = await fetch(`${API_URL}/api/attendance/student`, { headers: { 'x-user-id': String(userId) } });
            if (!response.ok) throw new Error('Không thể tải dữ liệu điểm danh');
            const data = await response.json();
            const attendanceRows = Array.isArray(data) ? data : data.attendance;
            setRecords(Array.isArray(attendanceRows) ? attendanceRows : []);
        } catch (err) {
            console.error('Lỗi tải lịch sử điểm danh:', err);
            setError('Chưa tải được lịch điểm danh. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAttendance();
    }, [loadAttendance]);

    const classSource = useMemo(() => {
        const map = new Map<number, ClassItem>();
        classes.forEach((item) => map.set(item.id, item));
        records.forEach((record) => {
            if (!map.has(record.class_id)) {
                map.set(record.class_id, {
                    id: record.class_id,
                    name: record.class_name,
                    code: `Lớp ${record.class_id}`,
                    description: 'Dữ liệu điểm danh từ cơ sở dữ liệu',
                    subject: record.class_name,
                    teacher_name: 'Giảng viên phụ trách',
                    start_date: record.date,
                    end_date: record.date,
                    status: 'active',
                    schedule: 'Thứ 2, 4, 6 • 19:30 - 21:00',
                    progress: 70,
                    location: 'Phòng học VAT',
                    student_count: 1,
                });
            }
        });
        return Array.from(map.values());
    }, [classes, records]);

    const weekDays = useMemo(() => weekLabels.map((label, index) => {
        const date = new Date(selectedWeekStart);
        date.setDate(selectedWeekStart.getDate() + index);
        return { label, date, key: dateKey(date) };
    }), [selectedWeekStart]);

    const selectedWeekEnd = useMemo(() => getWeekEnd(selectedWeekStart), [selectedWeekStart]);
    const currentWeekStart = useMemo(() => getWeekStart(), []);
    const isCurrentWeek = dateKey(selectedWeekStart) === dateKey(currentWeekStart);

    const calendarSlots = useMemo(() => {
        const now = new Date();
        const recordMap = new Map(records.map((record) => [`${record.class_id}-${dateKey(record.date)}`, record]));
        const filteredClasses = selectedClassId === 'all' ? classSource : classSource.filter((item) => item.id === selectedClassId);

        const recordSlots = filteredClasses.flatMap((classItem) => records
            .filter((record) => record.class_id === classItem.id && record.session_start_time && new Date(record.session_start_time) >= selectedWeekStart && new Date(record.session_start_time) <= selectedWeekEnd)
            .map((record) => {
                const start = new Date(record.session_start_time || record.date);
                const end = record.session_end_time ? new Date(record.session_end_time) : setTimeOnDate(start, parseScheduleTime(classItem.schedule || '', classItem.class_hours).end);
                const recordStatus: SlotStatus = record.status === 'present' || record.status === 'late' || record.status === 'excused' ? 'present' : 'missing';
                return {
                    id: `${classItem.id}-session-${record.session_id || record.date}`,
                    class_id: classItem.id,
                    class_name: classItem.name,
                    date: start,
                    start,
                    end,
                    time: `${start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
                    status: recordStatus,
                    label: statusLabel[record.status],
                    note: record.note || 'Bản ghi đã đồng bộ từ timeline buổi học.',
                    record,
                };
            }));

        if (recordSlots.length) return recordSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

        return filteredClasses.flatMap((classItem, classIndex) => {
            const days = parseScheduleDays(classItem.schedule || '', classIndex);
            const time = parseScheduleTime(classItem.schedule || '', classItem.class_hours);

            return days.map((dayIndex) => {
                const day = weekDays[dayIndex] || weekDays[0];
                const start = setTimeOnDate(day.date, time.start);
                const end = setTimeOnDate(day.date, time.end);
                const record = recordMap.get(`${classItem.id}-${day.key}`);
                const isUpcoming = start.getTime() > now.getTime();
                const status: SlotStatus = isUpcoming ? 'upcoming' : record?.status === 'present' || record?.status === 'late' || record?.status === 'excused' ? 'present' : 'missing';
                const label = isUpcoming ? 'Chưa đến giờ' : record ? statusLabel[record.status] : 'Chưa có mặt';
                return {
                    id: `${classItem.id}-${day.key}`,
                    class_id: classItem.id,
                    class_name: classItem.name,
                    date: day.date,
                    start,
                    end,
                    time: `${time.start} - ${time.end}`,
                    status,
                    label,
                    note: record?.note || (isUpcoming ? 'Buổi học chưa diễn ra.' : 'Chưa có bản ghi điểm danh trong cơ sở dữ liệu.'),
                    record,
                };
            });
        }).sort((a, b) => a.start.getTime() - b.start.getTime());
    }, [classSource, records, selectedClassId, selectedWeekEnd, selectedWeekStart, weekDays]);

    const slotsByDay = useMemo(() => weekDays.map((day) => ({
        ...day,
        slots: calendarSlots.filter((slot) => dateKey(slot.date) === day.key),
    })), [calendarSlots, weekDays]);

    const visibleStatuses = useMemo(() => ({
        present: calendarSlots.filter((slot) => slot.status === 'present').length,
        missing: calendarSlots.filter((slot) => slot.status === 'missing').length,
        upcoming: calendarSlots.filter((slot) => slot.status === 'upcoming').length,
    }), [calendarSlots]);

    const attendanceReport = useMemo(() => {
        const scopedRecords = selectedClassId === 'all' ? records : records.filter((record) => record.class_id === selectedClassId);
        const attendedRecords = scopedRecords.filter((record) => record.status === 'present' || record.status === 'late' || record.status === 'excused');
        const absentRecords = scopedRecords
            .filter((record) => record.status === 'absent')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const absentPercent = scopedRecords.length ? Math.round((absentRecords.length / scopedRecords.length) * 100) : 0;
        return {
            total: scopedRecords.length,
            attended: attendedRecords.length,
            absent: absentRecords.length,
            absentPercent,
            absentRecords,
        };
    }, [records, selectedClassId]);

    const moveWeek = (amount: number) => {
        setSelectedWeekStart((current) => {
            const next = new Date(current);
            next.setDate(current.getDate() + amount * 7);
            return getWeekStart(next);
        });
    };

    const handleWeekInput = (value: string) => {
        if (!value) return;
        setSelectedWeekStart(weekStartFromInput(value));
    };

    const openSlot = (slot: AttendanceCalendarSlot) => {
        setFocusedSlot(slot);
        setSubmitted(false);
    };

    const handleSubmitCorrection = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitted(true);
    };

    return (
        <div className="mx-auto grid w-full max-w-7xl gap-4 pb-8 sm:gap-5">
            <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_22px_60px_-48px_rgba(15,23,42,0.28)] dark:border-slate-200 dark:bg-white">
                <div className="border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-200 dark:bg-slate-50 sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div className="min-w-0">
                            <div className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-900 dark:border-red-100 dark:bg-red-50 dark:text-red-900">
                                Lịch điểm danh
                            </div>
                            <h1 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-slate-950 sm:text-3xl">
                                Tuần {formatDate(selectedWeekStart)} - {formatDate(selectedWeekEnd)}
                            </h1>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-600">
                                Chọn tuần để xem đầy đủ khung giờ học từ Thứ 2 đến Chủ nhật. Xanh là đã có mặt, đỏ là chưa có mặt, xám là chưa đến giờ.
                            </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-[auto_auto_auto] sm:items-center">
                            <Button type="button" variant="secondary" onClick={() => moveWeek(-1)} className="!border-slate-200 !bg-white !text-slate-800 dark:!border-slate-200 dark:!bg-white dark:!text-slate-800">
                                Tuần trước
                            </Button>
                            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-400 dark:text-slate-400">
                                Chọn tuần
                                <input
                                    type="week"
                                    value={weekInputValue(selectedWeekStart)}
                                    onChange={(event) => handleWeekInput(event.target.value)}
                                    className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black normal-case tracking-normal text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50 dark:border-slate-200 dark:bg-white dark:text-slate-900"
                                />
                            </label>
                            <Button type="button" variant="secondary" onClick={() => moveWeek(1)} className="!border-slate-200 !bg-white !text-slate-800 dark:!border-slate-200 dark:!bg-white dark:!text-slate-800">
                                Tuần sau
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                            <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-700">
                                Lọc theo lớp
                                <select
                                    value={selectedClassId}
                                    onChange={(event) => setSelectedClassId(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50 dark:border-slate-200 dark:bg-white dark:text-slate-900"
                                >
                                    <option value="all">Tất cả lớp đang học</option>
                                    {classSource.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </label>
                            <Button type="button" variant="primary" onClick={() => setSelectedWeekStart(getWeekStart())} disabled={isCurrentWeek}>
                                Tuần hiện tại
                            </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <StatusChip label="Có mặt" value={visibleStatuses.present} className="text-emerald-700" />
                            <StatusChip label="Chưa" value={visibleStatuses.missing} className="text-red-900" />
                            <StatusChip label="Sắp học" value={visibleStatuses.upcoming} className="text-slate-500" />
                        </div>
                    </div>
                </div>

                <div className="border-b border-slate-200 bg-white p-4 dark:border-slate-200 dark:bg-white sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
                        <div className="rounded-[26px] border border-red-100 bg-red-50 p-4 dark:border-red-100 dark:bg-red-50">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-900 dark:text-red-900">Attendance report</p>
                            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-slate-950">Tổng hợp chuyên cần</h2>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-600">
                                Báo cáo lấy trực tiếp từ cơ sở dữ liệu điểm danh, giúp học sinh biết đã đi học bao nhiêu buổi và vắng những ngày nào.
                            </p>
                            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                                <ReportCard label="Tổng buổi" value={attendanceReport.total} className="text-slate-950" />
                                <ReportCard label="Đã đi" value={attendanceReport.attended} className="text-emerald-700" />
                                <ReportCard label="% vắng" value={`${attendanceReport.absentPercent}%`} className="text-red-900" />
                            </div>
                        </div>

                        <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-200 dark:bg-slate-50">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-400">Các buổi vắng</p>
                                    <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950 dark:text-slate-950">{attendanceReport.absent} buổi cần theo dõi</h3>
                                </div>
                                <Badge tone={attendanceReport.absentPercent > 20 ? 'danger' : attendanceReport.absentPercent > 10 ? 'warning' : 'success'}>{attendanceReport.absentPercent}% buổi vắng</Badge>
                            </div>

                            <div className="mt-4 grid max-h-48 gap-2 overflow-y-auto pr-1">
                                {attendanceReport.absentRecords.length === 0 ? (
                                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 text-sm font-bold text-emerald-700 dark:border-emerald-100 dark:bg-white dark:text-emerald-700">
                                        Chưa có buổi vắng nào trong dữ liệu hiện tại.
                                    </div>
                                ) : attendanceReport.absentRecords.map((record) => (
                                    <div key={`${record.class_id}-${record.date}`} className="grid gap-2 rounded-2xl border border-red-100 bg-white p-3 dark:border-red-100 dark:bg-white sm:grid-cols-[auto_1fr] sm:items-center">
                                        <span className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-black text-red-900 dark:bg-red-50 dark:text-red-900">{formatDate(record.date)}</span>
                                        <div>
                                            <p className="text-sm font-black text-slate-950 dark:text-slate-950">Buổi {record.session_number || '—'} · {record.class_name}</p>
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-500">{record.session_title || record.note || 'Vắng mặt, chưa có ghi chú bổ sung.'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-3 dark:bg-white sm:p-4">
                    {error && (
                        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-100 dark:bg-red-50 dark:text-red-900">
                            <AlertCircleIcon size={18} />
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="grid min-h-[360px] place-items-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 text-sm font-black text-slate-500 dark:border-slate-200 dark:bg-slate-50 dark:text-slate-500">
                            Đang tải lịch điểm danh...
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                            {slotsByDay.map((day) => (
                                <article key={day.key} className="min-h-[230px] rounded-[24px] border border-slate-200 bg-slate-50 p-3 dark:border-slate-200 dark:bg-slate-50">
                                    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 dark:bg-white dark:ring-slate-100">
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-red-900 dark:text-red-900">{day.label}</p>
                                        <p className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950 dark:text-slate-950">{formatShortDate(day.date)}</p>
                                    </div>

                                    <div className="mt-3 grid gap-2">
                                        {day.slots.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs font-bold leading-5 text-slate-400 dark:border-slate-200 dark:bg-white dark:text-slate-400">
                                                Không có lịch học trong ngày này.
                                            </div>
                                        ) : day.slots.map((slot) => (
                                            <button
                                                key={slot.id}
                                                type="button"
                                                onClick={() => openSlot(slot)}
                                                className={`w-full rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getSlotClassName(slot.status)}`}
                                            >
                                                <span className="block text-[11px] font-black uppercase tracking-wide opacity-80">{slot.record?.session_number ? `Buổi ${slot.record.session_number} · ` : ''}{slot.time}</span>
                                                <span className="mt-1 block text-sm font-black leading-5">{slot.record?.session_title || slot.class_name}</span>
                                                <span className="mt-2 inline-flex rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-inherit">{slot.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {focusedSlot && (
                <div className="fixed inset-0 z-[150] grid place-items-end bg-slate-950/45 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
                    <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[30px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-200 dark:bg-white sm:max-w-2xl sm:rounded-[30px] sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <Badge tone={focusedSlot.status === 'present' ? 'success' : focusedSlot.status === 'missing' ? 'danger' : 'neutral'}>{slotStatusCopy[focusedSlot.status]}</Badge>
                                <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-slate-950">{focusedSlot.record?.session_title || focusedSlot.class_name}</h3>
                                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-500">{dayNames[focusedSlot.date.getDay()]} • {formatDate(focusedSlot.date)} • {focusedSlot.time}</p>
                            </div>
                            <button type="button" onClick={() => setFocusedSlot(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-100 dark:text-slate-600">
                                <XIcon size={18} />
                            </button>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <DetailCard title="Số buổi timeline" value={focusedSlot.record?.session_number ? `Buổi ${focusedSlot.record.session_number}` : 'Chưa gắn buổi'} />
                            <DetailCard title="Trạng thái" value={focusedSlot.label} />
                            <DetailCard title="Lớp học" value={focusedSlot.class_name} />
                            <DetailCard title="Ghi chú từ cơ sở dữ liệu" value={focusedSlot.note} />
                        </div>

                        {focusedSlot.status === 'missing' && (
                            <form onSubmit={handleSubmitCorrection} className="mt-5 rounded-[24px] border border-red-100 bg-red-50 p-4 dark:border-red-100 dark:bg-red-50">
                                <div className="flex items-start gap-3">
                                    <AlertCircleIcon className="mt-0.5 text-red-900" size={20} />
                                    <div>
                                        <h4 className="font-black text-red-950 dark:text-red-950">Báo giáo vụ kiểm tra lại</h4>
                                        <p className="mt-1 text-sm font-semibold leading-6 text-red-800 dark:text-red-800">Form đã có sẵn nội dung mẫu để học sinh gửi nhanh khi thấy điểm danh chưa khớp.</p>
                                    </div>
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.75fr]">
                                    <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-700">
                                        Nội dung cần kiểm tra
                                        <textarea
                                            defaultValue={`Em có tham gia buổi ${focusedSlot.class_name} ngày ${formatDate(focusedSlot.date)} lúc ${focusedSlot.time}. Nhờ giáo vụ kiểm tra lại giúp em.`}
                                            className="min-h-28 rounded-2xl border border-red-100 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-100 dark:border-red-100 dark:bg-white dark:text-slate-800"
                                        />
                                    </label>
                                    <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-700">
                                        Minh chứng
                                        <input
                                            defaultValue="Ảnh chụp lớp học / tin nhắn giáo viên"
                                            className="min-h-12 rounded-2xl border border-red-100 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-100 dark:border-red-100 dark:bg-white dark:text-slate-800"
                                        />
                                    </label>
                                </div>
                                <Button type="submit" variant="primary" className="mt-4 w-full sm:w-auto">
                                    {submitted ? 'Đã gửi yêu cầu mẫu' : 'Gửi yêu cầu kiểm tra'}
                                </Button>
                            </form>
                        )}

                        {focusedSlot.status === 'present' && (
                            <div className="mt-5 flex items-center gap-3 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800 dark:border-emerald-100 dark:bg-emerald-50 dark:text-emerald-800">
                                <CheckCircleIcon size={20} />
                                Dữ liệu điểm danh của buổi học này đã được ghi nhận trong cơ sở dữ liệu.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

function getSlotClassName(status: SlotStatus) {
    if (status === 'present') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (status === 'missing') return 'border-red-200 bg-red-50 text-red-900';
    return 'border-slate-200 bg-slate-100 text-slate-500';
}

function StatusChip({ label, value, className }: { label: string; value: number; className: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-200 dark:bg-white">
            <p className={`text-lg font-black tracking-[-0.04em] ${className}`}>{value}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-400">{label}</p>
        </div>
    );
}

function ReportCard({ label, value, className }: { label: string; value: number | string; className: string }) {
    return (
        <div className="rounded-2xl border border-red-100 bg-white p-3 dark:border-red-100 dark:bg-white">
            <p className={`text-2xl font-black tracking-[-0.05em] ${className}`}>{value}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-400">{label}</p>
        </div>
    );
}

function DetailCard({ title, value }: { title: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-200 dark:bg-slate-50">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400 dark:text-slate-400">{title}</p>
            <p className="mt-1 text-sm font-black leading-5 text-slate-950 dark:text-slate-950">{value}</p>
        </div>
    );
}
