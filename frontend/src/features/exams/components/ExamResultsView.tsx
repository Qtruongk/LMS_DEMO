import { useMemo, useState } from 'react';
import { Panel } from '../../../components/shared/ui';
import { AwardIcon, FlagIcon } from './ExamIcons';
import type { ExamSubmission } from '../types';

type ExamResultsViewProps = {
    results: ExamSubmission[];
};

type ResultFilter = 'all' | 'graded' | 'pending_essay' | 'in_progress';

const statusLabel: Record<ExamSubmission['status'], string> = {
    graded: 'Đã có điểm',
    pending_essay: 'Chờ chấm tự luận',
    in_progress: 'Đang làm bài',
};

const statusTone: Record<ExamSubmission['status'], string> = {
    graded: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/70 dark:text-emerald-100',
    pending_essay: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/70 dark:text-amber-100',
    in_progress: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200',
};

function formatDate(value?: string) {
    if (!value) return 'Chưa nộp';
    return new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function getScoreInfo(result: ExamSubmission) {
    const gradeScore = result.grade_details?.main?.score;
    const score = Number(gradeScore ?? result.total_score ?? 0);
    const maxScore = Number(result.max_score || 10);
    const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const visible = result.status === 'graded' && result.show_score_after_submit !== false;
    return { score, maxScore, percent: Math.max(0, Math.min(100, percent)), visible };
}

function getGradeLabel(result: ExamSubmission) {
    return result.grade_column_name || result.exam_title || 'Điểm kiểm tra';
}

function getGradebookTitle(result: ExamSubmission) {
    return result.gradebook_name || 'Bảng điểm';
}

export function ExamResultsView({ results }: ExamResultsViewProps) {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<ResultFilter>('all');
    const [selectedResult, setSelectedResult] = useState<ExamSubmission | null>(null);

    const filteredResults = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return results.filter((item) => {
            const matchStatus = status === 'all' || item.status === status;
            const searchable = [item.exam_title, item.subject, item.class_name, item.assigned_grader_name, item.gradebook_name, item.grade_column_name]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return matchStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
        });
    }, [query, results, status]);

    const subjectGradebooks = useMemo(() => {
        const groups = new Map<string, { subject: string; className: string; items: Array<{ id: number; label: string; score: number; maxScore: number; percent: number; visible: boolean; status: ExamSubmission['status']; examTitle: string; gradebook: string }>; totalScore: number; totalMax: number }>();
        results.forEach((item) => {
            const { score, maxScore, percent, visible } = getScoreInfo(item);
            const subject = item.subject || 'Chung';
            if (!groups.has(subject)) groups.set(subject, { subject, className: item.class_name || 'Chưa gán lớp', items: [], totalScore: 0, totalMax: 0 });
            const group = groups.get(subject)!;
            group.items.push({
                id: item.id,
                label: getGradeLabel(item),
                score,
                maxScore,
                percent,
                visible,
                status: item.status,
                examTitle: item.exam_title || 'Bài kiểm tra',
                gradebook: getGradebookTitle(item),
            });
            if (visible) {
                group.totalScore += score;
                group.totalMax += maxScore;
            }
        });
        return Array.from(groups.values()).map((group) => ({
            ...group,
            average: group.totalMax > 0 ? Math.round((group.totalScore / group.totalMax) * 100) : 0,
        }));
    }, [results]);

    return (
        <div className="grid gap-5 pb-4">
            <Panel title="Bảng điểm tổng theo môn">
                {subjectGradebooks.length ? (
                    <div className="grid gap-4">
                        {subjectGradebooks.map((group) => (
                            <article key={group.subject} className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
                                <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]">{group.className}</p>
                                        <h3 className="mt-1 text-lg font-black text-[var(--color-text)]">{group.subject}</h3>
                                    </div>
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-emerald-900 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-200">Điểm tổng</p>
                                        <p className="mt-1 text-xl font-black text-emerald-950 dark:text-emerald-50">{group.totalMax > 0 ? `${group.totalScore.toFixed(2)} / ${group.totalMax.toFixed(2)}` : 'Chưa có điểm'}</p>
                                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-200">{group.totalMax > 0 ? `${group.average}%` : 'Chờ giáo viên chấm'}</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[640px] text-left text-sm">
                                        <thead className="bg-[var(--color-bg-soft)] text-xs uppercase text-[var(--color-text-muted)]">
                                            <tr><th className="p-3">Bảng điểm</th><th className="p-3">Cột điểm</th><th className="p-3">Bài kiểm tra</th><th className="p-3">Điểm</th><th className="p-3">Trạng thái</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-border)]">
                                            {group.items.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="p-3 font-bold text-[var(--color-text)]">{item.gradebook}</td>
                                                    <td className="p-3 font-black text-[var(--color-primary)]">{item.label}</td>
                                                    <td className="p-3 text-[var(--color-text-secondary)]">{item.examTitle}</td>
                                                    <td className="p-3 font-black text-[var(--color-text)]">{item.visible ? `${item.score.toFixed(2)} / ${item.maxScore.toFixed(2)}` : 'Chưa công bố'}</td>
                                                    <td className="p-3 text-[var(--color-text-secondary)]">{statusLabel[item.status]}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-10 text-center text-sm font-bold text-[var(--color-text-muted)]">Chưa có bảng điểm môn học.</div>
                )}
            </Panel>
            <Panel
                title={`Lịch sử & kết quả bài kiểm tra (${filteredResults.length}/${results.length})`}
            >
                <div className="mb-4 grid gap-3 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 md:grid-cols-[1fr_14rem_auto]">
                    <label className="grid gap-1 text-xs font-bold text-[var(--color-text-secondary)]">
                        Tìm bài kiểm tra
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Nhập tên bài, môn, lớp hoặc giáo viên..."
                            className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]"
                        />
                    </label>
                    <label className="grid gap-1 text-xs font-bold text-[var(--color-text-secondary)]">
                        Trạng thái
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value as ResultFilter)}
                            className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]"
                        >
                            <option value="all">Tất cả kết quả</option>
                            <option value="graded">Đã có điểm</option>
                            <option value="pending_essay">Chờ chấm tự luận</option>
                            <option value="in_progress">Đang làm bài</option>
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('');
                            setStatus('all');
                        }}
                        className="h-11 self-end rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-xs font-black text-[var(--color-text)] transition hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    >
                        Xóa lọc
                    </button>
                </div>

                {filteredResults.length ? (
                    <div className="grid gap-4">
                        {filteredResults.map((res) => {
                            const { score, maxScore, percent, visible } = getScoreInfo(res);
                            const suspiciousLogs = (res.proctoring_logs || []).filter((log) => log.type === 'fullscreen_exit' || log.type === 'visibility_hidden');

                            return (
                                <article
                                    key={res.id}
                                    className="overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm transition hover:border-[var(--color-primary-border)] hover:shadow-md"
                                >
                                    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_13rem] lg:items-center">
                                        <div className="min-w-0 space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${statusTone[res.status]}`}>{statusLabel[res.status]}</span>
                                                {res.class_name && (
                                                    <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                                                        {res.class_name}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black leading-6 text-[var(--color-text)] sm:text-lg">{res.exam_title || 'Bài kiểm tra trực tuyến'}</h3>
                                            </div>

                                            <div className="grid gap-2 sm:grid-cols-3">
                                                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-xs">
                                                    <b className="mb-1 flex items-center gap-1 text-[var(--color-text)]"><AwardIcon size={14} /> {res.grade_column_name || 'Điểm bài kiểm tra'}</b>
                                                    <span className="font-bold text-[var(--color-text-secondary)]">{visible ? `${score.toFixed(2)} / ${maxScore.toFixed(2)} (${percent}%)` : 'Chưa công bố điểm'}</span>
                                                </div>
                                                <div className={`rounded-2xl border p-3 text-xs ${suspiciousLogs.length ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100'}`}>
                                                    <b className="mb-1 flex items-center gap-1"><FlagIcon size={14} /> Hành vi làm bài</b>
                                                    {suspiciousLogs.length ? `${suspiciousLogs.length} cảnh báo rời tab/toàn màn hình.` : 'Không có cảnh báo bất thường.'}
                                                </div>
                                                <div className="rounded-2xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900 dark:border-purple-900 dark:bg-purple-950/50 dark:text-purple-100">
                                                    <b className="mb-1 block">Giáo viên chấm</b>
                                                    {res.assigned_grader_name || 'Theo phân công'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-center">
                                            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[var(--color-card)] shadow-inner ring-8 ring-blue-100 dark:ring-blue-950">
                                                <div>
                                                    <div className="text-2xl font-black text-[var(--color-text)]">{visible ? `${percent}%` : '—'}</div>
                                                    <div className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Kết quả</div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedResult(res)}
                                                className="mt-3 h-11 w-full rounded-2xl bg-[var(--color-primary)] px-4 text-xs font-black text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-card)]"
                                            >
                                                Xem chi tiết
                                            </button>
                                        </div>
                                    </div>

                                    {res.teacher_feedback && (
                                        <div className="border-t border-[var(--color-border)] bg-purple-50/70 p-4 text-xs text-purple-900 dark:bg-purple-950/30 dark:text-purple-100 sm:px-5">
                                            <b className="block mb-1 text-[11px] uppercase tracking-wider text-purple-700 dark:text-purple-300">Nhận xét từ giảng viên</b>
                                            <p className="leading-5 italic">{res.teacher_feedback}</p>
                                            {res.teacher_audio_feedback_url && <audio controls src={res.teacher_audio_feedback_url} className="mt-2 w-full" />}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-12 text-center text-sm text-[var(--color-text-muted)]">
                        Không tìm thấy kết quả phù hợp với bộ lọc hiện tại.
                    </div>
                )}
            </Panel>

            {selectedResult && (
                <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" role="dialog" aria-modal="true">
                    <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-2xl sm:max-w-2xl sm:rounded-[2rem]">
                        {(() => {
                            const { score, maxScore, percent, visible } = getScoreInfo(selectedResult);
                            const suspiciousLogs = (selectedResult.proctoring_logs || []).filter((log) => log.type === 'fullscreen_exit' || log.type === 'visibility_hidden');
                            return (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
                                        <div>
                                            <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${statusTone[selectedResult.status]}`}>{statusLabel[selectedResult.status]}</span>
                                            <h3 className="mt-3 text-xl font-black text-[var(--color-text)]">{selectedResult.exam_title || 'Bài kiểm tra trực tuyến'}</h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedResult(null)}
                                            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[var(--color-border)] text-lg font-black text-[var(--color-text)] transition hover:bg-[var(--color-bg-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                                            aria-label="Đóng chi tiết kết quả"
                                        >
                                            ×
                                        </button>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-3xl bg-blue-50 p-4 text-blue-950 dark:bg-blue-950/50 dark:text-blue-100">
                                            <p className="text-[11px] font-black uppercase tracking-wider opacity-70">{selectedResult.grade_column_name || 'Điểm'}</p>
                                            <p className="mt-2 text-2xl font-black">{visible ? `${score.toFixed(2)}/${maxScore.toFixed(2)}` : 'Chưa công bố'}</p>
                                        </div>
                                        <div className="rounded-3xl bg-emerald-50 p-4 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100">
                                            <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Hoàn thành</p>
                                            <p className="mt-2 text-2xl font-black">{visible ? `${percent}%` : '—'}</p>
                                        </div>
                                        <div className="rounded-3xl bg-amber-50 p-4 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">
                                            <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Cảnh báo</p>
                                            <p className="mt-2 text-2xl font-black">{suspiciousLogs.length}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-sm">
                                        <b className="text-[var(--color-text)]">Bảng điểm</b>
                                        <p className="mt-1 text-[var(--color-text-secondary)]">{selectedResult.gradebook_name || 'Bảng điểm'} • {selectedResult.grade_column_name || 'Điểm kiểm tra'}: <span className="font-black text-[var(--color-primary)]">{visible ? score.toFixed(2) : 'Chưa công bố'}</span></p>
                                    </div>

                                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                                        <div className="rounded-2xl border border-[var(--color-border)] p-3">
                                            <b className="text-[var(--color-text)]">Thời gian nộp</b>
                                            <p className="mt-1 text-[var(--color-text-secondary)]">{formatDate(selectedResult.submit_time)}</p>
                                        </div>
                                        <div className="rounded-2xl border border-[var(--color-border)] p-3">
                                            <b className="text-[var(--color-text)]">Giáo viên chấm</b>
                                            <p className="mt-1 text-[var(--color-text-secondary)]">{selectedResult.assigned_grader_name || 'Theo phân công'}</p>
                                        </div>
                                        <div className="rounded-2xl border border-[var(--color-border)] p-3">
                                            <b className="text-[var(--color-text)]">Lượt làm bài</b>
                                            <p className="mt-1 text-[var(--color-text-secondary)]">#{selectedResult.attempt_number}</p>
                                        </div>
                                        <div className="rounded-2xl border border-[var(--color-border)] p-3">
                                            <b className="text-[var(--color-text)]">Ngày chấm</b>
                                            <p className="mt-1 text-[var(--color-text-secondary)]">{formatDate(selectedResult.graded_at)}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-950 dark:border-purple-900/70 dark:bg-purple-950/40 dark:text-purple-100">
                                        <b className="block text-xs uppercase tracking-wider text-purple-700 dark:text-purple-300">Nhận xét</b>
                                        <p className="mt-2 leading-6">{selectedResult.teacher_feedback || 'Chưa có nhận xét từ giáo viên. Hệ thống sẽ cập nhật khi giáo viên hoàn tất chấm bài.'}</p>
                                        {selectedResult.teacher_audio_feedback_url && <audio controls src={selectedResult.teacher_audio_feedback_url} className="mt-3 w-full" />}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedResult(null)}
                                        className="h-12 w-full rounded-2xl bg-[var(--color-primary)] text-sm font-black text-white transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-card)]"
                                    >
                                        Đã hiểu kết quả
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
