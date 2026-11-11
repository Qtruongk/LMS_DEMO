import { memo, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge, Panel } from '../../../components/shared/ui';
import { ChartIcon, CheckIcon, ClockIcon, TrendIcon } from '../../../components/shared/icons';
import { API_URL } from '../../../services/api';

export type StudentScoreItem = {
    id: string;
    test_id: number;
    source: 'assignment' | 'online_exam';
    title: string;
    class_id: number;
    class_name: string;
    class_code: string;
    subject: string;
    date: string;
    score: number;
    max_score: number;
    scaled_score_10: number;
    percentage: number;
    feedback?: string;
    delta?: number;
    is_personal_best?: boolean;
};

export type StudentScoreStats = {
    total_tests: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    latest_score: number;
    first_score: number;
    growth_score: number;
    trend_text: string;
    trend_tone: 'improving' | 'steady' | 'declining' | 'neutral';
};

type ClassSummary = {
    id: number;
    name: string;
    code: string;
    subject: string;
};

type ScoreProgressApiResponse = {
    items: StudentScoreItem[];
    classes: ClassSummary[];
    stats: StudentScoreStats;
};

type StudentScoreProgressChartProps = {
    userId: number;
    initialClassId?: number | null;
    showClassFilter?: boolean;
    title?: string;
    subtitle?: string;
    className?: string;
};

function formatDateVi(dateStr?: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function formatShortDateVi(dateStr?: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
    }).format(date);
}

function getScoreTone(score: number): 'success' | 'info' | 'warning' | 'danger' {
    if (score >= 8.5) return 'success';
    if (score >= 7.0) return 'info';
    if (score >= 5.0) return 'warning';
    return 'danger';
}

function getScoreLabel(score: number): string {
    if (score >= 9.0) return 'Xuất sắc';
    if (score >= 8.0) return 'Giỏi';
    if (score >= 6.5) return 'Khá';
    if (score >= 5.0) return 'Trung bình';
    return 'Cần cố gắng';
}

// Generate smooth cubic bezier SVG path from points
function generateSmoothCurve(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2) {
        return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        const prev = i > 0 ? points[i - 1] : current;
        const nextNext = i < points.length - 2 ? points[i + 2] : next;

        const cp1x = current.x + (next.x - prev.x) / 5;
        const cp1y = current.y + (next.y - prev.y) / 5;
        const cp2x = next.x - (nextNext.x - current.x) / 5;
        const cp2y = next.y - (nextNext.y - current.y) / 5;

        path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
    }
    return path;
}

