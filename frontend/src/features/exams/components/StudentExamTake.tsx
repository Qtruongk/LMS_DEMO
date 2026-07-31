import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PrimaryButton } from '../../../components/shared/ui';
import { ClockIcon, CheckCircleIcon } from '../../../components/shared/icons';
import { ExamBadgeIcon, FlagIcon } from './ExamIcons';
import type { ExamMedia, OnlineExam, ProctoringLog, QuestionItem, StudentAnswer } from '../types';
import { KaTeXRenderer } from './KaTeXRenderer';

type StudentExamTakeProps = {
    exam: OnlineExam;
    questions: QuestionItem[];
    submission: {
        id: number;
        answers?: Record<number, StudentAnswer>;
        start_time?: string;
    };
    onAutosave: (subId: number, answers: Record<number, StudentAnswer>, logs?: ProctoringLog[]) => Promise<void>;
    onSubmitExam: (subId: number, answers: Record<number, StudentAnswer>, logs?: ProctoringLog[]) => Promise<void>;
    onExit: () => void;
};

const manualTypes = new Set(['essay', 'writing', 'speaking', 'mindmap']);

const questionTypeLabel: Record<QuestionItem['type'], string> = {
    single_choice: 'Chọn 1 đáp án',
    multiple_choice: 'Chọn nhiều đáp án',
    true_false: 'Đúng / Sai',
    matching: 'Ghép cặp',
    ordering: 'Sắp xếp câu',
    drag_drop: 'Kéo thả',
    fill_blank: 'Điền từ',
    mindmap: 'Mindmap',
    speaking: 'Nói',
    writing: 'Viết',
    essay: 'Tự luận',
};

function shuffleOptions<T>(items: T[], enabled: boolean) {
    if (!enabled) return items;
    return [...items].sort(() => Math.random() - 0.5);
}

function formatTime(seconds: number) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function answerCount(answers: Record<number, StudentAnswer>) {
    return Object.values(answers).filter((value) => {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value) return Object.values(value).some(Boolean);
        return String(value || '').trim().length > 0;
    }).length;
}

