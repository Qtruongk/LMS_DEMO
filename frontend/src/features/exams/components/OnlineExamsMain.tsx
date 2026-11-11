import { useState, useEffect, useCallback, useMemo } from 'react';
import { Panel, PrimaryButton } from '../../../components/shared/ui';
import { ClockIcon, PlayIcon } from '../../../components/shared/icons';
import { ExamBadgeIcon, LayersIcon } from './ExamIcons';
import type { ClassItem, User } from '../../../types';
import type { OnlineExam, ProctoringLog, QuestionItem, ExamSubmission, StudentAnswer } from '../types';
import { TeacherExamManager } from './TeacherExamManager';
import { StudentExamTake } from './StudentExamTake';
import { ExamResultsView } from './ExamResultsView';
import { API_URL } from '../../../services/api';

type OnlineExamsMainProps = {
    user: User;
    classes: ClassItem[];
    selectedClassId?: number | null;
};

type StudentExamFilter = 'all' | 'done' | 'not_done' | 'in_progress' | 'overdue';
type StudentExamState = 'done' | 'not_done' | 'in_progress' | 'overdue';

const examFilterLabels: Record<StudentExamFilter, string> = {
    all: 'Tất cả',
    done: 'Đã làm',
    not_done: 'Chưa làm',
    in_progress: 'Đang làm',
    overdue: 'Trễ hạn',
};

const examStateLabels: Record<StudentExamState, string> = {
    done: 'Đã làm',
    not_done: 'Chưa làm',
    in_progress: 'Đang làm',
    overdue: 'Trễ hạn',
};

