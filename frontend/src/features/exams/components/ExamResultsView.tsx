import { Panel } from '../../../components/shared/ui';
import { CalendarIcon } from '../../../components/shared/icons';
import { AwardIcon, FlagIcon } from './ExamIcons';
import type { ExamSubmission } from '../types';

type ExamResultsViewProps = {
    results: ExamSubmission[];
};

export function ExamResultsView({ results }: ExamResultsViewProps) {
    const ranked = [...results]
        .filter((item) => item.status === 'graded')
        .sort((a, b) => Number(b.total_score || 0) - Number(a.total_score || 0))
        .slice(0, 5);

    return (
        <div className="grid gap-5">
            <Panel
                title="Bảng Xếp Hạng Điểm Theo Đề Thi"
                subtitle="Tạo động lực học tập bằng thứ hạng nhẹ nhàng, không gây áp lực quá mức cho học sinh"
            >
                {ranked.length ? (
                    <div className="grid gap-3 md:grid-cols-5">
                        {ranked.map((res, index) => (
                            <div key={res.id} className="rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-amber-50 to-white p-4 text-center shadow-xs dark:from-amber-950/40 dark:to-slate-900">
                                <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-amber-400 text-sm font-black text-white">
                                    #{index + 1}
                                </div>
                                <div className="line-clamp-2 text-xs font-black text-[var(--color-text)]">{res.exam_title}</div>
                                <div className="mt-2 text-lg font-black text-amber-700 dark:text-amber-200">{res.total_score}/{res.max_score || 10}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">Chưa có dữ liệu xếp hạng</div>
                )}
            </Panel>

            <Panel
                title={`Lịch Sử & Kết Quả Bài Kiểm Tra (${results.length} lượt làm)`}
                subtitle="Theo dõi điểm tự chấm, bài tự luận chờ giáo viên, nhận xét text/audio và log hành vi làm bài"
            >
                {results.length ? (
                    <div className="grid gap-4">
                        {results.map((res) => {
                            const isGraded = res.status === 'graded';
                            const score = Number(res.total_score || 0);
                            const maxScore = Number(res.max_score || 10);
                            const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                            const suspiciousLogs = (res.proctoring_logs || []).filter((log) => log.type === 'fullscreen_exit' || log.type === 'visibility_hidden');

                            return (
                                <article
                                    key={res.id}
                                    className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-xs transition hover:border-[var(--color-primary-border)]"
                                >
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-base text-[var(--color-text)]">{res.exam_title || 'Bài kiểm tra trực tuyến'}</span>
                                            {res.class_name && (
                                                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                                                    {res.class_name}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                                                <CalendarIcon size={13} /> Nộp lúc: {res.submit_time ? new Date(res.submit_time).toLocaleString('vi-VN') : 'Đang làm'}
                                            </span>
                                            <span className={`rounded-xl px-3 py-1 text-xs font-bold ${isGraded
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                                }`}>
                                                {isGraded ? `${score} / ${maxScore} điểm (${percent}%)` : '⏳ Đang chờ chấm tự luận'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid gap-3">
                                        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                                            <span>Lượt làm bài: <b>#{res.attempt_number}</b></span>
                                            <span>Môn học: <b>{res.subject || 'Chung'}</b></span>
                                            <span>GV chấm: <b>{res.assigned_grader_name || 'Theo phân công'}</b></span>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-3">
                                            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-xs">
                                                <b className="mb-1 flex items-center gap-1 text-[var(--color-text)]"><AwardIcon size={14} /> Trạng thái chấm</b>
                                                {isGraded ? 'Đã khóa điểm, không chỉnh sửa sau khi hoàn thành.' : 'Đang chờ giáo viên chấm phần nói/viết/mindmap.'}
                                            </div>
                                            <div className={`rounded-2xl border p-3 text-xs ${suspiciousLogs.length ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100'}`}>
                                                <b className="mb-1 flex items-center gap-1"><FlagIcon size={14} /> Log làm bài</b>
                                                {suspiciousLogs.length ? `${suspiciousLogs.length} lần thoát tab/toàn màn hình được ghi nhận.` : 'Không ghi nhận rời tab trong dữ liệu mẫu.'}
                                            </div>
                                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-100">
                                                <b className="mb-1 block">Chi tiết kết quả</b>
                                                Tự động chấm trắc nghiệm, tự luận hiển thị sau khi giáo viên hoàn tất.
                                            </div>
                                        </div>

                                        {res.teacher_feedback && (
                                            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900 dark:border-purple-900/60 dark:bg-purple-950/60 dark:text-purple-100">
                                                <b className="block mb-1 text-[11px] uppercase tracking-wider text-purple-700 dark:text-purple-300">Nhận xét từ Giảng viên:</b>
                                                <p className="italic">{res.teacher_feedback}</p>
                                                {res.teacher_audio_feedback_url && <audio controls src={res.teacher_audio_feedback_url} className="mt-2 w-full" />}
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">Chưa có lịch sử làm bài kiểm tra nào</div>
                )}
            </Panel>
        </div>
    );
}
