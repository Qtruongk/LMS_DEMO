import { useCallback, useEffect, useMemo, useState } from 'react';
import { SearchIcon, FileIcon, CheckIcon } from '../../../components/shared/icons';
import { API_URL } from '../../../services/api';
import { formatStudentName, compareStudentNames } from '../../../utils/format';

type TrackingMode = 'scores' | 'homework';
type HomeworkLevel = '100' | '75' | '50' | 'incomplete' | 'none';

type TrackingRecord = {
    student_id: number;
    full_name: string;
    username: string;
    student_code: string;
    score: number | null;
    score_note: string;
    homework_level: HomeworkLevel | null;
    homework_note: string;
};

type StudentTracking = {
    student: { id: number; full_name: string; username: string; student_code: string; phone?: string | null };
    summary: { score_count: number; score_average: number | null; homework_count: number; homework_assigned: number; homework_rate: number | null };
    weekly_scores: { week_start: string; week_end: string; count: number; average: number; highest: number; lowest: number }[];
    scores: { date: string; score: number | null; note: string }[];
    homework: { date: string; level: HomeworkLevel; note: string }[];
};

const today = () => new Date().toISOString().slice(0, 10);

export const HOMEWORK_OPTIONS: { id: HomeworkLevel; label: string; active: string; soft: string }[] = [
    { id: '100', label: '100%', active: 'bg-emerald-600 text-white border-emerald-600', soft: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: '75', label: '75%', active: 'bg-lime-600 text-white border-lime-600', soft: 'bg-lime-50 text-lime-700 border-lime-200' },
    { id: '50', label: '50%', active: 'bg-amber-500 text-white border-amber-500', soft: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'incomplete', label: 'Chưa hoàn thành', active: 'bg-red-600 text-white border-red-600', soft: 'bg-red-50 text-red-700 border-red-200' },
    { id: 'none', label: 'Không có bài', active: 'bg-slate-500 text-white border-slate-500', soft: 'bg-slate-50 text-slate-600 border-slate-200' },
];

const homeworkLabel = (level: string | null) => HOMEWORK_OPTIONS.find((o) => o.id === level)?.label ?? 'Chưa ghi nhận';

function scoreTone(score: number | null) {
    if (score === null) return 'text-slate-400';
    if (score >= 8) return 'text-emerald-600';
    if (score >= 6.5) return 'text-lime-600';
    if (score >= 5) return 'text-amber-600';
    return 'text-red-600';
}

function scoreBar(score: number) {
    if (score >= 8) return 'bg-emerald-500';
    if (score >= 6.5) return 'bg-lime-500';
    if (score >= 5) return 'bg-amber-500';
    return 'bg-red-500';
}

function fmtDate(value: string) {
    const [y, m, d] = value.slice(0, 10).split('-');
    return y && m && d ? `${d}/${m}/${y}` : value;
}