const examStateTone: Record<StudentExamState, string> = {
    done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    not_done: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
    in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

function getExamDeadline(exam: OnlineExam) {
    const value = exam.due_time || exam.end_time;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getStudentExamState(exam: OnlineExam, result?: ExamSubmission): StudentExamState {
    const status = result?.status || exam.submission_status;
    const isDone = Boolean(exam.has_submitted) || status === 'graded' || status === 'pending_essay';
    if (isDone) return 'done';
    if (status === 'in_progress') return 'in_progress';
    const deadline = getExamDeadline(exam);
    if (deadline && deadline.getTime() < Date.now()) return 'overdue';
    return 'not_done';
}

function formatExamDate(value?: string) {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
    return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export function OnlineExamsMain({ user, classes, selectedClassId }: OnlineExamsMainProps) {
    const isStudent = user.role === 'student';
    const canManage = user.role === 'admin' || user.role === 'owner' || user.role === 'teacher';

    const [exams, setExams] = useState<OnlineExam[]>([]);
    const [studentResults, setStudentResults] = useState<ExamSubmission[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [alertMsg, setAlertMsg] = useState<string>('');
    const [studentFilter, setStudentFilter] = useState<StudentExamFilter>('all');

    // Active Exam Taking Session for Student
    const [takingExam, setTakingExam] = useState<{
        exam: OnlineExam;
        questions: QuestionItem[];
        submission: ExamSubmission;
    } | null>(null);

    const headers = {
        'Content-Type': 'application/json',
        'x-user-id': String(user.id),
    };

    // Load Exams List
    const loadExams = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/online-exams`, { headers });
            const data = await res.json();
            setExams(data.exams ?? []);
        } catch (err) {
            console.error('Lỗi tải bài kiểm tra:', err);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    // Load Student Results
    const loadStudentResults = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/online-exams/student/results`, { headers });
            const data = await res.json();
            setStudentResults(data.results ?? []);
        } catch (err) {
            console.error('Lỗi tải kết quả bài thi:', err);
        }
    }, [user.id]);

    useEffect(() => {
        loadExams();
        if (isStudent) {
            loadStudentResults();
        }
    }, [loadExams, loadStudentResults, isStudent]);

    // Teacher API Callbacks
    const handleCreateExam = async (examPayload: Partial<OnlineExam>, questionsPayload: QuestionItem[]) => {
        const res = await fetch(`${API_URL}/api/online-exams`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...examPayload, questions: questionsPayload }),
        });
        const data = await res.json();
        setAlertMsg(data.message || 'Tạo bài thi thành công!');
        setTimeout(() => setAlertMsg(''), 4000);
        loadExams();
    };

    const handleUpdateExam = async (id: number, examPayload: Partial<OnlineExam>, questionsPayload?: QuestionItem[]) => {
        const res = await fetch(`${API_URL}/api/online-exams/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ ...examPayload, questions: questionsPayload }),
        });
        const data = await res.json();
        setAlertMsg(data.message || 'Đã cập nhật bài thi!');
        setTimeout(() => setAlertMsg(''), 4000);
        loadExams();
    };

    const handleDeleteExam = async (id: number) => {
        const res = await fetch(`${API_URL}/api/online-exams/${id}`, {
            method: 'DELETE',
            headers,
        });
        const data = await res.json();
        setAlertMsg(data.message || 'Đã xóa bài thi!');
        setTimeout(() => setAlertMsg(''), 4000);
        loadExams();
    };

    const handleFetchSubmissions = async (examId: number): Promise<ExamSubmission[]> => {
        const res = await fetch(`${API_URL}/api/online-exams/${examId}/submissions`, { headers });
        const data = await res.json();
        return data.submissions ?? [];
    };

    const handleGradeSubmission = async (
        subId: number,
        essayScores: Record<number, { score: number; feedback: string }>,
        feedback: string,
        totalScore: number,
        gradeDetails?: Record<string, { label: string; score: number; max_score?: number }>
    ) => {
        const res = await fetch(`${API_URL}/api/online-exams/submissions/${subId}/grade`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                essay_scores: essayScores,
                teacher_feedback: feedback,
                total_score: totalScore,
                grade_details: gradeDetails,
            }),
        });
        const data = await res.json();
        setAlertMsg(data.message || 'Đã chấm bài tự luận thành công!');
        setTimeout(() => setAlertMsg(''), 4000);
    };

    const handleFetchExamDetails = async (examId: number) => {
        const res = await fetch(`${API_URL}/api/online-exams/${examId}`, { headers });
        const data = await res.json();
        return data;
    };

    // Student Exam Taking Callbacks
    const handleStartExamAttempt = async (exam: OnlineExam) => {
        try {
            const resStart = await fetch(`${API_URL}/api/online-exams/${exam.id}/start`, {
                method: 'POST',
                headers,
            });
            const startData = await resStart.json();

            const resDetails = await fetch(`${API_URL}/api/online-exams/${exam.id}`, { headers });
            const detailsData = await resDetails.json();

            if (!resStart.ok) {
                alert(startData.message || 'Không thể vào bài thi');
                return;
            }

            setTakingExam({
                exam: detailsData.exam,
                questions: detailsData.questions,
                submission: startData.submission,
            });
        } catch (err) {
            console.error('Lỗi khi vào bài kiểm tra:', err);
        }
    };

    const handleAutosaveAttempt = async (subId: number, answers: Record<number, StudentAnswer>, logs?: ProctoringLog[]) => {
        await fetch(`${API_URL}/api/online-exams/submissions/${subId}/autosave`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ answers, proctoring_logs: logs || [] }),
        });
    };

    const handleSubmitExamAttempt = async (subId: number, answers: Record<number, StudentAnswer>, logs?: ProctoringLog[]) => {
        const res = await fetch(`${API_URL}/api/online-exams/submissions/${subId}/submit`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ answers, proctoring_logs: logs || [] }),
        });
        const data = await res.json();
        setAlertMsg(data.message || 'Đã nộp bài kiểm tra thành công!');
        setTimeout(() => setAlertMsg(''), 4000);
        loadStudentResults();
        loadExams();
    };

    // If Student is actively taking an exam: Render Full Exam Workspace
    if (takingExam) {
        return (
            <StudentExamTake
                exam={takingExam.exam}
                questions={takingExam.questions}
                submission={takingExam.submission}
                onAutosave={handleAutosaveAttempt}
                onSubmitExam={handleSubmitExamAttempt}
                onExit={() => setTakingExam(null)}
            />
        );
    }

    const resultByExamId = useMemo(() => {
        const map = new Map<number, ExamSubmission>();
        studentResults.forEach((result) => map.set(result.exam_id, result));
        return map;
    }, [studentResults]);

    const examStats = useMemo(() => {
        const stats: Record<StudentExamFilter, number> = { all: exams.length, done: 0, not_done: 0, in_progress: 0, overdue: 0 };
        exams.forEach((exam) => {
            const state = getStudentExamState(exam, resultByExamId.get(exam.id));
            stats[state] += 1;
        });
        return stats;
    }, [exams, resultByExamId]);

    const visibleStudentExams = useMemo(() => exams.filter((exam) => {
        if (studentFilter === 'all') return true;
        return getStudentExamState(exam, resultByExamId.get(exam.id)) === studentFilter;
    }), [exams, resultByExamId, studentFilter]);

    const visibleResults = studentResults;

    // TEACHER / ADMIN WORKSPACE
    if (canManage) {
        return (
            <TeacherExamManager
                exams={exams}
                classes={classes}
                selectedClassId={selectedClassId}
                onCreateExam={handleCreateExam}
                onUpdateExam={handleUpdateExam}
                onDeleteExam={handleDeleteExam}
                onFetchSubmissions={handleFetchSubmissions}
                onGradeSubmission={handleGradeSubmission}
                onFetchExamDetails={handleFetchExamDetails}
            />
        );
    }

    // STUDENT WORKSPACE
    return (
        <div className="grid gap-6">
            {alertMsg && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-sm flex items-center justify-between dark:border-emerald-900/60 dark:bg-emerald-950/80 dark:text-emerald-200">
                    <span>{alertMsg}</span>
                    <button type="button" onClick={() => setAlertMsg('')} className="text-emerald-600 hover:text-emerald-900">✕</button>
                </div>
            )}

            {/* Student Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-lg dark:bg-indigo-900/60 dark:text-indigo-200">
                        <ExamBadgeIcon size={22} />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-[var(--color-text)]">Kiểm Tra Trực Tuyến</h2>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-sm font-black text-[var(--color-text)]">{studentResults.length} bài đã có kết quả</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Kết quả nằm chung trong từng bài kiểm tra</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-xs">
                {(Object.keys(examFilterLabels) as StudentExamFilter[]).map((filter) => (
                    <button
                        key={filter}
                        type="button"
                        onClick={() => setStudentFilter(filter)}
                        className={`rounded-xl px-4 py-2 text-xs font-black transition ${studentFilter === filter ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}
                    >
                        {examFilterLabels[filter]} ({examStats[filter]})
                    </button>
                ))}
            </div>

            <Panel title={`Bài Kiểm Tra (${visibleStudentExams.length} bài)`}>
                {loading ? (
                    <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">Đang tải danh sách đề thi...</div>
                ) : visibleStudentExams.length ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {visibleStudentExams.map((exam) => {
                            const result = resultByExamId.get(exam.id);
                            const state = getStudentExamState(exam, result);
                            const canStart = state !== 'done' && state !== 'overdue';
                            return (
                                <article
                                    key={exam.id}
                                    className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-xs transition hover:border-[var(--color-primary-border)] hover:shadow-md"
                                >
                                    <div>
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${examStateTone[state]}`}>
                                                {examStateLabels[state]}
                                            </span>
                                            {exam.class_name && (
                                                <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                                                    Lớp {exam.class_name}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-base font-bold text-[var(--color-text)] mb-2 leading-snug">{exam.title}</h3>

                                        <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--color-text-muted)] mb-4">
                                            <span className="flex items-center gap-1"><ClockIcon size={13} /> Thời lượng: <b>{exam.duration_minutes} phút</b></span>
                                            <span className="flex items-center gap-1"><LayersIcon size={13} /> Số câu: <b>{exam.question_count ?? 0} câu</b></span>
                                            <span>Hạn: <b>{formatExamDate(exam.due_time || exam.end_time)}</b></span>
                                            <span>Chế độ: <b>{exam.display_mode === 'one' ? '1 câu/trang' : 'Tất cả câu'}</b></span>
                                        </div>

                                        {result && (
                                            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-100">
                                                <p className="font-black">Kết quả: {result.total_score ?? '-'} / {result.max_score ?? '-'}</p>
                                                <p className="mt-1 font-semibold opacity-80">Trạng thái: {result.status === 'graded' ? 'Đã có điểm' : result.status === 'pending_essay' ? 'Chờ chấm tự luận' : 'Đang làm bài'} • Nộp: {formatExamDate(result.submit_time)}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-[var(--color-border)] pt-3 flex justify-end">
                                        <PrimaryButton
                                            onClick={() => canStart && handleStartExamAttempt(exam)}
                                            disabled={!canStart}
                                            className={`h-10 px-6 text-xs font-bold inline-flex items-center gap-1.5 ${canStart ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-400 cursor-not-allowed'}`}
                                        >
                                            <PlayIcon size={14} /> {state === 'in_progress' ? 'Tiếp Tục Làm Bài' : state === 'done' ? 'Đã Hoàn Thành' : state === 'overdue' ? 'Đã Trễ Hạn' : 'Bắt Đầu Làm Bài'}
                                        </PrimaryButton>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">Hiện tại chưa có đề thi trực tuyến nào được phát cho lớp của bạn</div>
                )}
            </Panel>

            {visibleResults.length > 0 && <ExamResultsView results={visibleResults} />}
        </div>
    );
}
