import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { Pool } from 'pg';
dotenv.config();
const app = express();
const port = Number(process.env.PORT ?? 3000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';
    END IF;
  END $$;
`).then(() => pool.query(`
  INSERT INTO users (full_name, username, phone, student_code, role, password, specialty, note, status)
  VALUES ('Chủ trung tâm VAT', 'owner', '0900000001', NULL, 'owner'::user_role, 'owner123', 'Điều hành trung tâm', 'Tài khoản chủ trung tâm có toàn quyền quản lý', 'active')
  ON CONFLICT (username) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    specialty = EXCLUDED.specialty,
    note = EXCLUDED.note,
    status = 'active';
`)).catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS password_reset_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    approved_by INT REFERENCES users(id) ON DELETE SET NULL,
    auto_approved BOOLEAN NOT NULL DEFAULT false,
    note TEXT
  );
`).catch(console.error);
pool.query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_hours TEXT;').then(() => {
    return pool.query("UPDATE classes SET class_hours = '18:30 - 20:30' WHERE class_hours IS NULL OR class_hours = '';");
}).catch(console.error);
pool.query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();').catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS financial_transactions (
    id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(12) NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    revenue_source TEXT,
    payment_method TEXT,
    customer_source TEXT,
    learning_purpose TEXT,
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  INSERT INTO financial_transactions
    (transaction_date, type, category, amount, revenue_source, payment_method, customer_source, learning_purpose, discount_amount, note)
  SELECT * FROM (VALUES
    (CURRENT_DATE - interval '5 months', 'income', 'Khóa học trực tiếp', 42000000::numeric, 'Khóa học trực tiếp', 'Chuyển khoản', 'Facebook', 'Nâng cao tay nghề', 2100000::numeric, 'Doanh thu khóa học tháng trước'),
    (CURRENT_DATE - interval '5 months', 'expense', 'Lương giáo viên', 14200000::numeric, NULL, NULL, NULL, NULL, 0::numeric, 'Chi lương giảng viên'),
    (CURRENT_DATE - interval '5 months', 'expense', 'Vận hành & mặt bằng', 8200000::numeric, NULL, NULL, NULL, NULL, 0::numeric, 'Mặt bằng và vận hành'),
    (CURRENT_DATE - interval '4 months', 'income', 'Khóa học video', 12500000::numeric, 'Khóa học video', 'Ví điện tử', 'YouTube', 'Tự học linh hoạt', 800000::numeric, 'Doanh thu video'),
    (CURRENT_DATE - interval '4 months', 'income', 'Bộ đề', 6400000::numeric, 'Bộ đề', 'Chuyển khoản', 'Website', 'Luyện thi chứng chỉ', 350000::numeric, 'Doanh thu bộ đề'),
    (CURRENT_DATE - interval '4 months', 'expense', 'Lương giáo viên', 15100000::numeric, NULL, NULL, NULL, NULL, 0::numeric, 'Chi lương giảng viên'),
    (CURRENT_DATE - interval '4 months', 'expense', 'Marketing', 4300000::numeric, NULL, NULL, NULL, NULL, 0::numeric, 'Quảng cáo tuyển sinh'),
    (CURRENT_DATE - interval '3 months', 'income', 'Khóa học trực tiếp', 49600000::numeric, 'Khóa học trực tiếp', 'Tiền mặt', 'Giới thiệu', 'Chuyển nghề', 2800000::numeric, 'Doanh thu khóa học'),
    (CURRENT_DATE - interval '3 months', 'expense', 'Lương giáo viên', 16300000::numeric, NULL, NULL, NULL, NULL, 0::numeric, 'Chi lương giảng viên'),
    (CURRENT_DATE - interval '3 months', 'expense', 'Vận hành & mặt bằng', 8600000::numeric, NULL, NULL, NULL, NULL, 0::numeric, 'Mặt bằng và vận hành'),
    (CURRENT_DATE - interval '2 months', 'income', 'Khóa học trực tiếp', 53500000::numeric, 'Khóa học trực tiếp', 'Chuyển khoản', 'Facebook', 'Nâng cao tay nghề', 3200000::numeric, 'Doanh thu khóa học'),
    (CURRENT_DATE - interval '2 months', 'income', 'Khóa học video', 14700000::numeric, 'Khóa học video', 'Thẻ quốc tế', 'Website', 'Tự học linh hoạt', 920000::numeric, 'Doanh thu video'),
    (CURRENT_DATE - interval '2 months', 'expense', 'Lương giáo viên', 17100000::numeric, NULL, NULL, NULL, NULL, 0::numeric, 'Chi lương giảng viên'),
    (CURRENT_DATE - interval '2 months', 'expense', 'Marketing', 5100000::numeric, NULL, NULL, NULL, NULL, 0::numeric, 'Quảng cáo tuyển sinh'),
    (CURRENT_DATE - interval '1 month', 'income', 'Khóa học trực tiếp', 58800000::numeric, 'Khóa học trực tiếp', 'Chuyển khoản', 'Google', 'Chuyển nghề', 3700000::numeric, 'Doanh thu khóa học'),
    (CURRENT_DATE - interval '1 month', 'income', 'Bộ đề', 7900000::numeric, 'Bộ đề', 'Ví điện tử', 'TikTok', 'Luyện thi chứng chỉ', 420000::numeric, 'Doanh thu bộ đề'),
    (CURRENT_DATE - interval '1 month', 'expense', 'Lương giáo viên', 18400000::numeric, NULL, NULL, NULL, NULL, 0::numeric, 'Chi lương giảng viên'),
    (CURRENT_DATE - interval '1 month', 'expense', 'Vận hành & mặt bằng', 9000000::numeric, NULL, NULL, NULL, NULL, 0::numeric, 'Mặt bằng và vận hành'),
    (CURRENT_DATE, 'income', 'Khóa học trực tiếp', 24100000::numeric, 'Khóa học trực tiếp', 'Chuyển khoản', 'Facebook', 'Nâng cao tay nghề', 1450000::numeric, 'Doanh thu đã ghi nhận trong tháng'),
    (CURRENT_DATE, 'income', 'Khóa học video', 5600000::numeric, 'Khóa học video', 'Ví điện tử', 'Website', 'Tự học linh hoạt', 310000::numeric, 'Doanh thu video tháng này'),
    (CURRENT_DATE, 'income', 'Bộ đề', 2300000::numeric, 'Bộ đề', 'Thẻ quốc tế', 'TikTok', 'Luyện thi chứng chỉ', 120000::numeric, 'Doanh thu bộ đề tháng này'),
    (CURRENT_DATE, 'expense', 'Lương giáo viên', 9600000::numeric, NULL, NULL, NULL, NULL, 0::numeric, 'Tạm tính lương giáo viên'),
    (CURRENT_DATE, 'expense', 'Marketing', 2800000::numeric, NULL, NULL, NULL, NULL, 0::numeric, 'Marketing tháng này'),
    (CURRENT_DATE, 'expense', 'Vận hành & mặt bằng', 4300000::numeric, NULL, NULL, NULL, NULL, 0::numeric, 'Vận hành tháng này')
  ) AS seed(transaction_date, type, category, amount, revenue_source, payment_method, customer_source, learning_purpose, discount_amount, note)
  WHERE NOT EXISTS (SELECT 1 FROM financial_transactions);
`).catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS prospective_customers (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'Khác',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  INSERT INTO prospective_customers (source, status, created_at)
  SELECT * FROM (VALUES
    ('Facebook', 'enrolled', now() - interval '5 months'), ('Google', 'enrolled', now() - interval '4 months'), ('Website', 'lost', now() - interval '4 months'),
    ('Giới thiệu', 'enrolled', now() - interval '3 months'), ('TikTok', 'new', now() - interval '3 months'), ('Facebook', 'enrolled', now() - interval '2 months'),
    ('Google', 'contacted', now() - interval '2 months'), ('Website', 'enrolled', now() - interval '1 month'), ('TikTok', 'lost', now() - interval '1 month'),
    ('Facebook', 'enrolled', now()), ('Giới thiệu', 'contacted', now()), ('Google', 'new', now())
  ) AS seed(source, status, created_at)
  WHERE NOT EXISTS (SELECT 1 FROM prospective_customers);
`).catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS session_id INT REFERENCES sessions(id) ON DELETE SET NULL;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS description TEXT;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS note TEXT;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS material_kind TEXT NOT NULL DEFAULT \'blank\';').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_name TEXT;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_data TEXT;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_size TEXT;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_type TEXT;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_url TEXT;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS external_link TEXT;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT \'visible\';').catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS class_topics (
    id SERIAL PRIMARY KEY,
    class_id INT REFERENCES classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS assignment_kind TEXT NOT NULL DEFAULT \'quiz\';').catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS prompt_mode TEXT NOT NULL DEFAULT \'text\';').catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS prompt_text TEXT;').catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS prompt_image_name TEXT;').catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS prompt_image_data TEXT;').catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS prompt_image_type TEXT;').catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS answer_mode TEXT NOT NULL DEFAULT \'text\';').catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS answer_text TEXT;').catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS answer_image_name TEXT;').catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS answer_image_data TEXT;').catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS answer_image_type TEXT;').catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS topic_id INT REFERENCES class_topics(id) ON DELETE SET NULL;').catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS topic_title TEXT;').catch(console.error);
pool.query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS quiz_payload JSONB NOT NULL DEFAULT \'[]\'::jsonb;').catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS schedule_adjustments (
    id SERIAL PRIMARY KEY,
    class_id INT REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    custom_hours TEXT,
    type VARCHAR(50) DEFAULT 'rescheduled',
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS session_teacher_assignments (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_type VARCHAR(20) NOT NULL DEFAULT 'substitute',
    note TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(session_id, teacher_id)
  );
`).catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS feedbacks (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`).catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    class_id INT REFERENCES classes(id) ON DELETE CASCADE,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'present',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, student_id, date)
  );
`).catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS daily_scores (
    id SERIAL PRIMARY KEY,
    class_id INT REFERENCES classes(id) ON DELETE CASCADE,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    score NUMERIC(4,2),
    note TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, student_id, date)
  );
  CREATE TABLE IF NOT EXISTS homework_progress (
    id SERIAL PRIMARY KEY,
    class_id INT REFERENCES classes(id) ON DELETE CASCADE,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'none',
    note TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, student_id, date)
  );
`).catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    class_id INT REFERENCES classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    note TEXT,
    file_name TEXT,
    file_data TEXT,
    file_size TEXT,
    file_type TEXT,
    uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(console.error);
