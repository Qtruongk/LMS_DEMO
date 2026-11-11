import { memo } from 'react';
import { BookIcon, CalendarIcon, CheckCircleIcon, UsersIcon } from '../../../components/shared/icons';
import { Badge } from '../../../components/shared/ui';
import type { ClassItem } from '../../../types';

type StudentClassesProps = {
    classes: ClassItem[];
    onNavigate?: (module: string) => void;
    selectedClassId?: number | null;
    setSelectedClassId?: (id: number) => void;
    detail?: any;
    studentView?: string;
    user?: any;
};

const formatDate = (value?: string) => {
    if (!value) return 'Đang cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Đang cập nhật';
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const StudentClasses = memo(function StudentClasses({ classes }: StudentClassesProps) {
    const activeClasses = classes.filter(c => c.status !== 'completed' && c.status !== 'canceled');
    const mainClass = activeClasses[0];

    return (
        <div className="mx-auto grid w-full max-w-7xl gap-4 pb-8 sm:gap-6">
            <section className="relative overflow-hidden rounded-[32px] border border-red-100 bg-white p-4 shadow-[0_24px_70px_-52px_rgba(127,29,29,0.28)] sm:p-6 lg:p-7 dark:border-red-100 dark:bg-white">
                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-50 blur-3xl dark:bg-red-50" />
                <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-amber-50 blur-3xl dark:bg-amber-50" />

                <div className="relative grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
                    <div className="min-w-0">
                        <Badge tone="primary">Lớp học của tôi</Badge>
                        <h1 className="mt-4 max-w-3xl text-3xl font-black leading-[1.06] tracking-[-0.055em] text-slate-950 sm:text-5xl dark:text-slate-950">
                            Xem nhanh các lớp bạn đang theo học.
                        </h1>
                    </div>

                    <div className="rounded-[28px] border border-slate-100 bg-slate-50 p-4 shadow-sm dark:border-slate-100 dark:bg-slate-50">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-400">Tổng lớp đang học</p>
                                <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-slate-950">{activeClasses.length} lớp</p>
                            </div>
                            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-900 text-white shadow-[0_18px_35px_-18px_rgba(127,29,29,0.8)]">
                                <BookIcon size={24} />
                            </span>
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-100 dark:bg-white">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-400">Lớp gần nhất</p>
                                <p className="mt-1 line-clamp-1 text-base font-black text-slate-950 dark:text-slate-950">{mainClass?.name ?? 'Chưa có lớp'}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-100 dark:bg-white">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-400">Giảng viên</p>
                                <p className="mt-1 line-clamp-1 text-base font-black text-slate-950 dark:text-slate-950">{mainClass?.teacher_name || 'Đang cập nhật'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {activeClasses.length === 0 ? (
                <section className="rounded-[28px] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-200 dark:bg-white">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-900">
                        <BookIcon size={26} />
                    </span>
                    <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-slate-950">Bạn chưa có lớp đang học</h2>
                </section>
            ) : (
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {activeClasses.map((item) => {
                        const progress = Math.min(100, Math.max(0, Number(item.progress ?? 0)));

                        return (
                            <article
                                key={item.id}
                                className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-red-100 hover:shadow-[0_18px_42px_-34px_rgba(127,29,29,0.35)] dark:border-slate-200 dark:bg-white"
                            >
                                <div className="border-b border-slate-100 bg-white p-4 dark:border-slate-100 dark:bg-white">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge tone="primary">{item.subject || 'Môn học'}</Badge>
                                                <Badge tone="success">{item.status_label || 'Đang học'}</Badge>
                                            </div>
                                            <h2 className="mt-2 text-lg font-black leading-tight tracking-[-0.035em] text-slate-950 dark:text-slate-950">
                                                {item.name}
                                            </h2>
                                            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-500">Mã lớp: {item.code}</p>
                                        </div>
                                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-900 ring-1 ring-red-100">
                                            <UsersIcon size={20} />
                                        </span>
                                    </div>

                                    {item.description && (
                                        <p className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-slate-100 dark:bg-slate-50 dark:text-slate-600">
                                            {item.description}
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-3 p-4">
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-100 dark:bg-slate-50">
                                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-400">Giảng viên</p>
                                            <p className="mt-1 text-sm font-black text-slate-950 dark:text-slate-950">{item.teacher_name || 'Chưa phân công'}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-100 dark:bg-slate-50">
                                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-400">Địa điểm</p>
                                            <p className="mt-1 text-sm font-black text-slate-950 dark:text-slate-950">{item.location || 'Đang cập nhật'}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-100 dark:bg-white">
                                        <div className="flex items-start gap-3">
                                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-900 ring-1 ring-red-100">
                                                <CalendarIcon size={18} />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-400">Lịch học</p>
                                                <p className="mt-1 text-sm font-black leading-6 text-slate-950 dark:text-slate-950">{item.schedule || item.class_hours || 'Đang cập nhật lịch'}</p>
                                                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-500">
                                                    Từ {formatDate(item.start_date)} đến {formatDate(item.end_date)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-100 dark:bg-slate-50">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <CheckCircleIcon size={16} className="text-red-900" />
                                                <span className="text-sm font-black text-slate-950 dark:text-slate-950">Tiến độ</span>
                                            </div>
                                            <span className="text-sm font-black text-red-900 dark:text-red-900">{progress}%</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100 dark:bg-white dark:ring-slate-100">
                                            <div className="h-full rounded-full bg-red-900" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}
        </div>
    );
});
