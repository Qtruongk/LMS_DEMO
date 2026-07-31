import { memo } from 'react';
import { BookIcon, UsersIcon, CalendarIcon, FileIcon, CheckCircleIcon, SearchIcon, FilterIcon, MoreIcon } from '../../../components/shared/icons';
import { Badge, Button } from '../../../components/shared/ui';
import type { ClassItem } from '../../../types';

type StudentClassesProps = {
    classes: ClassItem[];
    onNavigate?: (module: string) => void;
};

export const StudentClasses = memo(function StudentClasses({ classes, onNavigate }: StudentClassesProps) {
    const activeClasses = classes.filter(c => c.status !== 'completed' && c.status !== 'canceled');

    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <BookIcon size={20} />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-[var(--color-text)]">Danh sách lớp đang học</h2>
                        <p className="text-xs text-[var(--color-text-secondary)]">Bạn đang tham gia {activeClasses.length} lớp học</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input type="text" placeholder="Tìm kiếm lớp học..." className="h-10 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] pl-9 pr-4 text-xs outline-none focus:border-[var(--color-primary)]" />
                    </div>
                    <Button leftIcon={<FilterIcon size={16} />}>Lọc</Button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeClasses.map((item) => (
                    <div key={item.id} className="group flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-0 shadow-sm transition hover:shadow-md hover:border-[var(--color-primary-border)] overflow-hidden">
                        <div className="p-5 flex-1 cursor-pointer">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <Badge tone="primary">{item.subject}</Badge>
                                    <h3 className="mt-2 text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">{item.name}</h3>
                                </div>
                                <button className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><MoreIcon size={16} /></button>
                            </div>
                            
                            <p className="text-xs text-[var(--color-text-secondary)] font-medium">Giảng viên: <span className="text-[var(--color-text)]">{item.teacher_name || 'Chưa phân công'}</span></p>
                            
                            <div className="mt-4 mb-2">
                                <div className="flex justify-between text-[10px] font-bold mb-1">
                                    <span className="text-[var(--color-text-secondary)]">Tiến độ khóa học</span>
                                    <span className="text-[var(--color-primary)]">45% (9/20 buổi)</span>
                                </div>
                                <div className="h-1.5 w-full bg-[var(--color-bg-soft)] rounded-full overflow-hidden">
                                    <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: '45%' }} />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[var(--color-border)]">
                                <span className="flex-1 text-center bg-green-50 text-green-700 py-1 rounded text-[10px] font-bold uppercase">Điểm danh: 8/9</span>
                                <span className="flex-1 text-center bg-amber-50 text-amber-700 py-1 rounded text-[10px] font-bold uppercase">Mới: 2 TB</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 divide-x divide-[var(--color-border)] border-t border-[var(--color-border)] bg-[var(--color-bg-soft)]">
                            <button onClick={() => onNavigate?.('timeline')} className="p-2 flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition">
                                <CalendarIcon size={16} />
                                <span className="text-[10px] font-semibold">Timeline</span>
                            </button>
                            <button onClick={() => onNavigate?.('materials')} className="p-2 flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition">
                                <FileIcon size={16} />
                                <span className="text-[10px] font-semibold">Tài liệu</span>
                            </button>
                            <button onClick={() => onNavigate?.('tests')} className="p-2 flex flex-col items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition">
                                <CheckCircleIcon size={16} />
                                <span className="text-[10px] font-semibold">Bài tập</span>
                            </button>
                            <button onClick={() => onNavigate?.('classes')} className="p-2 flex flex-col items-center gap-1 text-white bg-blue-600 hover:bg-blue-700 transition">
                                <UsersIcon size={16} />
                                <span className="text-[10px] font-semibold">Vào lớp</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});