export function StudentExamTake({
    exam,
    questions,
    submission,
    onAutosave,
    onSubmitExam,
    onExit,
}: StudentExamTakeProps) {
    const workspaceRef = useRef<HTMLDivElement | null>(null);
    const [answers, setAnswers] = useState<Record<number, StudentAnswer>>(submission.answers || {});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [logs, setLogs] = useState<ProctoringLog[]>([]);
    const [focusWarnings, setFocusWarnings] = useState(0);
    const [lastSavedAt, setLastSavedAt] = useState<string>('');

    const orderedQuestions = useMemo(
        () => shuffleOptions(questions, exam.shuffle_questions),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [exam.id]
    );

    const currentQuestion = orderedQuestions[currentIndex];
    const progress = orderedQuestions.length ? Math.round((answerCount(answers) / orderedQuestions.length) * 100) : 0;
    const manualQuestionCount = orderedQuestions.filter((q) => manualTypes.has(q.type)).length;

    const appendLog = (type: ProctoringLog['type'], detail?: string, questionId?: number) => {
        setLogs((prev) => [
            ...prev,
            {
                at: new Date().toISOString(),
                type,
                detail,
                question_id: questionId,
            },
        ].slice(-80));
    };

    const requestFullscreen = async () => {
        try {
            if (workspaceRef.current?.requestFullscreen && !document.fullscreenElement) {
                await workspaceRef.current.requestFullscreen();
            }
            setIsFullscreen(true);
            appendLog('fullscreen_enter', 'Học sinh bật chế độ toàn màn hình');
        } catch {
            appendLog('fullscreen_exit', 'Trình duyệt chặn toàn màn hình, hệ thống vẫn ghi nhận');
        }
    };

    useEffect(() => {
        requestFullscreen();
        const onFullscreenChange = () => {
            const active = !!document.fullscreenElement;
            setIsFullscreen(active);
            appendLog(active ? 'fullscreen_enter' : 'fullscreen_exit', active ? 'Đang ở toàn màn hình' : 'Học sinh thoát toàn màn hình');
            if (!active) setFocusWarnings((count) => count + 1);
        };
        const onVisibilityChange = () => {
            const hidden = document.hidden;
            appendLog(hidden ? 'visibility_hidden' : 'visibility_visible', hidden ? 'Học sinh rời tab/cửa sổ bài làm' : 'Học sinh quay lại bài làm');
            if (hidden) setFocusWarnings((count) => count + 1);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    window.clearInterval(timer);
                    appendLog('auto_submit', 'Hết thời gian, hệ thống tự động nộp bài');
                    void handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [answers]);

    useEffect(() => {
        const timer = window.setInterval(async () => {
            await onAutosave(submission.id, answers, logs);
            setLastSavedAt(new Date().toLocaleTimeString('vi-VN'));
        }, 15000);
        return () => window.clearInterval(timer);
    }, [answers, logs, onAutosave, submission.id]);

    const updateAnswer = (question: QuestionItem, value: StudentAnswer, detail: string) => {
        if (!question.id) return;
        setAnswers((prev) => ({ ...prev, [question.id!]: value }));
        appendLog('answer_change', detail, question.id);
    };

    const onSelectOption = (question: QuestionItem, optionId: string, multiple = false) => {
        if (!question.id) return;
        const prev = answers[question.id];
        if (multiple) {
            const arr = Array.isArray(prev) ? prev : [];
            const next = arr.includes(optionId) ? arr.filter((id) => id !== optionId) : [...arr, optionId];
            updateAnswer(question, next, `Cập nhật lựa chọn: ${next.join(', ') || 'bỏ chọn'}`);
        } else {
            updateAnswer(question, optionId, `Chọn đáp án ${optionId}`);
        }
    };

    const handleSubmit = async (auto = false) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const finalLogs: ProctoringLog[] = [
            ...logs,
            {
                at: new Date().toISOString(),
                type: auto ? 'auto_submit' : 'manual_submit',
                detail: auto ? 'Tự động nộp khi hết giờ' : 'Học sinh chủ động nộp bài',
            },
        ];
        await onSubmitExam(submission.id, answers, finalLogs);
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
        setIsSubmitting(false);
        onExit();
    };

    return (
        <div ref={workspaceRef} className="min-h-screen bg-slate-950 text-slate-100">
            <div className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur md:px-6">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-500/20 text-blue-200">
                            <ExamBadgeIcon size={22} />
                        </span>
                        <div className="min-w-0">
                            <h1 className="truncate text-base font-black md:text-xl">{exam.title}</h1>
                            <p className="text-xs text-slate-400">{exam.subject || 'Bài kiểm tra'} • Lượt làm #{submission.id} • {manualQuestionCount} câu cần giáo viên chấm</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-black ${timeLeft < 300 ? 'bg-red-500 text-white' : 'bg-white/10 text-slate-100'}`}>
                            <ClockIcon size={15} /> {formatTime(timeLeft)}
                        </span>
                        <button
                            type="button"
                            onClick={requestFullscreen}
                            className={`rounded-2xl px-3 py-2 text-xs font-bold ${isFullscreen ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-100'}`}
                        >
                            {isFullscreen ? 'Đang toàn màn hình' : 'Bật toàn màn hình'}
                        </button>
                        <PrimaryButton onClick={() => setShowSubmitConfirm(true)} disabled={isSubmitting} className="h-10 bg-emerald-600 px-5 text-xs font-black hover:bg-emerald-700">
                            Nộp bài
                        </PrimaryButton>
                    </div>
                </div>
            </div>

            <main className="mx-auto grid max-w-7xl gap-4 p-4 md:grid-cols-[280px_minmax(0,1fr)] md:p-6">
                <aside className="space-y-4 md:sticky md:top-24 md:self-start">
                    <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl">
                        <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-300">
                            <span>Tiến độ làm bài</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="mt-4 grid grid-cols-5 gap-2 md:grid-cols-4">
                            {orderedQuestions.map((question, index) => {
                                const done = question.id ? !!answers[question.id] && String(answers[question.id]).length > 0 : false;
                                return (
                                    <button
                                        key={question.id || index}
                                        type="button"
                                        onClick={() => {
                                            setCurrentIndex(index);
                                            appendLog('question_focus', `Mở câu ${index + 1}`, question.id);
                                        }}
                                        className={`h-10 rounded-xl text-xs font-black transition ${index === currentIndex ? 'bg-blue-500 text-white ring-2 ring-blue-200' : done ? 'bg-emerald-500/20 text-emerald-100' : 'bg-white/10 text-slate-300 hover:bg-white/15'}`}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs text-amber-50">
                        <div className="mb-2 flex items-center gap-2 font-black"><FlagIcon size={16} /> Giám sát hành vi</div>
                        <p>Không chuyển tab, không thoát toàn màn hình. Mọi thao tác chọn câu, đổi đáp án, rời tab đều được ghi log.</p>
                        <div className="mt-3 rounded-2xl bg-slate-950/40 p-3">
                            <b>Cảnh báo:</b> {focusWarnings} lần • <b>Autosave:</b> {lastSavedAt || 'đang chờ'}
                        </div>
                    </section>
                </aside>

                <section className="min-w-0 space-y-4">
                    {exam.instructions && (
                        <div className="rounded-3xl border border-blue-300/20 bg-blue-500/10 p-4 text-sm text-blue-50">
                            <b className="mb-1 block">Hướng dẫn làm bài</b>
                            {exam.instructions}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {currentQuestion && (
                            <QuestionCard
                                key={currentQuestion.id || currentIndex}
                                index={currentIndex}
                                total={orderedQuestions.length}
                                question={currentQuestion}
                                answer={currentQuestion.id ? answers[currentQuestion.id] : undefined}
                                shuffleOptionsEnabled={exam.shuffle_options}
                                onSelectOption={onSelectOption}
                                onUpdateAnswer={updateAnswer}
                            />
                        )}
                    </AnimatePresence>

                    <div className="flex flex-col-reverse justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row">
                        <button
                            type="button"
                            disabled={currentIndex === 0}
                            onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                            className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-200 disabled:opacity-40"
                        >
                            Câu trước
                        </button>
                        <button
                            type="button"
                            disabled={currentIndex >= orderedQuestions.length - 1}
                            onClick={() => setCurrentIndex((index) => Math.min(orderedQuestions.length - 1, index + 1))}
                            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-40"
                        >
                            Câu tiếp theo
                        </button>
                    </div>
                </section>
            </main>

            <AnimatePresence>
                {showSubmitConfirm && (
                    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
                        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-200"><CheckCircleIcon size={28} /></div>
                            <h2 className="text-xl font-black">Xác nhận nộp bài?</h2>
                            <p className="mt-2 text-sm text-slate-300">Bạn đã hoàn thành {answerCount(answers)}/{orderedQuestions.length} câu. Sau khi nộp, phần trắc nghiệm được tự chấm và phần tự luận/nói/viết sẽ chờ giáo viên chấm.</p>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowSubmitConfirm(false)} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold">Xem lại</button>
                                <PrimaryButton onClick={() => handleSubmit(false)} disabled={isSubmitting} className="h-10 bg-emerald-600 px-5 text-xs font-black hover:bg-emerald-700">
                                    {isSubmitting ? 'Đang nộp...' : 'Nộp bài ngay'}
                                </PrimaryButton>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function QuestionCard({
    index,
    total,
    question,
    answer,
    shuffleOptionsEnabled,
    onSelectOption,
    onUpdateAnswer,
}: {
    index: number;
    total: number;
    question: QuestionItem;
    answer?: StudentAnswer;
    shuffleOptionsEnabled: boolean;
    onSelectOption: (question: QuestionItem, optionId: string, multiple?: boolean) => void;
    onUpdateAnswer: (question: QuestionItem, value: StudentAnswer, detail: string) => void;
}) {
    const options = useMemo(() => shuffleOptions(question.options || [], shuffleOptionsEnabled), [question.options, shuffleOptionsEnabled]);
    const selectedList = Array.isArray(answer) ? answer : typeof answer === 'string' && answer ? [answer] : [];

    const moveOrderingItem = (optionId: string) => {
        const current = Array.isArray(answer) ? answer : [];
        const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
        onUpdateAnswer(question, next, `Sắp xếp: ${next.join(' → ')}`);
    };

    return (
        <motion.article
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl"
        >
            <div className="border-b border-white/10 bg-white/[0.04] p-5 md:p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide text-blue-200">
                    <span className="rounded-full bg-blue-500/20 px-3 py-1">Câu {index + 1}/{total}</span>
                    <span className="rounded-full bg-purple-500/20 px-3 py-1">{questionTypeLabel[question.type]}</span>
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1">{question.points || 1} điểm</span>
                </div>
                <div className="text-lg font-bold leading-relaxed text-white md:text-2xl">
                    <KaTeXRenderer content={question.question_text} />
                </div>
                <MediaStrip media={question.media} />
            </div>

            <div className="space-y-4 p-5 md:p-6">
                {['single_choice', 'multiple_choice', 'true_false', 'matching'].includes(question.type) && (
                    <div className="grid gap-3">
                        {options.map((opt) => {
                            const isSelected = selectedList.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => onSelectOption(question, opt.id, question.type === 'multiple_choice')}
                                    className={`group flex items-center gap-4 rounded-3xl border p-4 text-left transition ${isSelected ? 'border-blue-300 bg-blue-500/20 text-white shadow-lg shadow-blue-950/40' : 'border-white/10 bg-white/[0.04] text-slate-100 hover:border-blue-300/60 hover:bg-blue-500/10'}`}
                                >
                                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-black ${isSelected ? 'bg-blue-500 text-white' : 'bg-white/10 text-slate-200 group-hover:bg-blue-500/30'}`}>{opt.id}</span>
                                    <span className="min-w-0 flex-1"><KaTeXRenderer content={opt.text} /></span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {question.type === 'fill_blank' && (
                    <input
                        value={typeof answer === 'string' ? answer : ''}
                        onChange={(e) => onUpdateAnswer(question, e.target.value, `Điền từ: ${e.target.value}`)}
                        placeholder="Nhập câu trả lời ngắn của bạn..."
                        className="h-14 w-full rounded-3xl border border-white/10 bg-white/[0.06] px-5 text-base font-bold text-white outline-none ring-blue-400 transition placeholder:text-slate-500 focus:ring-2"
                    />
                )}

                {['ordering', 'drag_drop'].includes(question.type) && (
                    <div className="grid gap-4">
                        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Chạm từng thẻ theo thứ tự đúng</p>
                            <div className="flex flex-wrap gap-2">
                                {options.map((opt) => (
                                    <button key={opt.id} type="button" onClick={() => moveOrderingItem(opt.id)} className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500/30">
                                        {opt.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-3xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                            <b>Thứ tự đã chọn:</b> {selectedList.length ? selectedList.join(' → ') : 'Chưa chọn'}
                        </div>
                    </div>
                )}

                {['essay', 'writing', 'speaking', 'mindmap'].includes(question.type) && (
                    <div className="grid gap-4">
                        <textarea
                            value={typeof answer === 'string' ? answer : ''}
                            onChange={(e) => onUpdateAnswer(question, e.target.value, `Nhập tự luận ${e.target.value.length} ký tự`)}
                            rows={question.type === 'speaking' ? 4 : 9}
                            placeholder={question.type === 'speaking' ? 'Ghi chú nội dung nói hoặc dán link audio...' : question.type === 'mindmap' ? 'Mô tả mindmap theo nhánh: Chủ đề > Nhánh 1 > Ý nhỏ...' : 'Nhập bài làm của bạn tại đây...'}
                            className="w-full rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-base leading-7 text-white outline-none ring-blue-400 transition placeholder:text-slate-500 focus:ring-2"
                        />
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/[0.04] p-5 text-center text-sm text-slate-300 hover:border-blue-300/60 hover:bg-blue-500/10">
                            <span className="font-black text-white">Đính kèm ảnh / audio / video câu trả lời</span>
                            <span className="mt-1 text-xs">Demo UX: chọn tệp để học sinh hiểu luồng nộp media</span>
                            <input type="file" accept="image/*,audio/*,video/*" className="hidden" onChange={(e) => onUpdateAnswer(question, `${typeof answer === 'string' ? answer : ''}\n[Đính kèm: ${e.target.files?.[0]?.name || 'media'}]`, 'Đính kèm media câu trả lời')} />
                        </label>
                    </div>
                )}
            </div>
        </motion.article>
    );
}

function MediaStrip({ media }: { media?: ExamMedia[] }) {
    if (!media?.length) return null;
    return (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {media.map((item, index) => (
                <div key={`${item.url}-${index}`} className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
                    {item.type === 'image' && <img src={item.url} alt={item.name || 'exam media'} className="h-48 w-full object-cover" />}
                    {item.type === 'audio' && <audio controls src={item.url} className="w-full p-3" />}
                    {item.type === 'video' && <video controls src={item.url} className="max-h-64 w-full" />}
                    <div className="px-4 py-2 text-xs font-bold text-slate-300">{item.name || 'Tệp đính kèm'}</div>
                </div>
            ))}
        </div>
    );
}
