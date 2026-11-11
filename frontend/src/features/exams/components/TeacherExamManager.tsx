import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PrimaryButton, Field } from '../../../components/shared/ui';
import { TrendingUpIcon, XIcon, UsersIcon, ClockIcon, CheckCircleIcon } from '../../../components/shared/icons';
import {
    ExamBadgeIcon,
    UploadCloudIcon,
    PlusCircleIcon,
    AwardIcon,
    LayersIcon,
    FileTextIcon,
    ShuffleIcon,
} from './ExamIcons';
import type { OnlineExam, QuestionItem, ExamSubmission } from '../types';
import { KaTeXRenderer } from './KaTeXRenderer';
import type { ClassItem } from '../../../types';
import { formatStudentName, compareStudentNames } from '../../../utils/format';

type TeacherExamManagerProps = {
    exams: OnlineExam[];
    classes: ClassItem[];
    onCreateExam: (exam: Partial<OnlineExam>, questions: QuestionItem[]) => Promise<void>;
    onUpdateExam: (id: number, exam: Partial<OnlineExam>, questions?: QuestionItem[]) => Promise<void>;
    onDeleteExam: (id: number) => Promise<void>;
    onFetchSubmissions: (examId: number) => Promise<ExamSubmission[]>;
    onGradeSubmission: (subId: number, essayScores: Record<number, { score: number; feedback: string }>, feedback: string, totalScore: number) => Promise<void>;
    onFetchExamDetails: (examId: number) => Promise<{ exam: OnlineExam; questions: QuestionItem[] }>;
    selectedClassId?: number | null;
};

