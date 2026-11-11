import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './icons';
import { API_URL } from '../../services/api';

type ClassStat = {
    id: number;
    name: string;
    code: string;
    subject: string;
    schedule: string | null;
    status: string;
    teacher_name: string | null;
    attendance: { total: number; present: number; absent: number; late: number; rate: number | null };
    score: { count: number; average: number | null };
    homework: { assigned: number; rate: number | null };
};

type StudentProfile = {
    student: { id: number; full_name: string | null; username: string; phone: string | null; student_code: string | null; status: string; note: string | null; created_at: string };
    summary: { class_count: number; total_sessions: number; absent: number; late: number; attendance_rate: number | null; score_average: number | null; homework_rate: number | null };
    classes: ClassStat[];
    recent_absences: { class_id: number; class_name: string; date: string; status: string; note: string | null }[];
    tuitions: { class_id: number; class_name: string; amount_due: number; amount_paid: number; status: string }[];
};

const fmtDate = (v: string) => {
    const [y, m, d] = v.slice(0, 10).split('-');
    return y && m && d ? `${d}/${m}/${y}` : v;
};
const fmtMoney = (v: number) => `${v.toLocaleString('vi-VN')}đ`;

const rateTone = (v: number | null) =>
    v === null ? 'text-slate-400' : v >= 85 ? 'text-emerald-600' : v >= 65 ? 'text-amber-600' : 'text-red-600';
const scoreTone = (v: number | null) =>
    v === null ? 'text-slate-400' : v >= 8 ? 'text-emerald-600' : v >= 6.5 ? 'text-lime-600' : v >= 5 ? 'text-amber-600' : 'text-red-600';

const statusLabel: Record<string, { label: string; cls: string }> = {
    absent: { label: 'Vắng', cls: 'bg-red-600 text-white' },
    late: { label: 'Đi muộn', cls: 'bg-amber-500 text-white' },
};

