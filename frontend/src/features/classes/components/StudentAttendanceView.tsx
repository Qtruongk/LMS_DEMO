import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircleIcon, CalendarIcon, CheckCircleIcon, FilterIcon, XIcon } from '../../../components/shared/icons';
import { Badge, Button, Panel } from '../../../components/shared/ui';
import { API_URL } from '../../../services/api';
import type { ClassItem } from '../../../types';

type StudentAttendanceViewProps = {
    classes: ClassItem[];
};

type StudentAttendanceRecord = {
    id: number;
    class_id: number;
    class_name: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    note?: string;
    created_at?: string;
};

function getCurrentUserId() {
    try {
        const saved = localStorage.getItem('vat_user');
        return saved ? JSON.parse(saved).id : null;
    } catch {
        return null;
    }
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('vi-VN');
}

function formatTime(value?: string) {
    if (!value) return '--:--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export const StudentAttendanceView = memo(function StudentAttendanceView({ classes }: StudentAttendanceViewProps) {
    const [selectedClass, setSelectedClass] = useState<string>('ALL');
    const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [alertMsg, setAlertMsg] = useState('');

    const loadAttendance = useCallback(async () => {
        const userId = getCurrentUserId();
        if (!userId) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/attendance/student`, {
                headers: { 'Content-Type': 'application/json', 'x-user-id': String(userId) },
            });
            if (!response.ok) throw new Error('Không thể tải dữ liệu điểm danh');
            const data = await response.json();
            setRecords((data.attendance ?? []) as StudentAttendanceRecord[]);
            setAlertMsg('');
        } catch (error) {
            console.error('Lỗi tải lịch sử điểm danh:', error);
            setRecords([]);
            setAlertMsg('Chưa tải được dữ liệu điểm danh từ cơ sở dữ liệu.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAttendance();
    }, [loadAttendance]);

    const filteredRecords = useMemo(() => records.filter((record) => selectedClass === 'ALL' || String(record.class_id) === selectedClass), [records, selectedClass]);

    const stats = useMemo(() => {
        const source = filteredRecords;
        return [
            { label: 'Tổng số buổi', value: source.length, icon: CalendarIcon, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Có mặt', value: source.filter((item) => item.status === 'present').length, icon: CheckCircleIcon, color: 'text-green-500', bg: 'bg-green-50' },
            { label: 'Vắng có phép', value: source.filter((item) => item.status === 'excused').length, icon: AlertCircleIcon, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Vắng không phép', value: source.filter((item) => item.status === 'absent').length, icon: XIcon, color: 'text-red-500', bg: 'bg-red-50' },
        ];
    }, [filteredRecords]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'present': return <Badge tone="success">Có mặt</Badge>;
            case 'late': return <Badge tone="warning">Đi muộn</Badge>;
            case 'excused': return <Badge tone="warning">Vắng có phép</Badge>;
            case 'absent': return <Badge tone="danger">Vắng K.phép</Badge>;
            default: return <Badge tone="neutral">Chưa rõ</Badge>;
        }
    };

    return (
        <div className="grid gap-6">
            <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4 md:flex-row md:items-center">
                <div>
                    <h2 className="text-2xl font-black text-[var(--color-text)]">Lịch sử điểm danh</h2>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Theo dõi quá trình chuyên cần từ dữ liệu cơ sở dữ liệu</p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)]"
                    >
                        <option value="ALL">Tất cả lớp học</option>
                        {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <Button leftIcon={<FilterIcon size={16} />} onClick={loadAttendance}>Tải lại</Button>
                </div>
            </div>

            {alertMsg && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{alertMsg}</div>}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="flex flex-col items-start justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                        <span className={`mb-3 grid h-8 w-8 place-items-center rounded-lg ${stat.bg} ${stat.color}`}>
                            <stat.icon size={16} />
                        </span>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">{stat.label}</p>
                            <b className="text-2xl font-black text-[var(--color-text)]">{stat.value}</b>
                        </div>
                    </div>
                ))}
            </div>

            <Panel title="Chi tiết các buổi học" className="overflow-hidden p-0">
                {loading ? (
                    <div className="p-6 text-sm font-semibold text-[var(--color-text-secondary)]">Đang tải dữ liệu điểm danh...</div>
                ) : filteredRecords.length ? (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--color-bg-soft)] text-xs font-bold uppercase text-[var(--color-text-muted)]">
                            <tr>
                                <th className="px-6 py-4">Ngày / Giờ</th>
                                <th className="px-6 py-4">Lớp học</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {filteredRecords.map((record) => (
                                <tr key={record.id} className="transition hover:bg-[var(--color-bg-soft)]">
                                    <td className="px-6 py-4">
                                        <div className="flex min-w-10 flex-col">
                                            <b className="text-sm font-black text-[var(--color-text)]">{formatTime(record.created_at)}</b>
                                            <span className="text-[10px] text-[var(--color-text-muted)]">{formatDate(record.date)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-[var(--color-text)]">{record.class_name}</td>
                                    <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                                    <td className="px-6 py-4 text-xs text-[var(--color-text-secondary)]">{record.note || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-8 text-center text-sm font-semibold text-[var(--color-text-secondary)]">Chưa có dữ liệu điểm danh trong cơ sở dữ liệu cho bộ lọc hiện tại.</div>
                )}
            </Panel>
        </div>
    );
});