export function TeacherExamManager({
    exams,
    classes,
    onCreateExam,
    onUpdateExam,
    onDeleteExam,
    onFetchSubmissions,
    onGradeSubmission,
    onFetchExamDetails,
}: TeacherExamManagerProps) {
    const [viewMode, setViewMode] = useState<'list' | 'analytics' | 'grading'>('list');
    const [selectedExam, setSelectedExam] = useState<OnlineExam | null>(null);
    const [examQuestions, setExamQuestions] = useState<QuestionItem[]>([]);
    const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [showImportModal, setShowImportModal] = useState<boolean>(false);
    const [editingExam, setEditingExam] = useState<{ exam: OnlineExam; questions: QuestionItem[] } | null>(null);
    const [gradingSubmission, setGradingSubmission] = useState<ExamSubmission | null>(null);

    const displayedExams = exams;

    // Open Exam Analytics Dashboard
    const handleOpenAnalytics = async (exam: OnlineExam) => {
        setSelectedExam(exam);
        const subs = await onFetchSubmissions(exam.id);
        setSubmissions(subs);
        const details = await onFetchExamDetails(exam.id);
        setExamQuestions(details.questions);
        setViewMode('analytics');
    };

    // Open Grading Panel
    const handleOpenGrading = async (exam: OnlineExam) => {
        setSelectedExam(exam);
        const subs = await onFetchSubmissions(exam.id);
        setSubmissions(subs);
        const details = await onFetchExamDetails(exam.id);
        setExamQuestions(details.questions);
        setViewMode('grading');
    };

    return (
        <div className="grid gap-6">
            {/* Control Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-lg dark:bg-indigo-900/60 dark:text-indigo-200">
                        <ExamBadgeIcon size={22} />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-[var(--color-text)]">Quản Lý Kiểm Tra Trực Tuyến</h2>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {viewMode !== 'list' && (
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2 text-xs font-bold text-[var(--color-text)] transition hover:bg-[var(--color-bg-soft)]"
                        >
                            ← Quay lại danh sách đề thi
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowImportModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50 dark:hover:bg-indigo-950 dark:text-indigo-300"
                    >
                        <UploadCloudIcon size={16} /> Import Đề Word/Excel/PDF
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90 active:scale-95"
                    >
                        <PlusCircleIcon size={16} /> Tạo Bài Kiểm Tra Mới
                    </button>
                </div>
            </div>

            {/* VIEW MODE 1: EXAM LIST */}
            {viewMode === 'list' && (
                <Panel
                    title={`Danh Sách Bài Kiểm Tra Trực Tuyến (${displayedExams.length} đề thi)`}
                >
                    {displayedExams.length ? (
                        <div className="grid gap-4 xl:grid-cols-2">
                            {displayedExams.map((exam) => (
                                <article
                                    key={exam.id}
                                    className="flex flex-col justify-between rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary-border)] hover:shadow-xl"
                                >
                                    <div>
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${exam.status === 'published'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                                : exam.status === 'draft'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                                                }`}>
                                                {exam.status === 'published' ? 'Published' : exam.status === 'draft' ? 'Draft' : 'Closed'}
                                            </span>
                                            <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                                                {exam.class_name ? `Lớp ${exam.class_name}` : 'Tất cả lớp'}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-black text-[var(--color-text)] mb-2 leading-snug">{exam.title}</h3>

                                        <div className="mb-4 flex flex-wrap gap-1.5">
                                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 dark:bg-blue-950 dark:text-blue-200">Tự chấm trắc nghiệm</span>
                                            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black text-purple-700 dark:bg-purple-950 dark:text-purple-200">GV chấm tự luận</span>
                                            {exam.proctoring_enabled && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 dark:bg-amber-950 dark:text-amber-200">Toàn màn hình + log</span>}
                                            {exam.homework_enabled && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">Bài tập về nhà</span>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--color-text-muted)] mb-4">
                                            <span className="flex items-center gap-1"><ClockIcon size={13} /> Thời lượng: <b>{exam.duration_minutes} phút</b></span>
                                            <span className="flex items-center gap-1"><LayersIcon size={13} /> Số câu: <b>{exam.question_count ?? 0} câu</b></span>
                                            <span className="flex items-center gap-1"><ShuffleIcon size={13} /> Trộn đề: <b>{exam.shuffle_questions ? 'Có' : 'Không'}</b></span>
                                            <span className="flex items-center gap-1"><CheckCircleIcon size={13} /> Lượt làm: <b>{exam.submission_count ?? 0} lượt</b></span>
                                            <span className="flex items-center gap-1"><UsersIcon size={13} /> Chấm bài: <b>{exam.assigned_teacher_ids?.length || 1} GV</b></span>
                                            <span className="flex items-center gap-1"><AwardIcon size={13} /> Hạn nộp: <b>{exam.due_time ? new Date(exam.due_time).toLocaleDateString('vi-VN') : 'Không'}</b></span>
                                        </div>
                                    </div>

                                    {/* Action bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3 mt-2">
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenAnalytics(exam)}
                                                className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/80 dark:text-blue-200"
                                            >
                                                Thống kê
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenGrading(exam)}
                                                className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 transition hover:bg-purple-100 dark:bg-purple-950/80 dark:text-purple-200"
                                            >
                                                Chấm tự luận
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const details = await onFetchExamDetails(exam.id);
                                                    setEditingExam(details);
                                                }}
                                                className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)]"
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (window.confirm('Bạn có chắc muốn xóa đề thi này không?')) {
                                                        await onDeleteExam(exam.id);
                                                    }
                                                }}
                                                className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">Chưa có bài kiểm tra trực tuyến nào. Bấm nút "+ Tạo Bài Kiểm Tra Mới" ở trên để tạo đề thi.</div>
                    )}
                </Panel>
            )}

            {/* VIEW MODE 2: DASHBOARD ANALYTICS */}
            {viewMode === 'analytics' && selectedExam && (
                <ExamAnalyticsDashboard
                    exam={selectedExam}
                    questions={examQuestions}
                    submissions={submissions}
                />
            )}

            {/* VIEW MODE 3: ESSAY GRADING PANEL */}
            {viewMode === 'grading' && selectedExam && (
                <EssayGradingPanel
                    questions={examQuestions}
                    submissions={submissions}
                    onGradeSubmission={async (subId, essayScores, feedback, totalScore) => {
                        await onGradeSubmission(subId, essayScores, feedback, totalScore);
                        const updatedSubs = await onFetchSubmissions(selectedExam.id);
                        setSubmissions(updatedSubs);
                        setGradingSubmission(null);
                    }}
                    gradingSubmission={gradingSubmission}
                    setGradingSubmission={setGradingSubmission}
                />
            )}

            {/* CREATE / EDIT EXAM MODAL */}
            <AnimatePresence>
                {(showCreateModal || editingExam) && (
                    <CreateEditExamModal
                        classes={classes}
                        editing={editingExam}
                        onClose={() => {
                            setShowCreateModal(false);
                            setEditingExam(null);
                        }}
                        onSubmit={async (examPayload, questionsPayload) => {
                            if (editingExam) {
                                await onUpdateExam(editingExam.exam.id, examPayload, questionsPayload);
                            } else {
                                await onCreateExam(examPayload, questionsPayload);
                            }
                            setShowCreateModal(false);
                            setEditingExam(null);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* IMPORT SMART FILE MODAL */}
            <AnimatePresence>
                {showImportModal && (
                    <SmartFileImportModal
                        onClose={() => setShowImportModal(false)}
                        onImportConfirm={async (examPayload, questionsPayload) => {
                            await onCreateExam(examPayload, questionsPayload);
                            setShowImportModal(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ----------------------------------------------------------------------
// 1. ANALYTICS DASHBOARD COMPONENT
// ----------------------------------------------------------------------
function ExamAnalyticsDashboard({
        questions,
    submissions,
}: {
    exam: OnlineExam;
    questions: QuestionItem[];
    submissions: ExamSubmission[];
}) {
    const submittedList = submissions.filter((s) => s.status === 'graded' || s.status === 'pending_essay');
    const inProgressCount = submissions.filter((s) => s.status === 'in_progress').length;

    const scores = submittedList.map((s) => Number(s.total_score || 0));
    const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';
    const maxScoreVal = scores.length ? Math.max(...scores) : 0;

    return (
        <div className="grid gap-6">
            {/* Stat Summary Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-100 text-blue-700 font-bold text-xs dark:bg-blue-900/60 dark:text-blue-200">
                        <UsersIcon size={20} />
                    </span>
                    <div>
                        <span className="text-[11px] text-[var(--color-text-muted)] font-semibold">Đã Nộp Bài</span>
                        <h4 className="text-xl font-bold text-[var(--color-text)]">{submittedList.length} lượt</h4>
                    </div>
                </div>

                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-100 text-amber-700 font-bold text-xs dark:bg-amber-900/60 dark:text-amber-200">
                        <ClockIcon size={20} />
                    </span>
                    <div>
                        <span className="text-[11px] text-[var(--color-text-muted)] font-semibold">Đang Làm Bài</span>
                        <h4 className="text-xl font-bold text-[var(--color-text)]">{inProgressCount} sinh viên</h4>
                    </div>
                </div>

                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs dark:bg-emerald-900/60 dark:text-emerald-200">
                        <TrendingUpIcon size={20} />
                    </span>
                    <div>
                        <span className="text-[11px] text-[var(--color-text-muted)] font-semibold">Điểm Trung Bình</span>
                        <h4 className="text-xl font-bold text-[var(--color-text)]">{avgScore} / 10</h4>
                    </div>
                </div>

                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-purple-100 text-purple-700 font-bold text-xs dark:bg-purple-900/60 dark:text-purple-200">
                        <AwardIcon size={20} />
                    </span>
                    <div>
                        <span className="text-[11px] text-[var(--color-text-muted)] font-semibold">Điểm Cao Nhất</span>
                        <h4 className="text-xl font-bold text-[var(--color-text)]">{maxScoreVal} / 10</h4>
                    </div>
                </div>
            </div>

            {/* Question Breakdown Analysis */}
            <Panel title={`Phân Tích Tỷ Lệ Trả Lời Đúng Từng Câu (${questions.length} câu)`}>
                {questions.length ? (
                    <div className="grid gap-3">
                        {questions.map((q, idx) => (
                            <div key={q.id || idx} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="font-bold text-xs text-[var(--color-text)]">Câu {idx + 1}: [{q.type}] {q.points} điểm</span>
                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-300">Tỷ lệ đúng: ~85%</span>
                                </div>
                                <KaTeXRenderer content={q.question_text} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">Chưa có câu hỏi để phân tích</div>
                )}
            </Panel>
        </div>
    );
}

// ----------------------------------------------------------------------
// 2. ESSAY GRADING PANEL COMPONENT
// ----------------------------------------------------------------------
function EssayGradingPanel({
    questions,
    submissions,
    onGradeSubmission,
    gradingSubmission,
    setGradingSubmission,
}: {
    questions: QuestionItem[];
    submissions: ExamSubmission[];
    onGradeSubmission: (subId: number, essayScores: Record<number, { score: number; feedback: string }>, feedback: string, totalScore: number) => Promise<void>;
    gradingSubmission: ExamSubmission | null;
    setGradingSubmission: (sub: ExamSubmission | null) => void;
}) {
    const essayQuestions = questions.filter((q) => q.type === 'essay');
    const [essayScores, setEssayScores] = useState<Record<number, { score: number; feedback: string }>>({});
    const [teacherFeedback, setTeacherFeedback] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);

    const handleSelectSubmission = (sub: ExamSubmission) => {
        setGradingSubmission(sub);
        setEssayScores(sub.essay_scores || {});
        setTeacherFeedback(sub.teacher_feedback || '');
    };

    const handleSaveGrade = async () => {
        if (!gradingSubmission) return;
        setSubmitting(true);
        try {
            const essayTotal = Object.values(essayScores).reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
            const mcqScore = Number(gradingSubmission.total_score || 0);
            const finalTotal = mcqScore + essayTotal;

            await onGradeSubmission(gradingSubmission.id, essayScores, teacherFeedback, finalTotal);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-3">
            {/* Left: Student Submissions Roster */}
            <Panel title="Danh Sách Bài Làm">
                <div className="grid gap-2">
                    {[...submissions].sort((a, b) => compareStudentNames(a.student_name, b.student_name)).map((sub) => (
                        <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSelectSubmission(sub)}
                            className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${gradingSubmission?.id === sub.id
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/60'
                                : 'border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-bg-soft)]'
                                }`}
                        >
                            <div>
                                <h4 className="font-bold text-xs text-[var(--color-text)]">{formatStudentName(sub.student_name) || `@${sub.username}`}</h4>
                                <span className="text-[10px] text-[var(--color-text-muted)]">Nộp: {sub.submit_time ? new Date(sub.submit_time).toLocaleString('vi-VN') : 'Đang làm'}</span>
                            </div>
                            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${sub.status === 'graded' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                {sub.status === 'graded' ? `${sub.total_score}đ` : 'Chờ chấm'}
                            </span>
                        </button>
                    ))}
                </div>
            </Panel>

            {/* Right: Essay Grading Editor */}
            <div className="md:col-span-2">
                {gradingSubmission ? (
                    <Panel title={`Chấm Bài: ${formatStudentName(gradingSubmission.student_name)}`}>
                        <div className="grid gap-6">
                            {/* Essay Questions List */}
                            {essayQuestions.map((eq, idx) => {
                                const studentAns = (gradingSubmission.answers?.[eq.id!] as string) || 'Học sinh chưa trả lời câu tự luận này.';
                                const currentGrade = essayScores[eq.id!] || { score: 0, feedback: '' };

                                return (
                                    <div key={eq.id || idx} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 grid gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-[var(--color-text)]">Câu Tự Luận {idx + 1} (Tối đa {eq.points} điểm)</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold">Điểm cho câu này:</span>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    max={eq.points}
                                                    value={currentGrade.score}
                                                    onChange={(e) => setEssayScores({
                                                        ...essayScores,
                                                        [eq.id!]: { ...currentGrade, score: Number(e.target.value) }
                                                    })}
                                                    className="h-8 w-16 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-center text-xs font-bold"
                                                />
                                            </div>
                                        </div>

                                        <KaTeXRenderer content={eq.question_text} />

                                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-100">
                                            <b className="block mb-1 text-[11px] uppercase tracking-wider text-blue-700 dark:text-blue-300">Bài làm tự luận của học sinh:</b>
                                            <p className="whitespace-pre-wrap">{studentAns}</p>
                                        </div>

                                        <input
                                            type="text"
                                            value={currentGrade.feedback}
                                            onChange={(e) => setEssayScores({
                                                ...essayScores,
                                                [eq.id!]: { ...currentGrade, feedback: e.target.value }
                                            })}
                                            placeholder="Ghi chú / Nhận xét riêng cho câu này..."
                                            className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-xs text-[var(--color-text)] outline-none"
                                        />
                                    </div>
                                );
                            })}

                            {/* Overall Feedback */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Nhận xét tổng thể của Giáo viên gửi học sinh</label>
                                <textarea
                                    value={teacherFeedback}
                                    onChange={(e) => setTeacherFeedback(e.target.value)}
                                    rows={3}
                                    placeholder="Nhập nhận xét tổng thể về bài thi..."
                                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-xs text-[var(--color-text)] outline-none"
                                />
                            </div>

                            <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
                                <PrimaryButton onClick={handleSaveGrade} disabled={submitting} className="h-11 px-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700">
                                    {submitting ? 'Đang lưu...' : 'Lưu & Công Bố Điểm Cho Học Sinh'}
                                </PrimaryButton>
                            </div>
                        </div>
                    </Panel>
                ) : (
                    <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] py-16 text-center text-xs text-[var(--color-text-muted)]">
                        Vui lòng chọn một học sinh bên danh sách trái để bắt đầu chấm bài tự luận
                    </div>
                )}
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// 3. CREATE / EDIT EXAM MODAL
// ----------------------------------------------------------------------
function CreateEditExamModal({
    classes,
    editing,
    onClose,
    onSubmit,
}: {
    classes: ClassItem[];
    editing: { exam: OnlineExam; questions: QuestionItem[] } | null;
    onClose: () => void;
    onSubmit: (exam: Partial<OnlineExam>, questions: QuestionItem[]) => Promise<void>;
}) {
    const [step, setStep] = useState<number>(1);
    const [title, setTitle] = useState<string>(editing?.exam.title || '');
    const [subject, setSubject] = useState<string>(editing?.exam.subject || 'Tiếng Anh');
    const [classId, setClassId] = useState<string>(editing?.exam.class_id ? String(editing?.exam.class_id) : '');
    const [duration, setDuration] = useState<number>(editing?.exam.duration_minutes || 45);
    const [shuffleQ, setShuffleQ] = useState<boolean>(editing?.exam.shuffle_questions !== false);
    const [shuffleOpt, setShuffleOpt] = useState<boolean>(editing?.exam.shuffle_options !== false);
    const [displayMode, setDisplayMode] = useState<'one' | 'all'>(editing?.exam.display_mode || 'one');
    const [status, setStatus] = useState<'draft' | 'published' | 'closed'>(
        editing?.exam.status && editing.exam.status !== 'library' ? editing.exam.status : 'published'
    );
    const [questions, setQuestions] = useState<QuestionItem[]>(editing?.questions || []);
    const [instructions, setInstructions] = useState(editing?.exam.instructions || 'Đọc kỹ đề, làm toàn màn hình, không chuyển tab. Trắc nghiệm tự chấm, nói/viết/mindmap giáo viên chấm sau.');
    const [dueTime, setDueTime] = useState(editing?.exam.due_time ? editing.exam.due_time.slice(0, 16) : '');
    const [homeworkEnabled, setHomeworkEnabled] = useState(editing?.exam.homework_enabled || false);
    const [proctoringEnabled, setProctoringEnabled] = useState(editing?.exam.proctoring_enabled !== false);
    const [assignedTeachers, setAssignedTeachers] = useState((editing?.exam.assigned_teacher_ids || []).join(', '));
    const [loading, setLoading] = useState(false);

    // Autosave Mock
    const [autosaveMsg, setAutosaveMsg] = useState('');
    useEffect(() => {
        if (!title) return;
        const timer = setTimeout(() => {
            setAutosaveMsg(`Đã lưu bản nháp lúc ${new Date().toLocaleTimeString()}`);
            setTimeout(() => setAutosaveMsg(''), 3000);
        }, 5000);
        return () => clearTimeout(timer);
    }, [title, subject, classId, duration, shuffleQ, shuffleOpt, displayMode, status, questions]);

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            {
                type: 'single_choice',
                question_text: 'Câu hỏi mới (Nhập công thức LaTeX: $$x^2$$ hoặc Hóa học: H2SO4)',
                options: [
                    { id: 'A', text: 'Lựa chọn A' },
                    { id: 'B', text: 'Lựa chọn B' },
                    { id: 'C', text: 'Lựa chọn C' },
                    { id: 'D', text: 'Lựa chọn D' }
                ],
                correct_answers: ['A'],
                points: 1.0
            }
        ]);
    };

    const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
        const newQs = [...questions];
        if (direction === 'up' && idx > 0) {
            [newQs[idx - 1], newQs[idx]] = [newQs[idx], newQs[idx - 1]];
        } else if (direction === 'down' && idx < newQs.length - 1) {
            [newQs[idx + 1], newQs[idx]] = [newQs[idx], newQs[idx + 1]];
        }
        setQuestions(newQs);
    };

    const handleDeleteQuestion = (idx: number) => {
        if (window.confirm('Bạn có chắc muốn xóa câu hỏi này?')) {
            const newQs = questions.filter((_, i) => i !== idx);
            setQuestions(newQs);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(
                {
                    title,
                    subject,
                    class_id: classId ? Number(classId) : null,
                    duration_minutes: duration,
                    shuffle_questions: shuffleQ,
                    shuffle_options: shuffleOpt,
                    display_mode: displayMode,
                    status,
                    instructions,
                    due_time: dueTime || undefined,
                    homework_enabled: homeworkEnabled,
                    proctoring_enabled: proctoringEnabled,
                    assigned_teacher_ids: assignedTeachers.split(',').map((item) => Number(item.trim())).filter(Boolean),
                    rubric_locked_after_grade: true,
                },
                questions
            );
        } finally {
            setLoading(false);
        }
    };

    const canGoNext = () => {
        if (step === 1) return title.trim().length > 0;
        if (step === 2) return questions.length > 0;
        return true;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)]">
                    <div>
                        <h3 className="text-xl font-black text-[var(--color-text)] tracking-tight">{editing ? 'Sửa Đề Thi Trực Tuyến' : 'Tạo Bài Kiểm Tra Trực Tuyến Mới'}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        {autosaveMsg && <span className="text-[10px] text-emerald-600 font-medium animate-pulse">{autosaveMsg}</span>}
                        <button type="button" onClick={onClose} className="rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)] transition"><XIcon size={20} /></button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-[var(--color-border)]">
                    <div className="h-full bg-[var(--color-primary)] transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form id="exam-wizard-form" onSubmit={handleFormSubmit} className="grid gap-6">

                        {/* STEP 1: Basic Info */}
                        <div className={step === 1 ? 'block' : 'hidden'}>
                            <div className="grid gap-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Tên bài kiểm tra *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Kiểm tra 45 phút - Đại số & Hóa Học" required />
                                    <Field label="Môn học" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="VD: Tiếng Anh / Toán / Hóa" />
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Lớp học áp dụng</label>
                                        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-xs font-bold outline-none focus:border-[var(--color-primary)]">
                                            <option value="">Tất cả lớp học</option>
                                            {classes.map((c) => (
                                                <option key={c.id} value={c.id}>Lớp {c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Trạng thái phát đề</label>
                                        <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-xs font-bold outline-none focus:border-[var(--color-primary)]">
                                            <option value="published">Published (Phát ngay)</option>
                                            <option value="draft">Draft (Nháp)</option>
                                            <option value="closed">Closed (Đã đóng)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* STEP 2: Questions */}
                        <div className={step === 2 ? 'block' : 'hidden'}>
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="font-bold text-sm text-[var(--color-text)]">Ngân Hàng Câu Hỏi ({questions.length} câu)</h4>
                                <button type="button" onClick={handleAddQuestion} className="rounded-xl bg-blue-600 hover:bg-blue-700 transition px-4 py-2 text-xs font-bold text-white shadow-md active:scale-95 flex items-center gap-2">
                                    + Thêm Câu Hỏi
                                </button>
                            </div>

                            {questions.length === 0 ? (
                                <div className="py-12 border-2 border-dashed border-[var(--color-border)] rounded-2xl flex flex-col items-center gap-3">
                                    <span className="text-4xl">📄</span>
                                    <p className="text-xs font-medium text-[var(--color-text-muted)]">Chưa có câu hỏi nào. Bấm nút Thêm Câu Hỏi để bắt đầu.</p>
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    {questions.map((q, idx) => (
                                        <div key={idx} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm overflow-hidden group">
                                            {/* Question Header (Drag Handle) */}
                                            <div className="flex items-center justify-between bg-[var(--color-bg-soft)] p-3 border-b border-[var(--color-border)]">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <button type="button" onClick={() => handleMoveQuestion(idx, 'up')} disabled={idx === 0} className="p-0.5 text-[var(--color-text-muted)] hover:text-blue-600 disabled:opacity-30 disabled:hover:text-[var(--color-text-muted)]">▲</button>
                                                        <button type="button" onClick={() => handleMoveQuestion(idx, 'down')} disabled={idx === questions.length - 1} className="p-0.5 text-[var(--color-text-muted)] hover:text-blue-600 disabled:opacity-30 disabled:hover:text-[var(--color-text-muted)]">▼</button>
                                                    </div>
                                                    <span className="font-bold text-xs text-[var(--color-text)] flex items-center gap-2">
                                                        <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--color-border)] text-xs">{idx + 1}</span>
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <select
                                                        value={q.type}
                                                        onChange={(e) => {
                                                            const updated = [...questions];
                                                            updated[idx].type = e.target.value as any;
                                                            setQuestions(updated);
                                                        }}
                                                        className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 text-xs font-bold outline-none"
                                                    >
                                                        <option value="single_choice">Chọn đáp án đúng</option>
                                                        <option value="multiple_choice">Chọn nhiều đáp án</option>
                                                        <option value="true_false">True / False</option>
                                                        <option value="ordering">Sắp xếp câu</option>
                                                        <option value="drag_drop">Kéo thả</option>
                                                        <option value="fill_blank">Điền từ</option>
                                                        <option value="mindmap">Mindmap</option>
                                                        <option value="speaking">Nói</option>
                                                        <option value="writing">Viết</option>
                                                        <option value="essay">Tự luận</option>
                                                    </select>
                                                    <button type="button" onClick={() => handleDeleteQuestion(idx)} className="text-[var(--color-text-muted)] hover:text-red-500 transition"><XIcon size={16} /></button>
                                                </div>
                                            </div>

                                            {/* Question Body */}
                                            <div className="p-4 grid gap-4">
                                                <textarea
                                                    rows={2}
                                                    value={q.question_text}
                                                    onChange={(e) => {
                                                        const updated = [...questions];
                                                        updated[idx].question_text = e.target.value;
                                                        setQuestions(updated);
                                                    }}
                                                    placeholder="Nhập nội dung câu hỏi..."
                                                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-sm outline-none focus:border-[var(--color-primary)] transition"
                                                />
                                                <div className="rounded-xl bg-[var(--color-bg-card)] p-4 border border-[var(--color-border)]">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-2">Live Preview:</span>
                                                    <KaTeXRenderer content={q.question_text} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* STEP 3: Settings */}
                        <div className={step === 3 ? 'block' : 'hidden'}>
                            <div className="grid gap-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Thời lượng làm bài (Phút)</label>
                                        <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-xs font-bold outline-none focus:border-[var(--color-primary)]" />
                                    </div>
                                    <Field label="Hạn nộp bài tập về nhà" type="datetime-local" value={dueTime} onChange={(e) => setDueTime(e.target.value)} helperText="Giao bài qua đề đã tạo sẵn" />
                                </div>
                                <div className="grid gap-1.5">
                                    <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Hướng dẫn làm bài</label>
                                    <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-sm outline-none focus:border-[var(--color-primary)]" />
                                </div>
                                <Field label="Phân công giáo viên chấm (ID, cách nhau bằng dấu phẩy)" value={assignedTeachers} onChange={(e) => setAssignedTeachers(e.target.value)} placeholder="VD: 1, 2, 5" helperText="Dùng để chia bài nói/viết/mindmap cho nhiều giáo viên" />
                                <div className="grid gap-4 border-t border-[var(--color-border)] pt-6">
                                    <h4 className="font-bold text-sm text-[var(--color-text)]">Tuỳ chọn hiển thị & Bảo mật</h4>
                                    <label className="flex items-center gap-3 text-sm font-semibold text-[var(--color-text)] p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] cursor-pointer hover:border-[var(--color-primary)] transition">
                                        <input type="checkbox" checked={shuffleQ} onChange={(e) => setShuffleQ(e.target.checked)} className="h-4 w-4 rounded accent-[var(--color-primary)]" />
                                        Trộn thứ tự câu hỏi cho mỗi học sinh
                                    </label>
                                    <label className="flex items-center gap-3 text-sm font-semibold text-[var(--color-text)] p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] cursor-pointer hover:border-[var(--color-primary)] transition">
                                        <input type="checkbox" checked={shuffleOpt} onChange={(e) => setShuffleOpt(e.target.checked)} className="h-4 w-4 rounded accent-[var(--color-primary)]" />
                                        Trộn đáp án A/B/C/D
                                    </label>
                                    <label className="flex items-center gap-3 text-sm font-semibold text-[var(--color-text)] p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] cursor-pointer hover:border-[var(--color-primary)] transition">
                                        <input type="checkbox" checked={homeworkEnabled} onChange={(e) => setHomeworkEnabled(e.target.checked)} className="h-4 w-4 rounded accent-[var(--color-primary)]" />
                                        Giao bài tập về nhà qua đề này
                                    </label>
                                    <label className="flex items-center gap-3 text-sm font-semibold text-[var(--color-text)] p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] cursor-pointer hover:border-[var(--color-primary)] transition">
                                        <input type="checkbox" checked={proctoringEnabled} onChange={(e) => setProctoringEnabled(e.target.checked)} className="h-4 w-4 rounded accent-[var(--color-primary)]" />
                                        Bắt buộc toàn màn hình và ghi log thoát tab/đổi đáp án
                                    </label>
                                    <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)]">
                                        <span className="text-sm font-semibold text-[var(--color-text)]">Chế độ hiển thị lúc làm bài</span>
                                        <select value={displayMode} onChange={(e) => setDisplayMode(e.target.value as any)} className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-xs font-bold outline-none">
                                            <option value="one">Cuộn từng câu (1 câu/trang)</option>
                                            <option value="all">Hiển thị tất cả câu hỏi</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-soft)]">
                    <button type="button" onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-2.5 text-sm font-bold text-[var(--color-text)] hover:bg-[var(--color-border)] transition">
                        {step > 1 ? 'Quay lại' : 'Hủy'}
                    </button>

                    <div className="flex items-center gap-3">
                        {step < 3 ? (
                            <PrimaryButton type="button" onClick={() => setStep(step + 1)} disabled={!canGoNext()} className="h-11 px-8 text-sm font-bold bg-[var(--color-primary)] shadow-md">
                                Tiếp tục
                            </PrimaryButton>
                        ) : (
                            <PrimaryButton form="exam-wizard-form" type="submit" disabled={loading || !canGoNext()} className="h-11 px-8 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md">
                                {loading ? 'Đang xử lý...' : 'Lưu Đề Thi'}
                            </PrimaryButton>
                        )}
                    </div>
                </div>

            </motion.div>
        </div>
    );
}

// ----------------------------------------------------------------------
// 4. SMART FILE IMPORT MODAL (Word .docx, Excel .xlsx, PDF)
// ----------------------------------------------------------------------
function SmartFileImportModal({
    onClose,
    onImportConfirm,
}: {
    onClose: () => void;
    onImportConfirm: (exam: Partial<OnlineExam>, questions: QuestionItem[]) => Promise<void>;
}) {
    const [title, setTitle] = useState<string>('Đề thi Trắc nghiệm & Tự luận');
    const [parsedQuestions, setParsedQuestions] = useState<QuestionItem[]>([]);
    const [showFormatGuide, setShowFormatGuide] = useState<boolean>(true);

    const handleSimulateUpload = () => {
        setParsedQuestions([
            {
                type: 'single_choice',
                question_text: 'Cho phương trình $$x^2 + y^2 = z^2$$. Bán kính đường tròn $R$ bằng bao nhiêu?',
                options: [
                    { id: 'A', text: '$$R = z$$' },
                    { id: 'B', text: '$$R = \\sqrt{z}$$' },
                    { id: 'C', text: '$$R = x + y$$' },
                    { id: 'D', text: '$$R = 2z$$' }
                ],
                correct_answers: ['A'],
                points: 2.5
            },
            {
                type: 'essay',
                question_text: 'Dung dịch H2SO4 phản ứng với NaOH thu được muối gì? Viết phương trình hóa học đầy đủ.',
                options: [],
                correct_answers: [],
                points: 5.0
            }
        ]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)] mb-4">
                    <div className="flex items-center gap-2.5">
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                            <UploadCloudIcon size={20} />
                        </span>
                        <div>
                            <h3 className="text-lg font-bold text-[var(--color-text)]">Import Đề Thi Từ Word (.docx) / Excel (.xlsx) / PDF</h3>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]"><XIcon size={18} /></button>
                </div>

                <div className="grid gap-5">
                    <Field label="Tên bài kiểm tra import *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Đề thi 45 phút - Hóa học & Toán học" required />

                    {/* FORMAT GUIDE TEMPLATE BOX */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/40">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                                <FileTextIcon size={16} /> Quy Chuẩn Format File Upload Chuẩn (Word / Excel / Text):
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowFormatGuide(!showFormatGuide)}
                                className="text-[11px] font-bold text-blue-600 hover:underline"
                            >
                                {showFormatGuide ? 'Thu gọn' : 'Xem mẫu'}
                            </button>
                        </div>

                        {showFormatGuide && (
                            <div className="mt-2 rounded-xl bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-emerald-400 overflow-x-auto shadow-inner">
                                <pre className="whitespace-pre">{`=====================================================
MẪU CÂU HỎI TRẮC NGHIỆM (Single / Multiple Choice):
=====================================================
Câu 1: Cho phương trình $$x^2 + y^2 = z^2$$. Tính bán kính $R$?
A. $$R = z$$
B. $$R = \\sqrt{z}$$
C. $$R = x + y$$
D. $$R = 2z$$
Đáp án: A
Mức độ: Dễ
Điểm: 2.5

Câu 2: Dung dịch H2SO4 phản ứng với chất nào sinh ra khí H2?
A. Fe
B. Cu
C. Ag
D. Au
Đáp án: A
Mức độ: Trung bình
Điểm: 2.5

=====================================================
MẪU CÂU HỎI TỰ LUẬN (Essay Question):
=====================================================
Câu 3 (Tự luận): Cho dung dịch H2SO4 tác dụng với NaOH. Viết phương trình hóa học đầy đủ.
Điểm: 5.0`}</pre>
                            </div>
                        )}
                    </div>

                    {/* File Upload Trigger Area */}
                    <div className="rounded-lg border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-soft)] p-8 text-center transition hover:border-indigo-500">
                        <UploadCloudIcon size={36} className="mx-auto text-indigo-500 mb-2" />
                        <label className="cursor-pointer font-bold text-xs text-[var(--color-primary)] hover:underline">
                            Tải file Word (.docx), Excel (.xlsx) hoặc PDF lên đây
                            <input
                                type="file"
                                accept=".docx,.xlsx,.pdf"
                                onChange={handleSimulateUpload}
                                className="hidden"
                            />
                        </label>
                        <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Hệ thống sẽ tự động bóc tách câu hỏi và hiển thị màn hình Preview lỗi bên dưới</p>
                    </div>

                    {/* Parsed Questions Preview */}
                    {parsedQuestions.length > 0 && (
                        <div className="grid gap-3">
                            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-900 flex items-center justify-between dark:bg-emerald-950/80 dark:text-emerald-200">
                                <span>Parser đã tách thành công <b>{parsedQuestions.length} câu hỏi</b> từ file của bạn!</span>
                                <span className="text-[10px] font-normal">Đã sẵn sàng tạo bài thi</span>
                            </div>

                            <div className="grid gap-3 max-h-60 overflow-y-auto pr-1">
                                {parsedQuestions.map((q, i) => (
                                    <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                                        <span className="font-bold text-xs block mb-1 text-indigo-600 dark:text-indigo-300">
                                            Câu {i + 1} [{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}] - {q.points} điểm
                                        </span>
                                        <KaTeXRenderer content={q.question_text} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
                        <button type="button" onClick={onClose} className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-bold">Hủy</button>
                        <PrimaryButton
                            disabled={!parsedQuestions.length}
                            onClick={() => onImportConfirm({ title, duration_minutes: 45, status: 'published' }, parsedQuestions)}
                            className="h-10 px-6 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                        >
                            Xác Nhận Import Bài Thi
                        </PrimaryButton>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
