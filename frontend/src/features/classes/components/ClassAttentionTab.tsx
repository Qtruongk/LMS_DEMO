import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircleIcon, CheckCircleIcon, SearchIcon, CheckIcon } from '../../../components/shared/icons';
import { API_URL } from '../../../services/api';
import { formatStudentName, compareStudentNames } from '../../../utils/format';

type AnalyzedStudent = {
    student_id: number;
    full_name: string;
    username: string;
    student_code: string;
    phone: string | null;
    total_att: number;
    absent_count: number;
    late_count: number;
    present_count: number;
    absent_rate: number;
    late_rate: number;
    score_avg: number | null;
    below_6_count: number;
    below_6_rate: number;
    min_score: number | null;
    max_score: number | null;
    total_hw: number;
    missed_hw_count: number;
    hw_incomplete_rate: number;
    is_high_absence: boolean;
    is_frequent_late: boolean;
    is_low_score: boolean;
    is_incomplete_hw: boolean;
    attention_reasons: string[];
    needs_attention: boolean;
    risk_level: 'danger' | 'warning' | 'good';
};

type AttentionSummary = {
    total_students: number;
    attention_count: number;
    high_absence_count: number;
    frequent_late_count: number;
    low_score_count: number;
    incomplete_hw_count: number;
};

type FilterType = 'all' | 'needs_attention' | 'absence' | 'late' | 'low_score' | 'incomplete_hw';