function generateReportHtml(records: TrackingRecord[], className: string, date: string, avgToday: number | null) {
    const formattedDate = fmtDate(date);
    const validScores = records.map(r => r.score).filter((s): s is number => s !== null);
    const maxScore = validScores.length ? Math.max(...validScores) : '—';
    const minScore = validScores.length ? Math.min(...validScores) : '—';
    const sorted = [...records].sort((a, b) => compareStudentNames(a.full_name, b.full_name));

    const rows = sorted.map((r, i) => {
        const sc = r.score !== null ? r.score : '—';
        let rank = '—';
        if (typeof r.score === 'number') {
            if (r.score >= 8.5) rank = 'Xuất sắc';
            else if (r.score >= 7.0) rank = 'Khá - Giỏi';
            else if (r.score >= 5.0) rank = 'Trung bình';
            else rank = 'Cần cố gắng';
        }
        return `
            <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center;">${i + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px 10px; font-weight: bold;">${formatStudentName(r.full_name)}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center;">${r.student_code || '—'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; font-weight: bold; color: ${typeof r.score === 'number' && r.score < 6 ? '#dc2626' : '#166534'};">${sc}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center;">${rank}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">${r.score_note || 'Chăm chỉ, tích cực làm bài.'}</td>
            </tr>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Bảng Điểm & Nhận Xét - ${className}</title>
    <style>
        body { font-family: 'Times New Roman', Times, serif; color: #0f172a; margin: 25px; line-height: 1.5; }
        .header { text-align: center; margin-bottom: 25px; }
        .school-name { font-size: 15pt; font-weight: bold; color: #1e3a8a; text-transform: uppercase; margin-bottom: 4px; }
        .sub-header { font-size: 11pt; color: #475569; margin-bottom: 12px; }
        .doc-title { font-size: 17pt; font-weight: bold; color: #0f172a; margin-top: 15px; margin-bottom: 6px; }
        .meta { font-size: 11pt; margin-bottom: 18px; }
        .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; font-size: 11pt; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 11pt; }
        th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center; font-weight: bold; }
        .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 11pt; }
        .signature { text-align: center; width: 45%; }
        @media print {
            body { margin: 15mm; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="school-name">TRUNG TÂM ANH NGỮ QUỐC TẾ VAT</div>
        <div class="sub-header">Hệ Thống Đào Tạo & Khảo Thí Anh Ngữ Chuẩn Quốc Tế</div>
        <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 10px 0 15px;" />
        <div class="doc-title">BẢNG ĐIỂM KIỂM TRA & NHẬN XÉT HỌC TẬP GỬI PHỤ HUYNH</div>
        <div class="meta">
            <b>Lớp:</b> ${className} &nbsp;|&nbsp; <b>Ngày kiểm tra:</b> ${formattedDate}
        </div>
    </div>

    <div class="summary-box">
        <b>Thống kê tổng quan:</b> Sĩ số: <b>${records.length} học sinh</b> &nbsp;|&nbsp; 
        Điểm TB cả lớp: <b>${avgToday ?? '—'}</b> &nbsp;|&nbsp; 
        Điểm cao nhất: <b>${maxScore}</b> &nbsp;|&nbsp; 
        Điểm thấp nhất: <b>${minScore}</b>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 40px;">STT</th>
                <th>Họ và tên học sinh</th>
                <th style="width: 85px;">Mã HV</th>
                <th style="width: 80px;">Điểm số</th>
                <th style="width: 105px;">Xếp loại</th>
                <th>Nhận xét của giáo viên</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>

    <div style="font-size: 10.5pt; font-style: italic; margin-bottom: 25px;">
        * Kính mong Quý Phụ huynh phối hợp cùng trung tâm đôn đốc và động viên các em tự giác hoàn thành bài tập về nhà cũng như chuẩn bị bài trước khi đến lớp.
    </div>

    <table style="width: 100%; border: none; margin-top: 30px;">
        <tr style="border: none;">
            <td style="border: none; width: 50%; text-align: center; vertical-align: top;">
                <b>BAN GIÁM ĐỐC TRUNG TÂM</b><br/>
                <i>(Ký và đóng dấu)</i>
                <br/><br/><br/><br/>
                <b>VAT English Center</b>
            </td>
            <td style="border: none; width: 50%; text-align: center; vertical-align: top;">
                <i>Ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</i><br/>
                <b>GIÁO VIÊN PHỤ TRÁCH</b><br/>
                <i>(Ký và ghi rõ họ tên)</i>
                <br/><br/><br/><br/>
            </td>
        </tr>
    </table>
</body>
</html>
`;
}

export function ClassTrackingPanel({ classId, userId, mode, className = 'Lớp học' }: { classId: number; userId: number; mode: TrackingMode; className?: string }) {
    const [date, setDate] = useState(today());
    const [records, setRecords] = useState<TrackingRecord[]>([]);
    const [initial, setInitial] = useState<string>('[]');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [search, setSearch] = useState('');
    const [hwFilter, setHwFilter] = useState<'all' | 'completed' | 'incomplete' | 'none'>('all');
    const [copyNotification, setCopyNotification] = useState(false);
    const [selected, setSelected] = useState<TrackingRecord | null>(null);
    const [detail, setDetail] = useState<StudentTracking | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const headers = useMemo(() => ({ 'Content-Type': 'application/json', 'x-user-id': String(userId) }), [userId]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/tracking/class/${classId}?date=${date}`, { headers });
            const data = await res.json();
            const rows = (data.records ?? []) as TrackingRecord[];
            setRecords(rows);
            setInitial(JSON.stringify(rows));
        } catch (error) {
            console.error('Lỗi tải dữ liệu:', error);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, [classId, date, headers]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setSelected(null); setDetail(null); setHwFilter('all'); }, [mode, classId]);

    const dirty = JSON.stringify(records) !== initial;

    const homeworkStats = useMemo(() => ({
        completed: records.filter((r) => r.homework_level === '100' || r.homework_level === '75').length,
        incomplete: records.filter((r) => r.homework_level === 'incomplete' || r.homework_level === '50').length,
        none: records.filter((r) => r.homework_level === 'none').length,
        unrecorded: records.filter((r) => !r.homework_level).length,
    }), [records]);

    const homeworkSummaryText = useMemo(() => {
        const formattedDate = fmtDate(date);
        const cName = className || 'LỚP HỌC';

        const incompleteStudents = records
            .filter((r) => r.homework_level === 'incomplete' || r.homework_level === '50')
            .map((r) => formatStudentName(r.full_name));
        const noneStudents = records
            .filter((r) => r.homework_level === 'none')
            .map((r) => formatStudentName(r.full_name));

        let detailText = 'Lớp hoàn thành bài tập đầy đủ.';
        if (incompleteStudents.length > 0 && noneStudents.length > 0) {
            detailText = `Lớp hoàn thành bài tập đầy đủ ngoại trừ ${incompleteStudents.join(', ')} chưa hoàn thành và ${noneStudents.join(', ')} chưa nộp bài`;
        } else if (incompleteStudents.length > 0) {
            detailText = `Lớp hoàn thành bài tập đầy đủ ngoại trừ ${incompleteStudents.join(', ')} chưa hoàn thành`;
        } else if (noneStudents.length > 0) {
            detailText = `Lớp hoàn thành bài tập đầy đủ ngoại trừ ${noneStudents.join(', ')} chưa nộp bài`;
        }

        return `BÀI TẬP VỀ NHÀ LỚP [${cName.toUpperCase()}] NGÀY [${formattedDate}]\n${detailText}`;
    }, [className, date, records]);

    const handleCopyHomeworkSummary = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(homeworkSummaryText);
        }
        setCopyNotification(true);
        setTimeout(() => setCopyNotification(false), 2500);
    };

    const filtered = records.filter((r) => {
        const q = search.trim().toLowerCase();
        const matchesSearch = !q || [r.full_name, r.username, r.student_code].some((v) => v?.toLowerCase().includes(q));
        if (!matchesSearch) return false;
        if (mode === 'homework' && hwFilter !== 'all') {
            if (hwFilter === 'completed') return r.homework_level === '100' || r.homework_level === '75';
            if (hwFilter === 'incomplete') return r.homework_level === 'incomplete' || r.homework_level === '50';
            if (hwFilter === 'none') return r.homework_level === 'none';
        }
        return true;
    });

    const sortedFiltered = useMemo(() => {
        return [...filtered].sort((a, b) => compareStudentNames(a.full_name, b.full_name));
    }, [filtered]);

    const updateRecord = (studentId: number, patch: Partial<TrackingRecord>) => {
        setRecords((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, ...patch } : r)));
    };

    const exportWord = () => {
        const html = generateReportHtml(records, className || 'Lớp học', date, avgToday);
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bang_Diem_${(className || 'Lop').replace(/\s+/g, '_')}_${date}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const exportPdf = () => {
        const html = generateReportHtml(records, className || 'Lớp học', date, avgToday);
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Trình duyệt chặn cửa sổ popup. Vui lòng cho phép popup để xuất PDF.');
            return;
        }
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    const save = async () => {
        setSaving(true);
        try {
            const body = mode === 'scores'
                ? { class_id: classId, date, records: records.map((r) => ({ student_id: r.student_id, score: r.score, note: r.score_note })) }
                : { class_id: classId, date, records: records.map((r) => ({ student_id: r.student_id, level: r.homework_level, note: r.homework_note })) };
            const res = await fetch(`${API_URL}/api/tracking/${mode === 'scores' ? 'scores' : 'homework'}`, { method: 'POST', headers, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) {
                setMessage(data.message || 'Lỗi lưu dữ liệu');
                return;
            }
            setInitial(JSON.stringify(records));
            setMessage(data.message || 'Đã lưu');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error(error);
            setMessage('Không thể lưu dữ liệu');
        } finally {
            setSaving(false);
        }
    };

    const openStudent = async (record: TrackingRecord) => {
        setSelected(record);
        setDetail(null);
        setDetailLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/tracking/class/${classId}/student/${record.student_id}`, { headers });
            setDetail(await res.json());
        } catch (error) {
            console.error('Lỗi truy xuất học sinh:', error);
        } finally {
            setDetailLoading(false);
        }
    };

    const enteredCount = mode === 'scores'
        ? records.filter((r) => r.score !== null).length
        : records.filter((r) => r.homework_level !== null).length;

    const avgToday = (() => {
        const vals = records.map((r) => r.score).filter((v): v is number => v !== null);
        return vals.length ? Math.round((vals.reduce((t, v) => t + v, 0) / vals.length) * 100) / 100 : null;
    })();

    if (selected) {
        return <StudentTrackingDetail record={selected} detail={detail} loading={detailLoading} onBack={() => { setSelected(null); setDetail(null); }} />;
    }

    return (
        <div className="grid gap-3">
            {/* Định dạng thông báo bài tập về nhà & thẻ thống kê trạng thái */}
            {mode === 'homework' && (
                <>
                    <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                            <span className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">
                                Thông báo nhanh
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyHomeworkSummary}
                                className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:opacity-90 cursor-pointer"
                            >
                                <CheckIcon size={14} />
                                {copyNotification ? 'Đã sao chép!' : 'Sao chép'}
                            </button>
                        </div>
                        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3.5 text-xs font-mono font-bold leading-relaxed text-[var(--color-text)] whitespace-pre-line select-all">
                            {homeworkSummaryText}
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <StatCard
                            title="Hoàn thành"
                            value={homeworkStats.completed}
                            description={`${records.length ? Math.round((homeworkStats.completed / records.length) * 100) : 0}% tổng số`}
                            tone="emerald"
                            isActive={hwFilter === 'completed'}
                            onClick={() => setHwFilter((prev) => (prev === 'completed' ? 'all' : 'completed'))}
                        />
                        <StatCard
                            title="Chưa hoàn thành"
                            value={homeworkStats.incomplete}
                            description={`${records.length ? Math.round((homeworkStats.incomplete / records.length) * 100) : 0}% tổng số`}
                            tone="amber"
                            isActive={hwFilter === 'incomplete'}
                            onClick={() => setHwFilter((prev) => (prev === 'incomplete' ? 'all' : 'incomplete'))}
                        />
                        <StatCard
                            title="Chưa nộp bài"
                            value={homeworkStats.none}
                            description={`${records.length ? Math.round((homeworkStats.none / records.length) * 100) : 0}% tổng số`}
                            tone="red"
                            isActive={hwFilter === 'none'}
                            onClick={() => setHwFilter((prev) => (prev === 'none' ? 'all' : 'none'))}
                        />
                    </div>
                </>
            )}

            <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="min-h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-bold text-slate-950 outline-none focus:border-[var(--color-primary)]"
                />
                <div className="relative">
                    <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm tên, mã học sinh..."
                        className="min-h-10 w-full rounded-xl border border-[var(--color-border)] bg-white pl-8 pr-3 text-xs font-semibold text-slate-950 outline-none focus:border-[var(--color-primary)]"
                    />
                </div>
            </div>

            {/* Các nút chức năng xuất Word & PDF cho Điểm kiểm tra */}
            {mode === 'scores' && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-2.5">
                    <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                        Xuất báo cáo điểm & nhận xét gửi phụ huynh:
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={exportWord}
                            className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-xs transition hover:bg-blue-50 cursor-pointer dark:bg-slate-800 dark:border-blue-800 dark:text-blue-300"
                            title="Xuất phiếu điểm file Word (.doc) gửi phụ huynh"
                        >
                            <FileIcon size={14} /> Xuất Word (.doc)
                        </button>
                        <button
                            type="button"
                            onClick={exportPdf}
                            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-xs transition hover:bg-rose-50 cursor-pointer dark:bg-slate-800 dark:border-rose-800 dark:text-rose-300"
                            title="In hoặc lưu PDF phiếu điểm gửi phụ huynh"
                        >
                            🖨️ Xuất PDF
                        </button>
                    </div>
                </div>
            )}

            {mode === 'scores' && (
                <div className="grid grid-cols-3 gap-2">
                    <MiniStat label="Đã nhập điểm" value={`${enteredCount}/${records.length}`} />
                    <MiniStat label="Điểm TB hôm nay" value={avgToday ?? '—'} />
                    <MiniStat label="Dưới 5 điểm" value={records.filter((r) => r.score !== null && r.score < 5).length} />
                </div>
            )}

            {mode === 'homework' && (
                <div className="flex flex-wrap gap-1.5">
                    {HOMEWORK_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setRecords((prev) => prev.map((r) => ({ ...r, homework_level: opt.id })))}
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition hover:opacity-80 cursor-pointer ${opt.soft}`}
                        >
                            Tất cả: {opt.label}
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="grid gap-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--color-bg-soft)]" />)}</div>
            ) : sortedFiltered.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--color-text-muted)]">Không có học sinh phù hợp</p>
            ) : (
                <div className="grid gap-2.5">
                    {sortedFiltered.map((r, idx) => (
                        <div key={r.student_id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 shadow-xs">
                            <div className="flex flex-col gap-2.5">
                                <div className="flex items-center justify-between gap-3">
                                    <button type="button" onClick={() => openStudent(r)} className="group flex min-w-0 items-center gap-2.5 text-left">
                                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[11px] font-bold text-[var(--color-primary)]">{idx + 1}</span>
                                        <span className="min-w-0">
                                            <b className="block truncate text-xs text-[var(--color-text)] group-hover:text-[var(--color-primary)] group-hover:underline">
                                                {formatStudentName(r.full_name)}
                                            </b>
                                            <span className="block truncate text-[11px] text-[var(--color-text-muted)]">{r.student_code || 'Chưa có mã'}</span>
                                        </span>
                                    </button>
                                    {mode === 'scores' && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">Điểm:</span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={10}
                                                step={0.25}
                                                value={r.score ?? ''}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    updateRecord(r.student_id, { score: v === '' ? null : Math.min(10, Math.max(0, Number(v))) });
                                                }}
                                                placeholder="0 - 10"
                                                className={`h-9 w-20 shrink-0 rounded-xl border border-[var(--color-border)] bg-white text-center text-sm font-black outline-none focus:border-[var(--color-primary)] ${scoreTone(r.score)}`}
                                            />
                                        </div>
                                    )}
                                </div>

                                {mode === 'scores' && (
                                    <input
                                        type="text"
                                        value={r.score_note || ''}
                                        onChange={(e) => updateRecord(r.student_id, { score_note: e.target.value })}
                                        placeholder="Nhận xét của giáo viên gửi phụ huynh..."
                                        className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs font-semibold text-slate-950 outline-none focus:border-[var(--color-primary)] placeholder:text-slate-400"
                                    />
                                )}

                                {mode === 'homework' && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {HOMEWORK_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => updateRecord(r.student_id, { homework_level: r.homework_level === opt.id ? null : opt.id })}
                                                className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${r.homework_level === opt.id ? opt.active : opt.soft}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-card)] pt-3">
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">{message || (dirty ? 'Có thay đổi chưa lưu' : '')}</span>
                <button
                    type="button"
                    disabled={saving || !dirty}
                    onClick={save}
                    className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                >
                    {saving ? 'Đang lưu...' : mode === 'scores' ? 'Lưu điểm' : 'Lưu bài tập'}
                </button>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    description,
    tone,
    isActive = false,
    onClick,
}: {
    title: string;
    value: number;
    description: string;
    tone: 'emerald' | 'amber' | 'red' | 'blue';
    isActive?: boolean;
    onClick?: () => void;
}) {
    const toneMap = {
        emerald: {
            base: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
            hover: 'hover:border-emerald-300 hover:shadow-emerald-500/10',
            active: 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-100/80 dark:bg-emerald-500/20',
            badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        },
        amber: {
            base: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
            hover: 'hover:border-amber-300 hover:shadow-amber-500/10',
            active: 'ring-2 ring-amber-500 border-amber-400 bg-amber-100/80 dark:bg-amber-500/20',
            badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        },
        red: {
            base: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
            hover: 'hover:border-red-300 hover:shadow-red-500/10',
            active: 'ring-2 ring-red-500 border-red-400 bg-red-100/80 dark:bg-red-500/20',
            badge: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
        },
        blue: {
            base: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
            hover: 'hover:border-blue-300 hover:shadow-blue-500/10',
            active: 'ring-2 ring-blue-500 border-blue-400 bg-blue-100/80 dark:bg-blue-500/20',
            badge: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
        },
    };

    const cfg = toneMap[tone];

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.();
                }
            }}
            className={`group relative cursor-pointer rounded-3xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] select-none ${cfg.base} ${cfg.hover} ${isActive ? cfg.active : ''}`}
            title={`Nhấn để lọc danh sách học sinh: ${title}`}
        >
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-wide opacity-80">{title}</p>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-black transition-all group-hover:scale-105 ${cfg.badge}`}>
                    <span>{value}</span>
                </span>
            </div>
            <p className="mt-1 text-3xl font-black">{value}</p>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs font-bold opacity-75">
                <p>{description}</p>
                {isActive && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Đang lọc trên bảng ✓
                    </span>
                )}
            </div>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-2.5 text-center">
            <p className="text-base font-black text-[var(--color-text)]">{value}</p>
            <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">{label}</p>
        </div>
    );
}