export const StudentScoreProgressChart = memo(function StudentScoreProgressChart({
    userId,
    initialClassId = null,
    showClassFilter = true,
    title = 'Tiến trình học tập',
    
    className = '',
}: StudentScoreProgressChartProps) {
    const [data, setData] = useState<ScoreProgressApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<number | 'all'>(initialClassId ?? 'all');
    const [viewMode, setViewMode] = useState<'line' | 'bar'>('line');
    const [limitCount, setLimitCount] = useState<'all' | '5' | '10'>('all');
    const [showBenchmarks, setShowBenchmarks] = useState(true);
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const [showHistoryTable, setShowHistoryTable] = useState(false);

    useEffect(() => {
        if (initialClassId) {
            setSelectedClassId(initialClassId);
        }
    }, [initialClassId]);

    const fetchScoreProgress = () => {
        setLoading(true);
        setError('');
        const query = selectedClassId !== 'all' ? `?classId=${selectedClassId}` : '';
        fetch(`${API_URL}/api/student/score-progress${query}`, {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': String(userId),
            },
        })
            .then(async (res) => {
                if (!res.ok) {
                    const errPayload = await res.json().catch(() => ({}));
                    throw new Error(errPayload.message || 'Không thể tải dữ liệu tiến trình điểm.');
                }
                return res.json();
            })
            .then((resData: ScoreProgressApiResponse) => {
                setData(resData);
            })
            .catch((err: Error) => {
                console.error('Lỗi tải tiến trình điểm:', err);
                setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu điểm.');
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchScoreProgress();
    }, [userId, selectedClassId]);

    // Filter items based on limitCount
    const displayedItems = useMemo(() => {
        if (!data?.items) return [];
        if (limitCount === '5') return data.items.slice(-5);
        if (limitCount === '10') return data.items.slice(-10);
        return data.items;
    }, [data?.items, limitCount]);

    // Recalculate local stats for displayed items
    const localStats = useMemo(() => {
        if (!displayedItems.length) return data?.stats;
        const scores = displayedItems.map((i) => i.scaled_score_10);
        const count = displayedItems.length;
        const avg = Math.round((scores.reduce((a, b) => a + b, 0) / count) * 10) / 10;
        const high = Math.max(...scores);
        const latest = displayedItems[displayedItems.length - 1].scaled_score_10;
        const first = displayedItems[0].scaled_score_10;
        const growth = count > 1 ? Math.round((latest - first) * 10) / 10 : 0;
        return {
            ...data?.stats,
            average_score: avg,
            highest_score: high,
            latest_score: latest,
            growth_score: growth,
        };
    }, [displayedItems, data?.stats]);

    // SVG Coordinate Calculations
    // Chart ViewBox 800 x 280
    const svgWidth = 800;
    const svgHeight = 280;
    const padding = { top: 32, right: 35, bottom: 45, left: 50 };
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    const points = useMemo(() => {
        const count = displayedItems.length;
        if (count === 0) return [];
        return displayedItems.map((item, index) => {
            const x = count === 1
                ? padding.left + chartWidth / 2
                : padding.left + (index / (count - 1)) * chartWidth;
            // score from 0 to 10
            const clampedScore = Math.max(0, Math.min(10, item.scaled_score_10));
            const y = padding.top + chartHeight - (clampedScore / 10) * chartHeight;
            return { x, y, item, index };
        });
    }, [displayedItems, chartWidth, chartHeight, padding.left, padding.top]);

    const curvePath = useMemo(() => generateSmoothCurve(points.map((p) => ({ x: p.x, y: p.y }))), [points]);
    const areaPath = useMemo(() => {
        if (points.length === 0) return '';
        const bottomY = padding.top + chartHeight;
        const firstX = points[0].x;
        const lastX = points[points.length - 1].x;
        return `${curvePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }, [curvePath, points, padding.top, chartHeight]);

    // Benchmark Y coordinates
    const targetY = padding.top + chartHeight - (8.0 / 10) * chartHeight; // Mốc 8.0
    const avgY = localStats?.average_score
        ? padding.top + chartHeight - (Math.min(10, localStats.average_score) / 10) * chartHeight
        : null;

    const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

    return (
        <Panel
            title={title}
            className={`overflow-hidden !border-slate-200 !bg-white dark:!border-[var(--color-border)] dark:!bg-[var(--color-card)] ${className}`}
            action={
                <div className="flex flex-wrap items-center gap-2">
                    {/* Class filter dropdown */}
                    {showClassFilter && data?.classes && data.classes.length > 1 && (
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-800 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-500/20 dark:border-[var(--color-border)] dark:bg-[var(--color-bg-soft)] dark:text-white"
                        >
                            <option value="all">Tất cả môn / lớp</option>
                            {data.classes.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                    {cls.name} ({cls.code})
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Chart Mode Toggle */}
                    <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-[var(--color-border)] dark:bg-[var(--color-bg-soft)]">
                        <button
                            type="button"
                            onClick={() => setViewMode('line')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${
                                viewMode === 'line'
                                    ? 'bg-white text-red-900 shadow-xs dark:bg-red-950 dark:text-red-200'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                            }`}
                        >
                            Đường cong
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('bar')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${
                                viewMode === 'bar'
                                    ? 'bg-white text-red-900 shadow-xs dark:bg-red-950 dark:text-red-200'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                            }`}
                        >
                            Cột
                        </button>
                    </div>

                    {/* Limit Filter */}
                    {data?.items && data.items.length > 5 && (
                        <div className="hidden sm:flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-[var(--color-border)] dark:bg-[var(--color-bg-soft)]">
                            <button
                                type="button"
                                onClick={() => setLimitCount('5')}
                                className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                                    limitCount === '5' ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white' : 'text-slate-500'
                                }`}
                            >
                                5 bài gần nhất
                            </button>
                            <button
                                type="button"
                                onClick={() => setLimitCount('all')}
                                className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                                    limitCount === 'all' ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white' : 'text-slate-500'
                                }`}
                            >
                                Tất cả ({data.items.length})
                            </button>
                        </div>
                    )}
                </div>
            }
        >
            {loading ? (
                <div className="grid gap-4 py-6">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[1, 2, 3, 4].map((n) => (
                            <div key={n} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-[var(--color-bg-soft)]" />
                        ))}
                    </div>
                    <div className="h-64 animate-pulse rounded-3xl bg-slate-100 dark:bg-[var(--color-bg-soft)]" />
                </div>
            ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">
                    <p>{error}</p>
                    <button
                        type="button"
                        onClick={fetchScoreProgress}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-800"
                    >
                        Thử lại
                    </button>
                </div>
            ) : !data || displayedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center dark:border-[var(--color-border)] dark:bg-[var(--color-bg-soft)]">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm dark:bg-white/10">
                        <ChartIcon size={26} />
                    </span>
                    <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">Chưa có dữ liệu bài kiểm tra</h3>
                </div>
            ) : (
                <div className="grid gap-6">
                    {/* KPI Quick Stats Row */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {/* 1. Điểm Trung Bình */}
                        <div className="score-kpi-card score-kpi-blue group cursor-default">
                            <div className="flex items-center justify-between">
                                <span className="score-kpi-title text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                                    Điểm trung bình
                                </span>
                                <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30 transition-transform group-hover:scale-110 dark:bg-blue-500">
                                    <ChartIcon size={16} />
                                </span>
                            </div>
                            <p className="score-kpi-val mt-2 text-3xl font-black text-slate-900 dark:text-white">
                                {localStats?.average_score.toFixed(1)}
                                <span className="text-sm font-bold text-blue-600/70 dark:text-blue-400/80"> / 10</span>
                            </p>
                            <p className="score-kpi-sub mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                <span>{getScoreLabel(localStats?.average_score || 0)} • {displayedItems.length} bài đã làm</span>
                            </p>
                        </div>

                        {/* 2. Điểm Cao Nhất */}
                        <div className="score-kpi-card score-kpi-amber group cursor-default">
                            <div className="flex items-center justify-between">
                                <span className="score-kpi-title text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                                    Điểm cao nhất
                                </span>
                                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/30 transition-transform group-hover:scale-110 dark:bg-amber-400 dark:text-slate-950 font-black">
                                    ★
                                </span>
                            </div>
                            <p className="score-kpi-val mt-2 text-3xl font-black text-amber-600 dark:text-amber-300">
                                {localStats?.highest_score.toFixed(1)}
                                <span className="text-sm font-bold text-amber-500/70 dark:text-amber-400/80"> / 10</span>
                            </p>
                            <p className="score-kpi-sub mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-200/90">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                                <span>Đỉnh cao năng lực học tập</span>
                            </p>
                        </div>

                        {/* 3. Bài Gần Nhất */}
                        <div className="score-kpi-card score-kpi-emerald group cursor-default">
                            <div className="flex items-center justify-between">
                                <span className="score-kpi-title text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                                    Bài gần nhất
                                </span>
                                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-500/30 transition-transform group-hover:scale-110 dark:bg-emerald-500">
                                    <CheckIcon size={16} />
                                </span>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <p className="score-kpi-val text-3xl font-black text-slate-900 dark:text-white">
                                    {localStats?.latest_score.toFixed(1)}
                                </p>
                                {displayedItems.length > 1 && (
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${
                                            (displayedItems[displayedItems.length - 1].delta || 0) >= 0
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-500/40'
                                                : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                                        }`}
                                    >
                                        {(displayedItems[displayedItems.length - 1].delta || 0) >= 0
                                            ? `+${(displayedItems[displayedItems.length - 1].delta || 0).toFixed(1)}`
                                            : `${(displayedItems[displayedItems.length - 1].delta || 0).toFixed(1)}`}
                                    </span>
                                )}
                            </div>
                            <p className="score-kpi-sub mt-1.5 truncate text-[11px] font-bold text-slate-600 dark:text-slate-300" title={displayedItems[displayedItems.length - 1]?.title}>
                                {displayedItems[displayedItems.length - 1]?.title || 'Bài gần đây'}
                            </p>
                        </div>

                        {/* 4. Tiến Trình Tăng Trưởng */}
                        <div className="score-kpi-card score-kpi-rose group cursor-default">
                            <div className="flex items-center justify-between">
                                <span className="score-kpi-title text-[11px] font-black uppercase tracking-wider text-rose-900 dark:text-rose-400">
                                    Độ tiến bộ
                                </span>
                                <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-700 text-white shadow-sm shadow-rose-700/30 transition-transform group-hover:scale-110 dark:bg-rose-600">
                                    <TrendIcon size={16} />
                                </span>
                            </div>
                            <p className="score-kpi-val mt-2 text-3xl font-black text-rose-700 dark:text-rose-300">
                                {(localStats?.growth_score || 0) > 0 ? `+${localStats?.growth_score}` : localStats?.growth_score}
                                <span className="text-sm font-bold text-rose-600/70 dark:text-rose-400/80"> điểm</span>
                            </p>
                            <p className="score-kpi-sub mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-rose-800 dark:text-rose-200">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-rose-600" />
                                <span>{localStats?.trend_text || 'Đang duy trì tốt'}</span>
                            </p>
                        </div>
                    </div>

                    {/* Chart Container & Interactive Display */}
                    <div className="relative rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 sm:p-6 dark:border-[var(--color-border)] dark:from-[var(--color-card)] dark:to-[var(--color-bg-soft)]">
                        {/* Chart Legend & Benchmark switch */}
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-red-700 dark:bg-red-500" />
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Điểm kiểm tra của bạn</span>
                                </div>
                                {showBenchmarks && (
                                    <>
                                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                            <span className="h-0.5 w-4 border-t-2 border-dashed border-emerald-500" />
                                            <span className="font-semibold">Mục tiêu Giỏi (8.0)</span>
                                        </div>
                                        {localStats?.average_score && (
                                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                <span className="h-0.5 w-4 border-t-2 border-dashed border-blue-500" />
                                                <span className="font-semibold">TB cá nhân ({localStats.average_score.toFixed(1)})</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowBenchmarks((prev) => !prev)}
                                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                            >
                                {showBenchmarks ? 'Ẩn đường mốc' : 'Hiện đường mốc mục tiêu'}
                            </button>
                        </div>

                        {/* Interactive Vector Graphic */}
                        <div className="relative w-full overflow-hidden">
                            {viewMode === 'line' ? (
                                <svg
                                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                                    className="w-full h-auto overflow-visible select-none"
                                >
                                    <defs>
                                        <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#991B1B" stopOpacity="0.32" />
                                            <stop offset="60%" stopColor="#991B1B" stopOpacity="0.08" />
                                            <stop offset="100%" stopColor="#991B1B" stopOpacity="0.0" />
                                        </linearGradient>
                                        <linearGradient id="scoreLineGradient" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#DC2626" />
                                            <stop offset="50%" stopColor="#B91C1C" />
                                            <stop offset="100%" stopColor="#7F1D1D" />
                                        </linearGradient>
                                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#B91C1C" floodOpacity="0.45" />
                                        </filter>
                                    </defs>

                                    {/* Grid Lines and Y-Axis Labels */}
                                    {[0, 2.5, 5.0, 7.5, 10.0].map((tick) => {
                                        const y = padding.top + chartHeight - (tick / 10) * chartHeight;
                                        return (
                                            <g key={tick}>
                                                <line
                                                    x1={padding.left}
                                                    y1={y}
                                                    x2={svgWidth - padding.right}
                                                    y2={y}
                                                    stroke="currentColor"
                                                    className="text-slate-200 dark:text-slate-800"
                                                    strokeDasharray={tick === 0 || tick === 10 ? undefined : '4 4'}
                                                    strokeWidth={1}
                                                />
                                                <text
                                                    x={padding.left - 12}
                                                    y={y + 4}
                                                    textAnchor="end"
                                                    className="fill-slate-400 text-[11px] font-bold"
                                                >
                                                    {tick.toFixed(tick % 1 === 0 ? 0 : 1)}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* Benchmark Line (Target 8.0) */}
                                    {showBenchmarks && (
                                        <g>
                                            <line
                                                x1={padding.left}
                                                y1={targetY}
                                                x2={svgWidth - padding.right}
                                                y2={targetY}
                                                stroke="#10B981"
                                                strokeWidth={1.5}
                                                strokeDasharray="6 6"
                                                opacity={0.7}
                                            />
                                            <text
                                                x={svgWidth - padding.right}
                                                y={targetY - 5}
                                                textAnchor="end"
                                                className="fill-emerald-600 text-[10px] font-bold dark:fill-emerald-400"
                                            >
                                                Mục tiêu 8.0
                                            </text>
                                        </g>
                                    )}

                                    {/* Personal Average Line */}
                                    {showBenchmarks && avgY !== null && (
                                        <g>
                                            <line
                                                x1={padding.left}
                                                y1={avgY}
                                                x2={svgWidth - padding.right}
                                                y2={avgY}
                                                stroke="#3B82F6"
                                                strokeWidth={1.2}
                                                strokeDasharray="4 4"
                                                opacity={0.65}
                                            />
                                        </g>
                                    )}

                                    {/* Area Fill */}
                                    <path d={areaPath} fill="url(#scoreAreaGradient)" />

                                    {/* Line Stroke */}
                                    <path
                                        d={curvePath}
                                        fill="none"
                                        stroke="url(#scoreLineGradient)"
                                        strokeWidth={3.5}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        filter="url(#glow)"
                                    />

                                    {/* Data Points */}
                                    {points.map((pt, idx) => {
                                        const isHovered = hoveredIdx === idx;
                                        const isLatest = idx === points.length - 1;
                                        const isPersonalBest = pt.item.is_personal_best;

                                        return (
                                            <g
                                                key={pt.item.id}
                                                className="cursor-pointer transition"
                                                onMouseEnter={() => setHoveredIdx(idx)}
                                                onMouseLeave={() => setHoveredIdx(null)}
                                            >
                                                {/* X-Axis date label */}
                                                <text
                                                    x={pt.x}
                                                    y={padding.top + chartHeight + 20}
                                                    textAnchor="middle"
                                                    className={`text-[10px] font-bold transition ${
                                                        isHovered
                                                            ? 'fill-red-800 dark:fill-red-400 font-black'
                                                            : 'fill-slate-400 dark:fill-slate-500'
                                                    }`}
                                                >
                                                    {formatShortDateVi(pt.item.date)}
                                                </text>

                                                {/* Outer pulse circle for latest or personal best */}
                                                {(isLatest || isPersonalBest || isHovered) && (
                                                    <circle
                                                        cx={pt.x}
                                                        cy={pt.y}
                                                        r={isHovered ? 14 : 11}
                                                        className="fill-red-600/20 animate-pulse"
                                                    />
                                                )}

                                                {/* Main Point Marker */}
                                                <circle
                                                    cx={pt.x}
                                                    cy={pt.y}
                                                    r={isHovered ? 7 : 5.5}
                                                    className={`transition-all duration-200 ${
                                                        isHovered
                                                            ? 'fill-red-700 stroke-white dark:stroke-slate-900 stroke-[3px]'
                                                            : 'fill-white dark:fill-slate-900 stroke-red-700 stroke-[3px]'
                                                    }`}
                                                />

                                                {/* Value badge on top of point */}
                                                <text
                                                    x={pt.x}
                                                    y={pt.y - 12}
                                                    textAnchor="middle"
                                                    className={`text-[11px] font-black tracking-tight ${
                                                        isHovered
                                                            ? 'fill-red-900 dark:fill-red-200 text-xs'
                                                            : 'fill-slate-700 dark:fill-slate-300'
                                                    }`}
                                                >
                                                    {pt.item.scaled_score_10}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>
                            ) : (
                                /* Bar Chart View */
                                <div className="flex h-64 items-end justify-between gap-2 pt-8 sm:gap-4">
                                    {displayedItems.map((item, idx) => {
                                        const score = item.scaled_score_10;
                                        const heightPercent = Math.max(8, (score / 10) * 100);
                                        const isHovered = hoveredIdx === idx;
                                        const barColor =
                                            score >= 8.5
                                                ? 'bg-emerald-600 hover:bg-emerald-500'
                                                : score >= 7.0
                                                ? 'bg-blue-600 hover:bg-blue-500'
                                                : score >= 5.0
                                                ? 'bg-amber-500 hover:bg-amber-400'
                                                : 'bg-rose-600 hover:bg-rose-500';

                                        return (
                                            <div
                                                key={item.id}
                                                className="group relative flex flex-1 flex-col items-center gap-1.5"
                                                onMouseEnter={() => setHoveredIdx(idx)}
                                                onMouseLeave={() => setHoveredIdx(null)}
                                            >
                                                <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">
                                                    {score}
                                                </span>
                                                <div className="flex h-44 w-full max-w-[50px] items-end rounded-t-xl bg-slate-100 dark:bg-slate-800/60 p-1">
                                                    <div
                                                        className={`w-full rounded-t-lg transition-all duration-300 ${barColor} ${
                                                            isHovered ? 'ring-2 ring-red-400 ring-offset-2' : ''
                                                        }`}
                                                        style={{ height: `${heightPercent}%` }}
                                                    />
                                                </div>
                                                <span className="truncate max-w-[65px] text-center text-[10px] font-bold text-slate-400">
                                                    {formatShortDateVi(item.date)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Floating Rich Tooltip when hovering over a point */}
                            <AnimatePresence>
                                {hoveredPoint && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.96 }}
                                        transition={{ duration: 0.15 }}
                                        className="pointer-events-none absolute z-30 w-72 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-[var(--color-border)] dark:bg-[var(--color-card)]/95"
                                        style={{
                                            left: `${Math.min(
                                                Math.max(10, (hoveredPoint.x / svgWidth) * 100 - 15),
                                                70
                                            )}%`,
                                            top: '10px',
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    {hoveredPoint.item.class_name}
                                                </span>
                                                <h4 className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">
                                                    {hoveredPoint.item.title}
                                                </h4>
                                            </div>
                                            <Badge tone={getScoreTone(hoveredPoint.item.scaled_score_10)} size="sm">
                                                {getScoreLabel(hoveredPoint.item.scaled_score_10)}
                                            </Badge>
                                        </div>

                                        <div className="mt-3 flex items-baseline gap-2 border-y border-slate-100 py-2 dark:border-slate-800">
                                            <span className="text-2xl font-black text-red-700 dark:text-red-400">
                                                {hoveredPoint.item.scaled_score_10}
                                                <span className="text-xs font-semibold text-slate-400"> / 10</span>
                                            </span>
                                            {hoveredPoint.item.max_score !== 10 && (
                                                <span className="text-xs font-semibold text-slate-500">
                                                    (gốc: {hoveredPoint.item.score}/{hoveredPoint.item.max_score})
                                                </span>
                                            )}
                                            {hoveredPoint.index > 0 && (
                                                <span
                                                    className={`ml-auto text-xs font-black ${
                                                        (hoveredPoint.item.delta || 0) >= 0
                                                            ? 'text-emerald-600'
                                                            : 'text-rose-600'
                                                    }`}
                                                >
                                                    {(hoveredPoint.item.delta || 0) >= 0
                                                        ? `↑ +${(hoveredPoint.item.delta || 0).toFixed(1)}`
                                                        : `↓ ${(hoveredPoint.item.delta || 0).toFixed(1)}`}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1 font-semibold">
                                                <ClockIcon size={12} /> {formatDateVi(hoveredPoint.item.date)}
                                            </span>
                                            {hoveredPoint.item.is_personal_best && (
                                                <span className="font-bold text-amber-600">★ Kỷ lục cá nhân</span>
                                            )}
                                        </div>

                                        {hoveredPoint.item.feedback && (
                                            <p className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs font-semibold italic text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                                                &ldquo;{hoveredPoint.item.feedback}&rdquo;
                                            </p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Collapsible Test Score History List */}
                    <div className="border-t border-slate-200 pt-3 dark:border-[var(--color-border)]">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                Lịch sử bài kiểm tra ({displayedItems.length})
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowHistoryTable((prev) => !prev)}
                                className="text-xs font-bold text-red-800 hover:text-red-950 dark:text-red-300 dark:hover:text-red-100"
                            >
                                {showHistoryTable ? 'Thu gọn danh sách ▲' : 'Xem toàn bộ danh sách ▼'}
                            </button>
                        </div>

                        {showHistoryTable && (
                            <div className="mt-4 grid gap-2.5 overflow-hidden">
                                {displayedItems.map((item, idx) => {
                                    const score = item.scaled_score_10;
                                    const tone = getScoreTone(score);
                                    const delta = item.delta || 0;

                                    return (
                                        <article
                                            key={item.id}
                                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 transition hover:border-red-200 hover:bg-white dark:border-[var(--color-border)] dark:bg-[var(--color-bg-soft)] dark:hover:bg-[var(--color-card)]"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-slate-700 shadow-xs dark:bg-white/10 dark:text-white">
                                                    #{idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h5 className="truncate text-sm font-black text-slate-900 dark:text-white">
                                                            {item.title}
                                                        </h5>
                                                        <Badge tone={tone} size="sm">
                                                            {getScoreLabel(score)}
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-[var(--color-text-secondary)]">
                                                        {item.class_name} • Ngày {formatDateVi(item.date)}
                                                    </p>
                                                    {item.feedback && (
                                                        <p className="mt-1 text-xs font-medium italic text-slate-600 dark:text-slate-300">
                                                            Lời phê: &ldquo;{item.feedback}&rdquo;
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                {idx > 0 && (
                                                    <span
                                                        className={`text-xs font-black ${
                                                            delta >= 0
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : 'text-rose-600 dark:text-rose-400'
                                                        }`}
                                                    >
                                                        {delta >= 0 ? `+${delta.toFixed(1)}` : `${delta.toFixed(1)}`}
                                                    </span>
                                                )}
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-slate-900 dark:text-white">
                                                        {score}
                                                        <span className="text-xs font-semibold text-slate-400"> / 10</span>
                                                    </p>
                                                    {item.max_score !== 10 && (
                                                        <p className="text-[10px] font-semibold text-slate-400">
                                                            Gốc: {item.score}/{item.max_score}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Panel>
    );
});
