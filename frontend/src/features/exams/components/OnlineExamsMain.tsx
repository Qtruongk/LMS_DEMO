import { useState, useEffect, useCallback } from 'react';
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
    initialTab?: 'exams' | 'results';
    hideStudentHeader?: boolean;
};

export function OnlineExamsMain({ user, classes, initialTab = 'exams', hideStudentHeader = false }: OnlineExamsMainProps) {
    const isStudent = user.role === 'student';
    const canManage = user.role === 'admin' || user.role === 'owner' || user.role === 'teacher';

    const [activeTab, setActiveTab] = useState<'exams' | 'results'>(initialTab);
    const [exams, setExams] = useState<OnlineExam[]>([]);
    const [studentResults, setStudentResults] = useState<ExamSubmission[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [alertMsg, setAlertMsg] = useState<string>('');

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
        setActiveTab(initialTab);
    }, [initialTab]);

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
        totalScore: number
    ) => {
        const res = await fetch(`${API_URL}/api/online-exams/submissions/${subId}/grade`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                essay_scores: essayScores,
                teacher_feedback: feedback,
                total_score: totalScore,
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
            const resDetails = await fetch(`${API_URL}/api/online-exams/${exam.id}`, { headers });
            const detailsData = await resDetails.json();

            const resStart = await fetch(`${API_URL}/api/online-exams/${exam.id}/start`, {
                method: 'POST',
                headers,
            });
            const startData = await resStart.json();

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

    const visibleStudentExams = exams;
    const visibleResults = studentResults;

    // TEACHER / ADMIN WORKSPACE
    if (canManage) {
        return (
            <TeacherExamManager
                exams={exams}
                classes={classes}
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
            {!hideStudentHeader && (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xs">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-lg dark:bg-indigo-900/60 dark:text-indigo-200">
                            <ExamBadgeIcon size={22} />
                        </span>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--color-text)]">Kiểm Tra Trực Tuyến</h2>
                            <p className="text-xs text-[var(--color-text-secondary)]">Làm bài trực tuyến, tự động lưu 30s, đếm ngược thời gian thực và xem kết quả ngay</p>
                        </div>
                    </div>

                    {/* Tab switcher */}
                    <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-1 gap-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('exams')}
                            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${activeTab === 'exams' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-text-secondary)]'}`}
                        >
                            Đề Thi Hiện Có ({visibleStudentExams.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('results')}
                            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${activeTab === 'results' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-text-secondary)]'}`}
                        >
                            Kết Quả Học Tập ({studentResults.length})
                        </button>
                    </div>
                </div>
            )}

            {/* Tab 1: Available Exams */}
            {activeTab === 'exams' && (
                <Panel title={`Danh Sách Đề Thi Trực Tuyến (${visibleStudentExams.length} bài thi)`} subtitle="Chọn đề thi và bấm Bắt đầu làm bài trong giao diện toàn màn hình thân thiện với học sinh">
                    {loading ? (
                        <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">Đang tải danh sách đề thi...</div>
                    ) : visibleStudentExams.length ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {visibleStudentExams.map((exam) => (
                                <article
                                    key={exam.id}
                                    className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-xs transition hover:border-[var(--color-primary-border)] hover:shadow-md"
                                >
                                    <div>
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                                Đang mở đề
                                            </span>
                                            {exam.class_name && (
                                                <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                                                    Lớp {exam.class_name}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-base font-bold text-[var(--color-text)] mb-2 leading-snug">{exam.title}</h3>
                                        <p className="text-xs text-[var(--color-text-secondary)] mb-4 line-clamp-2">{exam.description || 'Không có mô tả thêm'}</p>

                                        <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--color-text-muted)] mb-4">
                                            <span className="flex items-center gap-1"><ClockIcon size={13} /> Thời lượng: <b>{exam.duration_minutes} phút</b></span>
                                            <span className="flex items-center gap-1"><LayersIcon size={13} /> Số câu: <b>{exam.question_count ?? 0} câu</b></span>
                                            <span>Tối đa: <b>{exam.max_attempts} lần</b></span>
                                            <span>Chế độ: <b>{exam.display_mode === 'one' ? '1 câu/trang' : 'Tất cả câu'}</b></span>
                                        </div>
                                    </div>

                                    <div className="border-t border-[var(--color-border)] pt-3 flex justify-end">
                                        <PrimaryButton
                                            onClick={() => handleStartExamAttempt(exam)}
                                            className="h-10 px-6 text-xs font-bold bg-blue-600 hover:bg-blue-700 inline-flex items-center gap-1.5"
                                        >
                                            <PlayIcon size={14} /> Bắt Đầu Làm Bài
                                        </PrimaryButton>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">Hiện tại chưa có đề thi trực tuyến nào được phát cho lớp của bạn</div>
                    )}
                </Panel>
            )}

            {/* Tab 2: History Results */}
            {activeTab === 'results' && (
                <ExamResultsView results={visibleResults} />
            )}
        </div>
    );
}
