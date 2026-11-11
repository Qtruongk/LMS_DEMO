import { useMemo, useState, type FormEvent } from 'react';
import vatLogo from '../../../assets/vat_logo.jpg';
import { API_URL } from '../../../services/api';
import { Alert, Button, Field, Panel, PrimaryButton } from '../../../components/shared/ui';

type SelfServiceTab = 'change' | 'forgot';

type Props = {
    onBackToLogin?: () => void;
};

type ResetStatus = {
    request?: {
        id: number;
        username: string;
        status: string;
        requested_at?: string;
        approved_at?: string;
        completed_at?: string;
        auto_approved?: boolean;
        full_name?: string;
        phone?: string;
        student_code?: string;
    };
    can_change?: boolean;
};

async function publicApi<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? 'Không thể xử lý yêu cầu');
    return data;
}

export function SelfServiceView({ onBackToLogin }: Props) {
    const [activeTab, setActiveTab] = useState<SelfServiceTab>('change');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageTone, setMessageTone] = useState<'success' | 'danger' | 'info'>('info');
    const [changeForm, setChangeForm] = useState({ username: '', old_password: '', new_password: '', confirm_password: '' });
    const [forgotForm, setForgotForm] = useState({ username: '', new_password: '', confirm_password: '' });
    const [resetStatus, setResetStatus] = useState<ResetStatus | null>(null);

    const forgotStatusLabel = useMemo(() => {
        const status = resetStatus?.request?.status;
        if (status === 'approved') return 'Đã được xác nhận đổi mật khẩu';
        if (status === 'completed') return 'Đã hoàn thành';
        if (status === 'pending') return 'Đang chờ duyệt';
        return 'Chưa có yêu cầu';
    }, [resetStatus]);

    const setResult = (text: string, tone: 'success' | 'danger' | 'info' = 'info') => {
        setMessage(text);
        setMessageTone(tone);
    };

    const submitChangePassword = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setResult('');
        try {
            const data = await publicApi<{ message: string }>('/api/self-service/change-password', {
                method: 'POST',
                body: JSON.stringify(changeForm),
            });
            setChangeForm({ username: '', old_password: '', new_password: '', confirm_password: '' });
            setResult(data.message, 'success');
        } catch (error) {
            setResult(error instanceof Error ? error.message : 'Đổi mật khẩu thất bại.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const submitForgotRequest = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setResult('');
        try {
            const data = await publicApi<{ message: string; request: ResetStatus['request'] }>('/api/self-service/forgot-password/request', {
                method: 'POST',
                body: JSON.stringify({ username: forgotForm.username }),
            });
            setResetStatus({ request: data.request, can_change: data.request?.status === 'approved' });
            setResult(data.message, 'success');
        } catch (error) {
            setResult(error instanceof Error ? error.message : 'Không thể gửi yêu cầu.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const checkForgotStatus = async () => {
        if (!forgotForm.username.trim()) {
            setResult('Vui lòng nhập tên đăng nhập để kiểm tra.', 'danger');
            return;
        }
        setLoading(true);
        setResult('');
        try {
            const data = await publicApi<ResetStatus>(`/api/self-service/forgot-password/status?username=${encodeURIComponent(forgotForm.username.trim())}`);
            setResetStatus(data);
            setResult(data.can_change ? 'Đã có thể đổi được mật khẩu. Vui lòng nhập mật khẩu mới.' : 'Yêu cầu của bạn đã được gửi. Vui lòng đợi hệ thống xác nhận sau 5 phút.', data.can_change ? 'success' : 'info');
        } catch (error) {
            setResetStatus(null);
            setResult(error instanceof Error ? error.message : 'Không thể kiểm tra trạng thái.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const submitForgotComplete = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setResult('');
        try {
            const data = await publicApi<{ message: string }>('/api/self-service/forgot-password/complete', {
                method: 'POST',
                body: JSON.stringify(forgotForm),
            });
            setForgotForm({ username: '', new_password: '', confirm_password: '' });
            setResetStatus(null);
            setResult(data.message, 'success');
        } catch (error) {
            setResult(error instanceof Error ? error.message : 'Không thể đổi mật khẩu.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#fbfafb] px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6">
            <div className="mx-auto grid w-full max-w-3xl gap-5">
                <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <img src={vatLogo} alt="VAT" className="h-12 w-12 rounded-2xl object-cover ring-1 ring-red-100" />
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-900 dark:text-red-200">Self-service</p>
                            <h1 className="text-xl font-black tracking-[-0.03em]">Đổi mật khẩu học sinh</h1>
                        </div>
                    </div>
                    {onBackToLogin && <Button type="button" onClick={onBackToLogin}>Quay lại đăng nhập</Button>}
                </header>

                <Panel title="Trung tâm tự phục vụ tài khoản">
                    <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--color-bg-soft)] p-1">
                        <button type="button" onClick={() => { setActiveTab('change'); setMessage(''); }} className={`rounded-xl px-4 py-3 text-sm font-black transition ${activeTab === 'change' ? 'bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}>Đổi mật khẩu</button>
                        <button type="button" onClick={() => { setActiveTab('forgot'); setMessage(''); }} className={`rounded-xl px-4 py-3 text-sm font-black transition ${activeTab === 'forgot' ? 'bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}>Quên mật khẩu</button>
                    </div>

                    {message && (
                        <div className="mb-5">
                            <Alert tone={messageTone}>{message}</Alert>
                        </div>
                    )}

                    {activeTab === 'change' && (
                        <form onSubmit={submitChangePassword} className="grid gap-4">
                            <Field label="Tên đăng nhập" value={changeForm.username} onChange={(event) => setChangeForm({ ...changeForm, username: event.target.value })} required placeholder="Nhập tên đăng nhập học sinh" />
                            <Field label="Mật khẩu cũ" type="password" value={changeForm.old_password} onChange={(event) => setChangeForm({ ...changeForm, old_password: event.target.value })} required placeholder="Nhập mật khẩu hiện tại" />
                            <Field label="Mật khẩu mới" type="password" value={changeForm.new_password} onChange={(event) => setChangeForm({ ...changeForm, new_password: event.target.value })} required placeholder="Tối thiểu 6 ký tự" />
                            <Field label="Xác nhận mật khẩu" type="password" value={changeForm.confirm_password} onChange={(event) => setChangeForm({ ...changeForm, confirm_password: event.target.value })} required placeholder="Nhập lại mật khẩu mới" />
                            <PrimaryButton type="submit" isLoading={loading}>Xác nhận đổi mật khẩu</PrimaryButton>
                        </form>
                    )}

                    {activeTab === 'forgot' && (
                        <div className="grid gap-5">
                            <form onSubmit={submitForgotRequest} className="grid gap-4">
                                <Field label="Tên đăng nhập" value={forgotForm.username} onChange={(event) => setForgotForm({ ...forgotForm, username: event.target.value })} required placeholder="Nhập tên đăng nhập học sinh" />
                                <div className="flex flex-wrap gap-3">
                                    <PrimaryButton type="submit" isLoading={loading}>Gửi yêu cầu</PrimaryButton>
                                    <Button type="button" onClick={checkForgotStatus} disabled={loading}>Kiểm tra trạng thái</Button>
                                </div>
                            </form>

                            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Trạng thái yêu cầu</p>
                                <p className="mt-1 text-base font-black text-[var(--color-text)]">{forgotStatusLabel}</p>
                                <p className="mt-2 text-sm font-semibold text-[var(--color-text-secondary)]">Sau khi gửi yêu cầu, học sinh đợi 5 phút để hệ thống tự động duyệt hoặc admin xác nhận thủ công.</p>
                            </div>

                            {resetStatus?.can_change && (
                                <form onSubmit={submitForgotComplete} className="grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                                    <Alert tone="success">Đã có thể đổi được mật khẩu. Vui lòng nhập mật khẩu mới.</Alert>
                                    <Field label="Mật khẩu mới" type="password" value={forgotForm.new_password} onChange={(event) => setForgotForm({ ...forgotForm, new_password: event.target.value })} required placeholder="Tối thiểu 6 ký tự" />
                                    <Field label="Xác nhận mật khẩu" type="password" value={forgotForm.confirm_password} onChange={(event) => setForgotForm({ ...forgotForm, confirm_password: event.target.value })} required placeholder="Nhập lại mật khẩu mới" />
                                    <PrimaryButton type="submit" isLoading={loading}>Lưu mật khẩu mới</PrimaryButton>
                                </form>
                            )}
                        </div>
                    )}
                </Panel>
            </div>
        </main>
    );
}
