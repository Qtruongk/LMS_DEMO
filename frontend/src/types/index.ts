export type Role = 'student' | 'teacher' | 'admin' | 'owner';

export type User = {
    id: number;
    full_name?: string;
    username: string;
    password?: string;
    phone?: string;
    student_code?: string;
    role: Role;
    specialty?: string;
    status: string;
    class_names?: string[];
    class_subjects?: string[];
    class_ids?: number[];
};

export type ClassItem = {
    id: number;
    name: string;
    code: string;
    description: string;
    subject: string;
    teacher_name: string;
    teacher_id?: number;
    start_date: string;
    end_date: string;
    status: string;
    status_label?: string;
    schedule: string;
    class_hours?: string;
    progress: number;
    location: string;
    student_count: number;
};

export type SessionItem = {
    id: number;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    status: string;
    teacher_notes?: string;
    materials?: Material[];
    attendance_total?: number;
    present_count?: number;
    absent_count?: number;
};

export type Material = {
    id: number;
    class_id?: number;
    class_name?: string;
    title: string;
    description?: string;
    note?: string;
    material_kind?: 'blank' | 'solution' | 'document';
    file_name?: string;
    file_data?: string;
    file_size?: string;
    file_type?: string;
    file_url?: string;
    external_link?: string;
    uploaded_by_name?: string;
    created_at: string;
};

export type AssignmentQuizOption = { id: string; text: string; correct: boolean; imageName?: string; imageData?: string; imageType?: string };
export type AssignmentQuizQuestion = { id: string; title: string; options: AssignmentQuizOption[]; points: string; required: boolean; imageName?: string; imageData?: string; imageType?: string };

export type TestItem = {
    id: number;
    title: string;
    description: string;
    type: string;
    due_date: string;
    max_score: string | number;
    status: string;
    assignment_kind?: 'quiz' | 'essay';
    prompt_mode?: 'text' | 'image';
    prompt_text?: string;
    prompt_image_name?: string;
    prompt_image_data?: string;
    prompt_image_type?: string;
    answer_mode?: 'text' | 'image';
    answer_text?: string;
    answer_image_name?: string;
    answer_image_data?: string;
    answer_image_type?: string;
    quiz_payload?: AssignmentQuizQuestion[];
    topic_id?: number;
    topic_title?: string;
    submitted_count?: number;
    graded_count?: number;
    ungraded_count?: number;
    enrolled_count?: number;
    student_submission_id?: number;
    student_submitted_at?: string;
    student_score?: string | number;
    student_feedback?: string;
};

export type ClassTopic = {
    id: number;
    class_id: number;
    title: string;
    description?: string;
    sort_order?: number;
    created_at?: string;
};

export type GradebookAssignment = {
    id: number;
    title: string;
    max_score: string | number;
    assignment_kind?: 'quiz' | 'essay';
    topic_title?: string;
    due_date?: string;
};

export type GradebookScore = {
    test_id: number;
    submission_id?: number;
    status: 'missing' | 'submitted' | 'graded';
    score?: string | number | null;
    feedback?: string;
    submitted_at?: string;
    answer?: string;
    file_url?: string;
};

export type GradebookRow = {
    student_id: number;
    student_name?: string;
    username: string;
    student_code?: string;
    scores: GradebookScore[];
};

export type GradebookData = {
    assignments: GradebookAssignment[];
    rows: GradebookRow[];
};

export type Tuition = {
    id: number;
    student_name: string;
    student_code: string;
    class_name?: string;
    amount_due: string;
    amount_paid: string;
    status: string;
    note?: string;
};

export type NotificationAttachment = {
    id?: string;
    name: string;
    type?: string;
    size?: number;
    data: string;
    uploaded_at?: string;
};

export type NotificationItem = {
    id: number;
    title: string;
    content: string;
    content_html?: string;
    attachments?: NotificationAttachment[];
    type?: string;
    priority?: string;
    class_id?: number;
    class_name?: string;
    sender_name?: string;
    created_by_name?: string;
    created_at: string;
    read_status?: Record<string, boolean>;
    is_read?: boolean;
};

export type FeedbackItem = {
    id: number;
    student_id: number;
    student_name: string;
    student_code: string;
    subject: string;
    content: string;
    status: string;
    admin_response?: string;
    created_at: string;
    updated_at: string;
};

export type ClassDetail = {
    class: ClassItem;
    students: User[];
    sessions: SessionItem[];
    materials: Material[];
    tests: TestItem[];
    notifications?: NotificationItem[];
    topics?: ClassTopic[];
    tuitions: Tuition[];
};

export type WorkspaceSummary = Record<string, string | number>;

export type ScheduleAdjustment = {
    id: number;
    class_id: number;
    class_name?: string;
    class_code?: string;
    location?: string;
    date: string;
    custom_hours?: string;
    type: 'rescheduled' | 'canceled' | 'makeup' | 'special';
    reason?: string;
    created_at?: string;
};
