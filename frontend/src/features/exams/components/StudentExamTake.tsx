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

const questionTypeLabel: Record<string, string> = {
    single_choice: 'Một đáp án',
    multiple_choice: 'Nhiều đáp án',
    true_false: 'Đúng / Sai',
    matching: 'Ghép cặp',
    ordering: 'Sắp xếp',
    drag_drop: 'Kéo thả',
    fill_blank: 'Điền đáp án',
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
    const safeSeconds = Math.max(0, seconds);
    const min = Math.floor(safeSeconds / 60);
    const sec = safeSeconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function hasAnswer(value: StudentAnswer | undefined) {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value) return Object.values(value).some(Boolean);
    return String(value || '').trim().length > 0;
}

function answerCount(answers: Record<number, StudentAnswer>) {
    return Object.values(answers).filter(hasAnswer).length;
}

function answerPreview(answer?: StudentAnswer) {
    if (!hasAnswer(answer)) return 'Chưa trả lời';
    if (Array.isArray(answer)) return answer.join(' → ');
    if (typeof answer === 'object' && answer) return Object.entries(answer).map(([key, value]) => `${key}: ${value}`).join(', ');
    return String(answer);
}

export function StudentExamTake({
    exam,
    questions,
    submission,
    onAutosave,
    onSubmitExam,
    onExit,
}: StudentExamTakeProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, StudentAnswer>>(submission.answers || {});
    const [logs, setLogs] = useState<ProctoringLog[]>([]);
    const [lastSavedAt, setLastSavedAt] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [focusWarnings, setFocusWarnings] = useState(0);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [showPalette, setShowPalette] = useState(false);
    const [timeLeft, setTimeLeft] = useState((exam.duration_minutes || 45) * 60);
    const workspaceRef = useRef<HTMLDivElement>(null);
    const suppressFocusWarningUntil = useRef(0);

    const orderedQuestions = useMemo(() => {
        const base = exam.shuffle_questions ? shuffleOptions(questions, true) : questions;
        return base;
    }, [questions, exam.shuffle_questions]);

    const currentQuestion = orderedQuestions[currentIndex];
    const answeredCount = answerCount(answers);
    const progress = orderedQuestions.length ? Math.round((answeredCount / orderedQuestions.length) * 100) : 0;
    const manualQuestionCount = orderedQuestions.filter((q) => manualTypes.has(q.type)).length;
    const unansweredQuestions = orderedQuestions.filter((q) => q.id && !hasAnswer(answers[q.id]));
    const isDangerTime = timeLeft < 300;

    const appendLog = (type: ProctoringLog['type'], detail?: string, questionId?: number) => {
        setLogs((prev) => [
            ...prev,
            {
                at: new Date().toISOString(),
                type,
                detail,
                question_id: questionId,
            },
        ].slice(-100));
    };

    const requestFullscreen = async () => {
        try {
            suppressFocusWarningUntil.current = Date.now() + 1800;
            await workspaceRef.current?.requestFullscreen?.();
            setIsFullscreen(Boolean(document.fullscreenElement));
            appendLog('fullscreen_enter', 'Học sinh bật toàn màn hình');
        } catch {
            suppressFocusWarningUntil.current = 0;
            appendLog('fullscreen_exit', 'Trình duyệt không cho phép bật toàn màn hình');
        }
    };

    useEffect(() => {
        const tick = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    window.clearInterval(tick);
                    void handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(tick);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const autosave = window.setInterval(async () => {
            await onAutosave(submission.id, answers, logs).catch(() => undefined);
            setLastSavedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
        }, 15000);
        return () => window.clearInterval(autosave);
    }, [answers, logs, onAutosave, submission.id]);

    useEffect(() => {
        const onFullscreenChange = () => {
            const active = Boolean(document.fullscreenElement);
            setIsFullscreen(active);
            if (!active && Date.now() > suppressFocusWarningUntil.current) {
                setFocusWarnings((count) => count + 1);
                appendLog('fullscreen_exit', 'Học sinh thoát toàn màn hình');
            }
        };
        const onVisibilityChange = () => {
            const hidden = document.hidden;
            if (hidden && Date.now() > suppressFocusWarningUntil.current) {
                setFocusWarnings((count) => count + 1);
                appendLog('visibility_hidden', 'Học sinh chuyển tab hoặc ẩn trình duyệt');
            }
        };
        window.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            window.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, []);

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

    const goToQuestion = (index: number) => {
        const question = orderedQuestions[index];
        setCurrentIndex(index);
        setShowPalette(false);
        appendLog('question_focus', `Mở câu ${index + 1}`, question?.id);
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

    const nextQuestion = () => goToQuestion(Math.min(currentIndex + 1, orderedQuestions.length - 1));
    const previousQuestion = () => goToQuestion(Math.max(currentIndex - 1, 0));

    return (
        <div ref={workspaceRef} className="min-h-screen bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_45%,#ecfeff_100%)] text-slate-900">
            <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-3 py-3 shadow-lg shadow-blue-100/60 backdrop-blur-xl md:px-6">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                            <ExamBadgeIcon size={22} />
                        </span>
                        <div className="min-w-0">
                            <h1 className="truncate text-base font-black md:text-xl">{exam.title}</h1>
                            <p className="truncate text-xs text-slate-600">{exam.subject || 'Bài kiểm tra'} • Lượt làm #{submission.id} • {manualQuestionCount} câu cần giáo viên chấm</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
                        <span className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl px-3 text-xs font-black ${isDangerTime ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'bg-slate-100 text-slate-800 ring-1 ring-slate-200'}`}>
                            <ClockIcon size={15} /> {formatTime(timeLeft)}
                        </span>
                        <button
                            type="button"
                            onClick={requestFullscreen}
                            className={`h-10 rounded-2xl px-3 text-xs font-bold transition ${isFullscreen ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'}`}
                        >
                            {isFullscreen ? 'Toàn màn hình' : 'Bật tập trung'}
                        </button>
                        <PrimaryButton onClick={() => setShowSubmitConfirm(true)} disabled={isSubmitting} className="h-10 bg-emerald-600 px-5 text-xs font-black text-white hover:bg-emerald-700">
                            Nộp bài
                        </PrimaryButton>
                    </div>
                </div>
                <div className="mx-auto mt-3 max-w-7xl">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-600">
                        <span>Tiến độ làm bài</span>
                        <span>{answeredCount}/{orderedQuestions.length} câu • {progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <motion.div className="h-full rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-300" initial={false} animate={{ width: `${progress}%` }} />
                    </div>
                </div>
            </div>

            <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 pb-28 md:grid-cols-[290px_minmax(0,1fr)] md:px-6 md:pb-8">
                <aside className="hidden space-y-4 md:block">
                    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl shadow-blue-100/70 backdrop-blur">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-slate-600">Danh sách câu</p>
                                <h2 className="font-black text-slate-900">Điều hướng nhanh</h2>
                            </div>
                            <span className="rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{progress}%</span>
                        </div>
                        <QuestionGrid
                            questions={orderedQuestions}
                            answers={answers}
                            currentIndex={currentIndex}
                            onPick={goToQuestion}
                        />
                    </section>

                    <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-xl shadow-blue-100/70">
                        <div className="mb-2 flex items-center gap-2 font-black"><FlagIcon size={16} /> Giám sát hành vi</div>
                        <p className="leading-5">Không chuyển tab, không thoát toàn màn hình. Mọi thao tác chọn câu, đổi đáp án, rời tab đều được ghi log để giáo viên kiểm tra.</p>
                        <div className="mt-3 rounded-2xl bg-white/80 p-3 leading-6">
                            <b>Cảnh báo:</b> {focusWarnings} lần<br />
                            <b>Autosave:</b> {lastSavedAt || 'đang chờ'}
                        </div>
                    </section>
                </aside>

                <section className="min-w-0 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <InfoTile label="Câu hiện tại" value={`${currentIndex + 1}/${orderedQuestions.length}`} tone="blue" />
                        <InfoTile label="Đã trả lời" value={`${answeredCount} câu`} tone="emerald" />
                        <InfoTile label="Còn lại" value={`${unansweredQuestions.length} câu`} tone="amber" />
                    </div>

                    {exam.instructions && (
                        <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900 shadow-lg shadow-blue-100/70">
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

                    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            type="button"
                            onClick={previousQuestion}
                            disabled={currentIndex === 0}
                            className="h-12 rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Câu trước
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowPalette(true)}
                            className="h-12 rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-900 transition hover:bg-slate-100 md:hidden"
                        >
                            Mở danh sách câu
                        </button>
                        {currentIndex < orderedQuestions.length - 1 ? (
                            <PrimaryButton onClick={nextQuestion} className="h-12 bg-blue-600 px-6 text-sm font-black text-white hover:bg-blue-700">
                                Câu tiếp theo
                            </PrimaryButton>
                        ) : (
                            <PrimaryButton onClick={() => setShowSubmitConfirm(true)} className="h-12 bg-emerald-600 px-6 text-sm font-black text-white hover:bg-emerald-700">
                                Hoàn thành & nộp bài
                            </PrimaryButton>
                        )}
                    </div>
                </section>
            </main>

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 shadow-2xl shadow-blue-100 backdrop-blur md:hidden">
                <div className="mx-auto flex max-w-7xl items-center gap-2">
                    <button type="button" onClick={() => setShowPalette(true)} className="h-11 flex-1 rounded-2xl bg-slate-100 text-xs font-black text-slate-900">
                        {answeredCount}/{orderedQuestions.length} câu
                    </button>
                    <PrimaryButton onClick={() => setShowSubmitConfirm(true)} disabled={isSubmitting} className="h-11 flex-1 bg-emerald-600 text-xs font-black text-white hover:bg-emerald-700">
                        Nộp bài
                    </PrimaryButton>
                </div>
            </div>

            <AnimatePresence>
                {showPalette && (
                    <div className="fixed inset-0 z-40 bg-slate-900/35 p-4 backdrop-blur md:hidden">
                        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="mx-auto mt-8 max-w-md rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-600">Danh sách câu</p>
                                    <h2 className="text-lg font-black text-slate-900">Chọn câu muốn làm</h2>
                                </div>
                                <button type="button" onClick={() => setShowPalette(false)} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-900">Đóng</button>
                            </div>
                            <QuestionGrid questions={orderedQuestions} answers={answers} currentIndex={currentIndex} onPick={goToQuestion} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSubmitConfirm && (
                    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/35 p-4 backdrop-blur">
                        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
                            <div className="border-b border-slate-200 bg-white p-5">
                                <div className="flex items-center gap-3">
                                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><CheckCircleIcon size={24} /></span>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900">Xác nhận nộp bài</h2>
                                        <p className="text-sm text-slate-600">Kiểm tra nhanh trước khi gửi cho giảng viên.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 p-5">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <InfoTile label="Đã làm" value={`${answeredCount}/${orderedQuestions.length}`} tone="emerald" />
                                    <InfoTile label="Chưa làm" value={`${unansweredQuestions.length}`} tone="amber" />
                                    <InfoTile label="Cảnh báo" value={`${focusWarnings} lần`} tone="red" />
                                </div>
                                {unansweredQuestions.length > 0 && (
                                    <div className="max-h-36 overflow-auto rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                        <b>Câu chưa trả lời:</b> {unansweredQuestions.map((q) => orderedQuestions.indexOf(q) + 1).join(', ')}
                                    </div>
                                )}
                                <div className="max-h-40 overflow-auto rounded-3xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
                                    <b className="mb-2 block text-slate-900">Tóm tắt câu hiện tại:</b>
                                    {orderedQuestions.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((question, idx) => (
                                        <div key={question.id || idx} className="flex justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
                                            <span className="font-bold">Câu {orderedQuestions.indexOf(question) + 1}</span>
                                            <span className="truncate text-right">{question.id ? answerPreview(answers[question.id]) : 'Chưa trả lời'}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                    <button type="button" onClick={() => setShowSubmitConfirm(false)} className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-800 hover:bg-slate-100">
                                        Xem lại bài
                                    </button>
                                    <PrimaryButton disabled={isSubmitting} onClick={() => handleSubmit(false)} className="h-11 bg-emerald-600 px-6 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60">
                                        {isSubmitting ? 'Đang nộp...' : 'Xác nhận nộp bài'}
                                    </PrimaryButton>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function InfoTile({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'emerald' | 'amber' | 'red' }) {
    const toneClass = {
        blue: 'border-blue-200 bg-blue-50 text-blue-800',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        amber: 'border-amber-200 bg-amber-50 text-amber-800',
        red: 'border-red-200 bg-red-50 text-red-800',
    }[tone];
    return (
        <div className={`rounded-3xl border p-4 ${toneClass}`}>
            <p className="text-[11px] font-black uppercase tracking-wide opacity-70">{label}</p>
            <p className="mt-1 text-lg font-black">{value}</p>
        </div>
    );
}

function QuestionGrid({
    questions,
    answers,
    currentIndex,
    onPick,
}: {
    questions: QuestionItem[];
    answers: Record<number, StudentAnswer>;
    currentIndex: number;
    onPick: (index: number) => void;
}) {
    return (
        <div className="grid grid-cols-5 gap-2">
            {questions.map((question, index) => {
                const done = question.id ? hasAnswer(answers[question.id]) : false;
                return (
                    <button
                        key={question.id || index}
                        type="button"
                        onClick={() => onPick(index)}
                        className={`h-11 rounded-2xl text-xs font-black transition ${index === currentIndex ? 'bg-blue-600 text-white ring-2 ring-blue-200' : done ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}`}
                        aria-label={`Mở câu ${index + 1}`}
                    >
                        {index + 1}
                    </button>
                );
            })}
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
            className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-blue-100/80"
        >
            <div className="border-b border-slate-200 bg-white p-5 md:p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">Câu {index + 1}/{total}</span>
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700">{questionTypeLabel[question.type]}</span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">{question.points || 1} điểm</span>
                </div>
                <div className="text-lg font-bold leading-relaxed text-slate-900 md:text-2xl">
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
                                    onClick={() => onSelectOption(question, opt.id, question.type === 'multiple_choice' || question.type === 'matching')}
                                    className={`group flex min-h-16 items-center gap-4 rounded-3xl border p-4 text-left transition active:scale-[0.99] ${isSelected ? 'border-blue-300 bg-blue-50 text-blue-900 shadow-lg shadow-blue-100' : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50'}`}
                                >
                                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-black ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-blue-100'}`}>{opt.id}</span>
                                    <span className="min-w-0 flex-1"><KaTeXRenderer content={opt.text} /></span>
                                    {isSelected && <CheckCircleIcon size={18} />}
                                </button>
                            );
                        })}
                    </div>
                )}

                {question.type === 'fill_blank' && (
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wide text-slate-600">Câu trả lời ngắn</label>
                        <input
                            value={typeof answer === 'string' ? answer : ''}
                            onChange={(e) => onUpdateAnswer(question, e.target.value, `Điền từ: ${e.target.value}`)}
                            placeholder="Nhập câu trả lời ngắn của bạn..."
                            className="h-14 w-full rounded-3xl border border-slate-200 bg-white px-5 text-base font-bold text-slate-900 outline-none ring-blue-400 transition placeholder:text-slate-500 focus:ring-2"
                        />
                    </div>
                )}

                {['ordering', 'drag_drop'].includes(question.type) && (
                    <div className="grid gap-4">
                        <div className="rounded-3xl border border-slate-200 bg-white p-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-600">Chạm từng thẻ theo thứ tự đúng</p>
                            <div className="flex flex-wrap gap-2">
                                {options.map((opt) => (
                                    <button key={opt.id} type="button" onClick={() => moveOrderingItem(opt.id)} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-blue-100">
                                        {opt.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
                            <b>Thứ tự đã chọn:</b> {selectedList.length ? selectedList.join(' → ') : 'Chưa chọn'}
                        </div>
                    </div>
                )}

                {['essay', 'writing', 'speaking', 'mindmap'].includes(question.type) && (
                    <div className="grid gap-4">
                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-600">
                            <span>Khu vực nhập bài</span>
                            <span>{typeof answer === 'string' ? answer.length : 0} ký tự</span>
                        </div>
                        <textarea
                            value={typeof answer === 'string' ? answer : ''}
                            onChange={(e) => onUpdateAnswer(question, e.target.value, `Nhập tự luận ${e.target.value.length} ký tự`)}
                            rows={question.type === 'speaking' ? 4 : 10}
                            placeholder={question.type === 'speaking' ? 'Ghi chú nội dung nói hoặc dán link audio...' : question.type === 'mindmap' ? 'Mô tả mindmap theo nhánh: Chủ đề > Nhánh 1 > Ý nhỏ...' : 'Nhập bài làm của bạn tại đây...'}
                            className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-base leading-7 text-slate-900 outline-none ring-blue-400 transition placeholder:text-slate-500 focus:ring-2"
                        />
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50">
                            <span className="font-black text-slate-900">Đính kèm ảnh / audio / video câu trả lời</span>
                            <span className="mt-1 text-xs">Chọn tệp để ghi nhận minh chứng hoặc bài nói</span>
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
                <div key={`${item.url}-${index}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                    {item.type === 'image' && <img src={item.url} alt={item.name || 'exam media'} className="h-48 w-full object-cover" />}
                    {item.type === 'audio' && <audio controls src={item.url} className="w-full p-3" />}
                    {item.type === 'video' && <video controls src={item.url} className="max-h-64 w-full" />}
                    <div className="px-4 py-2 text-xs font-bold text-slate-700">{item.name || 'Tệp đính kèm'}</div>
                </div>
            ))}
        </div>
    );
}