const tuitionLabel: Record<string, { label: string; cls: string }> = {
    paid: { label: 'Đã đóng', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    partial: { label: 'Đóng một phần', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    unpaid: { label: 'Chưa đóng', cls: 'bg-red-50 text-red-700 border-red-200' },
    waived: { label: 'Miễn phí', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export function StudentProfileModal({ studentId, viewerId, onClose }: { studentId: number | null; viewerId: number; onClose: () => void }) {
    const [data, setData] = useState<StudentProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!studentId) return;
        let alive = true;
        setLoading(true);
        setError('');
        setData(null);
        fetch(`${API_URL}/api/students/${studentId}/profile`, { headers: { 'x-user-id': String(viewerId) } })
            .then(async (r) => {
                const body = await r.json();
                if (!r.ok) throw new Error(body.message || 'Không tải được hồ sơ');
                if (alive) setData(body);
            })
            .catch((e) => alive && setError(e.message))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [studentId, viewerId]);

    useEffect(() => {
        if (!studentId) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [studentId, onClose]);

    if (!studentId) return null;

    const st = data?.student;
    const sm = data?.summary;
    const name = st?.full_name || st?.username || '';

    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <div
                className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
                    <h2 className="truncate text-lg font-black text-[var(--color-text)] sm:text-xl">Hồ sơ học sinh{name ? `: ${name}` : ''}</h2>
                    <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)] hover:bg-[var(--color-border)]">
                        <XIcon size={18} />
                    </button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
                    {loading ? (
                        <div className="grid gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-[var(--color-bg-soft)]" />)}</div>
                    ) : error ? (
                        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>
                    ) : data && st && sm ? (
                        <>
                            <div className="flex items-center gap-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-5">
                                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary)] text-2xl font-black text-white shadow-md">
                                    {name.charAt(0).toUpperCase()}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="truncate text-xl font-black text-[var(--color-text)]">{name}</h3>
                                        <span className={`rounded-md border px-2 py-0.5 text-[11px] font-black ${st.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                            {st.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa'}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 grid gap-x-4 gap-y-1 text-xs font-semibold text-[var(--color-text-muted)] sm:grid-cols-2">
                                        <span>Mã HS: <b className="font-mono text-[var(--color-text)]">{st.student_code || 'Chưa có'}</b></span>
                                        <span>Tài khoản: <b className="text-[var(--color-text)]">@{st.username}</b></span>
                                        <span>SĐT: <b className="text-[var(--color-text)]">{st.phone || 'Chưa có'}</b></span>
                                        <span>Ngày tạo: <b className="text-[var(--color-text)]">{fmtDate(st.created_at)}</b></span>
                                    </div>
                                    {st.note && <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">Ghi chú: {st.note}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                <Kpi label="Lớp đang học" value={sm.class_count} />
                                <Kpi label="Chuyên cần" value={sm.attendance_rate !== null ? `${sm.attendance_rate}%` : '—'} tone={rateTone(sm.attendance_rate)} />
                                <Kpi label="Điểm TB" value={sm.score_average ?? '—'} tone={scoreTone(sm.score_average)} />
                                <Kpi label="Hoàn thành BTVN" value={sm.homework_rate !== null ? `${sm.homework_rate}%` : '—'} tone={rateTone(sm.homework_rate)} />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <Pill label="Tổng buổi" value={sm.total_sessions} cls="border-slate-200 bg-slate-50 text-slate-700" />
                                <Pill label="Vắng" value={sm.absent} cls="border-red-200 bg-red-50 text-red-700" />
                                <Pill label="Đi muộn" value={sm.late} cls="border-amber-200 bg-amber-50 text-amber-700" />
                            </div>

                            <section className="space-y-2.5">
                                <h4 className="text-base font-black text-[var(--color-text)]">Lớp học ({data.classes.length})</h4>
                                {data.classes.length === 0 ? (
                                    <Empty text="Học sinh chưa được xếp vào lớp nào" />
                                ) : (
                                    data.classes.map((c) => (
                                        <div key={c.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <b className="block truncate text-sm text-[var(--color-text)]">{c.name}</b>
                                                    <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                                                        {c.code} • GV: {c.teacher_name || 'Chưa phân công'} • Lịch: {c.schedule || 'Chưa xếp'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                                <ClassMetric
                                                    label="Chuyên cần"
                                                    value={c.attendance.rate !== null ? `${c.attendance.rate}%` : '—'}
                                                    sub={c.attendance.total ? `${c.attendance.absent} vắng / ${c.attendance.total} buổi` : 'Chưa điểm danh'}
                                                    tone={rateTone(c.attendance.rate)}
                                                    bar={c.attendance.rate}
                                                />
                                                <ClassMetric
                                                    label="Điểm TB"
                                                    value={c.score.average ?? '—'}
                                                    sub={c.score.count ? `${c.score.count} bài kiểm tra` : 'Chưa có điểm'}
                                                    tone={scoreTone(c.score.average)}
                                                    bar={c.score.average !== null ? c.score.average * 10 : null}
                                                />
                                                <ClassMetric
                                                    label="BTVN"
                                                    value={c.homework.rate !== null ? `${c.homework.rate}%` : '—'}
                                                    sub={c.homework.assigned ? `${c.homework.assigned} buổi có bài` : 'Chưa có dữ liệu'}
                                                    tone={rateTone(c.homework.rate)}
                                                    bar={c.homework.rate}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </section>

                            <section className="space-y-2.5">
                                <h4 className="text-base font-black text-[var(--color-text)]">Ngày nghỉ / đi muộn gần đây</h4>
                                {data.recent_absences.length === 0 ? (
                                    <Empty text="Không có buổi nghỉ hoặc đi muộn nào" />
                                ) : (
                                    <div className="grid gap-2">
                                        {data.recent_absences.map((a, i) => {
                                            const s = statusLabel[a.status] ?? { label: a.status, cls: 'bg-slate-500 text-white' };
                                            return (
                                                <div key={`${a.class_id}-${a.date}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2.5">
                                                    <div className="min-w-0">
                                                        <b className="block text-xs text-[var(--color-text)]">{fmtDate(a.date)}</b>
                                                        <span className="block truncate text-[11px] text-[var(--color-text-muted)]">{a.class_name}{a.note ? ` • ${a.note}` : ''}</span>
                                                    </div>
                                                    <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-black ${s.cls}`}>{s.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            {data.tuitions.length > 0 && (
                                <section className="space-y-2.5">
                                    <h4 className="text-base font-black text-[var(--color-text)]">Học phí</h4>
                                    <div className="grid gap-2">
                                        {data.tuitions.map((t) => {
                                            const s = tuitionLabel[t.status] ?? { label: t.status, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
                                            return (
                                                <div key={t.class_id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2.5">
                                                    <div className="min-w-0">
                                                        <b className="block truncate text-xs text-[var(--color-text)]">{t.class_name}</b>
                                                        <span className="text-[11px] text-[var(--color-text-muted)]">Đã đóng {fmtMoney(t.amount_paid)} / {fmtMoney(t.amount_due)}</span>
                                                    </div>
                                                    <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-black ${s.cls}`}>{s.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>,
        document.body
    );
}

function Kpi({ label, value, tone = 'text-[var(--color-text)]' }: { label: string; value: React.ReactNode; tone?: string }) {
    return (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-center">
            <p className={`text-2xl font-black ${tone}`}>{value}</p>
            <p className="text-[10px] font-black uppercase text-[var(--color-text-muted)]">{label}</p>
        </div>
    );
}

function Pill({ label, value, cls }: { label: string; value: number; cls: string }) {
    return (
        <div className={`rounded-xl border p-2 text-center ${cls}`}>
            <p className="text-lg font-black">{value}</p>
            <p className="text-[10px] font-black uppercase">{label}</p>
        </div>
    );
}

function ClassMetric({ label, value, sub, tone, bar }: { label: string; value: React.ReactNode; sub: string; tone: string; bar: number | null }) {
    const barCls = bar === null ? '' : bar >= 85 ? 'bg-emerald-500' : bar >= 65 ? 'bg-amber-500' : 'bg-red-500';
    return (
        <div className="rounded-xl bg-[var(--color-bg-soft)] p-2.5">
            <p className="text-[10px] font-black uppercase text-[var(--color-text-muted)]">{label}</p>
            <p className={`text-lg font-black ${tone}`}>{value}</p>
            <div className="mx-auto mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                {bar !== null && <div className={`h-full rounded-full ${barCls}`} style={{ width: `${Math.max(4, Math.min(100, bar))}%` }} />}
            </div>
            <p className="mt-1 truncate text-[10px] font-semibold text-[var(--color-text-muted)]">{sub}</p>
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-4 text-center text-xs font-semibold text-[var(--color-text-muted)]">{text}</p>;
}
