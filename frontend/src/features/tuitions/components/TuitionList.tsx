import { Badge, EmptyState, GhostButton, Panel } from '../../../components/shared/ui';
import { statusLabel } from '../../../constants/labels';
import { DownloadIcon } from '../../../components/shared/icons';
import type { Tuition, User } from '../../../types';
import { formatMoney } from '../../../utils/format';
import { StudentFinancesView } from './StudentFinancesView';

export function TuitionList({ tuitions, user }: { tuitions: Tuition[], user?: User }) {
    if (user?.role === 'student') {
        return <StudentFinancesView tuitions={tuitions} />;
    }
    return (
        <Panel
            title="Học phí"
           
            action={
                <GhostButton>
                    <DownloadIcon size={16} />
                    Export
                </GhostButton>
            }
        >
            {tuitions.length ? (
                <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                        <thead>
                            <tr className="bg-[var(--color-bg-soft)]">
                                <th className="p-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Học sinh</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Lớp</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Cần thu</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Đã thu</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tuitions.map((item) => (
                                <tr key={item.id} className="border-t border-[var(--color-border)] transition hover:bg-[var(--color-primary-soft)]">
                                    <td className="p-4">
                                        <span className="font-medium text-[var(--color-text)]">{item.student_name}</span>
                                        <br />
                                        <small className="text-[var(--color-text-muted)]">{item.student_code}</small>
                                    </td>
                                    <td className="p-4 text-[var(--color-text-secondary)]">{item.class_name}</td>
                                    <td className="p-4 font-medium text-[var(--color-text)]">{formatMoney(item.amount_due)}</td>
                                    <td className="p-4 font-medium text-[var(--color-text)]">{formatMoney(item.amount_paid)}</td>
                                    <td className="p-4">
                                        <Badge tone="primary">{statusLabel[item.status] ?? item.status}</Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : <EmptyState />}
        </Panel>
    );
}
