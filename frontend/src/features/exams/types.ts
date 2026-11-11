export type QuestionType =
    | 'single_choice'
    | 'multiple_choice'
    | 'true_false'
    | 'matching'
    | 'ordering'
    | 'drag_drop'
    | 'fill_blank'
    | 'mindmap'
    | 'speaking'
    | 'writing'
    | 'essay'
    | 'paper_upload';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type ExamMedia = {
    type: 'image' | 'audio' | 'video' | 'file';
    url: string;
    name?: string;
};

export type ProctoringLog = {
    at: string;
    type:
    | 'fullscreen_enter'
    | 'fullscreen_exit'
    | 'visibility_hidden'
    | 'visibility_visible'
    | 'answer_change'
    | 'question_focus'
    | 'auto_submit'
    | 'manual_submit';
    question_id?: number;
    detail?: string;
};

export type QuestionOption = {
    id: string;
    text: string;
    media?: ExamMedia[];
};

export type QuestionItem = {
    id?: number;
    exam_id?: number;
    class_id?: number | null;
    subject?: string;
    chapter?: string;
    topic?: string;
    difficulty?: DifficultyLevel;
    type: QuestionType;
    question_text: string;
    media?: ExamMedia[];
    options?: QuestionOption[];
    correct_answers?: string[];
    points?: number;
    grading_guide?: string;
    tags?: string[];
};

export type OnlineExam = {
    id: number;
    title: string;
    subject?: string;
    class_id?: number | null;
    class_name?: string;
    teacher_name?: string;
    description?: string;
    instructions?: string;
    start_time?: string;
    end_time?: string;
    due_time?: string;
    duration_minutes: number;
    show_answers_after_submit: boolean;
    show_score_after_submit: boolean;
    max_attempts: number;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    display_mode: 'one' | 'all';
    auto_submit: boolean;
    random_question_count?: number;
    question_delivery_mode?: 'same' | 'different';
    shared_question_ids?: number[];
    is_library?: boolean;
    status: 'draft' | 'published' | 'closed' | 'library';
    gradebook_name?: string;
    grade_column_name?: string;
    proctoring_enabled?: boolean;
    homework_enabled?: boolean;
    assigned_teacher_ids?: number[];
    rubric_locked_after_grade?: boolean;
    created_by?: number;
    created_at?: string;
    question_count?: number;
    submission_count?: number;
    submission_status?: 'in_progress' | 'pending_essay' | 'graded';
    has_submitted?: boolean;
};

export type StudentAnswer = string | string[] | Record<string, string>;

export type ExamSubmission = {
    id: number;
    exam_id: number;
    student_id: number;
    student_name?: string;
    student_code?: string;
    username?: string;
    exam_title?: string;
    subject?: string;
    class_name?: string;
    gradebook_name?: string;
    grade_column_name?: string;
    attempt_number: number;
    start_time: string;
    submit_time?: string;
    status: 'in_progress' | 'pending_essay' | 'graded';
    total_score?: number;
    max_score?: number;
    answers: Record<number, StudentAnswer>;
    question_ids?: number[];
    essay_scores?: Record<number, { score: number; feedback: string; audio_feedback_url?: string }>;
    grade_details?: Record<string, { label: string; score: number; max_score?: number }>;
    teacher_feedback?: string;
    teacher_audio_feedback_url?: string;
    assigned_grader_name?: string;
    proctoring_logs?: ProctoringLog[];
    graded_by?: number;
    graded_at?: string;
    show_answers_after_submit?: boolean;
    show_score_after_submit?: boolean;
};

export type ExamAnalytics = {
    total_enrolled: number;
    submitted_count: number;
    in_progress_count: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    score_distribution: { range: string; count: number }[];
    easiest_question?: string;
    hardest_question?: string;
};