function StudentTrackingDetail({ record, detail, loading, onBack }: { record: TrackingRecord; detail: StudentTracking | null; loading: boolean; onBack: () => void }) {
    const s = detail?.summary;
    return (
        <div className="grid gap-4">
            <button type="button" onClick={onBack} className="w-fit rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-border)]">
                ← Quay lại danh sách
            </button>

            <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary)] text-lg font-black text-white">
                    {record.full_name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                    <h3 className="truncate text-base font-black text-[var(--color-text)]">{formatStudentName(record.full_name)}</h3>
                    <p className="truncate text-[11px] font-semibold text-[var(--color-text-muted)]">
                        {record.student_code || 'Chưa có mã'} • @{record.username}{detail?.student?.phone ? ` • ${detail.student.phone}` : ''}
                    </p>
                </div>
            </div>

            {loading || !detail ? (
                <div className="grid gap-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--color-bg-soft)]" />)}</div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-2">
                        <MiniStat label="Điểm TB" value={s?.score_average ?? '—'} />
                        <MiniStat label="Số bài KT" value={s?.score_count ?? 0} />
                        <MiniStat label="Hoàn thành BTVN" value={s?.homework_rate !== null && s?.homework_rate !== undefined ? `${s.homework_rate}%` : '—'} />
                    </div>

                    <section className="grid gap-2">
                        <h4 className="text-sm font-black text-[var(--color-text)]">Điểm hàng tuần</h4>
                        {detail.weekly_scores.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-center text-xs text-[var(--color-text-muted)]">Chưa có điểm kiểm tra</p>
                        ) : (
                            detail.weekly_scores.map((w) => (
                                <div key={w.week_start} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <b className="block text-xs text-[var(--color-text)]">Tuần {fmtDate(w.week_start)} – {fmtDate(w.week_end)}</b>
                                            <span className="text-[11px] text-[var(--color-text-muted)]">{w.count} bài • Cao nhất {w.highest} • Thấp nhất {w.lowest}</span>
                                        </div>
                                        <span className={`text-xl font-black ${scoreTone(w.average)}`}>{w.average}</span>
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-bg-soft)]">
                                        <div className={`h-full rounded-full ${scoreBar(w.average)}`} style={{ width: `${w.average * 10}%` }} />
                                    </div>
                                </div>
                            ))
                        )}
                    </section>

                    {detail.scores.length > 0 && (
                        <section className="grid gap-2">
                            <h4 className="text-sm font-black text-[var(--color-text)]">Điểm từng buổi</h4>
                            {detail.scores.map((sc) => (
                                <div key={sc.date} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2">
                                    <span className="text-xs font-semibold text-[var(--color-text)]">{fmtDate(sc.date)}</span>
                                    <span className={`text-sm font-black ${scoreTone(sc.score)}`}>{sc.score ?? '—'}</span>
                                </div>
                            ))}
                        </section>
                    )}

                    <section className="grid gap-2">
                        <h4 className="text-sm font-black text-[var(--color-text)]">Mức độ hoàn thành bài tập từng buổi</h4>
                        {detail.homework.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-center text-xs text-[var(--color-text-muted)]">Chưa có dữ liệu bài tập về nhà</p>
                        ) : (
                            detail.homework.map((hw) => {
                                const opt = HOMEWORK_OPTIONS.find((o) => o.id === hw.level);
                                return (
                                    <div key={hw.date} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2">
                                        <span className="text-xs font-semibold text-[var(--color-text)]">{fmtDate(hw.date)}</span>
                                        <span className={`rounded-lg border px-2.5 py-0.5 text-[11px] font-bold ${opt?.active ?? ''}`}>{homeworkLabel(hw.level)}</span>
                                    </div>
                                );
                            })
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
