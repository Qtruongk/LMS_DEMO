export type Role = 'student' | 'teacher' | 'admin';

export type User = {
    id: number;
    full_name?: string;
    username: string;
    phone?: string;
    student_code?: string;
    role: Role;
    specialty?: string;
    status: string;
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
    file_name?: string;
    file_data?: string;
    file_size?: string;
    file_type?: string;
    file_url?: string;
    external_link?: string;
    uploaded_by_name?: string;
    created_at: string;
};

export type TestItem = {
    id: number;
    title: string;
    description: string;
    type: string;
    due_date: string;
    max_score: string;
    status: string;
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

export type NotificationItem = {
    id: number;
    title: string;
    content: string;
    type?: string;
    priority?: string;
    class_id?: number;
    class_name?: string;
    sender_name?: string;
    created_by_name?: string;
    created_at: string;
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
