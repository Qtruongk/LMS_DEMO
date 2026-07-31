import { memo } from 'react';
import { WalletIcon, CheckCircleIcon, DownloadIcon, ClockIcon } from '../../../components/shared/icons';
import { Badge, Panel, Button } from '../../../components/shared/ui';
import type { Tuition } from '../../../types';
import { formatMoney } from '../../../utils/format';

type StudentFinancesViewProps = {
    tuitions: Tuition[];
};

export const StudentFinancesView = memo(function StudentFinancesView({ tuitions }: StudentFinancesViewProps) {
    const totalDue = tuitions.reduce((acc, t) => acc + (t.status === 'unpaid' ? Number(t.amount_due || 0) : 0), 0);
    const totalPaid = tuitions.reduce((acc, t) => acc + (t.status === 'paid' ? Number(t.amount_paid || 0) : 0), 0);

    return (
        <div className="grid gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--color-border)] pb-4">
                <div>
                    <h2 className="text-2xl font-black text-[var(--color-text)]">Học phí & Thanh toán</h2>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">Quản lý hóa đơn và các khoản phí cần đóng</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Cần thanh toán</p>
                        <b className="text-3xl font-black text-red-600">{formatMoney(String(totalDue))}</b>
                    </div>
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-600">
                        <ClockIcon size={24} />
                    </span>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Đã thanh toán (Năm nay)</p>
                        <b className="text-3xl font-black text-green-600">{formatMoney(String(totalPaid))}</b>
                    </div>
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-green-50 text-green-600">
                        <CheckCircleIcon size={24} />
                    </span>
                </div>
            </div>

            <Panel title="Danh sách hóa đơn" className="p-0 overflow-hidden">
                {tuitions.length === 0 ? (
                    <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">Bạn không có hóa đơn nào.</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--color-bg-soft)] text-xs uppercase text-[var(--color-text-muted)] font-bold">
                            <tr>
                                <th className="px-6 py-4">Mã hóa đơn / Khóa học</th>
                                <th className="px-6 py-4">Số tiền</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {tuitions.map(item => (
                                <tr key={item.id} className="hover:bg-[var(--color-bg-soft)] transition group">
                                    <td className="px-6 py-4">
                                        <b className="block text-sm font-bold text-[var(--color-text)]">{item.class_name}</b>
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">INV-{1000 + item.id} • 15/10/2026</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-[var(--color-text)]">{formatMoney(item.amount_due)}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge tone={item.status === 'paid' ? 'success' : 'danger'}>
                                            {item.status === 'paid' ? 'Đã thu' : 'Chưa thu'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {item.status === 'unpaid' ? (
                                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold" leftIcon={<WalletIcon size={14} />}>
                                                Thanh toán
                                            </Button>
                                        ) : (
                                            <button className="text-[var(--color-text-muted)] hover:text-blue-600 transition p-2 rounded-full hover:bg-blue-50">
                                                <DownloadIcon size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Panel>
        </div>
    );
});
