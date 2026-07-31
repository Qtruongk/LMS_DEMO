import { memo, useState } from 'react';
import { CalendarIcon, CheckCircleIcon, XIcon, AlertCircleIcon, FilterIcon } from '../../../components/shared/icons';
import { Badge, Panel, Button } from '../../../components/shared/ui';
import type { ClassItem } from '../../../types';

type StudentAttendanceViewProps = {
    classes: ClassItem[];
};

export const StudentAttendanceView = memo(function StudentAttendanceView({ classes }: StudentAttendanceViewProps) {
    const [selectedClass, setSelectedClass] = useState<string>('ALL');

    // Mock data
    const stats = [
        { label: 'Tổng số buổi', value: 45, icon: CalendarIcon, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Có mặt', value: 38, icon: CheckCircleIcon, color: 'text-green-500', bg: 'bg-green-50' },
        { label: 'Vắng có phép', value: 5, icon: AlertCircleIcon, color: 'text-amber-500', bg: 'bg-amber-50' },
        { label: 'Vắng không phép', value: 2, icon: XIcon, color: 'text-red-500', bg: 'bg-red-50' },
    ];

    const records = [
        { date: '15/10/2026', time: '18:00', class: 'Tiếng Anh Giao Tiếp', status: 'present', note: '' },
        { date: '12/10/2026', time: '18:00', class: 'Tiếng Anh Giao Tiếp', status: 'excused', note: 'Bệnh' },
        { date: '10/10/2026', time: '09:00', class: 'Đại số tuyến tính', status: 'absent', note: '' },
        { date: '08/10/2026', time: '18:00', class: 'Tiếng Anh Giao Tiếp', status: 'present', note: '' },
        { date: '05/10/2026', time: '18:00', class: 'Tiếng Anh Giao Tiếp', status: 'present', note: 'Đi trễ 10p' },
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'present': return <Badge tone="success">Có mặt</Badge>;
            case 'excused': return <Badge tone="warning">Vắng có phép</Badge>;
            case 'absent': return <Badge tone="danger">Vắng K.phép</Badge>;
            default: return <Badge tone="neutral">Chưa rõ</Badge>;
        }
    };

    return (
        <div className="grid gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--color-border)] pb-4">
                <div>
                    <h2 className="text-2xl font-black text-[var(--color-text)]">Lịch sử điểm danh</h2>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">Theo dõi quá trình chuyên cần của bạn</p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)]"
                    >
                        <option value="ALL">Tất cả lớp học</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <Button leftIcon={<FilterIcon size={16} />}>Tháng này</Button>
                </div>
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {stats.map((stat, i) => (
                    <div key={i} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 flex flex-col justify-between items-start">
                        <span className={`grid h-8 w-8 place-items-center rounded-lg ${stat.bg} ${stat.color} mb-3`}>
                            <stat.icon size={16} />
                        </span>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">{stat.label}</p>
                            <b className="text-2xl font-black text-[var(--color-text)]">{stat.value}</b>
                        </div>
                    </div>
                ))}
            </div>

            <Panel title="Chi tiết các buổi học" className="p-0 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--color-bg-soft)] text-xs uppercase text-[var(--color-text-muted)] font-bold">
                        <tr>
                            <th className="px-6 py-4">Ngày / Giờ</th>
                            <th className="px-6 py-4">Lớp học</th>
                            <th className="px-6 py-4">Trạng thái</th>
                            <th className="px-6 py-4">Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                        {records.map((r, i) => (
                            <tr key={i} className="hover:bg-[var(--color-bg-soft)] transition">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center min-w-10">
                                            <b className="text-sm font-black text-[var(--color-text)]">{r.time}</b>
                                            <span className="text-[10px] text-[var(--color-text-muted)]">{r.date}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-semibold text-[var(--color-text)]">{r.class}</td>
                                <td className="px-6 py-4">{getStatusBadge(r.status)}</td>
                                <td className="px-6 py-4 text-[var(--color-text-secondary)] text-xs">{r.note || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Panel>
        </div>
    );
});
