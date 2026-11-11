import { useEffect, useState } from 'react';
import { API_URL } from '../../../services/api';
import { Badge, Button, EmptyState, Panel } from '../../../components/shared/ui';
import type { User } from '../../../types';

type PasswordResetRequest = {
    id: number;
    username: string;
    status: 'pending' | 'approved' | 'completed' | string;
    requested_at?: string;
    approved_at?: string;
    completed_at?: string;
    auto_approved?: boolean;
    full_name?: string;
    phone?: string;
    student_code?: string;
};

type Props = {
    user: User;
};

const statusLabel: Record<string, string> = {
    pending: 'Yêu cầu',
    approved: 'Đã xác nhận',
    completed: 'Hoàn thành',
};

const statusTone: Record<string, 'warning' | 'info' | 'success'> = {
    pending: 'warning',
    approved: 'info',
    completed: 'success',
};

function formatDateTime(value?: string) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function PasswordResetRequestsView({ user }: Props) {
    const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    async function loadRequests() {
        const response = await fetch(`${API_URL}/api/password-reset/requests`, {
            headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? 'Không thể tải yêu cầu đổi mật khẩu.');
        setRequests(data.requests ?? []);
    }

    async function approveRequest(id: number) {
        setLoading(true);
        setMessage('');
        try {
            const response = await fetch(`${API_URL}/api/password-reset/requests/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message ?? 'Không thể xác nhận yêu cầu.');
            setMessage(data.message);
            await loadRequests();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể xác nhận yêu cầu.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadRequests().catch((error) => setMessage(error instanceof Error ? error.message : 'Không thể tải yêu cầu đổi mật khẩu.'));
        const timer = window.setInterval(() => {
            loadRequests().catch(() => undefined);
        }, 30000);
        return () => window.clearInterval(timer);
    }, [user.id]);

    return (
        <Panel
            title="Yêu cầu đổi mật khẩu"
            action={<Button type="button" onClick={() => loadRequests().catch((error) => setMessage(error instanceof Error ? error.message : 'Không thể tải yêu cầu.'))}>Làm mới</Button>}
        >
            {message && (
                <div className={`mb-4 rounded-2xl border p-3 text-sm font-bold ${message.toLowerCase().includes('không') || message.toLowerCase().includes('lỗi') ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                    {message}
                </div>
            )}

            {!requests.length ? (
                <EmptyState title="Chưa có yêu cầu" />
            ) : (
                <div className="grid gap-3">
                    {requests.map((item) => (
                        <article key={item.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-base font-black text-[var(--color-text)]">{item.full_name || item.username}</h3>
                                        <Badge tone={statusTone[item.status] ?? 'info'}>{statusLabel[item.status] ?? item.status}</Badge>
                                        {item.auto_approved && <Badge tone="success">Tự động duyệt</Badge>}
                                    </div>
                                    <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">@{item.username}{item.student_code ? ` • ${item.student_code}` : ''}{item.phone ? ` • ${item.phone}` : ''}</p>
                                </div>
                                <Button type="button" variant="primary" disabled={item.status !== 'pending'} isLoading={loading} onClick={() => approveRequest(item.id)}>
                                    Xác nhận đổi
                                </Button>
                            </div>
                            <div className="mt-4 grid gap-2 text-xs font-bold text-[var(--color-text-secondary)] sm:grid-cols-3">
                                <span>Gửi yêu cầu: {formatDateTime(item.requested_at)}</span>
                                <span>Duyệt: {formatDateTime(item.approved_at)}</span>
                                <span>Hoàn thành: {formatDateTime(item.completed_at)}</span>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </Panel>
    );
}