pool.query(`
  DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM ('normal', 'important', 'urgent');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;

  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT,
    type VARCHAR(50) DEFAULT 'general',
    class_id INT REFERENCES classes(id) ON DELETE CASCADE,
    target_role VARCHAR(20) DEFAULT 'all',
    sender_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    receiver_type TEXT DEFAULT 'all',
    receiver_ids INTEGER[] DEFAULT '{}',
    priority notification_priority NOT NULL DEFAULT 'normal',
    read_status JSONB NOT NULL DEFAULT '{}',
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(console.error);
pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS class_id INT REFERENCES classes(id) ON DELETE CASCADE;').catch(console.error);
pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT \'general\';').catch(console.error);
pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS content_html TEXT;').catch(console.error);
pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT \'[]\'::jsonb;').catch(console.error);
pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id INT REFERENCES users(id) ON DELETE SET NULL;').catch(console.error);
pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL;').catch(console.error);
pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS receiver_type TEXT DEFAULT \'all\';').catch(console.error);
pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS receiver_ids INTEGER[] DEFAULT \'{}\';').catch(console.error);
pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority notification_priority NOT NULL DEFAULT \'normal\';').catch(console.error);
pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_status JSONB NOT NULL DEFAULT \'{}\';').catch(console.error);
pool.query('ALTER TABLE notifications ALTER COLUMN receiver_type DROP NOT NULL;').catch(console.error);
pool.query(`
  INSERT INTO notifications (title, content, type, class_id, target_role, sender_id, created_by, receiver_type, receiver_ids, priority, created_at)
  SELECT item.title, item.content, item.type, NULL, 'all', admin_user.id, admin_user.id, 'all', '{}', item.priority::notification_priority, now() - (item.position || ' hours')::interval
  FROM (VALUES
    (1, 'Nhắc chuẩn bị bài trước buổi học', 'Học viên vui lòng xem lại nội dung buổi trước, ghi chú câu hỏi thắc mắc và chuẩn bị tài liệu cần thiết trước khi vào lớp.', 'class', 'important'),
    (2, 'Cập nhật lịch học bù tuần này', 'Lớp sẽ có lịch học bù theo thông báo của giảng viên. Vui lòng kiểm tra lịch trong mục lớp học và phản hồi nếu trùng lịch cá nhân.', 'class', 'urgent'),
    (3, 'Yêu cầu nộp bài tập cuối chương', 'Các em hoàn thành bài tập cuối chương và nộp đúng hạn để giảng viên kịp nhận xét trước buổi ôn tập.', 'class', 'important'),
    (4, 'Tài liệu mới đã được đăng', 'Bộ tài liệu ôn tập và câu hỏi luyện tập đã được cập nhật. Học viên nên tải về và học theo thứ tự gợi ý.', 'general', 'normal'),
    (5, 'Nhắc quy định điểm danh', 'Vui lòng vào lớp đúng giờ, điểm danh đầu buổi và báo trước cho giảng viên nếu cần nghỉ học.', 'general', 'important'),
    (6, 'Thông báo kiểm tra nhanh đầu giờ', 'Buổi học tới sẽ có phần kiểm tra nhanh 10 phút để đánh giá mức độ nắm bài. Nội dung nằm trong phần đã học gần nhất.', 'class', 'urgent'),
    (7, 'Cập nhật kênh hỗ trợ học viên', 'Mọi thắc mắc về bài học, lịch học hoặc tài liệu, học viên gửi phản hồi qua hệ thống để được xử lý tập trung.', 'general', 'normal'),
    (8, 'Nhắc hoàn thành khảo sát sau buổi học', 'Sau mỗi buổi học, học viên vui lòng hoàn thành khảo sát ngắn để trung tâm cải thiện chất lượng giảng dạy.', 'general', 'normal'),
    (9, 'Chuẩn bị nội dung thảo luận nhóm', 'Mỗi nhóm chuẩn bị phần trình bày ngắn về chủ đề đã phân công. Giảng viên sẽ gọi ngẫu nhiên trong buổi học.', 'class', 'important'),
    (10, 'Thông báo bảo trì hệ thống học tập', 'Hệ thống có thể gián đoạn ngắn trong khung giờ bảo trì. Vui lòng lưu bài làm trước khi thao tác.', 'general', 'urgent')
  ) AS item(position, title, content, type, priority)
  CROSS JOIN LATERAL (SELECT id FROM users WHERE role IN ('owner', 'admin') ORDER BY CASE role WHEN 'owner' THEN 0 ELSE 1 END, id LIMIT 1) admin_user
  WHERE NOT EXISTS (SELECT 1 FROM notifications);
`).catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS online_exams (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT,
    class_id INT REFERENCES classes(id) ON DELETE CASCADE,
    description TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_minutes INT DEFAULT 45,
    show_answers_after_submit BOOLEAN DEFAULT false,
    show_score_after_submit BOOLEAN DEFAULT true,
    max_attempts INT DEFAULT 1,
    shuffle_questions BOOLEAN DEFAULT true,
    shuffle_options BOOLEAN DEFAULT true,
    display_mode VARCHAR(20) DEFAULT 'one',
    auto_submit BOOLEAN DEFAULT true,
    random_question_count INT DEFAULT 0,
    question_delivery_mode VARCHAR(20) DEFAULT 'same',
    shared_question_ids JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'published',
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS is_library BOOLEAN DEFAULT false;
`).catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS question_bank (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES online_exams(id) ON DELETE CASCADE,
    class_id INT REFERENCES classes(id) ON DELETE SET NULL,
    subject TEXT,
    chapter TEXT,
    topic TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium',
    type VARCHAR(30) DEFAULT 'single_choice',
    question_text TEXT NOT NULL,
    options JSONB,
    correct_answers JSONB,
    points NUMERIC(5,2) DEFAULT 1.0,
    grading_guide TEXT,
    tags TEXT[],
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS exam_submissions (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES online_exams(id) ON DELETE CASCADE,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    attempt_number INT DEFAULT 1,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submit_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'in_progress',
    total_score NUMERIC(5,2),
    max_score NUMERIC(5,2),
    answers JSONB DEFAULT '{}'::jsonb,
    essay_scores JSONB DEFAULT '{}'::jsonb,
    teacher_feedback TEXT,
    graded_by INT REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMP
  );
`).catch(console.error);
pool.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS instructions TEXT`).catch(console.error);
pool.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS due_time TIMESTAMP`).catch(console.error);
pool.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS proctoring_enabled BOOLEAN DEFAULT true`).catch(console.error);
pool.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS homework_enabled BOOLEAN DEFAULT false`).catch(console.error);
pool.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS assigned_teacher_ids JSONB DEFAULT '[]'::jsonb`).catch(console.error);
pool.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS rubric_locked_after_grade BOOLEAN DEFAULT true`).catch(console.error);
pool.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS random_question_count INT DEFAULT 0`).catch(console.error);
pool.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS question_delivery_mode VARCHAR(20) DEFAULT 'same'`).catch(console.error);
pool.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS shared_question_ids JSONB DEFAULT '[]'::jsonb`).catch(console.error);
pool.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS gradebook_name TEXT DEFAULT 'Bảng điểm'`).catch(console.error);
pool.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS grade_column_name TEXT DEFAULT 'Điểm kiểm tra'`).catch(console.error);
pool.query(`ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb`).catch(console.error);
pool.query(`ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS grade_level TEXT`).catch(console.error);
pool.query(`ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS class_id INT REFERENCES classes(id) ON DELETE SET NULL`).catch(console.error);
pool.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS proctoring_logs JSONB DEFAULT '[]'::jsonb`).catch(console.error);
pool.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS teacher_audio_feedback_url TEXT`).catch(console.error);
pool.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS assigned_grader_name TEXT`).catch(console.error);
pool.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS question_ids JSONB DEFAULT '[]'::jsonb`).catch(console.error);
pool.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS grade_details JSONB DEFAULT '{}'::jsonb`).catch(console.error);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const statusVi = {
    upcoming: 'Sắp bắt đầu',
    active: 'Đang học',
    completed: 'Đã hoàn thành',
    archived: 'Đã lưu trữ',
    not_started: 'Chưa học',
    in_progress: 'Đang học',
    cancelled: 'Đã hủy',
    rescheduled: 'Đổi lịch',
    draft: 'Nháp',
    published: 'Đã giao',
    closed: 'Đã đóng',
    unpaid: 'Chưa thu',
    partial: 'Thu một phần',
    paid: 'Đã thu đủ',
    waived: 'Miễn/giảm',
};
const asyncHandler = (handler) => {
    return (req, res, next) => {
        handler(req, res).catch(next);
    };
};
app.use(async (req, _res, next) => {
    try {
        const userId = req.header('x-user-id');
        if (userId) {
            const { rows } = await pool.query('SELECT id, role, full_name, username FROM users WHERE id = $1 AND status = $2', [userId, 'active']);
            req.user = rows[0];
        }
        next();
    }
    catch (error) {
        next(error);
    }
});
function requireUser(req, res) {
    if (!req.user) {
        res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục.' });
        return false;
    }
    return true;
}
function requireRole(req, res, roles) {
    if (!requireUser(req, res))
        return false;
    if (!roles.includes(req.user.role)) {
        res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' });
        return false;
    }
    return true;
}
async function canManageClass(user, classId) {
    if (!user)
        return false;
    if (user.role === 'owner' || user.role === 'admin')
        return true;
    if (user.role !== 'teacher')
        return false;
    const { rowCount } = await pool.query('SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2', [classId, user.id]);
    return (rowCount ?? 0) > 0;
}
async function canViewClass(user, classId) {
    if (!user)
        return false;
    if (user.role === 'owner' || user.role === 'admin')
        return true;
    if (user.role === 'teacher')
        return canManageClass(user, classId);
    const { rowCount } = await pool.query('SELECT 1 FROM enrollments WHERE class_id = $1 AND student_id = $2', [classId, user.id]);
    return (rowCount ?? 0) > 0;
}
async function buildClassGradebook(classId, viewer) {
    const [assignmentsRes, studentsRes, submissionsRes] = await Promise.all([
        pool.query(`SELECT id, title, max_score, assignment_kind, topic_title, due_date
             FROM tests
             WHERE class_id = $1 AND type = 'assignment' AND status <> 'draft'
             ORDER BY COALESCE(topic_id, 0), due_date NULLS LAST, created_at`, [classId]),
        viewer?.role === 'student'
            ? pool.query(`SELECT u.id, u.full_name, u.username, u.student_code
                 FROM enrollments e
                 JOIN users u ON u.id = e.student_id
                 WHERE e.class_id = $1 AND e.student_id = $2
                 ORDER BY u.full_name`, [classId, viewer.id])
            : pool.query(`SELECT u.id, u.full_name, u.username, u.student_code
                 FROM enrollments e
                 JOIN users u ON u.id = e.student_id
                 WHERE e.class_id = $1
                 ORDER BY u.full_name`, [classId]),
        pool.query(`SELECT sub.test_id, sub.student_id, sub.id AS submission_id,
                    CASE
                        WHEN sub.id IS NULL THEN 'missing'
                        WHEN sub.score IS NOT NULL THEN 'graded'
                        ELSE 'submitted'
                    END AS status,
                    sub.score, sub.feedback, sub.submitted_at, sub.answer, sub.file_url
             FROM submissions sub
             JOIN tests test ON test.id = sub.test_id
             WHERE test.class_id = $1 AND test.type = 'assignment'`, [classId]),
    ]);
    const submissionsByKey = new Map();
    submissionsRes.rows.forEach((submission) => {
        submissionsByKey.set(`${submission.student_id}-${submission.test_id}`, submission);
    });
    return {
        assignments: assignmentsRes.rows,
        rows: studentsRes.rows.map((student) => ({
            student_id: student.id,
            student_name: student.full_name,
            username: student.username,
            student_code: student.student_code,
            scores: assignmentsRes.rows.map((assignment) => {
                const submission = submissionsByKey.get(`${student.id}-${assignment.id}`);
                return submission ? {
                    test_id: assignment.id,
                    submission_id: submission.submission_id,
                    status: submission.status,
                    score: submission.score,
                    feedback: submission.feedback,
                    submitted_at: submission.submitted_at,
                    answer: submission.answer,
                    file_url: submission.file_url,
                } : {
                    test_id: assignment.id,
                    status: 'missing',
                    score: null,
                    feedback: '',
                    answer: '',
                    file_url: '',
                    submitted_at: null,
                };
            }),
        })),
    };
}
function validatePasswordInput(newPassword, confirmPassword) {
    if (!newPassword || newPassword.length < 6)
        return 'Mật khẩu mới phải có ít nhất 6 ký tự.';
    if (newPassword !== confirmPassword)
        return 'Xác nhận mật khẩu không khớp.';
    return '';
}
const maxNotificationAttachments = 3;
const maxNotificationAttachmentSize = 6 * 1024 * 1024;
const maxNotificationAttachmentDataLength = 9 * 1024 * 1024;
function normalizeNotificationAttachments(input) {
    if (input == null || input === '')
        return { attachments: [] };
    if (!Array.isArray(input))
        return { attachments: [], error: 'Tệp đính kèm không hợp lệ.' };
    if (input.length > maxNotificationAttachments)
        return { attachments: [], error: `Chỉ được tải tối đa ${maxNotificationAttachments} tệp cho mỗi thông báo.` };
    const attachments = [];
    for (const raw of input) {
        if (!raw || typeof raw !== 'object')
            return { attachments: [], error: 'Tệp đính kèm không hợp lệ.' };
        const record = raw;
        const name = String(record.name || '').trim().slice(0, 180);
        const data = String(record.data || '');
        const type = String(record.type || 'application/octet-stream').slice(0, 120);
        const size = Number(record.size || 0);
        if (!name || !data.startsWith('data:'))
            return { attachments: [], error: 'Tệp đính kèm thiếu tên hoặc dữ liệu.' };
        if (Number.isFinite(size) && size > maxNotificationAttachmentSize)
            return { attachments: [], error: `Tệp "${name}" vượt quá giới hạn 6MB.` };
        if (data.length > maxNotificationAttachmentDataLength)
            return { attachments: [], error: `Tệp "${name}" vượt quá giới hạn lưu trữ.` };
        attachments.push({
            id: String(record.id || `${Date.now()}-${attachments.length}`),
            name,
            type,
            size: Number.isFinite(size) ? size : 0,
            data,
            uploaded_at: String(record.uploaded_at || new Date().toISOString()),
        });
    }
    return { attachments };
}
async function autoApprovePasswordResetRequests() {
    await pool.query(`
        UPDATE password_reset_requests
        SET status = 'approved', approved_at = now(), auto_approved = true
        WHERE status = 'pending'
          AND requested_at <= now() - interval '5 minutes'
    `);
}
function randomAttendanceStatus(_classId, _studentId, _dateValue) {
    return 'present';
}
function randomAttendanceNote(_status) {
    return '';
}
async function syncAttendanceFromTimeline(_classId, _studentId) {
    return;
}
function createStudentCode(index) {
    return `VAT-ST-${String(Date.now()).slice(-4)}${String(index + 1).padStart(2, '0')}`;
}
app.get('/health', asyncHandler(async (_req, res) => {
    const dbResult = await pool.query('select now() as now');
    res.json({ status: 'ok', database: 'connected', time: dbResult.rows[0].now });
}));
app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const { rows } = await pool.query(`SELECT id, full_name, username, phone, student_code, role, specialty, status
     FROM users WHERE username = $1 AND password = $2 AND status = 'active'`, [username, password]);
    if (!rows[0]) {
        res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        return;
    }
    res.json({ user: rows[0] });
}));
app.post('/api/self-service/change-password', asyncHandler(async (req, res) => {
    const { username, old_password, new_password, confirm_password } = req.body;
    const validationError = validatePasswordInput(new_password, confirm_password);
    if (!username || !old_password) {
        res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu cũ.' });
        return;
    }
    if (validationError) {
        res.status(400).json({ message: validationError });
        return;
    }
    if (old_password === new_password) {
        res.status(400).json({ message: 'Mật khẩu mới không được trùng mật khẩu cũ.' });
        return;
    }
    const { rows } = await pool.query(`SELECT id FROM users WHERE username = $1 AND password = $2 AND role = 'student' AND status = 'active'`, [username, old_password]);
    if (!rows[0]) {
        res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu cũ không đúng.' });
        return;
    }
    await pool.query('UPDATE users SET password = $1, updated_at = now() WHERE id = $2', [new_password, rows[0].id]);
    res.json({ message: 'Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.' });
}));
app.post('/api/self-service/forgot-password/request', asyncHandler(async (req, res) => {
    const { username } = req.body;
    if (!username) {
        res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập.' });
        return;
    }
    const userResult = await pool.query(`SELECT id, username FROM users WHERE username = $1 AND role = 'student' AND status = 'active'`, [username]);
    if (!userResult.rows[0]) {
        res.status(404).json({ message: 'Không tìm thấy tài khoản học sinh.' });
        return;
    }
    await autoApprovePasswordResetRequests();
    const existing = await pool.query(`SELECT id, status, requested_at, approved_at
         FROM password_reset_requests
         WHERE user_id = $1 AND status IN ('pending', 'approved')
         ORDER BY requested_at DESC
         LIMIT 1`, [userResult.rows[0].id]);
    if (existing.rows[0]) {
        res.json({ message: existing.rows[0].status === 'approved' ? 'Yêu cầu đã được duyệt. Bạn có thể đổi mật khẩu mới.' : 'Yêu cầu của bạn đã được gửi.', request: existing.rows[0] });
        return;
    }
    const requestResult = await pool.query(`INSERT INTO password_reset_requests (user_id, username, status)
         VALUES ($1, $2, 'pending')
         RETURNING id, username, status, requested_at, approved_at, completed_at, auto_approved`, [userResult.rows[0].id, userResult.rows[0].username]);
    res.status(201).json({ message: 'Yêu cầu của bạn đã được gửi.', request: requestResult.rows[0] });
}));
app.get('/api/self-service/forgot-password/status', asyncHandler(async (req, res) => {
    const username = String(req.query.username ?? '').trim();
    if (!username) {
        res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập.' });
        return;
    }
    await autoApprovePasswordResetRequests();
    const { rows } = await pool.query(`SELECT pr.id, pr.username, pr.status, pr.requested_at, pr.approved_at, pr.completed_at, pr.auto_approved,
                u.full_name, u.phone, u.student_code
         FROM password_reset_requests pr
         JOIN users u ON u.id = pr.user_id
         WHERE pr.username = $1 AND u.role = 'student'
         ORDER BY pr.requested_at DESC
         LIMIT 1`, [username]);
    if (!rows[0]) {
        res.status(404).json({ message: 'Chưa có yêu cầu đổi mật khẩu cho tài khoản này.' });
        return;
    }
    res.json({ request: rows[0], can_change: rows[0].status === 'approved' });
}));
app.post('/api/self-service/forgot-password/complete', asyncHandler(async (req, res) => {
    const { username, new_password, confirm_password } = req.body;
    const validationError = validatePasswordInput(new_password, confirm_password);
    if (!username) {
        res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập.' });
        return;
    }
    if (validationError) {
        res.status(400).json({ message: validationError });
        return;
    }
    await autoApprovePasswordResetRequests();
    const { rows } = await pool.query(`SELECT pr.id, pr.user_id, u.password
         FROM password_reset_requests pr
         JOIN users u ON u.id = pr.user_id
         WHERE pr.username = $1 AND pr.status = 'approved' AND u.role = 'student' AND u.status = 'active'
         ORDER BY pr.requested_at DESC
         LIMIT 1`, [username]);
    if (!rows[0]) {
        res.status(403).json({ message: 'Yêu cầu chưa được duyệt hoặc đã hoàn thành.' });
        return;
    }
    if (rows[0].password === new_password) {
        res.status(400).json({ message: 'Mật khẩu mới không được trùng mật khẩu cũ.' });
        return;
    }
    await pool.query('UPDATE users SET password = $1, updated_at = now() WHERE id = $2', [new_password, rows[0].user_id]);
    await pool.query('UPDATE password_reset_requests SET status = $1, completed_at = now() WHERE id = $2', ['completed', rows[0].id]);
    res.json({ message: 'Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.' });
}));
app.get('/api/password-reset/requests', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['admin', 'owner']))
        return;
    await autoApprovePasswordResetRequests();
    const { rows } = await pool.query(`
        SELECT pr.id, pr.username, pr.status, pr.requested_at, pr.approved_at, pr.completed_at, pr.auto_approved,
               u.full_name, u.phone, u.student_code
        FROM password_reset_requests pr
        JOIN users u ON u.id = pr.user_id
        ORDER BY pr.requested_at DESC
    `);
    res.json({ requests: rows });
}));
app.post('/api/password-reset/requests/:id/approve', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['admin', 'owner']))
        return;
    const requestId = Number(req.params.id);
    if (!Number.isFinite(requestId)) {
        res.status(400).json({ message: 'Yêu cầu không hợp lệ.' });
        return;
    }
    const { rows } = await pool.query(`UPDATE password_reset_requests
         SET status = 'approved', approved_at = now(), approved_by = $1, auto_approved = false
         WHERE id = $2 AND status = 'pending'
         RETURNING id, username, status, requested_at, approved_at, completed_at, auto_approved`, [req.user.id, requestId]);
    if (!rows[0]) {
        res.status(404).json({ message: 'Không tìm thấy yêu cầu đang chờ duyệt.' });
        return;
    }
    res.json({ message: 'Đã xác nhận cho học sinh đổi mật khẩu.', request: rows[0] });
}));
app.get('/api/me', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    res.json({ user: req.user });
}));
app.get('/api/summary', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const role = req.user.role;
    const userId = req.user.id;
    const totals = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM classes) AS classes,
      (SELECT COUNT(*) FROM users WHERE role = 'teacher') AS teachers,
      (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
      (SELECT COUNT(*) FROM classes WHERE status = 'active') AS active_classes,
      (SELECT COUNT(*) FROM sessions WHERE start_time::date = CURRENT_DATE) AS today_sessions,
      (SELECT COUNT(*) FROM tuitions WHERE status IN ('unpaid','partial')) AS tuition_alerts
  `);
    const studentMetrics = role === 'student'
        ? await pool.query(`
        SELECT
          COUNT(DISTINCT e.class_id) AS my_classes,
          COUNT(DISTINCT s.id) FILTER (WHERE s.start_time > now()) AS upcoming_sessions,
          COUNT(DISTINCT m.id) AS materials,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'published') AS open_tests,
          ROUND(COALESCE(AVG(e.progress), 0)) AS progress
        FROM enrollments e
        LEFT JOIN sessions s ON s.class_id = e.class_id
        LEFT JOIN materials m ON m.class_id = e.class_id
        LEFT JOIN tests t ON t.class_id = e.class_id
        WHERE e.student_id = $1
      `, [userId])
        : null;
    const teacherMetrics = role === 'teacher'
        ? await pool.query(`
        SELECT
          COUNT(DISTINCT c.id) AS my_classes,
          COUNT(DISTINCT e.student_id) AS students,
          COUNT(DISTINCT s.id) FILTER (WHERE s.start_time >= now() AND s.start_time < now() + interval '7 days') AS week_sessions,
          COUNT(DISTINCT sub.id) FILTER (WHERE sub.score IS NULL) AS pending_grades,
          COUNT(DISTINCT c.id) FILTER (WHERE c.progress < 35 AND c.status = 'active') AS slow_classes
        FROM classes c
        LEFT JOIN enrollments e ON e.class_id = c.id
        LEFT JOIN sessions s ON s.class_id = c.id
        LEFT JOIN tests t ON t.class_id = c.id
        LEFT JOIN submissions sub ON sub.test_id = t.id
        WHERE c.teacher_id = $1
      `, [userId])
        : null;
    res.json({ totals: totals.rows[0], roleMetrics: studentMetrics?.rows[0] ?? teacherMetrics?.rows[0] ?? totals.rows[0] });
}));
app.get('/api/owner/general-report', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner']))
        return;
    const { rows } = await pool.query(`
        SELECT
            (SELECT COUNT(*) FROM users WHERE role = 'student')::int AS total_students,
            (SELECT COUNT(*) FROM users WHERE role = 'student' AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE))::int AS new_students_this_month,
            (SELECT COUNT(*) FROM classes WHERE date_trunc('month', COALESCE(end_date::timestamp, updated_at)) = date_trunc('month', CURRENT_DATE) AND status IN ('completed', 'archived'))::int AS completed_classes_this_month,
            (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions WHERE type = 'income' AND date_trunc('month', transaction_date) = date_trunc('month', CURRENT_DATE))::float AS revenue_this_month,
            (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions WHERE type = 'expense' AND date_trunc('month', transaction_date) = date_trunc('month', CURRENT_DATE))::float AS expenses_this_month
    `);
    res.json({ overview: rows[0] });
}));
app.get('/api/classes', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const user = req.user;
    const params = [];
    let where = '';
    if (user.role === 'student') {
        params.push(user.id);
        where = 'WHERE EXISTS (SELECT 1 FROM enrollments e WHERE e.class_id = c.id AND e.student_id = $1)';
    }
    else if (user.role === 'teacher') {
        params.push(user.id);
        where = 'WHERE c.teacher_id = $1';
    }
    const { rows } = await pool.query(`
    SELECT c.*, ${Object.keys(statusVi).map((k) => `WHEN '${k}' THEN '${statusVi[k]}'`).join(' ')} END AS status_label,
      COALESCE(NULLIF(u.full_name, ''), u.username) AS teacher_name,
      COUNT(e.student_id)::int AS student_count
    FROM classes c
    LEFT JOIN users u ON u.id = c.teacher_id
    LEFT JOIN enrollments e ON e.class_id = c.id
    ${where}
    GROUP BY c.id, u.id, u.full_name, u.username
    ORDER BY c.start_date DESC, c.id DESC
  `.replace('SELECT c.*, WHEN', 'SELECT c.*, CASE c.status::text WHEN'), params);
    res.json({ classes: rows });
}));
app.get('/api/student/deadlines', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['student']))
        return;
    const { rows } = await pool.query(`
        SELECT t.id, t.title, t.description, t.type, t.due_date, t.status,
               c.id AS class_id, c.name AS class_name, c.code AS class_code,
               s.id AS student_submission_id, s.submitted_at AS student_submitted_at
        FROM tests t
        JOIN classes c ON c.id = t.class_id
        JOIN enrollments e ON e.class_id = c.id AND e.student_id = $1
        LEFT JOIN submissions s ON s.test_id = t.id AND s.student_id = $1
        WHERE t.status = 'published'
          AND t.type = 'assignment'
          AND t.due_date IS NOT NULL
          AND t.due_date >= now()
          AND t.due_date < now() + interval '7 days'
          AND s.id IS NULL
        ORDER BY t.due_date ASC, t.id ASC
    `, [req.user.id]);
    res.json({ deadlines: rows });
}));
app.get('/api/student/score-progress', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['student']))
        return;
    const studentId = req.user.id;
    const requestedClassId = req.query.classId ? Number(req.query.classId) : null;
    const assignmentParams = [studentId];
    let classFilter1 = '';
    if (requestedClassId && !Number.isNaN(requestedClassId)) {
        assignmentParams.push(requestedClassId);
        classFilter1 = `AND c.id = $${assignmentParams.length}`;
    }
    const { rows: assignmentRows } = await pool.query(`
        SELECT s.id AS submission_id,
               s.test_id,
               s.score,
               s.feedback,
               COALESCE(s.submitted_at, s.graded_at, t.created_at) AS test_date,
               t.title AS test_title,
               t.max_score,
               t.assignment_kind,
               t.type AS test_type,
               c.id AS class_id,
               c.name AS class_name,
               c.code AS class_code,
               c.subject AS class_subject
        FROM submissions s
        JOIN tests t ON t.id = s.test_id
        JOIN classes c ON c.id = t.class_id
        JOIN enrollments e ON e.class_id = c.id AND e.student_id = $1
        WHERE s.student_id = $1
          AND s.score IS NOT NULL
          ${classFilter1}
        ORDER BY COALESCE(s.submitted_at, s.graded_at, t.created_at) ASC
    `, assignmentParams);
    const examParams = [studentId];
    let classFilter2 = '';
    if (requestedClassId && !Number.isNaN(requestedClassId)) {
        examParams.push(requestedClassId);
        classFilter2 = `AND c.id = $${examParams.length}`;
    }
    let examRows = [];
    try {
        const { rows } = await pool.query(`
            SELECT es.id AS submission_id,
                   es.exam_id,
                   es.total_score AS score,
                   es.teacher_feedback AS feedback,
                   COALESCE(es.submit_time, es.start_time, oe.created_at) AS test_date,
                   oe.title AS test_title,
                   10 AS max_score,
                   'online_exam' AS test_type,
                   c.id AS class_id,
                   c.name AS class_name,
                   c.code AS class_code,
                   c.subject AS class_subject
            FROM exam_submissions es
            JOIN online_exams oe ON oe.id = es.exam_id
            JOIN classes c ON c.id = oe.class_id
            JOIN enrollments e ON e.class_id = c.id AND e.student_id = $1
            WHERE es.student_id = $1
              AND es.total_score IS NOT NULL
              ${classFilter2}
            ORDER BY COALESCE(es.submit_time, es.start_time, oe.created_at) ASC
        `, examParams);
        examRows = rows;
    }
    catch {
        examRows = [];
    }
    const merged = [
        ...assignmentRows.map((row) => {
            const rawScore = Number(row.score) || 0;
            const maxScore = Number(row.max_score) || 10;
            const scaled10 = maxScore > 0 ? Math.min(10, Math.round((rawScore / maxScore) * 10 * 10) / 10) : rawScore;
            const percentage = maxScore > 0 ? Math.min(100, Math.round((rawScore / maxScore) * 100)) : 0;
            return {
                id: `assignment-${row.submission_id}`,
                test_id: row.test_id,
                source: 'assignment',
                title: row.test_title,
                class_id: row.class_id,
                class_name: row.class_name,
                class_code: row.class_code,
                subject: row.class_subject || 'Tiếng Anh',
                date: row.test_date,
                score: rawScore,
                max_score: maxScore,
                scaled_score_10: scaled10,
                percentage,
                feedback: row.feedback || '',
            };
        }),
        ...examRows.map((row) => {
            const rawScore = Number(row.score) || 0;
            const maxScore = Number(row.max_score) || 10;
            const scaled10 = maxScore > 0 ? Math.min(10, Math.round((rawScore / maxScore) * 10 * 10) / 10) : rawScore;
            const percentage = maxScore > 0 ? Math.min(100, Math.round((rawScore / maxScore) * 100)) : 0;
            return {
                id: `exam-${row.submission_id}`,
                test_id: row.exam_id,
                source: 'online_exam',
                title: row.test_title,
                class_id: row.class_id,
                class_name: row.class_name,
                class_code: row.class_code,
                subject: row.class_subject || 'Tiếng Anh',
                date: row.test_date,
                score: rawScore,
                max_score: maxScore,
                scaled_score_10: scaled10,
                percentage,
                feedback: row.feedback || '',
            };
        }),
    ];
    merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningBest = 0;
    const items = merged.map((item, index) => {
        const prev = index > 0 ? merged[index - 1] : null;
        const delta = prev ? Math.round((item.scaled_score_10 - prev.scaled_score_10) * 10) / 10 : 0;
        if (item.scaled_score_10 > runningBest)
            runningBest = item.scaled_score_10;
        return {
            ...item,
            delta,
            is_personal_best: item.scaled_score_10 === runningBest && item.scaled_score_10 >= 8.0,
        };
    });
    const { rows: studentClasses } = await pool.query(`
        SELECT c.id, c.name, c.code, c.subject
        FROM enrollments e
        JOIN classes c ON c.id = e.class_id
        WHERE e.student_id = $1
        ORDER BY c.name
    `, [studentId]);
    const count = items.length;
    const scores = items.map((i) => i.scaled_score_10);
    const average = count > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / count) * 10) / 10 : 0;
    const highest = count > 0 ? Math.max(...scores) : 0;
    const lowest = count > 0 ? Math.min(...scores) : 0;
    const latest = items[items.length - 1]?.scaled_score_10 ?? 0;
    const first = items[0]?.scaled_score_10 ?? 0;
    const growth = count > 1 ? Math.round((latest - first) * 10) / 10 : 0;
    let trendText = 'Chưa có đủ bài kiểm tra';
    let trendTone = 'neutral';
    if (count >= 2) {
        if (growth > 1.0) {
            trendText = `Tiến bộ vượt bậc (+${growth}đ)`;
            trendTone = 'improving';
        }
        else if (growth > 0) {
            trendText = `Đang có tiến bộ (+${growth}đ)`;
            trendTone = 'improving';
        }
        else if (growth === 0) {
            trendText = 'Phong độ duy trì ổn định';
            trendTone = 'steady';
        }
        else {
            trendText = `Cần lưu ý (${growth}đ)`;
            trendTone = 'declining';
        }
    }
    res.json({
        items,
        classes: studentClasses,
        stats: {
            total_tests: count,
            average_score: average,
            highest_score: highest,
            lowest_score: lowest,
            latest_score: latest,
            first_score: first,
            growth_score: growth,
            trend_text: trendText,
            trend_tone: trendTone,
        },
    });
}));
app.get('/api/teacher/review-items', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['teacher', 'admin', 'owner']))
        return;
    const user = req.user;
    const params = [];
    let teacherFilter = '';
    if (user.role === 'teacher') {
        params.push(user.id);
        teacherFilter = `AND c.teacher_id = $${params.length}`;
    }
    const { rows } = await pool.query(`
        SELECT sub.id, sub.test_id, sub.student_id, sub.submitted_at, sub.score, sub.feedback,
               test.title, test.description, test.type, test.due_date, test.status,
               c.id AS class_id, c.name AS class_name, c.code AS class_code,
               u.full_name AS student_name, u.username, u.student_code
        FROM submissions sub
        JOIN tests test ON test.id = sub.test_id
        JOIN classes c ON c.id = test.class_id
        JOIN users u ON u.id = sub.student_id
        WHERE test.type = 'assignment'
          AND sub.submitted_at >= now() - interval '7 days'
          AND sub.score IS NULL
          ${teacherFilter}
        ORDER BY sub.submitted_at DESC, sub.id DESC
    `, params);
    res.json({ reviewItems: rows });
}));
app.get('/api/admin/assignments', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['admin', 'owner']))
        return;
    const { rows } = await pool.query(`
        SELECT test.id, test.class_id, test.title, test.description, test.type, test.due_date,
               test.max_score, test.status, test.assignment_kind, test.topic_id, test.topic_title,
               test.created_at,
               c.name AS class_name, c.code AS class_code, c.subject AS class_subject,
               teacher.id AS teacher_id,
               COALESCE(NULLIF(teacher.full_name, ''), teacher.username, 'Chưa phân công') AS teacher_name,
               creator.id AS created_by,
               COALESCE(NULLIF(creator.full_name, ''), creator.username, 'Hệ thống') AS created_by_name,
               COUNT(DISTINCT e.student_id)::int AS enrolled_count,
               COUNT(DISTINCT sub.id)::int AS submitted_count,
               COUNT(DISTINCT sub.id) FILTER (WHERE sub.score IS NOT NULL)::int AS graded_count,
               COUNT(DISTINCT sub.id) FILTER (WHERE sub.id IS NOT NULL AND sub.score IS NULL)::int AS ungraded_count
        FROM tests test
        JOIN classes c ON c.id = test.class_id
        LEFT JOIN users teacher ON teacher.id = c.teacher_id
        LEFT JOIN users creator ON creator.id = test.created_by
        LEFT JOIN enrollments e ON e.class_id = test.class_id
        LEFT JOIN submissions sub ON sub.test_id = test.id
        WHERE test.type = 'assignment'
        GROUP BY test.id, c.id, teacher.id, creator.id
        ORDER BY test.created_at DESC, test.due_date NULLS LAST, test.id DESC
    `);
    res.json({ assignments: rows });
}));
app.post('/api/classes', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin']))
        return;
    const { name, code, subject, teacher_id, start_date, end_date, schedule, class_hours, location, description, students_csv } = req.body;
    const classCode = code || `VAT-CLS-${String(Date.now()).slice(-6)}`;
    const { rows } = await pool.query(`INSERT INTO classes (name, code, subject, teacher_id, start_date, end_date, schedule, class_hours, location, description, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'upcoming') RETURNING *`, [name, classCode, subject || 'Chưa xếp môn', teacher_id || null, start_date || null, end_date || null, schedule || null, class_hours || null, location || null, description || null]);
    const createdClass = rows[0];
    const createdStudents = [];
    if (students_csv && createdClass) {
        const rawLines = String(students_csv).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        let lines = rawLines;
        if (lines.length > 0) {
            const firstLineLower = lines[0]?.toLowerCase() ?? '';
            if (firstLineLower.includes('full_name') || firstLineLower.includes('username') || firstLineLower.includes('họ') || firstLineLower.includes('tên')) {
                lines = lines.slice(1);
            }
        }
        for (const [index, line] of lines.entries()) {
            const parts = line.split(',').map((item) => item?.trim());
            if (!parts[0])
                continue;
            let [fullName, username, password, phone] = parts;
            if (!username) {
                username = fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                if (!username)
                    username = `student${Date.now()}${index}`;
            }
            const userPassword = password || 'vat1234';
            const studentCode = createStudentCode(index);
            // Insert or find existing student
            let studentId = null;
            const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
            if (existing.rows[0]) {
                studentId = existing.rows[0].id;
            }
            else {
                const inserted = await pool.query(`INSERT INTO users (full_name, username, role, password, phone, student_code)
                     VALUES ($1, $2, 'student', $3, $4, $5)
                     RETURNING id`, [fullName, username, userPassword, phone || null, studentCode]);
                if (inserted.rows[0]) {
                    studentId = inserted.rows[0].id;
                    createdStudents.push(inserted.rows[0]);
                }
            }
            if (studentId) {
                await pool.query('INSERT INTO enrollments (class_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [createdClass.id, studentId]);
                await pool.query('INSERT INTO tuitions (class_id, student_id, amount_due, status) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [createdClass.id, studentId, 0, 'unpaid']);
            }
        }
    }
    res.status(201).json({ class: createdClass, student_count: createdStudents.length });
}));
app.delete('/api/classes/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin']))
        return;
    const classId = Number(req.params.id);
    await pool.query('DELETE FROM classes WHERE id = $1', [classId]);
    res.json({ message: 'Đã xóa lớp học thành công.' });
}));
app.put('/api/classes/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const classId = Number(req.params.id);
    const { name, code, subject, teacher_id, schedule, class_hours, location, description } = req.body;
    const { rows } = await pool.query(`UPDATE classes SET
            name = COALESCE($1, name),
            code = COALESCE($2, code),
            subject = COALESCE($3, subject),
            teacher_id = $4,
            schedule = COALESCE($5, schedule),
            class_hours = COALESCE($6, class_hours),
            location = COALESCE($7, location),
            description = COALESCE($8, description)
        WHERE id = $9 RETURNING *`, [name, code, subject, teacher_id || null, schedule, class_hours, location, description, classId]);
    res.json({ class: rows[0], message: 'Đã cập nhật thông tin lớp học thành công.' });
}));
app.get('/api/schedule/adjustments', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const { rows } = await pool.query(`
        SELECT sa.*, c.name AS class_name, c.code AS class_code, c.location
        FROM schedule_adjustments sa
        JOIN classes c ON c.id = sa.class_id
        ORDER BY sa.date DESC, sa.id DESC
    `);
    res.json({ adjustments: rows });
}));
app.post('/api/schedule/adjustments', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const { class_id, date, custom_hours, type, reason } = req.body;
    if (!class_id || !date) {
        res.status(400).json({ message: 'Vui lòng chọn lớp học và ngày áp dụng' });
        return;
    }
    const { rows } = await pool.query(`INSERT INTO schedule_adjustments (class_id, date, custom_hours, type, reason)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`, [Number(class_id), date, custom_hours || null, type || 'rescheduled', reason || null]);
    res.status(201).json({ adjustment: rows[0], message: 'Đã tạo điều chỉnh lịch đột xuất thành công.' });
}));
app.delete('/api/schedule/adjustments/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const id = Number(req.params.id);
    await pool.query('DELETE FROM schedule_adjustments WHERE id = $1', [id]);
    res.json({ message: 'Đã xóa điều chỉnh lịch.' });
}));
// --- Sessions (Timeline) Endpoints ---
app.get('/api/sessions/class/:classId', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const { classId } = req.params;
    await syncAttendanceFromTimeline(Number(classId));
    const { rows } = await pool.query(`SELECT s.*,
                COUNT(a.id)::int AS attendance_total,
                COUNT(a.id) FILTER (WHERE a.status = 'present')::int AS present_count,
                COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent_count,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', m.id,
                            'class_id', m.class_id,
                            'class_name', c.name,
                            'title', m.title,
                            'description', m.description,
                            'note', m.note,
                            'file_name', m.file_name,
                            'file_size', m.file_size,
                            'file_type', m.file_type,
                            'file_url', m.file_url,
                            'external_link', m.external_link,
                            'uploaded_by_name', uploader.full_name,
                            'created_at', m.created_at
                        ) ORDER BY m.created_at DESC
                    ) FILTER (WHERE m.id IS NOT NULL),
                    '[]'::json
                ) AS materials
         FROM sessions s
         JOIN classes c ON c.id = s.class_id
         LEFT JOIN materials m ON m.session_id = s.id AND COALESCE(m.visibility, 'visible') = 'visible'
         LEFT JOIN users uploader ON uploader.id = m.uploaded_by
         LEFT JOIN attendance a ON a.class_id = s.class_id AND a.date = s.start_time::date
         WHERE s.class_id = $1
         GROUP BY s.id
         ORDER BY s.start_time ASC`, [classId]);
    res.json({ sessions: rows });
}));
app.post('/api/sessions', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const { class_id, title, description, start_time, end_time } = req.body;
    const { rows } = await pool.query(`INSERT INTO sessions (class_id, title, description, start_time, end_time, status) 
         VALUES ($1, $2, $3, $4, $5, 'not_started') RETURNING *`, [class_id, title, description, start_time, end_time]);
    res.json({ message: 'Tạo buổi học thành công', session: rows[0] });
}));
app.put('/api/sessions/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const { id } = req.params;
    const { title, description, start_time, end_time, status } = req.body;
    const { rows } = await pool.query(`UPDATE sessions 
         SET title = $1, description = $2, start_time = $3, end_time = $4, status = $5
         WHERE id = $6 RETURNING *`, [title, description, start_time, end_time, status, id]);
    res.json({ message: 'Cập nhật buổi học thành công', session: rows[0] });
}));
app.delete('/api/sessions/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const { id } = req.params;
    await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
    res.json({ message: 'Xóa buổi học thành công' });
}));
// --- Attendance Endpoints ---
app.get('/api/attendance/class/:classId', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const classId = Number(req.params.classId);
    const date = String(req.query.date || new Date().toISOString().split('T')[0]);
    await syncAttendanceFromTimeline(classId);
    // Check if explicit enrollments exist for this class
    const checkEnroll = await pool.query('SELECT 1 FROM enrollments WHERE class_id = $1 LIMIT 1', [classId]);
    const hasEnrollments = checkEnroll.rows.length > 0;
    const studentQuery = hasEnrollments
        ? `SELECT u.id AS student_id, u.full_name, u.username, u.student_code
           FROM enrollments e JOIN users u ON u.id = e.student_id
           WHERE e.class_id = $1 AND u.role = 'student' ORDER BY u.full_name`
        : `SELECT u.id AS student_id, u.full_name, u.username, u.student_code
           FROM users u WHERE u.role = 'student' ORDER BY u.full_name`;
    const [studentsRes, attendanceRes] = await Promise.all([
        pool.query(studentQuery, hasEnrollments ? [classId] : []),
        pool.query(`SELECT student_id, status, note FROM attendance WHERE class_id = $1 AND date = $2`, [classId, date])
    ]);
    const hasSavedAttendance = attendanceRes.rows.length > 0;
    const attMap = new Map(attendanceRes.rows.map(r => [r.student_id, r]));
    const records = studentsRes.rows.map(s => {
        const existing = attMap.get(s.student_id);
        const generatedStatus = randomAttendanceStatus(classId, s.student_id, date);
        return {
            student_id: s.student_id,
            full_name: s.full_name || s.username,
            username: s.username,
            student_code: s.student_code,
            status: existing ? existing.status : generatedStatus,
            note: existing ? (existing.note || '') : randomAttendanceNote(generatedStatus)
        };
    });
    res.json({ class_id: classId, date, has_saved: hasSavedAttendance, saved_count: attendanceRes.rows.length, records });
}));
app.get('/api/attendance/class/:classId/stats', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const classId = Number(req.params.classId);
    // Check if explicit enrollments exist for this class
    const checkEnroll = await pool.query('SELECT 1 FROM enrollments WHERE class_id = $1 LIMIT 1', [classId]);
    const hasEnrollments = checkEnroll.rows.length > 0;
    const studentQuery = hasEnrollments
        ? `SELECT u.id AS student_id, u.full_name, u.username, u.student_code
           FROM enrollments e JOIN users u ON u.id = e.student_id
           WHERE e.class_id = $1 AND u.role = 'student' ORDER BY u.full_name`
        : `SELECT u.id AS student_id, u.full_name, u.username, u.student_code
           FROM users u WHERE u.role = 'student' ORDER BY u.full_name`;
    const [studentsRes, attendanceRes, sessionsRes] = await Promise.all([
        pool.query(studentQuery, hasEnrollments ? [classId] : []),
        pool.query(`SELECT a.student_id, a.status, a.date::text AS date, a.note,
                    s.id AS session_id, s.title AS session_title
             FROM attendance a
             LEFT JOIN sessions s ON s.class_id = a.class_id AND s.start_time::date = a.date
             WHERE a.class_id = $1
             ORDER BY a.date DESC`, [classId]),
        pool.query(`SELECT COUNT(DISTINCT date)::int AS total_sessions
             FROM attendance
             WHERE class_id = $1`, [classId])
    ]);
    const totalSessions = sessionsRes.rows[0]?.total_sessions || 0;
    const studentStatsMap = new Map();
    const studentRecordsMap = new Map();
    for (const row of attendanceRes.rows) {
        const sid = Number(row.student_id);
        if (!studentStatsMap.has(sid)) {
            studentStatsMap.set(sid, { present: 0, absent: 0, late: 0, total: 0 });
            studentRecordsMap.set(sid, []);
        }
        const st = studentStatsMap.get(sid);
        st.total += 1;
        if (row.status === 'present')
            st.present += 1;
        else if (row.status === 'absent')
            st.absent += 1;
        else if (row.status === 'late')
            st.late += 1;
        const dateStr = typeof row.date === 'string' ? row.date.split('T')[0] : new Date(row.date).toISOString().split('T')[0];
        studentRecordsMap.get(sid).push({
            date: dateStr,
            status: row.status,
            note: row.note || '',
            session_id: row.session_id ? Number(row.session_id) : null,
            session_title: row.session_title || null
        });
    }
    const students = studentsRes.rows.map((s) => {
        const sid = Number(s.student_id);
        const st = studentStatsMap.get(sid) || { present: 0, absent: 0, late: 0, total: 0 };
        const totalRecorded = st.total;
        const rate = totalRecorded > 0 ? Math.round(((st.present + st.late * 0.7) / totalRecorded) * 100) : 100;
        let category = 'good';
        const isHighAbsence = st.absent >= 3 ||
            (totalSessions <= 2 && (st.absent >= 2 || (st.absent >= 1 && st.late >= 1))) ||
            (totalSessions > 2 && st.absent >= 2 && rate < 75);
        if (isHighAbsence) {
            category = 'danger';
        }
        else if (st.absent >= 1 || st.late >= 1) {
            category = 'warning';
        }
        else {
            category = 'good';
        }
        const rawRecords = studentRecordsMap.get(sid) || [];
        // Sort descending by date
        const attendanceHistory = [...rawRecords].sort((a, b) => b.date.localeCompare(a.date));
        const absentDates = attendanceHistory
            .filter((r) => r.status === 'absent')
            .map((r) => ({
            date: r.date,
            status: r.status,
            status_text: 'Vắng mặt',
            note: r.note || '',
            session_title: r.session_title || ''
        }));
        const lateDates = attendanceHistory
            .filter((r) => r.status === 'late')
            .map((r) => ({
            date: r.date,
            status: r.status,
            status_text: 'Đi muộn',
            note: r.note || '',
            session_title: r.session_title || ''
        }));
        return {
            student_id: sid,
            full_name: s.full_name || s.username,
            username: s.username,
            student_code: s.student_code,
            present_count: st.present,
            absent_count: st.absent,
            late_count: st.late,
            total_recorded: totalRecorded,
            rate: Math.min(100, Math.max(0, rate)),
            category,
            absent_dates: absentDates,
            late_dates: lateDates,
            attendance_history: attendanceHistory
        };
    });
    students.sort((a, b) => {
        if (b.absent_count !== a.absent_count)
            return b.absent_count - a.absent_count;
        if (b.late_count !== a.late_count)
            return b.late_count - a.late_count;
        return a.full_name.localeCompare(b.full_name);
    });
    const summary = {
        total_students: students.length,
        total_sessions: totalSessions,
        good_count: students.filter((s) => s.category === 'good').length,
        warning_count: students.filter((s) => s.category === 'warning').length,
        danger_count: students.filter((s) => s.category === 'danger').length
    };
    res.json({
        class_id: classId,
        summary,
        students
    });
}));
app.get('/api/attendance/class/:classId/student/:studentId', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const classId = Number(req.params.classId);
    const studentId = Number(req.params.studentId);
    const [userRes, attendanceRes, classRes] = await Promise.all([
        pool.query(`SELECT id, full_name, username, student_code, phone FROM users WHERE id = $1`, [studentId]),
        pool.query(`SELECT a.id, a.class_id, a.student_id, a.date::text AS date, a.status, a.note, a.created_at,
                    s.id AS session_id, s.title AS session_title, s.start_time, s.end_time
             FROM attendance a
             LEFT JOIN sessions s ON s.class_id = a.class_id AND s.start_time::date = a.date
             WHERE a.class_id = $1 AND a.student_id = $2
             ORDER BY a.date DESC`, [classId, studentId]),
        pool.query(`SELECT id, name, code FROM classes WHERE id = $1`, [classId])
    ]);
    if (!userRes.rows[0]) {
        res.status(404).json({ message: 'Không tìm thấy học sinh' });
        return;
    }
    const student = userRes.rows[0];
    const records = attendanceRes.rows.map(r => ({
        id: r.id,
        date: typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0],
        status: r.status,
        note: r.note || '',
        session_id: r.session_id ? Number(r.session_id) : null,
        session_title: r.session_title || null,
        start_time: r.start_time,
        end_time: r.end_time
    }));
    const absentDates = records.filter(r => r.status === 'absent');
    const lateDates = records.filter(r => r.status === 'late');
    const presentDates = records.filter(r => r.status === 'present');
    const totalRecorded = records.length;
    const rate = totalRecorded > 0
        ? Math.round(((presentDates.length + lateDates.length * 0.7) / totalRecorded) * 100)
        : 100;
    res.json({
        student: {
            id: student.id,
            full_name: student.full_name || student.username,
            username: student.username,
            student_code: student.student_code,
            phone: student.phone
        },
        class: classRes.rows[0] || { id: classId },
        summary: {
            total_recorded: totalRecorded,
            present_count: presentDates.length,
            absent_count: records.filter(r => r.status === 'absent').length,
            late_count: lateDates.length,
            rate: Math.min(100, Math.max(0, rate))
        },
        absent_dates: absentDates,
        late_dates: lateDates,
        records
    });
}));
// --- Student profile (aggregated) ---
app.get('/api/students/:id/profile', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const studentId = Number(req.params.id);
    const userRes = await pool.query(`SELECT id, full_name, username, phone, student_code, role, status, note, created_at
         FROM users WHERE id = $1`, [studentId]);
    if (!userRes.rows[0]) {
        res.status(404).json({ message: 'Không tìm thấy học sinh' });
        return;
    }
    const [classesRes, attRes, scoreRes, hwRes, absentRes, tuitionRes] = await Promise.all([
        pool.query(`SELECT c.id, c.name, c.code, c.subject, c.schedule, c.status, t.full_name AS teacher_name
             FROM enrollments e
             JOIN classes c ON c.id = e.class_id
             LEFT JOIN users t ON t.id = c.teacher_id
             WHERE e.student_id = $1
             ORDER BY c.name`, [studentId]),
        pool.query(`SELECT class_id,
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE status = 'present')::int AS present,
                    COUNT(*) FILTER (WHERE status = 'absent')::int AS absent,
                    COUNT(*) FILTER (WHERE status = 'late')::int AS late
             FROM attendance WHERE student_id = $1 GROUP BY class_id`, [studentId]),
        pool.query(`SELECT class_id, COUNT(score)::int AS count, ROUND(AVG(score)::numeric, 2) AS average
             FROM daily_scores WHERE student_id = $1 GROUP BY class_id`, [studentId]),
        pool.query(`SELECT class_id,
                    COUNT(*) FILTER (WHERE level <> 'none')::int AS assigned,
                    ROUND(AVG(CASE level WHEN '100' THEN 100 WHEN '75' THEN 75 WHEN '50' THEN 50 WHEN 'incomplete' THEN 0 END)::numeric, 0) AS rate
             FROM homework_progress WHERE student_id = $1 GROUP BY class_id`, [studentId]),
        pool.query(`SELECT a.class_id, c.name AS class_name, a.date::text AS date, a.status, a.note
             FROM attendance a JOIN classes c ON c.id = a.class_id
             WHERE a.student_id = $1 AND a.status IN ('absent', 'late')
             ORDER BY a.date DESC LIMIT 20`, [studentId]),
        pool.query(`SELECT t.class_id, c.name AS class_name, t.amount_due, t.amount_paid, t.status
             FROM tuitions t JOIN classes c ON c.id = t.class_id
             WHERE t.student_id = $1`, [studentId]).catch(() => ({ rows: [] })),
    ]);
    const byClass = (rows) => new Map(rows.map((r) => [Number(r.class_id), r]));
    const attMap = byClass(attRes.rows);
    const scoreMap = byClass(scoreRes.rows);
    const hwMap = byClass(hwRes.rows);
    // Include classes that have activity even without an enrollment row
    const classIds = new Set(classesRes.rows.map((c) => Number(c.id)));
    const extraIds = [...attMap.keys(), ...scoreMap.keys(), ...hwMap.keys()].filter((id) => !classIds.has(id));
    let extraClasses = [];
    if (extraIds.length) {
        const r = await pool.query(`SELECT c.id, c.name, c.code, c.subject, c.schedule, c.status, t.full_name AS teacher_name
             FROM classes c LEFT JOIN users t ON t.id = c.teacher_id WHERE c.id = ANY($1::int[])`, [[...new Set(extraIds)]]);
        extraClasses = r.rows;
    }
    const classes = [...classesRes.rows, ...extraClasses].map((c) => {
        const id = Number(c.id);
        const a = attMap.get(id);
        const s = scoreMap.get(id);
        const h = hwMap.get(id);
        const total = a?.total ?? 0;
        const rate = total ? Math.round(((a.present + a.late * 0.7) / total) * 100) : null;
        return {
            id,
            name: c.name,
            code: c.code,
            subject: c.subject,
            schedule: c.schedule,
            status: c.status,
            teacher_name: c.teacher_name,
            attendance: { total, present: a?.present ?? 0, absent: a?.absent ?? 0, late: a?.late ?? 0, rate },
            score: { count: s?.count ?? 0, average: s?.average !== undefined && s?.average !== null ? Number(s.average) : null },
            homework: { assigned: h?.assigned ?? 0, rate: h?.rate !== undefined && h?.rate !== null ? Number(h.rate) : null },
        };
    });
    const sum = (fn) => classes.reduce((t, c) => t + fn(c), 0);
    const totalSessions = sum((c) => c.attendance.total);
    const scored = classes.filter((c) => c.score.average !== null);
    const hwRated = classes.filter((c) => c.homework.rate !== null);
    res.json({
        student: userRes.rows[0],
        summary: {
            class_count: classes.length,
            total_sessions: totalSessions,
            absent: sum((c) => c.attendance.absent),
            late: sum((c) => c.attendance.late),
            attendance_rate: totalSessions
                ? Math.round(((sum((c) => c.attendance.present) + sum((c) => c.attendance.late) * 0.7) / totalSessions) * 100)
                : null,
            score_average: scored.length ? Math.round((scored.reduce((t, c) => t + c.score.average, 0) / scored.length) * 100) / 100 : null,
            homework_rate: hwRated.length ? Math.round(hwRated.reduce((t, c) => t + c.homework.rate, 0) / hwRated.length) : null,
        },
        classes,
        recent_absences: absentRes.rows,
        tuitions: tuitionRes.rows.map((t) => ({ ...t, amount_due: Number(t.amount_due), amount_paid: Number(t.amount_paid) })),
    });
}));
// --- Daily scores & homework progress ---
const HOMEWORK_LEVELS = ['100', '75', '50', 'incomplete', 'none'];
async function getClassStudents(classId) {
    const checkEnroll = await pool.query('SELECT 1 FROM enrollments WHERE class_id = $1 LIMIT 1', [classId]);
    const query = checkEnroll.rows.length
        ? `SELECT u.id AS student_id, u.full_name, u.username, u.student_code
           FROM enrollments e JOIN users u ON u.id = e.student_id
           WHERE e.class_id = $1 AND u.role = 'student' ORDER BY u.full_name`
        : `SELECT u.id AS student_id, u.full_name, u.username, u.student_code
           FROM users u WHERE u.role = 'student' ORDER BY u.full_name`;
    const { rows } = await pool.query(query, checkEnroll.rows.length ? [classId] : []);
    return rows;
}
app.get('/api/tracking/class/:classId', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const classId = Number(req.params.classId);
    const date = String(req.query.date || new Date().toISOString().split('T')[0]);
    const [students, scoresRes, hwRes] = await Promise.all([
        getClassStudents(classId),
        pool.query('SELECT student_id, score, note FROM daily_scores WHERE class_id = $1 AND date = $2', [classId, date]),
        pool.query('SELECT student_id, level, note FROM homework_progress WHERE class_id = $1 AND date = $2', [classId, date]),
    ]);
    const scoreMap = new Map(scoresRes.rows.map((r) => [Number(r.student_id), r]));
    const hwMap = new Map(hwRes.rows.map((r) => [Number(r.student_id), r]));
    const records = students.map((s) => {
        const sc = scoreMap.get(Number(s.student_id));
        const hw = hwMap.get(Number(s.student_id));
        return {
            student_id: Number(s.student_id),
            full_name: s.full_name || s.username,
            username: s.username,
            student_code: s.student_code,
            score: sc && sc.score !== null ? Number(sc.score) : null,
            score_note: sc?.note || '',
            homework_level: hw?.level || null,
            homework_note: hw?.note || '',
        };
    });
    res.json({ class_id: classId, date, records });
}));
app.post('/api/tracking/scores', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const { class_id, date, records } = req.body;
    if (!class_id || !date || !Array.isArray(records)) {
        res.status(400).json({ message: 'Dữ liệu điểm không hợp lệ' });
        return;
    }
    for (const r of records) {
        const raw = r.score;
        if (raw === null || raw === undefined || raw === '') {
            await pool.query('DELETE FROM daily_scores WHERE class_id = $1 AND student_id = $2 AND date = $3', [Number(class_id), r.student_id, date]);
            continue;
        }
        const score = Number(raw);
        if (!Number.isFinite(score) || score < 0 || score > 10) {
            res.status(400).json({ message: 'Điểm phải nằm trong khoảng 0 - 10' });
            return;
        }
        await pool.query(`INSERT INTO daily_scores (class_id, student_id, date, score, note, updated_at)
             VALUES ($1, $2, $3, $4, $5, now())
             ON CONFLICT (class_id, student_id, date)
             DO UPDATE SET score = EXCLUDED.score, note = EXCLUDED.note, updated_at = now()`, [Number(class_id), r.student_id, date, score, r.note || null]);
    }
    res.json({ message: `Đã lưu điểm kiểm tra ngày ${date}` });
}));
app.post('/api/tracking/homework', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const { class_id, date, records } = req.body;
    if (!class_id || !date || !Array.isArray(records)) {
        res.status(400).json({ message: 'Dữ liệu bài tập không hợp lệ' });
        return;
    }
    for (const r of records) {
        if (!r.level) {
            await pool.query('DELETE FROM homework_progress WHERE class_id = $1 AND student_id = $2 AND date = $3', [Number(class_id), r.student_id, date]);
            continue;
        }
        if (!HOMEWORK_LEVELS.includes(String(r.level))) {
            res.status(400).json({ message: 'Mức độ hoàn thành không hợp lệ' });
            return;
        }
        await pool.query(`INSERT INTO homework_progress (class_id, student_id, date, level, note, updated_at)
             VALUES ($1, $2, $3, $4, $5, now())
             ON CONFLICT (class_id, student_id, date)
             DO UPDATE SET level = EXCLUDED.level, note = EXCLUDED.note, updated_at = now()`, [Number(class_id), r.student_id, date, String(r.level), r.note || null]);
    }
    res.json({ message: `Đã lưu bài tập về nhà ngày ${date}` });
}));
app.get('/api/tracking/class/:classId/student/:studentId', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const classId = Number(req.params.classId);
    const studentId = Number(req.params.studentId);
    const [userRes, scoresRes, hwRes] = await Promise.all([
        pool.query('SELECT id, full_name, username, student_code, phone FROM users WHERE id = $1', [studentId]),
        pool.query(`SELECT date::text AS date, score, note FROM daily_scores
             WHERE class_id = $1 AND student_id = $2 ORDER BY date DESC`, [classId, studentId]),
        pool.query(`SELECT date::text AS date, level, note FROM homework_progress
             WHERE class_id = $1 AND student_id = $2 ORDER BY date DESC`, [classId, studentId]),
    ]);
    if (!userRes.rows[0]) {
        res.status(404).json({ message: 'Không tìm thấy học sinh' });
        return;
    }
    const scores = scoresRes.rows.map((r) => ({ date: r.date, score: r.score !== null ? Number(r.score) : null, note: r.note || '' }));
    const homework = hwRes.rows.map((r) => ({ date: r.date, level: r.level, note: r.note || '' }));
    // Group scores by ISO week (Monday start)
    const weekMap = new Map();
    for (const s of scores) {
        if (s.score === null)
            continue;
        const d = new Date(`${s.date}T00:00:00Z`);
        const day = (d.getUTCDay() + 6) % 7;
        const start = new Date(d);
        start.setUTCDate(d.getUTCDate() - day);
        const end = new Date(start);
        end.setUTCDate(start.getUTCDate() + 6);
        const key = start.toISOString().slice(0, 10);
        if (!weekMap.has(key))
            weekMap.set(key, { week_start: key, week_end: end.toISOString().slice(0, 10), scores: [] });
        weekMap.get(key).scores.push(s.score);
    }
    const weekly_scores = [...weekMap.values()]
        .sort((a, b) => b.week_start.localeCompare(a.week_start))
        .map((w) => ({
        week_start: w.week_start,
        week_end: w.week_end,
        count: w.scores.length,
        average: Math.round((w.scores.reduce((t, v) => t + v, 0) / w.scores.length) * 100) / 100,
        highest: Math.max(...w.scores),
        lowest: Math.min(...w.scores),
    }));
    const validScores = scores.filter((s) => s.score !== null).map((s) => s.score);
    const assigned = homework.filter((h) => h.level !== 'none');
    const levelValue = { '100': 100, '75': 75, '50': 50, incomplete: 0 };
    const homeworkRate = assigned.length
        ? Math.round(assigned.reduce((t, h) => t + (levelValue[h.level] ?? 0), 0) / assigned.length)
        : null;
    res.json({
        student: userRes.rows[0],
        summary: {
            score_count: validScores.length,
            score_average: validScores.length ? Math.round((validScores.reduce((t, v) => t + v, 0) / validScores.length) * 100) / 100 : null,
            homework_count: homework.length,
            homework_assigned: assigned.length,
            homework_rate: homeworkRate,
        },
        weekly_scores,
        scores,
        homework,
    });
}));
app.post('/api/attendance/save', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const { class_id, date, records } = req.body;
    if (!class_id || !date || !Array.isArray(records)) {
        res.status(400).json({ message: 'Dữ liệu điểm danh không hợp lệ' });
        return;
    }
    // 24-hour lock check (24 hours after the attendance date ends)
    const dayEndTimestamp = new Date(`${date}T23:59:59`).getTime();
    if (Date.now() > dayEndTimestamp + 24 * 60 * 60 * 1000) {
        res.status(403).json({ message: 'Đã quá 24h kể từ ngày điểm danh, hệ thống đã khóa chỉnh sửa!' });
        return;
    }
    for (const r of records) {
        const status = r.status === 'excused' ? 'absent' : (r.status || 'present');
        await pool.query(`INSERT INTO attendance (class_id, student_id, date, status, note)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (class_id, student_id, date)
             DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note`, [Number(class_id), r.student_id, date, status, r.note || null]);
    }
    res.json({ message: `Đã lưu kết quả điểm danh ngày ${date} thành công!` });
}));
app.get('/api/attendance/student', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const userId = req.user.id;
    await syncAttendanceFromTimeline(undefined, userId);
    const { rows } = await pool.query(`SELECT a.id, a.class_id, c.name AS class_name, a.date, a.status, a.note, a.created_at,
                s.id AS session_id, s.title AS session_title, s.start_time AS session_start_time, s.end_time AS session_end_time,
                ROW_NUMBER() OVER (PARTITION BY a.class_id ORDER BY COALESCE(s.start_time, a.date::timestamp), a.created_at)::int AS session_number
         FROM attendance a
         JOIN classes c ON c.id = a.class_id
         LEFT JOIN sessions s ON s.class_id = a.class_id AND s.start_time::date = a.date
         WHERE a.student_id = $1
         ORDER BY a.date DESC, a.created_at DESC`, [userId]);
    res.json({ attendance: rows });
}));
app.get('/api/materials/all', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const user = req.user;
    let where = '';
    let params = [];
    if (user.role === 'student') {
        where = 'WHERE m.class_id IN (SELECT class_id FROM enrollments WHERE student_id = $1)';
        params = [user.id];
    }
    else if (user.role === 'teacher') {
        where = 'WHERE m.class_id IN (SELECT id FROM classes WHERE teacher_id = $1)';
        params = [user.id];
    }
    const { rows } = await pool.query(`SELECT m.*, c.name AS class_name, u.full_name AS uploaded_by_name
         FROM materials m
         JOIN classes c ON c.id = m.class_id
         LEFT JOIN users u ON u.id = m.uploaded_by
         ${where}
         ORDER BY m.created_at DESC`, params);
    res.json({ materials: rows });
}));
app.get('/api/materials/class/:classId', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const classId = Number(req.params.classId);
    const { rows } = await pool.query(`SELECT m.*, u.full_name AS uploaded_by_name
         FROM materials m LEFT JOIN users u ON u.id = m.uploaded_by
         WHERE m.class_id = $1 ORDER BY m.created_at DESC`, [classId]);
    res.json({ materials: rows });
}));
app.post('/api/materials', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const userId = req.user.id;
    const { class_id, title, description, note, external_link, material_kind, file_name, file_data, file_size, file_type } = req.body;
    if (!class_id || (!title && !file_name)) {
        res.status(400).json({ message: 'Vui lòng chọn lớp học và tài liệu' });
        return;
    }
    const { rows } = await pool.query(`INSERT INTO materials (class_id, title, description, note, external_link, material_kind, file_name, file_data, file_size, file_type, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`, [
        Number(class_id),
        title || file_name || 'Tài liệu học tập',
        description || note || null,
        note || null,
        external_link || null,
        material_kind === 'solution' ? 'solution' : material_kind === 'document' ? 'document' : 'blank',
        file_name || null,
        file_data || null,
        file_size || null,
        file_type || null,
        userId,
    ]);
    res.status(201).json({ material: rows[0], message: 'Đã tải tài liệu lên thành công!' });
}));
app.put('/api/materials/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const id = Number(req.params.id);
    const { title, description, note, external_link, material_kind, file_name, file_data, file_size, file_type } = req.body;
    const { rows } = await pool.query(`UPDATE materials
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             note = $3,
             external_link = COALESCE($4, external_link),
             material_kind = COALESCE($5, material_kind),
             file_name = COALESCE($6, file_name),
             file_data = COALESCE($7, file_data),
             file_size = COALESCE($8, file_size),
             file_type = COALESCE($9, file_type)
         WHERE id = $10 RETURNING *`, [title || null, description || null, note || null, external_link || null, material_kind === 'solution' ? 'solution' : material_kind === 'blank' ? 'blank' : null, file_name || null, file_data || null, file_size || null, file_type || null, id]);
    if (!rows.length) {
        res.status(404).json({ message: 'Không tìm thấy tài liệu' });
        return;
    }
    res.json({ material: rows[0], message: 'Đã cập nhật tài liệu thành công!' });
}));
app.delete('/api/materials/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const id = Number(req.params.id);
    await pool.query('DELETE FROM materials WHERE id = $1', [id]);
    res.json({ message: 'Đã xóa tài liệu thành công!' });
}));
app.get('/api/notifications', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const user = req.user;
    let where = '';
    let params = [];
    if (user.role === 'student') {
        where = `WHERE n.receiver_type = 'all'
          OR n.class_id IS NULL
          OR n.class_id IN (SELECT class_id FROM enrollments WHERE student_id = $1)
          OR $1 = ANY(n.receiver_ids)`;
        params = [user.id];
    }
    const { rows } = await pool.query(`SELECT n.*, c.name AS class_name, COALESCE(author.full_name, sender.full_name) AS created_by_name, sender.full_name AS sender_name,
                COALESCE((n.read_status ->> $${params.length + 1})::boolean, false) AS is_read
         FROM notifications n
         LEFT JOIN classes c ON c.id = n.class_id
         LEFT JOIN users author ON author.id = n.created_by
         LEFT JOIN users sender ON sender.id = n.sender_id
         ${where}
         ORDER BY n.created_at DESC
         LIMIT 100`, [...params, String(user.id)]);
    res.json({ notifications: rows });
}));
app.post('/api/notifications/:id/read', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const user = req.user;
    const id = Number(req.params.id);
    const { rows } = await pool.query(`UPDATE notifications
         SET read_status = COALESCE(read_status, '{}'::jsonb) || jsonb_build_object($1::text, true)
         WHERE id = $2
         RETURNING *`, [String(user.id), id]);
    if (!rows.length) {
        res.status(404).json({ message: 'Không tìm thấy thông báo' });
        return;
    }
    res.json({ notification: rows[0], message: 'Đã đánh dấu đã đọc' });
}));
app.post('/api/notifications/read-all', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const user = req.user;
    const params = [String(user.id)];
    let where = '';
    if (user.role === 'student') {
        where = `WHERE n.receiver_type = 'all'
          OR n.class_id IS NULL
          OR n.class_id IN (SELECT class_id FROM enrollments WHERE student_id = $2)
          OR $2 = ANY(n.receiver_ids)`;
        params.push(user.id);
    }
    await pool.query(`UPDATE notifications n
         SET read_status = COALESCE(n.read_status, '{}'::jsonb) || jsonb_build_object($1::text, true)
         ${where}`, params);
    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
}));
app.post('/api/notifications', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const user = req.user;
    const { title, content, content_html, attachments: rawAttachments, type, class_id, receiver_type, receiver_ids, priority } = req.body;
    const trimmedTitle = String(title || '').trim();
    const trimmedContent = String(content || '').trim();
    const trimmedContentHtml = typeof content_html === 'string' ? content_html.trim() : null;
    const normalizedPriority = ['normal', 'important', 'urgent'].includes(priority) ? priority : 'normal';
    const normalizedType = class_id ? 'class' : (type || 'general');
    const ids = Array.isArray(receiver_ids) ? receiver_ids.map(Number).filter(Boolean) : [];
    const { attachments, error: attachmentError } = normalizeNotificationAttachments(rawAttachments);
    if (trimmedTitle.length < 8 || trimmedContent.length < 20) {
        res.status(400).json({ message: 'Vui lòng nhập tiêu đề tối thiểu 8 ký tự và nội dung tối thiểu 20 ký tự.' });
        return;
    }
    if (attachmentError) {
        res.status(400).json({ message: attachmentError });
        return;
    }
    if (user.role === 'teacher') {
        if (!class_id) {
            res.status(403).json({ message: 'Giáo viên chỉ có thể đăng thông báo cho các lớp mình phụ trách.' });
            return;
        }
        const checkClass = await pool.query('SELECT id FROM classes WHERE id = $1 AND teacher_id = $2', [Number(class_id), user.id]);
        if (!checkClass.rows.length) {
            res.status(403).json({ message: 'Bạn không có quyền đăng thông báo cho lớp học này.' });
            return;
        }
    }
    const { rows } = await pool.query(`INSERT INTO notifications (title, content, content_html, attachments, type, class_id, target_role, sender_id, created_by, receiver_type, receiver_ids, priority)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $8, $9, $10, $11) RETURNING *`, [
        trimmedTitle,
        trimmedContent,
        trimmedContentHtml,
        JSON.stringify(attachments),
        normalizedType,
        class_id ? Number(class_id) : null,
        receiver_type || 'all',
        user.id,
        receiver_type || 'all',
        ids,
        normalizedPriority,
    ]);
    res.status(201).json({ notification: rows[0], message: 'Đã đăng thông báo thành công!' });
}));
app.delete('/api/notifications/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const id = Number(req.params.id);
    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    res.json({ message: 'Đã xóa thông báo thành công!' });
}));
app.get('/api/classes/:id/scores', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const classId = Number(req.params.id);
    const user = req.user;
    const params = [classId];
    let teacherGuard = '';
    if (user.role === 'teacher') {
        params.push(user.id);
        teacherGuard = ' AND (e.created_by = $2 OR c.teacher_id = $2)';
    }
    const { rows } = await pool.query(`SELECT s.id, s.status, s.total_score, s.max_score, s.graded_at,
                u.full_name AS student_name, u.student_code,
                e.title AS exam_title, e.gradebook_name, e.grade_column_name
         FROM exam_submissions s
         JOIN online_exams e ON e.id = s.exam_id
         LEFT JOIN classes c ON c.id = e.class_id
         LEFT JOIN users u ON u.id = s.student_id
         WHERE e.class_id = $1 AND s.status <> 'in_progress'${teacherGuard}
         ORDER BY e.created_at DESC, u.full_name NULLS LAST`, params);
    res.json({ scores: rows });
}));
app.post('/api/classes/:id/topics', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const classId = Number(req.params.id);
    if (!(await canManageClass(req.user, classId))) {
        res.status(403).json({ message: 'Bạn không có quyền tạo chủ đề trong lớp này.' });
        return;
    }
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    if (!title) {
        res.status(400).json({ message: 'Vui lòng nhập tên chủ đề.' });
        return;
    }
    const { rows } = await pool.query(`INSERT INTO class_topics (class_id, title, description, sort_order)
         VALUES ($1, $2, $3, COALESCE((SELECT MAX(sort_order) + 1 FROM class_topics WHERE class_id = $1), 1))
         RETURNING *`, [classId, title, description || null]);
    res.status(201).json({ topic: rows[0], message: 'Đã tạo chủ đề thành công!' });
}));
app.get('/api/classes/:id/gradebook', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const classId = Number(req.params.id);
    if (!(await canViewClass(req.user, classId))) {
        res.status(403).json({ message: 'Bạn không có quyền xem bảng điểm lớp này.' });
        return;
    }
    const gradebook = await buildClassGradebook(classId, req.user);
    res.json({ gradebook });
}));
app.post('/api/classes/:id/gradebook/grade', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const classId = Number(req.params.id);
    if (!(await canManageClass(req.user, classId))) {
        res.status(403).json({ message: 'Bạn không có quyền chấm điểm lớp này.' });
        return;
    }
    const testId = Number(req.body.test_id);
    const studentId = Number(req.body.student_id);
    const score = Number(req.body.score);
    const feedback = String(req.body.feedback || '').trim();
    if (!testId || !studentId || Number.isNaN(score)) {
        res.status(400).json({ message: 'Dữ liệu chấm điểm không hợp lệ.' });
        return;
    }
    const [testRes, studentRes] = await Promise.all([
        pool.query('SELECT id, max_score FROM tests WHERE id = $1 AND class_id = $2 AND type = $3', [testId, classId, 'assignment']),
        pool.query('SELECT 1 FROM enrollments WHERE class_id = $1 AND student_id = $2', [classId, studentId]),
    ]);
    if (!testRes.rows.length || !studentRes.rows.length) {
        res.status(404).json({ message: 'Không tìm thấy bài tập hoặc học sinh trong lớp.' });
        return;
    }
    const maxScore = Number(testRes.rows[0].max_score ?? 10);
    if (score < 0 || score > maxScore) {
        res.status(400).json({ message: `Điểm phải nằm trong khoảng 0 - ${maxScore}.` });
        return;
    }
    const { rows } = await pool.query(`INSERT INTO submissions (test_id, student_id, score, feedback, graded_by, graded_at, submitted_at)
         VALUES ($1, $2, $3, $4, $5, now(), now())
         ON CONFLICT (test_id, student_id) DO UPDATE SET
            score = EXCLUDED.score,
            feedback = EXCLUDED.feedback,
            graded_by = EXCLUDED.graded_by,
            graded_at = now(),
            submitted_at = COALESCE(submissions.submitted_at, now())
         RETURNING *`, [testId, studentId, score, feedback || null, req.user.id]);
    const gradebook = await buildClassGradebook(classId, req.user);
    res.json({ submission: rows[0], gradebook, message: 'Đã cập nhật bảng điểm.' });
}));
app.get('/api/classes/:id', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const classId = Number(req.params.id);
    const user = req.user;
    if (!(await canViewClass(user, classId))) {
        res.status(403).json({ message: 'Bạn không có quyền xem lớp này.' });
        return;
    }
    const [klass, students, sessions, materials, topics, tests, notifications, tuitions] = await Promise.all([
        pool.query('SELECT c.*, u.full_name AS teacher_name FROM classes c LEFT JOIN users u ON u.id = c.teacher_id WHERE c.id=$1', [classId]),
        pool.query(`SELECT u.id, u.full_name, u.username, u.phone, u.student_code, e.progress, e.attendance_rate, e.teacher_note
                FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.class_id=$1 ORDER BY u.full_name`, [classId]),
        pool.query('SELECT * FROM sessions WHERE class_id=$1 ORDER BY start_time', [classId]),
        pool.query('SELECT m.*, u.full_name AS uploaded_by_name FROM materials m LEFT JOIN users u ON u.id=m.uploaded_by WHERE m.class_id=$1 ORDER BY m.created_at DESC', [classId]),
        pool.query('SELECT * FROM class_topics WHERE class_id=$1 ORDER BY sort_order, created_at', [classId]),
        pool.query(`SELECT test.*,
                   COUNT(DISTINCT sub.id)::int AS submitted_count,
                   COUNT(DISTINCT sub.id) FILTER (WHERE sub.score IS NOT NULL)::int AS graded_count,
                   COUNT(DISTINCT sub.id) FILTER (WHERE sub.id IS NOT NULL AND sub.score IS NULL)::int AS ungraded_count,
                   COUNT(DISTINCT e.student_id)::int AS enrolled_count,
                   MAX(sub.id) FILTER (WHERE sub.student_id = $2)::int AS student_submission_id,
                   MAX(sub.submitted_at) FILTER (WHERE sub.student_id = $2) AS student_submitted_at,
                   MAX(sub.score) FILTER (WHERE sub.student_id = $2) AS student_score,
                   MAX(sub.feedback) FILTER (WHERE sub.student_id = $2) AS student_feedback
            FROM tests test
            LEFT JOIN submissions sub ON sub.test_id = test.id
            LEFT JOIN enrollments e ON e.class_id = test.class_id
            WHERE test.class_id=$1
            GROUP BY test.id
            ORDER BY COALESCE(test.topic_id, 0), test.due_date NULLS LAST, test.created_at`, [classId, user.id]),
        pool.query(`SELECT n.*, c.name AS class_name, COALESCE(author.full_name, sender.full_name) AS created_by_name, sender.full_name AS sender_name
             FROM notifications n
             LEFT JOIN classes c ON c.id = n.class_id
             LEFT JOIN users author ON author.id = n.created_by
             LEFT JOIN users sender ON sender.id = n.sender_id
             WHERE n.class_id = $1
             ORDER BY n.created_at DESC
             LIMIT 50`, [classId]),
        pool.query(`SELECT t.*, u.full_name AS student_name FROM tuitions t JOIN users u ON u.id=t.student_id WHERE t.class_id=$1 ORDER BY u.full_name`, [classId]),
    ]);
    if (!klass.rows.length) {
        res.status(404).json({ message: 'Không tìm thấy lớp học.' });
        return;
    }
    res.json({ class: klass.rows[0], students: students.rows, sessions: sessions.rows, materials: materials.rows, topics: topics.rows, tests: tests.rows, notifications: notifications.rows, tuitions: tuitions.rows });
}));
app.get('/api/users', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const user = req.user;
    const role = req.query.role;
    const params = [];
    const conditions = [];
    if (role) {
        params.push(role);
        conditions.push(`u.role = $${params.length}`);
    }
    if (user.role === 'teacher' && role === 'student') {
        params.push(user.id);
        conditions.push(`u.id IN (
            SELECT e2.student_id
            FROM enrollments e2
            JOIN classes c2 ON c2.id = e2.class_id
            WHERE c2.teacher_id = $${params.length}
              AND c2.status IN ('upcoming', 'active')
              AND (c2.end_date IS NULL OR c2.end_date >= CURRENT_DATE)
        )`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`
        SELECT u.id, u.full_name, u.username, u.password, u.phone, u.student_code, u.role, u.specialty, u.status, u.note, u.created_at,
               COALESCE(array_agg(DISTINCT c.name) FILTER (
                   WHERE c.id IS NOT NULL AND c.status IN ('upcoming', 'active') AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
               ), ARRAY[]::text[]) AS class_names,
               COALESCE(array_agg(DISTINCT c.subject) FILTER (
                   WHERE c.id IS NOT NULL AND c.status IN ('upcoming', 'active') AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
               ), ARRAY[]::text[]) AS class_subjects,
               COALESCE(array_agg(DISTINCT c.id) FILTER (
                   WHERE c.id IS NOT NULL AND c.status IN ('upcoming', 'active') AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
               ), ARRAY[]::int[]) AS class_ids
        FROM users u
        LEFT JOIN enrollments e ON e.student_id = u.id OR e.student_id = u.id
        LEFT JOIN classes c ON c.id = e.class_id OR c.teacher_id = u.id
        ${where}
        GROUP BY u.id
        ORDER BY u.created_at DESC
    `, params);
    res.json({ users: rows });
}));
app.post('/api/users/student', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin']))
        return;
    const { username, password, class_id } = req.body;
    const { rows } = await pool.query(`INSERT INTO users (username, role, password)
     VALUES ($1,'student',$2) RETURNING id, full_name, username, role`, [username, password || 'student123']);
    if (class_id) {
        await pool.query('INSERT INTO enrollments (class_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [class_id, rows[0].id]);
        await pool.query('INSERT INTO tuitions (class_id, student_id, amount_due, status) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [class_id, rows[0].id, 0, 'unpaid']);
    }
    res.status(201).json({ user: rows[0] });
}));
app.post('/api/users/teacher', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin']))
        return;
    const { full_name, username, password } = req.body;
    if (!String(full_name || '').trim()) {
        res.status(400).json({ message: 'Vui lòng nhập họ và tên giáo viên.' });
        return;
    }
    const baseUsername = String(username || full_name)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '') || `teacher${Date.now()}`;
    let uniqueUsername = baseUsername;
    let suffix = 2;
    while ((await pool.query('SELECT 1 FROM users WHERE username = $1 LIMIT 1', [uniqueUsername])).rows.length) {
        uniqueUsername = `${baseUsername}${suffix}`;
        suffix += 1;
    }
    const { rows } = await pool.query(`INSERT INTO users (full_name, username, role, password)
         VALUES ($1, $2, 'teacher', $3) RETURNING id, full_name, username, role`, [String(full_name).trim(), uniqueUsername, password || 'teacher123']);
    res.status(201).json({ user: rows[0], message: `Đã tạo giáo viên với tài khoản ${uniqueUsername}.` });
}));
app.post('/api/users/students/import', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin']))
        return;
    const { csv, class_id } = req.body;
    const lines = String(csv || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const created = [];
    for (const [index, line] of lines.entries()) {
        const [full_name, email, phone] = line.split(',').map((item) => item?.trim());
        if (!full_name || !email)
            continue;
        const password = `vat${String(index + 1).padStart(4, '0')}`;
        const studentCode = createStudentCode(index);
        const { rows } = await pool.query(`INSERT INTO users (full_name, username, role, password)
       VALUES ($1,$2,'student',$3)
       ON CONFLICT (username) DO NOTHING
       RETURNING id, full_name, username, role, password`, [full_name, email, password]);
        if (rows[0]) {
            created.push(rows[0]);
            if (class_id) {
                await pool.query('INSERT INTO enrollments (class_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [class_id, rows[0].id]);
                await pool.query('INSERT INTO tuitions (class_id, student_id, amount_due, status) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [class_id, rows[0].id, 0, 'unpaid']);
            }
        }
    }
    res.status(201).json({ created });
}));
app.post('/api/users/import', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin']))
        return;
    const { csv, default_role = 'student' } = req.body;
    const rawLines = String(csv || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const created = [];
    let skipped = 0;
    let lines = rawLines;
    if (lines.length > 0) {
        const firstLineLower = lines[0]?.toLowerCase() ?? '';
        if (firstLineLower.includes('full_name') || firstLineLower.includes('username') || firstLineLower.includes('họ') || firstLineLower.includes('tên')) {
            lines = lines.slice(1);
        }
    }
    for (const [index, line] of lines.entries()) {
        const parts = line.split(',').map((item) => item?.trim());
        if (parts.length === 0 || !parts[0])
            continue;
        let [fullName, username, password, role, phone, specialty] = parts;
        fullName = String(fullName || '').trim();
        if (!fullName) {
            skipped++;
            continue;
        }
        const baseUsername = String(username || fullName)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '') || `user${Date.now()}${index}`;
        username = baseUsername;
        let suffix = 2;
        while ((await pool.query('SELECT 1 FROM users WHERE username = $1 LIMIT 1', [username])).rows.length) {
            username = `${baseUsername}${suffix}`;
            suffix += 1;
        }
        const userRole = (role === 'teacher' || role === 'admin' || role === 'owner' || role === 'student') ? role : default_role;
        const userPassword = password || 'vat1234';
        const studentCode = userRole === 'student' ? createStudentCode(index) : null;
        try {
            const { rows } = await pool.query(`INSERT INTO users (full_name, username, role, password, phone, specialty, student_code)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id, full_name, username, role, phone, specialty, student_code`, [fullName, username, userRole, userPassword, phone || null, specialty || null, studentCode]);
            if (rows[0]) {
                created.push(rows[0]);
            }
            else {
                skipped++;
            }
        }
        catch (err) {
            console.error(`Error importing row: ${line}`, err);
            skipped++;
        }
    }
    res.status(201).json({ count: created.length, created, skipped, message: `Tải lên thành công ${created.length} tài khoản${skipped ? `, bỏ qua ${skipped} tài khoản bị trùng.` : '.'}` });
}));
app.delete('/api/users/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin']))
        return;
    const { id } = req.params;
    const user = req.user;
    if (Number(id) === user.id) {
        res.status(400).json({ message: 'Không thể tự xóa tài khoản của chính mình.' });
        return;
    }
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (rowCount === 0) {
        res.status(404).json({ message: 'Không tìm thấy tài khoản để xóa.' });
        return;
    }
    res.json({ message: 'Đã xóa tài khoản thành công.' });
}));
app.delete('/api/users', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin']))
        return;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ message: 'Danh sách ID không hợp lệ.' });
        return;
    }
    const user = req.user;
    const safeIds = ids.filter((id) => Number(id) !== user.id);
    if (safeIds.length === 0) {
        res.status(400).json({ message: 'Không thể xóa các tài khoản đã chọn (có thể là tài khoản của chính bạn).' });
        return;
    }
    const placeholders = safeIds.map((_, i) => `$${i + 1}`).join(',');
    const { rowCount } = await pool.query(`DELETE FROM users WHERE id IN (${placeholders})`, safeIds);
    res.json({ message: `Đã xóa thành công ${rowCount} tài khoản.` });
}));
app.put('/api/users/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin']))
        return;
    const { id } = req.params;
    const { full_name, phone, student_code, specialty, status, password } = req.body;
    // Check if user exists
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (rows.length === 0) {
        res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
        return;
    }
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (full_name !== undefined) {
        updates.push(`full_name = $${paramIndex++}`);
        values.push(full_name);
    }
    if (phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(phone);
    }
    if (student_code !== undefined) {
        updates.push(`student_code = $${paramIndex++}`);
        values.push(student_code);
    }
    if (specialty !== undefined) {
        updates.push(`specialty = $${paramIndex++}`);
        values.push(specialty);
    }
    if (status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
    }
    if (password !== undefined && password.trim() !== '') {
        updates.push(`password = $${paramIndex++}`);
        values.push(password);
    }
    if (updates.length === 0) {
        res.status(400).json({ message: 'Không có thông tin nào để cập nhật.' });
        return;
    }
    values.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    await pool.query(query, values);
    res.json({ message: 'Cập nhật tài khoản thành công.' });
}));
app.put('/api/users/:id/class', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin']))
        return;
    const userId = Number(req.params.id);
    const classId = req.body.class_id ? Number(req.body.class_id) : null;
    const target = await pool.query('SELECT id, role, full_name, username FROM users WHERE id = $1', [userId]);
    if (!target.rows.length) {
        res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
        return;
    }
    if (!['student', 'teacher'].includes(target.rows[0].role)) {
        res.status(400).json({ message: 'Chỉ hỗ trợ đổi lớp cho giáo viên hoặc học sinh.' });
        return;
    }
    if (classId) {
        const klass = await pool.query('SELECT id FROM classes WHERE id = $1', [classId]);
        if (!klass.rows.length) {
            res.status(404).json({ message: 'Không tìm thấy lớp cần chuyển.' });
            return;
        }
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (target.rows[0].role === 'teacher') {
            await client.query('UPDATE classes SET teacher_id = NULL, updated_at = now() WHERE teacher_id = $1', [userId]);
            if (classId)
                await client.query('UPDATE classes SET teacher_id = $1, updated_at = now() WHERE id = $2', [userId, classId]);
        }
        else {
            await client.query('DELETE FROM enrollments WHERE student_id = $1', [userId]);
            if (classId) {
                await client.query('INSERT INTO enrollments (class_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [classId, userId]);
                await client.query('INSERT INTO tuitions (class_id, student_id, amount_due, status) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [classId, userId, 0, 'unpaid']);
            }
        }
        await client.query('COMMIT');
        res.json({ message: classId ? 'Đã đổi lớp thành công.' : 'Đã bỏ gán lớp thành công.' });
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}));
app.post('/api/materials', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const { class_id, session_id, title, description, file_url, external_link } = req.body;
    const { rows } = await pool.query(`INSERT INTO materials (class_id, session_id, title, description, file_url, external_link, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [class_id, session_id || null, title, description, file_url, external_link, req.user.id]);
    res.status(201).json({ material: rows[0] });
}));
app.post('/api/tests', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const { class_id, session_id, title, description, type, due_date, max_score, status, assignment_kind, prompt_mode, prompt_text, prompt_image_name, prompt_image_data, prompt_image_type, answer_mode, answer_text, answer_image_name, answer_image_data, answer_image_type, topic_id, topic_title, quiz_payload, } = req.body;
    const classId = Number(class_id);
    if (!classId || !String(title || '').trim()) {
        res.status(400).json({ message: 'Vui lòng chọn lớp và nhập tiêu đề bài tập.' });
        return;
    }
    if (!(await canManageClass(req.user, classId))) {
        res.status(403).json({ message: 'Bạn không có quyền tạo bài tập trong lớp này.' });
        return;
    }
    let resolvedTopicId = topic_id ? Number(topic_id) : null;
    let resolvedTopicTitle = topic_title ? String(topic_title).trim() : null;
    if (resolvedTopicId) {
        const topicRes = await pool.query('SELECT id, title FROM class_topics WHERE id = $1 AND class_id = $2', [resolvedTopicId, classId]);
        if (!topicRes.rows.length) {
            res.status(400).json({ message: 'Chủ đề không thuộc lớp đã chọn.' });
            return;
        }
        resolvedTopicTitle = topicRes.rows[0].title;
    }
    else {
        resolvedTopicId = null;
    }
    const normalizedAssignmentKind = assignment_kind === 'essay' ? 'essay' : 'quiz';
    const normalizedPromptMode = prompt_mode === 'image' ? 'image' : 'text';
    const normalizedAnswerMode = answer_mode === 'image' ? 'image' : 'text';
    const { rows } = await pool.query(`INSERT INTO tests (
            class_id, session_id, title, description, type, due_date, max_score, status, created_by,
            assignment_kind, prompt_mode, prompt_text, prompt_image_name, prompt_image_data, prompt_image_type,
            answer_mode, answer_text, answer_image_name, answer_image_data, answer_image_type, topic_id, topic_title, quiz_payload
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23::jsonb)
         RETURNING *`, [
        classId,
        session_id || null,
        String(title).trim(),
        description || prompt_text || null,
        type || 'assignment',
        due_date || null,
        Number(max_score) || 10,
        status || 'published',
        req.user.id,
        normalizedAssignmentKind,
        normalizedPromptMode,
        prompt_text || null,
        prompt_image_name || null,
        prompt_image_data || null,
        prompt_image_type || null,
        normalizedAnswerMode,
        answer_text || null,
        answer_image_name || null,
        answer_image_data || null,
        answer_image_type || null,
        resolvedTopicId,
        resolvedTopicTitle,
        JSON.stringify(Array.isArray(quiz_payload) ? quiz_payload : []),
    ]);
    res.status(201).json({ test: rows[0], message: 'Đã tạo bài tập thành công!' });
}));
app.put('/api/tests/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const testId = Number(req.params.id);
    const existing = await pool.query('SELECT * FROM tests WHERE id = $1', [testId]);
    if (!existing.rows.length) {
        res.status(404).json({ message: 'Không tìm thấy bài tập.' });
        return;
    }
    const currentClassId = Number(existing.rows[0].class_id);
    const { class_id, session_id, title, description, type, due_date, max_score, status, assignment_kind, prompt_mode, prompt_text, prompt_image_name, prompt_image_data, prompt_image_type, answer_mode, answer_text, answer_image_name, answer_image_data, answer_image_type, topic_id, topic_title, quiz_payload, } = req.body;
    const classId = class_id ? Number(class_id) : currentClassId;
    if (!classId || !String(title || existing.rows[0].title || '').trim()) {
        res.status(400).json({ message: 'Vui lòng chọn lớp và nhập tiêu đề bài tập.' });
        return;
    }
    if (!(await canManageClass(req.user, currentClassId)) || !(await canManageClass(req.user, classId))) {
        res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa bài tập trong lớp này.' });
        return;
    }
    let resolvedTopicId = topic_id ? Number(topic_id) : null;
    let resolvedTopicTitle = topic_title ? String(topic_title).trim() : null;
    if (resolvedTopicId) {
        const topicRes = await pool.query('SELECT id, title FROM class_topics WHERE id = $1 AND class_id = $2', [resolvedTopicId, classId]);
        if (!topicRes.rows.length) {
            res.status(400).json({ message: 'Chủ đề không thuộc lớp đã chọn.' });
            return;
        }
        resolvedTopicTitle = topicRes.rows[0].title;
    }
    else {
        resolvedTopicId = null;
    }
    const normalizedAssignmentKind = assignment_kind === 'essay' ? 'essay' : 'quiz';
    const normalizedPromptMode = prompt_mode === 'image' ? 'image' : 'text';
    const normalizedAnswerMode = answer_mode === 'image' ? 'image' : 'text';
    const { rows } = await pool.query(`UPDATE tests SET
            class_id=$1, session_id=$2, title=$3, description=$4, type=$5, due_date=$6, max_score=$7, status=$8,
            assignment_kind=$9, prompt_mode=$10, prompt_text=$11, prompt_image_name=$12, prompt_image_data=$13, prompt_image_type=$14,
            answer_mode=$15, answer_text=$16, answer_image_name=$17, answer_image_data=$18, answer_image_type=$19,
            topic_id=$20, topic_title=$21, quiz_payload=$22::jsonb
         WHERE id=$23
         RETURNING *`, [
        classId,
        session_id || null,
        String(title).trim(),
        description || prompt_text || null,
        type || 'assignment',
        due_date || null,
        Number(max_score) || 10,
        status || 'published',
        normalizedAssignmentKind,
        normalizedPromptMode,
        prompt_text || null,
        prompt_image_name || null,
        prompt_image_data || null,
        prompt_image_type || null,
        normalizedAnswerMode,
        answer_text || null,
        answer_image_name || null,
        answer_image_data || null,
        answer_image_type || null,
        resolvedTopicId,
        resolvedTopicTitle,
        JSON.stringify(Array.isArray(quiz_payload) ? quiz_payload : []),
        testId,
    ]);
    res.json({ test: rows[0], message: 'Đã cập nhật bài tập thành công!' });
}));
app.post('/api/tests/:id/submit', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['student']))
        return;
    const testId = Number(req.params.id);
    const { answer, file_url } = req.body;
    const { rows } = await pool.query(`INSERT INTO submissions (test_id, student_id, answer, file_url, submitted_at)
         VALUES ($1,$2,$3,$4,now())
         ON CONFLICT (test_id, student_id) DO UPDATE SET
            answer = EXCLUDED.answer,
            file_url = EXCLUDED.file_url,
            submitted_at = now(),
            score = NULL,
            feedback = NULL,
            graded_by = NULL,
            graded_at = NULL
         RETURNING *`, [testId, req.user.id, answer || null, file_url || null]);
    res.status(201).json({ submission: rows[0], message: 'Đã nộp bài tập thành công!' });
}));
app.patch('/api/tuitions/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin']))
        return;
    const { amount_paid, status, paid_at, note } = req.body;
    const { rows } = await pool.query(`UPDATE tuitions SET amount_paid=$1, status=$2, paid_at=$3, note=$4, updated_at=now() WHERE id=$5 RETURNING *`, [amount_paid, status, paid_at || null, note, req.params.id]);
    res.json({ tuition: rows[0] });
}));
app.get('/api/tuitions', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const user = req.user;
    let query = `
        SELECT t.*, u.full_name AS student_name, u.student_code, c.name AS class_name
        FROM tuitions t
        JOIN users u ON u.id=t.student_id
        JOIN classes c ON c.id=t.class_id
    `;
    const params = [];
    if (user.role === 'student') {
        query += ' WHERE t.student_id = $1';
        params.push(user.id);
    }
    else if (user.role !== 'admin' && user.role !== 'owner') {
        res.status(403).json({ message: 'Forbidden' });
        return;
    }
    query += ' ORDER BY t.updated_at DESC';
    const { rows } = await pool.query(query, params);
    res.json({ tuitions: rows });
}));
app.get('/api/owner/financial-report', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner']))
        return;
    const [overviewResult, monthlyResult, sourceResult, paymentResult, courseResult, discountsResult, customerResult, purposeResult, salariesResult, debtResult, enrollmentResult, feedbackOverviewResult, feedbackTypeResult, worstFeedbackResult] = await Promise.all([
        pool.query(`
            SELECT
              COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS revenue,
              COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expenses,
              COALESCE(SUM(discount_amount), 0) AS discounts
            FROM financial_transactions
        `),
        pool.query(`
            SELECT TO_CHAR(month_start, 'YYYY-MM') AS month,
                   COALESCE(SUM(ft.amount) FILTER (WHERE ft.type = 'income'), 0) AS revenue,
                   COALESCE(SUM(ft.amount) FILTER (WHERE ft.type = 'expense'), 0) AS expenses
            FROM generate_series(date_trunc('month', CURRENT_DATE) - interval '5 months', date_trunc('month', CURRENT_DATE), interval '1 month') AS month_start
            LEFT JOIN financial_transactions ft ON date_trunc('month', ft.transaction_date) = month_start
            GROUP BY month_start ORDER BY month_start
        `),
        pool.query(`SELECT COALESCE(revenue_source, 'Khác') AS label, SUM(amount) AS value FROM financial_transactions WHERE type = 'income' GROUP BY revenue_source ORDER BY value DESC`),
        pool.query(`SELECT COALESCE(payment_method, 'Chưa xác định') AS label, SUM(amount) AS value FROM financial_transactions WHERE type = 'income' GROUP BY payment_method ORDER BY value DESC`),
        pool.query(`SELECT c.name AS label, COALESCE(SUM(t.amount_paid), 0) AS value FROM classes c LEFT JOIN tuitions t ON t.class_id = c.id GROUP BY c.id, c.name ORDER BY value DESC LIMIT 8`),
        pool.query(`SELECT TO_CHAR(date_trunc('month', transaction_date), 'YYYY-MM') AS month, SUM(discount_amount) AS value FROM financial_transactions WHERE discount_amount > 0 GROUP BY date_trunc('month', transaction_date) ORDER BY month`),
        pool.query(`SELECT COALESCE(customer_source, 'Khác') AS label, SUM(amount) AS value FROM financial_transactions WHERE type = 'income' GROUP BY customer_source ORDER BY value DESC`),
        pool.query(`SELECT COALESCE(learning_purpose, 'Khác') AS label, SUM(amount) AS value FROM financial_transactions WHERE type = 'income' GROUP BY learning_purpose ORDER BY value DESC`),
        pool.query(`SELECT TO_CHAR(date_trunc('month', transaction_date), 'YYYY-MM') AS month, COALESCE(u.full_name, 'Giảng viên') AS teacher_name, SUM(ft.amount) AS value FROM financial_transactions ft LEFT JOIN users u ON u.id = ft.teacher_id WHERE ft.type = 'expense' AND ft.category = 'Lương giáo viên' GROUP BY date_trunc('month', transaction_date), u.full_name ORDER BY month DESC LIMIT 12`),
        pool.query(`SELECT COALESCE(SUM(amount_due - amount_paid), 0) AS value FROM tuitions WHERE amount_due > amount_paid`),
        pool.query(`SELECT COUNT(*) FILTER (WHERE class_count >= 2) AS multi_course_students, COUNT(*) AS total_students FROM (SELECT student_id, COUNT(*) AS class_count FROM enrollments GROUP BY student_id) enrollments_by_student`),
        pool.query(`
            SELECT
              COUNT(*) AS total_feedback,
              COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_feedback,
              COUNT(*) FILTER (WHERE status <> 'resolved' AND created_at <= now() - interval '24 hours') AS overdue_feedback,
              COUNT(*) FILTER (WHERE status = 'resolved' AND updated_at <= created_at + interval '48 hours') AS resolved_within_48h
            FROM feedbacks
        `),
        pool.query(`
            SELECT CASE
              WHEN subject ILIKE '%lịch%' THEN 'Lịch học'
              WHEN subject ILIKE '%nội dung%' OR subject ILIKE '%bài%' OR subject ILIKE '%học%' THEN 'Nội dung học'
              WHEN subject ILIKE '%cơ sở%' OR subject ILIKE '%thiết bị%' THEN 'Cơ sở vật chất'
              WHEN subject ILIKE '%hỗ trợ%' THEN 'Hỗ trợ'
              ELSE 'Góp ý khác'
            END AS label,
            COUNT(*) AS value
            FROM feedbacks
            GROUP BY label
            ORDER BY value DESC
        `),
        pool.query(`
            SELECT f.id, f.subject, f.content, f.status, f.created_at, u.full_name AS student_name,
                   EXTRACT(EPOCH FROM (now() - f.created_at)) / 3600 AS waiting_hours
            FROM feedbacks f
            JOIN users u ON u.id = f.student_id
            WHERE f.status <> 'resolved'
            ORDER BY f.created_at ASC
            LIMIT 5
        `),
    ]);
    const overview = overviewResult.rows[0];
    const revenue = Number(overview.revenue);
    const expenses = Number(overview.expenses);
    const pastCosts = monthlyResult.rows.slice(0, -1).map((row) => Number(row.expenses));
    const projectedExpenses = pastCosts.length ? Math.round(pastCosts.reduce((sum, value) => sum + value, 0) / pastCosts.length) : expenses;
    const totalStudents = Number(enrollmentResult.rows[0]?.total_students ?? 0);
    const feedbackOverview = feedbackOverviewResult.rows[0];
    const totalFeedback = Number(feedbackOverview.total_feedback ?? 0);
    res.json({
        overview: {
            revenue,
            expenses,
            profit: revenue - expenses,
            debt: Number(debtResult.rows[0]?.value ?? 0),
            discounts: Number(overview.discounts),
            profitMargin: revenue ? ((revenue - expenses) / revenue) * 100 : 0,
            costRevenueRatio: revenue ? (expenses / revenue) * 100 : 0,
            projectedExpenses,
            multiCourseRate: totalStudents ? (Number(enrollmentResult.rows[0].multi_course_students) / totalStudents) * 100 : 0,
        },
        monthly: monthlyResult.rows.map((row) => ({ ...row, revenue: Number(row.revenue), expenses: Number(row.expenses) })),
        revenueBySource: sourceResult.rows.map((row) => ({ ...row, value: Number(row.value) })),
        revenueByPayment: paymentResult.rows.map((row) => ({ ...row, value: Number(row.value) })),
        revenueByCourse: courseResult.rows.map((row) => ({ ...row, value: Number(row.value) })),
        discountsByMonth: discountsResult.rows.map((row) => ({ ...row, value: Number(row.value) })),
        revenueByCustomerSource: customerResult.rows.map((row) => ({ ...row, value: Number(row.value) })),
        revenueByLearningPurpose: purposeResult.rows.map((row) => ({ ...row, value: Number(row.value) })),
        teacherSalaries: salariesResult.rows.map((row) => ({ ...row, value: Number(row.value) })),
        serviceQuality: {
            overview: {
                totalFeedback,
                responseOver24hRate: totalFeedback ? (Number(feedbackOverview.overdue_feedback) / totalFeedback) * 100 : 0,
                resolvedWithin48hRate: Number(feedbackOverview.resolved_feedback) ? (Number(feedbackOverview.resolved_within_48h) / Number(feedbackOverview.resolved_feedback)) * 100 : 0,
                resolutionRate: totalFeedback ? (Number(feedbackOverview.resolved_feedback) / totalFeedback) * 100 : 0,
            },
            feedbackByType: feedbackTypeResult.rows.map((row) => ({ ...row, value: Number(row.value) })),
            worstFeedback: worstFeedbackResult.rows.map((row) => ({ ...row, waiting_hours: Math.round(Number(row.waiting_hours)) })),
        },
    });
}));
app.get('/api/owner/data-analytics', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner']))
        return;
    const [monthlyResult, leadResult, debtResult, enrollmentResult, attendanceResult] = await Promise.all([
        pool.query(`
            SELECT TO_CHAR(month_start, 'YYYY-MM') AS month,
                   COALESCE(SUM(ft.amount) FILTER (WHERE ft.type = 'income'), 0) AS revenue
            FROM generate_series(date_trunc('month', CURRENT_DATE) - interval '5 months', date_trunc('month', CURRENT_DATE), interval '1 month') AS month_start
            LEFT JOIN financial_transactions ft ON date_trunc('month', ft.transaction_date) = month_start
            GROUP BY month_start ORDER BY month_start
        `),
        pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'enrolled') AS converted FROM prospective_customers`),
        pool.query(`SELECT COUNT(DISTINCT student_id) AS debtors FROM tuitions WHERE amount_due > amount_paid`),
        pool.query(`SELECT COUNT(DISTINCT student_id) AS students, COUNT(*) FILTER (WHERE class_count >= 2) AS multi_course_students FROM (SELECT student_id, COUNT(*) AS class_count FROM enrollments GROUP BY student_id) enrollment_counts`),
        pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'absent') AS absent FROM attendance`),
    ]);
    const monthly = monthlyResult.rows.map((row) => ({ month: row.month, revenue: Number(row.revenue) }));
    const count = monthly.length;
    const averageIndex = (count - 1) / 2;
    const averageRevenue = monthly.reduce((sum, row) => sum + row.revenue, 0) / Math.max(count, 1);
    const numerator = monthly.reduce((sum, row, index) => sum + (index - averageIndex) * (row.revenue - averageRevenue), 0);
    const denominator = monthly.reduce((sum, _, index) => sum + (index - averageIndex) ** 2, 0);
    const trend = denominator ? numerator / denominator : 0;
    const nextMonthRevenue = Math.max(0, Math.round(averageRevenue + trend * (count - averageIndex)));
    const nextQuarterRevenue = Math.max(0, Math.round(nextMonthRevenue * 3 + trend * 3));
    const latestRevenue = monthly.at(-1)?.revenue ?? 0;
    const previousRevenue = monthly.at(-2)?.revenue ?? latestRevenue;
    const students = Number(enrollmentResult.rows[0]?.students ?? 0);
    const attendanceTotal = Number(attendanceResult.rows[0]?.total ?? 0);
    res.json({
        forecast: { nextMonthRevenue, nextQuarterRevenue, growthRate: previousRevenue ? ((nextMonthRevenue - previousRevenue) / previousRevenue) * 100 : 0, trendPerMonth: trend },
        monthly,
        metrics: {
            leadConversionRate: Number(leadResult.rows[0]?.total) ? (Number(leadResult.rows[0]?.converted) / Number(leadResult.rows[0]?.total)) * 100 : 0,
            multiCourseRate: students ? (Number(enrollmentResult.rows[0]?.multi_course_students) / students) * 100 : 0,
            tuitionDebtRate: students ? (Number(debtResult.rows[0]?.debtors) / students) * 100 : 0,
            absenceRate: attendanceTotal ? (Number(attendanceResult.rows[0]?.absent) / attendanceTotal) * 100 : 0,
        },
    });
}));
app.get('/api/owner/teaching-report', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner']))
        return;
    const { rows } = await pool.query(`
        SELECT
            t.id,
            t.full_name,
            t.specialty,
            t.created_at AS employment_started_at,
            COALESCE(session_stats.total_sessions, 0)::int AS total_sessions,
            COALESCE(session_stats.completed_sessions, 0)::int AS completed_sessions,
            COALESCE(session_stats.month_sessions, 0)::int AS month_sessions,
            COALESCE(session_stats.month_completed_sessions, 0)::int AS month_completed_sessions,
            COALESCE(substitute_stats.replaced_sessions, 0)::int AS replaced_sessions,
            COALESCE(schedule_stats.rescheduled_sessions, 0)::int AS rescheduled_sessions,
            COALESCE(grading_stats.graded_assignments, 0)::int AS graded_assignments,
            COALESCE(grading_stats.ungraded_assignments, 0)::int AS ungraded_assignments,
            COALESCE(notification_stats.sent_notifications, 0)::int AS sent_notifications,
            COALESCE(session_stats.month_completed_sessions, 0)::int AS lessons_taught_this_month,
            COALESCE(class_stats.taught_classes, 0)::int AS taught_classes,
            COALESCE(student_stats.taught_students, 0)::int AS taught_students,
            GREATEST(0, CURRENT_DATE - t.created_at::date)::int AS employment_days
        FROM users t
        LEFT JOIN LATERAL (
            SELECT
                COUNT(s.id) AS total_sessions,
                COUNT(s.id) FILTER (WHERE s.status = 'completed') AS completed_sessions,
                COUNT(s.id) FILTER (WHERE date_trunc('month', s.start_time) = date_trunc('month', CURRENT_DATE)) AS month_sessions,
                COUNT(s.id) FILTER (WHERE s.status = 'completed' AND date_trunc('month', s.start_time) = date_trunc('month', CURRENT_DATE)) AS month_completed_sessions
            FROM classes c
            LEFT JOIN sessions s ON s.class_id = c.id
            WHERE c.teacher_id = t.id
        ) session_stats ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(DISTINCT sta.session_id) AS replaced_sessions
            FROM session_teacher_assignments sta
            JOIN sessions s ON s.id = sta.session_id
            JOIN classes c ON c.id = s.class_id
            WHERE c.teacher_id = t.id AND sta.teacher_id <> t.id AND sta.assignment_type = 'substitute'
        ) substitute_stats ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS rescheduled_sessions
            FROM schedule_adjustments sa
            JOIN classes c ON c.id = sa.class_id
            WHERE c.teacher_id = t.id AND sa.type = 'rescheduled'
        ) schedule_stats ON true
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*) FILTER (WHERE sub.graded_by = t.id) AS graded_assignments,
                COUNT(*) FILTER (WHERE sub.score IS NULL)
                    AS ungraded_assignments
            FROM tests test
            JOIN classes c ON c.id = test.class_id
            LEFT JOIN submissions sub ON sub.test_id = test.id
            WHERE c.teacher_id = t.id AND test.type = 'assignment'
        ) grading_stats ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS sent_notifications
            FROM notifications n
            JOIN classes c ON c.id = n.class_id
            WHERE c.teacher_id = t.id AND COALESCE(n.sender_id, n.created_by) = t.id
        ) notification_stats ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(DISTINCT c.id) AS taught_classes
            FROM classes c
            LEFT JOIN session_teacher_assignments sta ON sta.teacher_id = t.id
            LEFT JOIN sessions s ON s.id = sta.session_id AND s.class_id = c.id
            WHERE c.teacher_id = t.id OR s.id IS NOT NULL
        ) class_stats ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(DISTINCT e.student_id) AS taught_students
            FROM enrollments e
            JOIN classes c ON c.id = e.class_id
            WHERE c.teacher_id = t.id
                OR EXISTS (
                    SELECT 1 FROM sessions s
                    JOIN session_teacher_assignments sta ON sta.session_id = s.id
                    WHERE s.class_id = c.id AND sta.teacher_id = t.id
                )
        ) student_stats ON true
        WHERE t.role = 'teacher' AND t.status = 'active'
        ORDER BY t.full_name
    `);
    res.json({ teachers: rows });
}));
app.get('/api/owner/class-report', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner']))
        return;
    const classesResult = await pool.query(`
        SELECT id, name, code, subject FROM classes ORDER BY name
    `);
    const requestedClassId = Number(req.query.classId);
    const classId = classesResult.rows.some((item) => item.id === requestedClassId)
        ? requestedClassId
        : classesResult.rows[0]?.id;
    if (!classId) {
        res.json({ classes: [], report: null });
        return;
    }
    const [classResult, sessionResult, monthlySessionsResult, scoresResult, assignmentResult, notificationsResult] = await Promise.all([
        pool.query(`SELECT id, name, code, subject, progress FROM classes WHERE id = $1`, [classId]),
        pool.query(`
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                COUNT(*) FILTER (WHERE status <> 'completed')::int AS remaining
            FROM sessions WHERE class_id = $1
        `, [classId]),
        pool.query(`
            SELECT id, title, start_time, end_time, status
            FROM sessions
            WHERE class_id = $1 AND date_trunc('month', start_time) = date_trunc('month', CURRENT_DATE)
            ORDER BY start_time
        `, [classId]),
        pool.query(`
            SELECT u.id, u.full_name,
                   ROUND(COALESCE(AVG(sub.score), 0)::numeric, 1)::float AS average_score,
                   COUNT(sub.id) FILTER (WHERE sub.score IS NOT NULL)::int AS graded_count
            FROM enrollments e
            JOIN users u ON u.id = e.student_id
            LEFT JOIN tests test ON test.class_id = e.class_id
            LEFT JOIN submissions sub ON sub.test_id = test.id AND sub.student_id = e.student_id
            WHERE e.class_id = $1
            GROUP BY u.id, u.full_name
            ORDER BY u.full_name
        `, [classId]),
        pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'published' AND (due_date IS NULL OR due_date >= now()))::int AS ongoing,
                COUNT(*) FILTER (WHERE status = 'closed' OR (due_date IS NOT NULL AND due_date < now()))::int AS finished
            FROM tests
            WHERE class_id = $1 AND type = 'assignment'
        `, [classId]),
        pool.query(`
            SELECT id, title, content, type, priority, created_at
            FROM notifications
            WHERE class_id = $1
            ORDER BY created_at DESC
            LIMIT 5
        `, [classId]),
    ]);
    const session = sessionResult.rows[0];
    res.json({
        classes: classesResult.rows,
        report: {
            class: classResult.rows[0],
            sessions: { total: Number(session.total), completed: Number(session.completed), remaining: Number(session.remaining) },
            monthSessions: monthlySessionsResult.rows,
            scores: scoresResult.rows.map((item) => ({ ...item, average_score: Number(item.average_score) })),
            assignments: { ongoing: Number(assignmentResult.rows[0].ongoing), finished: Number(assignmentResult.rows[0].finished) },
            notifications: notificationsResult.rows,
        },
    });
}));
app.post('/api/submissions/:id/grade', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const { score, feedback } = req.body;
    const { rows } = await pool.query(`UPDATE submissions SET score=$1, feedback=$2, graded_by=$3, graded_at=now() WHERE id=$4 RETURNING *`, [score, feedback, req.user.id, req.params.id]);
    res.json({ submission: rows[0] });
}));
// --- Feedbacks Endpoints ---
app.get('/api/feedbacks', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const user = req.user;
    let query = `
        SELECT f.*, u.full_name AS student_name, u.student_code
        FROM feedbacks f
        JOIN users u ON u.id = f.student_id
    `;
    const params = [];
    if (user.role === 'student') {
        query += ' WHERE f.student_id = $1';
        params.push(user.id);
    }
    else if (user.role !== 'admin' && user.role !== 'owner' && user.role !== 'teacher') {
        res.status(403).json({ message: 'Forbidden' });
        return;
    }
    query += ' ORDER BY f.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json({ feedbacks: rows });
}));
app.post('/api/feedbacks', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['student']))
        return;
    const user = req.user;
    const { subject, content } = req.body;
    const { rows } = await pool.query(`INSERT INTO feedbacks (student_id, subject, content) VALUES ($1, $2, $3) RETURNING *`, [user.id, subject, content]);
    res.json({ message: 'Đã gửi phản hồi', feedback: rows[0] });
}));
app.put('/api/feedbacks/:id/respond', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const { admin_response } = req.body;
    const { id } = req.params;
    const { rows } = await pool.query(`UPDATE feedbacks SET admin_response = $1, status = 'resolved', updated_at = now() WHERE id = $2 RETURNING *`, [admin_response, id]);
    res.json({ message: 'Đã trả lời phản hồi', feedback: rows[0] });
}));
// ==========================================
// ONLINE EXAMINATION SYSTEM ENDPOINTS
// ==========================================
app.get('/api/question-bank', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const user = req.user;
    const params = [];
    const conditions = [];
    const { class_id, subject, chapter } = req.query;
    if (user.role === 'teacher') {
        params.push(user.id);
        conditions.push(`(q.created_by = $${params.length} OR q.class_id IN (SELECT id FROM classes WHERE teacher_id = $${params.length}) OR q.exam_id IN (SELECT id FROM online_exams WHERE created_by = $${params.length} OR class_id IN (SELECT id FROM classes WHERE teacher_id = $${params.length})))`);
    }
    if (class_id) {
        params.push(Number(class_id));
        conditions.push(`COALESCE(q.class_id, e.class_id) = $${params.length}`);
    }
    if (subject) {
        params.push(String(subject));
        conditions.push(`q.subject = $${params.length}`);
    }
    if (chapter) {
        params.push(String(chapter));
        conditions.push(`COALESCE(q.grade_level, q.chapter) = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT q.*, COALESCE(q.grade_level, q.chapter) AS grade_level, COALESCE(q.class_id, e.class_id) AS class_id,
                e.title AS exam_title, c.name AS class_name, c.code AS class_code, c.subject AS class_subject, u.full_name AS created_by_name
         FROM question_bank q
         LEFT JOIN online_exams e ON e.id = q.exam_id
         LEFT JOIN classes c ON c.id = COALESCE(q.class_id, e.class_id)
         LEFT JOIN users u ON u.id = q.created_by
         ${where}
         ORDER BY c.name NULLS LAST, q.subject NULLS LAST, COALESCE(q.grade_level, q.chapter) NULLS LAST, q.topic NULLS LAST, q.id ASC`, params);
    res.json({ questions: rows });
}));
app.post('/api/question-bank', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const user = req.user;
    const { class_id, subject, grade_level, chapter, topic, difficulty, type, question_text, options, correct_answers, points, grading_guide, tags, media } = req.body;
    const classId = class_id ? Number(class_id) : null;
    if (!String(subject || '').trim() || !String(question_text || '').trim()) {
        res.status(400).json({ message: 'Vui lòng nhập môn học và nội dung câu hỏi.' });
        return;
    }
    if (classId && !(await canManageClass(user, classId))) {
        res.status(403).json({ message: 'Bạn không có quyền thêm câu hỏi cho lớp này.' });
        return;
    }
    const grade = String(grade_level || chapter || '').trim() || null;
    const { rows } = await pool.query(`INSERT INTO question_bank (
            exam_id, class_id, subject, chapter, grade_level, topic, difficulty, type, question_text,
            options, correct_answers, points, grading_guide, tags, media, created_by
         ) VALUES (NULL,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING *, COALESCE(grade_level, chapter) AS grade_level`, [
        classId, String(subject).trim(), grade, grade, topic || null, difficulty || 'medium', type || 'single_choice', String(question_text).trim(),
        JSON.stringify(options || []), JSON.stringify(correct_answers || []), Number(points || 1), grading_guide || null, tags || [], JSON.stringify(media || []), user.id
    ]);
    res.status(201).json({ question: rows[0], message: 'Đã thêm câu hỏi vào ngân hàng.' });
}));
app.post('/api/question-bank/bulk', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const user = req.user;
    const { class_id, subject: defaultSubject, chapter: defaultChapter, questions } = req.body;
    const classId = class_id ? Number(class_id) : null;
    if (!Array.isArray(questions) || questions.length === 0) {
        res.status(400).json({ message: 'Danh sách câu hỏi không được để trống.' });
        return;
    }
    if (classId && !(await canManageClass(user, classId))) {
        res.status(403).json({ message: 'Bạn không có quyền thêm câu hỏi cho lớp này.' });
        return;
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const insertedQuestions = [];
        for (const item of questions) {
            const text = String(item.question_text || '').trim();
            if (!text)
                continue;
            const subject = String(item.subject || defaultSubject || '').trim();
            if (!subject)
                continue;
            const grade = String(item.chapter || item.grade_level || defaultChapter || '').trim() || null;
            const topic = item.topic ? String(item.topic).trim() : null;
            const difficulty = item.difficulty || 'medium';
            const type = item.type || 'single_choice';
            const points = Number(item.points) > 0 ? Number(item.points) : 1;
            const options = Array.isArray(item.options) ? item.options : [];
            const correctAnswers = Array.isArray(item.correct_answers) ? item.correct_answers : [];
            const gradingGuide = item.grading_guide ? String(item.grading_guide).trim() : null;
            const tags = Array.isArray(item.tags) ? item.tags : ['excel-import'];
            const media = Array.isArray(item.media) ? item.media : [];
            const { rows } = await client.query(`INSERT INTO question_bank (
                    exam_id, class_id, subject, chapter, grade_level, topic, difficulty, type, question_text,
                    options, correct_answers, points, grading_guide, tags, media, created_by
                 ) VALUES (NULL,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                 RETURNING *, COALESCE(grade_level, chapter) AS grade_level`, [
                classId, subject, grade, grade, topic, difficulty, type, text,
                JSON.stringify(options), JSON.stringify(correctAnswers), points, gradingGuide, tags, JSON.stringify(media), user.id
            ]);
            if (rows[0]) {
                insertedQuestions.push(rows[0]);
            }
        }
        await client.query('COMMIT');
        if (insertedQuestions.length === 0) {
            res.status(400).json({ message: 'Không có câu hỏi hợp lệ nào để thêm vào ngân hàng.' });
            return;
        }
        res.status(201).json({
            count: insertedQuestions.length,
            questions: insertedQuestions,
            message: `Đã nhập thành công ${insertedQuestions.length} câu hỏi vào ngân hàng.`
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}));
app.put('/api/question-bank/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const questionId = Number(req.params.id);
    const user = req.user;
    const { class_id, subject, grade_level, chapter, topic, difficulty, type, question_text, options, correct_answers, points, grading_guide, tags, media } = req.body;
    const classId = class_id ? Number(class_id) : null;
    if (!String(subject || '').trim() || !String(question_text || '').trim()) {
        res.status(400).json({ message: 'Vui lòng nhập môn học và nội dung câu hỏi.' });
        return;
    }
    if (classId && !(await canManageClass(user, classId))) {
        res.status(403).json({ message: 'Bạn không có quyền cập nhật câu hỏi cho lớp này.' });
        return;
    }
    const params = [
        classId,
        String(subject).trim(),
        String(grade_level || chapter || '').trim() || null,
        topic || null,
        difficulty || 'medium',
        type || 'single_choice',
        String(question_text).trim(),
        JSON.stringify(options || []),
        JSON.stringify(correct_answers || []),
        Number(points || 1),
        grading_guide || null,
        tags || [],
        JSON.stringify(media || []),
        questionId,
    ];
    let ownerGuard = '';
    if (user.role === 'teacher') {
        params.push(user.id);
        ownerGuard = ' AND created_by = $15';
    }
    const { rows } = await pool.query(`UPDATE question_bank
         SET class_id=$1, subject=$2, chapter=$3, grade_level=$3, topic=$4, difficulty=$5, type=$6, question_text=$7,
             options=$8, correct_answers=$9, points=$10, grading_guide=$11, tags=$12, media=$13
         WHERE id=$14${ownerGuard}
         RETURNING *, COALESCE(grade_level, chapter) AS grade_level`, params);
    if (!rows[0]) {
        res.status(404).json({ message: 'Không tìm thấy câu hỏi để cập nhật.' });
        return;
    }
    res.json({ question: rows[0], message: 'Đã cập nhật câu hỏi.' });
}));
app.delete('/api/question-bank/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const questionId = Number(req.params.id);
    const user = req.user;
    const params = [questionId];
    let ownerGuard = '';
    if (user.role === 'teacher') {
        params.push(user.id);
        ownerGuard = ' AND created_by = $2';
    }
    await pool.query(`DELETE FROM question_bank WHERE id = $1${ownerGuard}`, params);
    res.json({ message: 'Đã xóa câu hỏi khỏi ngân hàng.' });
}));
app.post('/api/question-bank/deduplicate', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const user = req.user;
    const { class_id, chapter } = req.body;
    const params = [];
    const conditions = [];
    if (class_id) {
        params.push(Number(class_id));
        conditions.push(`class_id = $${params.length}`);
    }
    if (chapter) {
        params.push(String(chapter));
        conditions.push(`COALESCE(grade_level, chapter) = $${params.length}`);
    }
    if (user.role === 'teacher') {
        params.push(user.id);
        conditions.push(`created_by = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const deleteQuery = `
        DELETE FROM question_bank
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY COALESCE(class_id, 0), COALESCE(chapter, ''), question_text
                    ORDER BY id ASC
                ) as rnum
                FROM question_bank
                ${where}
            ) t
            WHERE t.rnum > 1
        )
    `;
    const result = await pool.query(deleteQuery, params);
    res.json({ count: result.rowCount, message: `Đã dọn dẹp ${result.rowCount} câu hỏi trùng lặp.` });
}));
app.delete('/api/question-bank/chapter/:chapter', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const user = req.user;
    const chapter = decodeURIComponent(String(req.params.chapter || ''));
    const { class_id } = req.query;
    const params = [chapter];
    let classGuard = '';
    if (class_id) {
        params.push(Number(class_id));
        classGuard = ` AND class_id = $${params.length}`;
    }
    let teacherGuard = '';
    if (user.role === 'teacher') {
        params.push(user.id);
        teacherGuard = ` AND created_by = $${params.length}`;
    }
    const result = await pool.query(`DELETE FROM question_bank WHERE COALESCE(grade_level, chapter) = $1${classGuard}${teacherGuard}`, params);
    res.json({ count: result.rowCount, message: `Đã xóa ${result.rowCount} câu hỏi trong bài tập.` });
}));
// Get list of online exams
app.get('/api/online-exams', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const user = req.user;
    let where = '';
    let params = [];
    if (user.role === 'student') {
        where = `WHERE e.status = 'published' AND (e.is_library IS NOT TRUE) AND (e.class_id IS NULL OR e.class_id IN (SELECT class_id FROM enrollments WHERE student_id = $1))`;
        params = [user.id];
    }
    else if (user.role === 'teacher') {
        where = `WHERE (e.class_id IN (SELECT id FROM classes WHERE teacher_id = $1) OR e.created_by = $1) AND (e.is_library IS NOT TRUE)`;
        params = [user.id];
    }
    else {
        where = `WHERE (e.is_library IS NOT TRUE)`;
    }
    const studentSubmissionSelect = user.role === 'student'
        ? `,
                (SELECT s.status FROM exam_submissions s WHERE s.exam_id = e.id AND s.student_id = $1 ORDER BY s.start_time DESC LIMIT 1) AS submission_status,
                EXISTS(SELECT 1 FROM exam_submissions s WHERE s.exam_id = e.id AND s.student_id = $1 AND s.status IN ('submitted', 'graded', 'pending_essay')) AS has_submitted`
        : `,
                NULL::text AS submission_status,
                false AS has_submitted`;
    const { rows } = await pool.query(`SELECT e.*, c.name AS class_name, u.full_name AS teacher_name,
                (SELECT COUNT(*)::int FROM question_bank q WHERE q.exam_id = e.id) AS question_count,
                (SELECT COUNT(*)::int FROM exam_submissions s WHERE s.exam_id = e.id) AS submission_count
                ${studentSubmissionSelect}
         FROM online_exams e
         LEFT JOIN classes c ON c.id = e.class_id
         LEFT JOIN users u ON u.id = e.created_by
         ${where}
         ORDER BY e.created_at DESC`, params);
    res.json({ exams: rows });
}));
// Get list of library exams
app.get('/api/online-exams/library', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const { rows } = await pool.query(`SELECT e.*, u.full_name AS teacher_name,
                (SELECT COUNT(*)::int FROM question_bank q WHERE q.exam_id = e.id) AS question_count
         FROM online_exams e
         LEFT JOIN users u ON u.id = e.created_by
         WHERE e.is_library = true
         ORDER BY e.created_at DESC`);
    res.json({ exams: rows });
}));
// Batch create fixed library exams
app.post('/api/online-exams/batch-library', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const userId = req.user.id;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ message: 'Danh sách bài tập cần tạo không hợp lệ.' });
        return;
    }
    const createdExams = [];
    for (const item of items) {
        const title = String(item.title || 'Bài tập cố định').trim();
        const subject = String(item.subject || 'Chung').trim();
        const duration_minutes = Number(item.duration_minutes || 45);
        const questions = Array.isArray(item.questions) ? item.questions : [];
        const examResult = await pool.query(`INSERT INTO online_exams (
                title, subject, class_id, description, duration_minutes,
                show_answers_after_submit, show_score_after_submit, max_attempts,
                shuffle_questions, shuffle_options, display_mode, auto_submit,
                random_question_count, question_delivery_mode, status, is_library, created_by
            ) VALUES ($1,$2,NULL,$3,$4,true,true,1,false,false,'one',true,0,'same','library',true,$5) RETURNING *`, [
            title, subject, item.description || `Bài tập cố định trong Thư viện (${questions.length} câu)`,
            duration_minutes, userId
        ]);
        const exam = examResult.rows[0];
        // Tự động tính điểm chia đều cho các câu trên thang 10
        const pointPerQuestion = questions.length > 0 ? Number((10 / questions.length).toFixed(2)) : 1;
        for (const q of questions) {
            await pool.query(`INSERT INTO question_bank (
                    exam_id, class_id, subject, chapter, grade_level, topic, difficulty, type, question_text,
                    options, correct_answers, points, grading_guide, tags, media, created_by
                ) VALUES ($1,NULL,$2,$3,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14)`, [
                exam.id, q.subject || subject, q.chapter || null, q.topic || null,
                q.difficulty || 'medium', q.type || 'single_choice', q.question_text || '',
                JSON.stringify(q.options || []), JSON.stringify(q.correct_answers || []),
                pointPerQuestion, q.grading_guide || null, q.tags || ['library-fixed'], JSON.stringify(q.media || []), userId
            ]);
        }
        createdExams.push({ ...exam, question_count: questions.length });
    }
    res.status(201).json({
        message: `Đã tạo thành công ${createdExams.length} bài tập cố định vào Thư viện!`,
        exams: createdExams
    });
}));
// Assign a library exam to a class
app.post('/api/online-exams/:id/assign-class', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const userId = req.user.id;
    const libraryExamId = Number(req.params.id);
    const { class_id, title, start_time, end_time, duration_minutes } = req.body;
    if (!class_id) {
        res.status(400).json({ message: 'Vui lòng chọn lớp học để giao bài.' });
        return;
    }
    const libRes = await pool.query('SELECT * FROM online_exams WHERE id = $1', [libraryExamId]);
    if (!libRes.rows.length) {
        res.status(404).json({ message: 'Không tìm thấy bài tập trong thư viện.' });
        return;
    }
    const libExam = libRes.rows[0];
    const qRes = await pool.query('SELECT * FROM question_bank WHERE exam_id = $1 ORDER BY id ASC', [libraryExamId]);
    const questions = qRes.rows;
    const assignedTitle = String(title || libExam.title).trim();
    const duration = Number(duration_minutes || libExam.duration_minutes || 45);
    const newExamRes = await pool.query(`INSERT INTO online_exams (
            title, subject, class_id, description, start_time, end_time, duration_minutes,
            show_answers_after_submit, show_score_after_submit, max_attempts,
            shuffle_questions, shuffle_options, display_mode, auto_submit,
            random_question_count, question_delivery_mode, status, is_library, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,0,'same','published',false,$15) RETURNING *`, [
        assignedTitle, libExam.subject, Number(class_id),
        libExam.description ? `${libExam.description} (Giao từ Thư viện)` : 'Bài tập giao từ Thư viện',
        start_time || null, end_time || null, duration,
        libExam.show_answers_after_submit, libExam.show_score_after_submit, libExam.max_attempts || 1,
        libExam.shuffle_questions, libExam.shuffle_options, libExam.display_mode || 'one', libExam.auto_submit,
        userId
    ]);
    const assignedExam = newExamRes.rows[0];
    const pointPerQuestion = questions.length > 0 ? Number((10 / questions.length).toFixed(2)) : 1;
    for (const q of questions) {
        await pool.query(`INSERT INTO question_bank (
                exam_id, class_id, subject, chapter, grade_level, topic, difficulty, type, question_text,
                options, correct_answers, points, grading_guide, tags, media, created_by
            ) VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15)`, [
            assignedExam.id, Number(class_id), q.subject || libExam.subject, q.chapter || null, q.topic || null,
            q.difficulty || 'medium', q.type || 'single_choice', q.question_text || '',
            JSON.stringify(q.options || []), JSON.stringify(q.correct_answers || []),
            pointPerQuestion, q.grading_guide || null, q.tags || ['assigned-from-library'], JSON.stringify(q.media || []), userId
        ]);
    }
    res.status(201).json({
        message: `Đã giao bài tập "${assignedTitle}" cho lớp thành công!`,
        exam: assignedExam,
        question_count: questions.length
    });
}));
// Get single online exam with questions
app.get('/api/online-exams/:id', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const examId = Number(req.params.id);
    const examRes = await pool.query(`SELECT e.*, c.name AS class_name, u.full_name AS teacher_name
         FROM online_exams e
         LEFT JOIN classes c ON c.id = e.class_id
         LEFT JOIN users u ON u.id = e.created_by
         WHERE e.id = $1`, [examId]);
    if (!examRes.rows.length) {
        res.status(404).json({ message: 'Không tìm thấy bài kiểm tra' });
        return;
    }
    const user = req.user;
    const exam = examRes.rows[0];
    const submissionRes = user.role === 'student'
        ? await pool.query(`SELECT question_ids FROM exam_submissions
             WHERE exam_id = $1 AND student_id = $2
             ORDER BY start_time DESC LIMIT 1`, [examId, user.id])
        : { rows: [] };
    const assignedQuestionIds = Array.isArray(submissionRes.rows[0]?.question_ids)
        ? submissionRes.rows[0].question_ids.map(Number).filter(Number.isFinite)
        : [];
    const questionsRes = assignedQuestionIds.length
        ? await pool.query(`SELECT * FROM question_bank
             WHERE exam_id = $1 AND id = ANY($2::int[])
             ORDER BY array_position($2::int[], id)`, [examId, assignedQuestionIds])
        : await pool.query(`SELECT * FROM question_bank WHERE exam_id = $1 ORDER BY id ASC`, [examId]);
    res.json({ exam, questions: questionsRes.rows });
}));
// Create new online exam with questions
app.post('/api/online-exams', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const userId = req.user.id;
    const { title, subject, class_id, description, start_time, end_time, duration_minutes, show_answers_after_submit, show_score_after_submit, max_attempts, shuffle_questions, shuffle_options, display_mode, auto_submit, status, questions, random_question_count, question_delivery_mode, gradebook_name, grade_column_name } = req.body;
    if (!title) {
        res.status(400).json({ message: 'Vui lòng nhập tên bài kiểm tra' });
        return;
    }
    const examResult = await pool.query(`INSERT INTO online_exams (
            title, subject, class_id, description, start_time, end_time, duration_minutes,
            show_answers_after_submit, show_score_after_submit, max_attempts,
            shuffle_questions, shuffle_options, display_mode, auto_submit, random_question_count,
            question_delivery_mode, gradebook_name, grade_column_name, status, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`, [
        title.trim(), subject || 'Chung', class_id ? Number(class_id) : null, description || null,
        start_time || null, end_time || null, Number(duration_minutes || 45),
        Boolean(show_answers_after_submit), show_score_after_submit !== false, Number(max_attempts || 1),
        shuffle_questions !== false, shuffle_options !== false, display_mode || 'one', auto_submit !== false,
        Math.max(0, Number(random_question_count || 0)), question_delivery_mode === 'different' ? 'different' : 'same',
        String(gradebook_name || 'Bảng điểm').trim() || 'Bảng điểm', String(grade_column_name || title || 'Điểm kiểm tra').trim() || 'Điểm kiểm tra',
        status || 'published', userId
    ]);
    const exam = examResult.rows[0];
    // Insert questions into question_bank
    if (Array.isArray(questions) && questions.length > 0) {
        for (const q of questions) {
            await pool.query(`INSERT INTO question_bank (
                    exam_id, class_id, subject, chapter, grade_level, topic, difficulty, type, question_text,
                    options, correct_answers, points, grading_guide, tags, media, created_by
                ) VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15)`, [
                exam.id, q.class_id ? Number(q.class_id) : (class_id ? Number(class_id) : null), q.subject || subject || 'Chung', q.chapter || q.grade_level || null, q.topic || null,
                q.difficulty || 'medium', q.type || 'single_choice', q.question_text || '',
                JSON.stringify(q.options || []), JSON.stringify(q.correct_answers || []),
                Number(q.points || 1.0), q.grading_guide || null, q.tags || [], JSON.stringify(q.media || []), userId
            ]);
        }
    }
    res.status(201).json({ exam, message: 'Tạo bài kiểm tra trực tuyến thành công!' });
}));
// Update online exam and questions
app.put('/api/online-exams/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const examId = Number(req.params.id);
    const userId = req.user.id;
    const { title, subject, class_id, description, start_time, end_time, duration_minutes, show_answers_after_submit, show_score_after_submit, max_attempts, shuffle_questions, shuffle_options, display_mode, auto_submit, status, questions, random_question_count, question_delivery_mode, gradebook_name, grade_column_name } = req.body;
    const examResult = await pool.query(`UPDATE online_exams SET
            title = COALESCE($1, title), subject = COALESCE($2, subject), class_id = $3,
            description = $4, start_time = $5, end_time = $6, duration_minutes = COALESCE($7, duration_minutes),
            show_answers_after_submit = $8, show_score_after_submit = $9, max_attempts = COALESCE($10, max_attempts),
            shuffle_questions = $11, shuffle_options = $12, display_mode = COALESCE($13, display_mode),
            auto_submit = $14, random_question_count = $15, question_delivery_mode = $16,
            gradebook_name = COALESCE($17, gradebook_name), grade_column_name = COALESCE($18, grade_column_name),
            status = COALESCE($19, status)
        WHERE id = $20 RETURNING *`, [
        title, subject, class_id ? Number(class_id) : null, description || null,
        start_time || null, end_time || null, Number(duration_minutes || 45),
        Boolean(show_answers_after_submit), show_score_after_submit !== false, Number(max_attempts || 1),
        shuffle_questions !== false, shuffle_options !== false, display_mode || 'one', auto_submit !== false,
        Math.max(0, Number(random_question_count || 0)), question_delivery_mode === 'different' ? 'different' : 'same',
        gradebook_name ? String(gradebook_name).trim() : null, grade_column_name ? String(grade_column_name).trim() : null,
        status, examId
    ]);
    if (!examResult.rows.length) {
        res.status(404).json({ message: 'Không tìm thấy bài kiểm tra' });
        return;
    }
    // Replace questions if provided
    if (Array.isArray(questions)) {
        await pool.query('DELETE FROM question_bank WHERE exam_id = $1', [examId]);
        for (const q of questions) {
            await pool.query(`INSERT INTO question_bank (
                    exam_id, class_id, subject, chapter, grade_level, topic, difficulty, type, question_text,
                    options, correct_answers, points, grading_guide, tags, media, created_by
                ) VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15)`, [
                examId, q.class_id ? Number(q.class_id) : (class_id ? Number(class_id) : null), q.subject || subject || 'Chung', q.chapter || q.grade_level || null, q.topic || null,
                q.difficulty || 'medium', q.type || 'single_choice', q.question_text || '',
                JSON.stringify(q.options || []), JSON.stringify(q.correct_answers || []),
                Number(q.points || 1.0), q.grading_guide || null, q.tags || [], JSON.stringify(q.media || []), userId
            ]);
        }
    }
    res.json({ exam: examResult.rows[0], message: 'Đã cập nhật bài kiểm tra!' });
}));
// Delete online exam
app.delete('/api/online-exams/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const examId = Number(req.params.id);
    await pool.query('DELETE FROM online_exams WHERE id = $1', [examId]);
    res.json({ message: 'Đã xóa bài kiểm tra thành công!' });
}));
// Student Starts Exam Attempt
app.post('/api/online-exams/:id/start', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const user = req.user;
    const examId = Number(req.params.id);
    const examRes = await pool.query('SELECT * FROM online_exams WHERE id = $1', [examId]);
    if (!examRes.rows.length) {
        res.status(404).json({ message: 'Bài kiểm tra không tồn tại' });
        return;
    }
    const exam = examRes.rows[0];
    // Check attempts limit
    const attemptsRes = await pool.query('SELECT COUNT(*)::int FROM exam_submissions WHERE exam_id = $1 AND student_id = $2', [examId, user.id]);
    const attemptCount = attemptsRes.rows[0].count;
    if (attemptCount >= exam.max_attempts) {
        res.status(403).json({ message: `Bạn đã dùng hết số lần làm bài (${exam.max_attempts} lần).` });
        return;
    }
    // Check existing in_progress submission
    const existing = await pool.query('SELECT * FROM exam_submissions WHERE exam_id = $1 AND student_id = $2 AND status = \'in_progress\' ORDER BY start_time DESC LIMIT 1', [examId, user.id]);
    if (existing.rows.length) {
        res.json({ submission: existing.rows[0], exam });
        return;
    }
    const allQuestionsRes = await pool.query('SELECT id FROM question_bank WHERE exam_id = $1 ORDER BY id ASC', [examId]);
    const allQuestionIds = allQuestionsRes.rows.map((row) => Number(row.id));
    const randomCount = Math.max(0, Math.min(Number(exam.random_question_count || 0), allQuestionIds.length));
    let assignedQuestionIds = allQuestionIds;
    if (randomCount > 0 && randomCount < allQuestionIds.length) {
        if (exam.question_delivery_mode === 'same') {
            const savedIds = Array.isArray(exam.shared_question_ids) ? exam.shared_question_ids.map(Number).filter(Number.isFinite) : [];
            if (savedIds.length === randomCount) {
                assignedQuestionIds = savedIds;
            }
            else {
                const sharedRes = await pool.query('SELECT id FROM question_bank WHERE exam_id = $1 ORDER BY random() LIMIT $2', [examId, randomCount]);
                assignedQuestionIds = sharedRes.rows.map((row) => Number(row.id));
                await pool.query('UPDATE online_exams SET shared_question_ids = $1 WHERE id = $2', [JSON.stringify(assignedQuestionIds), examId]);
            }
        }
        else {
            const randomRes = await pool.query('SELECT id FROM question_bank WHERE exam_id = $1 ORDER BY random() LIMIT $2', [examId, randomCount]);
            assignedQuestionIds = randomRes.rows.map((row) => Number(row.id));
        }
    }
    // Create new attempt submission
    const subRes = await pool.query(`INSERT INTO exam_submissions (exam_id, student_id, attempt_number, start_time, status, answers, question_ids)
         VALUES ($1, $2, $3, NOW(), 'in_progress', '{}'::jsonb, $4) RETURNING *`, [examId, user.id, attemptCount + 1, JSON.stringify(assignedQuestionIds)]);
    res.json({ submission: subRes.rows[0], exam });
}));
// Student Autosave Exam Attempt Answers (Every 30s)
app.post('/api/online-exams/submissions/:id/autosave', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const subId = Number(req.params.id);
    const { answers, proctoring_logs } = req.body;
    await pool.query(`UPDATE exam_submissions SET answers = $1, proctoring_logs = $2 WHERE id = $3 AND status = 'in_progress'`, [JSON.stringify(answers || {}), JSON.stringify(proctoring_logs || []), subId]);
    res.json({ message: 'Tự động lưu bài làm thành công' });
}));
// Student Submit Exam Attempt & Auto-Grade MCQs
app.post('/api/online-exams/submissions/:id/submit', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const subId = Number(req.params.id);
    const { answers, proctoring_logs } = req.body;
    const subRes = await pool.query('SELECT * FROM exam_submissions WHERE id = $1', [subId]);
    if (!subRes.rows.length) {
        res.status(404).json({ message: 'Không tìm thấy lượt làm bài' });
        return;
    }
    const sub = subRes.rows[0];
    const assignedQuestionIds = Array.isArray(sub.question_ids)
        ? sub.question_ids.map(Number).filter(Number.isFinite)
        : [];
    const questionsRes = assignedQuestionIds.length
        ? await pool.query(`SELECT * FROM question_bank
             WHERE exam_id = $1 AND id = ANY($2::int[])
             ORDER BY array_position($2::int[], id)`, [sub.exam_id, assignedQuestionIds])
        : await pool.query('SELECT * FROM question_bank WHERE exam_id = $1', [sub.exam_id]);
    const questions = questionsRes.rows;
    let correctCount = 0;
    let totalAutoQuestions = 0;
    let hasEssay = false;
    const finalAnswers = answers || sub.answers || {};
    for (const q of questions) {
        if (['essay', 'writing', 'speaking', 'mindmap', 'paper_upload'].includes(q.type)) {
            hasEssay = true;
            continue;
        }
        totalAutoQuestions++;
        const studentAns = finalAnswers[q.id];
        const correctAns = q.correct_answers || [];
        let isCorrect = false;
        if (q.type === 'single_choice' || q.type === 'true_false') {
            if (studentAns && (studentAns === correctAns[0] || (Array.isArray(correctAns) && correctAns.includes(studentAns)))) {
                isCorrect = true;
            }
        }
        else if (q.type === 'multiple_choice') {
            if (Array.isArray(studentAns) && Array.isArray(correctAns)) {
                const isExact = studentAns.length === correctAns.length && studentAns.every(val => correctAns.includes(val));
                if (isExact)
                    isCorrect = true;
            }
        }
        else if (q.type === 'fill_blank') {
            if (typeof studentAns === 'string' && typeof correctAns[0] === 'string') {
                if (studentAns.trim().toLowerCase() === correctAns[0].trim().toLowerCase()) {
                    isCorrect = true;
                }
            }
        }
        else if (q.type === 'matching' || q.type === 'ordering' || q.type === 'drag_drop') {
            if (JSON.stringify(studentAns) === JSON.stringify(correctAns)) {
                isCorrect = true;
            }
        }
        if (isCorrect) {
            correctCount++;
        }
    }
    // Tự động tính điểm dựa trên: (tổng số câu đúng / tổng số câu) * 10 rồi làm tròn lên hàng chục
    const totalCount = questions.length || totalAutoQuestions || 1;
    const rawScore = (correctCount / totalCount) * 10;
    // Làm tròn lên hàng phần chục / 1 chữ số thập phân (e.g. 7.33 -> 7.4)
    const autoScore = Math.min(10, Math.ceil(Math.round(rawScore * 100) / 10) / 10);
    const maxScore = 10;
    const updatedStatus = hasEssay ? 'pending_essay' : 'graded';
    const result = await pool.query(`UPDATE exam_submissions SET
            answers = $1, submit_time = NOW(), status = $2, total_score = $3, max_score = $4, proctoring_logs = $5
         WHERE id = $6 RETURNING *`, [JSON.stringify(finalAnswers), updatedStatus, autoScore, maxScore, JSON.stringify(proctoring_logs || []), subId]);
    res.json({ submission: result.rows[0], message: 'Nộp bài kiểm tra thành công!' });
}));
// Teacher Get All Submissions for Exam & Analytics
app.get('/api/online-exams/:id/submissions', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const examId = Number(req.params.id);
    const { rows } = await pool.query(`SELECT s.*, u.full_name AS student_name, u.student_code, u.username
         FROM exam_submissions s
         JOIN users u ON u.id = s.student_id
         WHERE s.exam_id = $1
         ORDER BY s.submit_time DESC NULLS LAST`, [examId]);
    res.json({ submissions: rows });
}));
// Teacher Grade Essay & Feedback
app.put('/api/online-exams/submissions/:id/grade', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher']))
        return;
    const subId = Number(req.params.id);
    const userId = req.user.id;
    const { essay_scores, teacher_feedback, total_score, grade_details } = req.body;
    const { rows } = await pool.query(`UPDATE exam_submissions SET
            essay_scores = $1, teacher_feedback = $2, total_score = $3, grade_details = $4, status = 'graded',
            graded_by = $5, graded_at = NOW()
         WHERE id = $6 RETURNING *`, [JSON.stringify(essay_scores || {}), teacher_feedback || null, Number(total_score || 0), JSON.stringify(grade_details || {}), userId, subId]);
    res.json({ submission: rows[0], message: 'Đã lưu điểm và nhận xét thành công!' });
}));
// Student History & Results
app.get('/api/online-exams/student/results', asyncHandler(async (req, res) => {
    if (!requireUser(req, res))
        return;
    const userId = req.user.id;
    const { rows } = await pool.query(`SELECT s.*, e.title AS exam_title, e.subject, e.gradebook_name, e.grade_column_name, e.show_answers_after_submit, e.show_score_after_submit, c.name AS class_name
         FROM exam_submissions s
         JOIN online_exams e ON e.id = s.exam_id
         LEFT JOIN classes c ON c.id = e.class_id
         WHERE s.student_id = $1
         ORDER BY s.start_time DESC`, [userId]);
    res.json({ results: rows });
}));
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: 'Có lỗi hệ thống, vui lòng thử lại.', error: String(err) });
});
app.get('/', (_req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>VAT LMS API</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f8fafc;color:#0f172a;text-align:center;}a{display:inline-block;margin-top:16px;padding:12px 24px;background:#7f1d1d;color:#fff;border-radius:12px;text-decoration:none;font-weight:bold;}</style></head><body><div><h1>VAT LMS Backend API đang hoạt động</h1><p>Vui lòng mở giao diện ứng dụng tại cổng 5173:</p><a href="http://localhost:5173">Mở Giao diện LMS (http://localhost:5173)</a></div></body></html>`);
});
app.listen(port, '::', () => {
    console.log(`Backend API listening on http://[::]:${port}`);
});
//# sourceMappingURL=index.js.map