export function ClassAttentionTab({ classId, userId, className }: { classId: number; userId: number; className?: string }) {
    const [students, setStudents] = useState<AnalyzedStudent[]>([]);
    const [summary, setSummary] = useState<AttentionSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterType>('needs_attention');
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        'x-user-id': String(userId),
    }), [userId]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/classes/${classId}/attention`, { headers });
            const data = await res.json();
            setStudents(data.students || []);
            setSummary(data.summary || null);
        } catch (error) {
            console.error('Lỗi tải thống kê lưu ý:', error);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    }, [classId, headers]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredStudents = useMemo(() => {
        const q = search.trim().toLowerCase();
        return students
            .filter((s) => {
                if (filter === 'needs_attention') return s.needs_attention;
                if (filter === 'absence') return s.is_high_absence;
                if (filter === 'late') return s.is_frequent_late;
                if (filter === 'low_score') return s.is_low_score;
                if (filter === 'incomplete_hw') return s.is_incomplete_hw;
                return true;
            })
            .filter((s) => !q || [s.full_name, s.username, s.student_code].some((v) => v?.toLowerCase().includes(q)))
            .sort((a, b) => {
                if (a.needs_attention !== b.needs_attention) return a.needs_attention ? -1 : 1;
                const riskOrder = { danger: 3, warning: 2, good: 1 };
                if (riskOrder[a.risk_level] !== riskOrder[b.risk_level]) {
                    return riskOrder[b.risk_level] - riskOrder[a.risk_level];
                }
                return compareStudentNames(a.full_name, b.full_name);
            });
    }, [students, search, filter]);

    const handleCopyReminder = (s: AnalyzedStudent) => {
        const studentName = formatStudentName(s.full_name);
        const reasons = s.attention_reasons.join(', ');
        const message = `Kính gửi Phụ huynh em ${studentName} (Lớp ${className || 'VAT'}),\nTrung tâm VAT xin gửi thông báo cập nhật tình hình học tập: Em cần được phụ huynh hỗ trợ và nhắc nhở thêm về tình hình (${reasons}). Trung tâm rất mong nhận được sự đồng hành từ gia đình để giúp em tiến bộ hơn. Trân trọng!`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(message);
        }
        setCopiedId(s.student_id);
        setTimeout(() => setCopiedId(null), 2500);
    };

    return (
        <div className="grid gap-4">
            {/* Thanh cảnh báo tổng quan */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs font-black text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertCircleIcon size={18} className="shrink-0 text-amber-600" />
                <span>
                    Tổng cộng: <b>{summary?.attention_count ?? 0}</b> / {summary?.total_students ?? 0} học sinh cần được lưu ý & hỗ trợ thêm
                </span>
            </div>

            {/* Thanh thông số phân tích */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <button
                    type="button"
                    onClick={() => setFilter(filter === 'absence' ? 'needs_attention' : 'absence')}
                    className={`rounded-2xl border p-3 text-left transition cursor-pointer ${
                        filter === 'absence'
                            ? 'border-red-500 bg-red-500 text-white shadow-md'
                            : 'border-red-200 bg-red-50/70 text-red-900 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300'
                    }`}
                >
                    <p className={`text-xl font-black ${filter === 'absence' ? 'text-white' : 'text-red-700 dark:text-red-300'}`}>
                        {summary?.high_absence_count ?? 0}
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-wider">Vắng nhiều (≥20%)</p>
                </button>

                <button
                    type="button"
                    onClick={() => setFilter(filter === 'late' ? 'needs_attention' : 'late')}
                    className={`rounded-2xl border p-3 text-left transition cursor-pointer ${
                        filter === 'late'
                            ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                            : 'border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300'
                    }`}
                >
                    <p className={`text-xl font-black ${filter === 'late' ? 'text-white' : 'text-amber-700 dark:text-amber-300'}`}>
                        {summary?.frequent_late_count ?? 0}
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-wider">Đi trễ nhiều (≥15%)</p>
                </button>

                <button
                    type="button"
                    onClick={() => setFilter(filter === 'low_score' ? 'needs_attention' : 'low_score')}
                    className={`rounded-2xl border p-3 text-left transition cursor-pointer ${
                        filter === 'low_score'
                            ? 'border-rose-500 bg-rose-500 text-white shadow-md'
                            : 'border-rose-200 bg-rose-50/70 text-rose-900 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300'
                    }`}
                >
                    <p className={`text-xl font-black ${filter === 'low_score' ? 'text-white' : 'text-rose-700 dark:text-rose-300'}`}>
                        {summary?.low_score_count ?? 0}
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-wider">Điểm dưới 6.0</p>
                </button>

                <button
                    type="button"
                    onClick={() => setFilter(filter === 'incomplete_hw' ? 'needs_attention' : 'incomplete_hw')}
                    className={`rounded-2xl border p-3 text-left transition cursor-pointer ${
                        filter === 'incomplete_hw'
                            ? 'border-indigo-500 bg-indigo-500 text-white shadow-md'
                            : 'border-indigo-200 bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300'
                    }`}
                >
                    <p className={`text-xl font-black ${filter === 'incomplete_hw' ? 'text-white' : 'text-indigo-700 dark:text-indigo-300'}`}>
                        {summary?.incomplete_hw_count ?? 0}
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-wider">Chưa hoàn thành BTVN</p>
                </button>
            </div>

            {/* Tìm kiếm và Bộ lọc */}
            <div className="grid gap-3">
                <div className="relative">
                    <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm học sinh theo tên, mã..."
                        className="min-h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white pl-9 pr-4 text-xs font-semibold text-slate-950 outline-none focus:border-[var(--color-primary)]"
                    />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {[
                        { id: 'needs_attention', label: `Cần lưu ý (${summary?.attention_count ?? 0})` },
                        { id: 'absence', label: `Vắng nhiều (${summary?.high_absence_count ?? 0})` },
                        { id: 'late', label: `Đi trễ (${summary?.frequent_late_count ?? 0})` },
                        { id: 'low_score', label: `Điểm < 6 (${summary?.low_score_count ?? 0})` },
                        { id: 'incomplete_hw', label: `Chưa nộp BTVN (${summary?.incomplete_hw_count ?? 0})` },
                        { id: 'all', label: `Tất cả học sinh (${summary?.total_students ?? 0})` },
                    ].map((btn) => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={() => setFilter(btn.id as FilterType)}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                filter === btn.id
                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs'
                                    : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Danh sách học sinh cần lưu ý */}
            {loading ? (
                <div className="grid gap-2.5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 animate-pulse rounded-2xl bg-[var(--color-bg-soft)]" />
                    ))}
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] p-8 text-center">
                    <CheckCircleIcon size={32} className="mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm font-black text-[var(--color-text)]">
                        {filter === 'needs_attention'
                            ? 'Không có học sinh nào cần lưu ý trong lớp này'
                            : 'Không có học sinh nào phù hợp bộ lọc'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filteredStudents.map((s, index) => {
                        const isDanger = s.risk_level === 'danger';
                        const isWarning = s.risk_level === 'warning';
                        return (
                            <div
                                key={s.student_id}
                                className={`rounded-2xl border p-4 shadow-xs transition ${
                                    isDanger
                                        ? 'border-red-300 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20'
                                        : isWarning
                                        ? 'border-amber-300 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20'
                                        : 'border-[var(--color-border)] bg-[var(--color-card)]'
                                }`}
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span
                                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xs font-black ${
                                                isDanger
                                                    ? 'bg-red-600 text-white'
                                                    : isWarning
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-emerald-600 text-white'
                                            }`}
                                        >
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="truncate text-sm font-black text-[var(--color-text)]">
                                                    {formatStudentName(s.full_name || s.username)}
                                                </h4>
                                                {isDanger && (
                                                    <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                                                        Cần nhắc nhở gấp
                                                    </span>
                                                )}
                                                {isWarning && (
                                                    <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                                                        Lưu ý theo dõi
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate text-[11px] font-semibold text-[var(--color-text-muted)]">
                                                {s.student_code || 'Chưa có mã'} • @{s.username}
                                                {s.phone ? ` • SĐT: ${s.phone}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleCopyReminder(s)}
                                        className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-text)] shadow-xs transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer shrink-0 dark:bg-slate-800"
                                    >
                                        <CheckIcon size={14} />
                                        {copiedId === s.student_id ? 'Đã sao chép tin nhắn!' : 'Sao chép tin nhắn gửi PH'}
                                    </button>
                                </div>

                                {/* Chi tiết chỉ số cảnh báo */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span
                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
                                            s.is_high_absence
                                                ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200'
                                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200'
                                        }`}
                                    >
                                        {s.is_high_absence ? '⚠️' : '✓'} Vắng: <b>{s.absent_count} buổi</b> ({s.absent_rate}%)
                                    </span>

                                    <span
                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
                                            s.is_frequent_late
                                                ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                        }`}
                                    >
                                        {s.is_frequent_late ? '⚡' : '✓'} Đi trễ: <b>{s.late_count} buổi</b> ({s.late_rate}%)
                                    </span>

                                    <span
                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
                                            s.is_low_score
                                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200'
                                                : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200'
                                        }`}
                                    >
                                        {s.is_low_score ? '📉' : '★'} Điểm TB: <b>{s.score_avg !== null ? s.score_avg : 'Chưa có'}</b>
                                        {s.below_6_count > 0 ? ` (${s.below_6_count} bài < 6đ)` : ''}
                                    </span>

                                    <span
                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
                                            s.is_incomplete_hw
                                                ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                        }`}
                                    >
                                        {s.is_incomplete_hw ? '❌' : '✓'} BTVN chưa xong: <b>{s.missed_hw_count} bài</b> ({s.hw_incomplete_rate}%)
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
