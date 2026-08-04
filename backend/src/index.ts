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
pool.query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_hours TEXT;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS note TEXT;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_name TEXT;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_data TEXT;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_size TEXT;').catch(console.error);
pool.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_type TEXT;').catch(console.error);
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
    type VARCHAR(50) DEFAULT 'general',
    class_id INT REFERENCES classes(id) ON DELETE CASCADE,
    target_role VARCHAR(20) DEFAULT 'all',
    sender_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    receiver_type TEXT DEFAULT 'all',
    receiver_ids INTEGER[] DEFAULT '{}',
    priority notification_priority NOT NULL DEFAULT 'normal',
    read_status JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(console.error);

pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS class_id INT REFERENCES classes(id) ON DELETE CASCADE;').catch(console.error);
pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT \'general\';').catch(console.error);
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
    status VARCHAR(20) DEFAULT 'published',
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(console.error);

pool.query(`
  CREATE TABLE IF NOT EXISTS question_bank (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES online_exams(id) ON DELETE CASCADE,
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
pool.query(`ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb`).catch(console.error);
pool.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS proctoring_logs JSONB DEFAULT '[]'::jsonb`).catch(console.error);
pool.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS teacher_audio_feedback_url TEXT`).catch(console.error);
pool.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS assigned_grader_name TEXT`).catch(console.error);

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

type Role = 'student' | 'teacher' | 'admin' | 'owner';

type AuthedRequest = express.Request & {
    user?: { id: number; role: Role; full_name: string; username: string };
};

const statusVi: Record<string, string> = {
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

const asyncHandler = (handler: (req: AuthedRequest, res: express.Response) => Promise<void>) => {
    return (req: AuthedRequest, res: express.Response, next: express.NextFunction) => {
        handler(req, res).catch(next);
    };
};

app.use(async (req: AuthedRequest, _res, next) => {
    try {
        const userId = req.header('x-user-id');
        if (userId) {
            const { rows } = await pool.query(
                'SELECT id, role, full_name, username FROM users WHERE id = $1 AND status = $2',
                [userId, 'active'],
            );
            req.user = rows[0];
        }
        next();
    } catch (error) {
        next(error);
    }
});

function requireUser(req: AuthedRequest, res: express.Response) {
    if (!req.user) {
        res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục.' });
        return false;
    }
    return true;
}

function requireRole(req: AuthedRequest, res: express.Response, roles: Role[]) {
    if (!requireUser(req, res)) return false;
    if (!roles.includes(req.user!.role)) {
        res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' });
        return false;
    }
    return true;
}

function randomAttendanceStatus(classId: number, studentId: number, dateValue: string | Date) {
    const dateKey = new Date(dateValue).toISOString().slice(0, 10).replace(/-/g, '');
    const seed = Number(dateKey) + classId * 31 + studentId * 17;
    return seed % 7 === 0 || seed % 11 === 0 ? 'absent' : 'present';
}

function randomAttendanceNote(status: string) {
    return status === 'absent'
        ? 'Tự động đồng bộ từ timeline: vắng mặt ngẫu nhiên để demo dữ liệu.'
        : 'Tự động đồng bộ từ timeline: có mặt.';
}

async function syncAttendanceFromTimeline(classId?: number, studentId?: number) {
    const params: unknown[] = [];
    const classFilter = classId ? `AND s.class_id = $${params.push(classId)}` : '';
    const studentFilter = studentId ? `AND e.student_id = $${params.push(studentId)}` : '';

    await pool.query(
        `INSERT INTO attendance (class_id, student_id, date, status, note)
         SELECT s.class_id,
                e.student_id,
                s.start_time::date,
                CASE
                    WHEN (EXTRACT(DOY FROM s.start_time)::int + s.class_id * 31 + e.student_id * 17) % 7 = 0
                      OR (EXTRACT(DOY FROM s.start_time)::int + s.class_id * 31 + e.student_id * 17) % 11 = 0
                    THEN 'absent'
                    ELSE 'present'
                END AS status,
                CASE
                    WHEN (EXTRACT(DOY FROM s.start_time)::int + s.class_id * 31 + e.student_id * 17) % 7 = 0
                      OR (EXTRACT(DOY FROM s.start_time)::int + s.class_id * 31 + e.student_id * 17) % 11 = 0
                    THEN 'Tự động đồng bộ từ timeline: vắng mặt ngẫu nhiên để demo dữ liệu.'
                    ELSE 'Tự động đồng bộ từ timeline: có mặt.'
                END AS note
         FROM sessions s
         JOIN enrollments e ON e.class_id = s.class_id
         WHERE s.start_time <= now()
           AND s.status <> 'cancelled'
           ${classFilter}
           ${studentFilter}
         ON CONFLICT (class_id, student_id, date) DO NOTHING`,
        params,
    );
}

function createStudentCode(index: number) {
    return `VAT-ST-${String(Date.now()).slice(-4)}${String(index + 1).padStart(2, '0')}`;
}

app.get('/health', asyncHandler(async (_req, res) => {
    const dbResult = await pool.query('select now() as now');
    res.json({ status: 'ok', database: 'connected', time: dbResult.rows[0].now });
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const { rows } = await pool.query(
        `SELECT id, full_name, username, phone, student_code, role, specialty, status
     FROM users WHERE username = $1 AND password = $2 AND status = 'active'`,
        [username, password],
    );

    if (!rows[0]) {
        res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        return;
    }

    res.json({ user: rows[0] });
}));

app.get('/api/me', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    res.json({ user: req.user });
}));

app.get('/api/summary', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const role = req.user!.role;
    const userId = req.user!.id;

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

app.get('/api/classes', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const user = req.user!;
    const params: unknown[] = [];
    let where = '';

    if (user.role === 'student') {
        params.push(user.id);
        where = 'WHERE EXISTS (SELECT 1 FROM enrollments e WHERE e.class_id = c.id AND e.student_id = $1)';
    } else if (user.role === 'teacher') {
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

app.post('/api/classes', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin'])) return;
    const { name, code, subject, teacher_id, start_date, end_date, schedule, class_hours, location, description, students_csv } = req.body;

    const classCode = code || `VAT-CLS-${String(Date.now()).slice(-6)}`;
    const { rows } = await pool.query(
        `INSERT INTO classes (name, code, subject, teacher_id, start_date, end_date, schedule, class_hours, location, description, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'upcoming') RETURNING *`,
        [name, classCode, subject || 'Chưa xếp môn', teacher_id || null, start_date || null, end_date || null, schedule || null, class_hours || null, location || null, description || null],
    );

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
            if (!parts[0]) continue;
            let [fullName, username, password, phone] = parts;
            if (!username) {
                username = fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                if (!username) username = `student${Date.now()}${index}`;
            }
            const userPassword = password || 'vat1234';
            const studentCode = createStudentCode(index);

            // Insert or find existing student
            let studentId: number | null = null;
            const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
            if (existing.rows[0]) {
                studentId = existing.rows[0].id;
            } else {
                const inserted = await pool.query(
                    `INSERT INTO users (full_name, username, role, password, phone, student_code)
                     VALUES ($1, $2, 'student', $3, $4, $5)
                     RETURNING id`,
                    [fullName, username, userPassword, phone || null, studentCode],
                );
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
    if (!requireRole(req, res, ['owner', 'admin'])) return;
    const classId = Number(req.params.id);
    await pool.query('DELETE FROM classes WHERE id = $1', [classId]);
    res.json({ message: 'Đã xóa lớp học thành công.' });
}));

app.put('/api/classes/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const classId = Number(req.params.id);
    const { name, code, subject, teacher_id, schedule, class_hours, location, description } = req.body;
    const { rows } = await pool.query(
        `UPDATE classes SET
            name = COALESCE($1, name),
            code = COALESCE($2, code),
            subject = COALESCE($3, subject),
            teacher_id = $4,
            schedule = COALESCE($5, schedule),
            class_hours = COALESCE($6, class_hours),
            location = COALESCE($7, location),
            description = COALESCE($8, description)
        WHERE id = $9 RETURNING *`,
        [name, code, subject, teacher_id || null, schedule, class_hours, location, description, classId],
    );
    res.json({ class: rows[0], message: 'Đã cập nhật thông tin lớp học thành công.' });
}));

app.get('/api/schedule/adjustments', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const { rows } = await pool.query(`
        SELECT sa.*, c.name AS class_name, c.code AS class_code, c.location
        FROM schedule_adjustments sa
        JOIN classes c ON c.id = sa.class_id
        ORDER BY sa.date DESC, sa.id DESC
    `);
    res.json({ adjustments: rows });
}));

app.post('/api/schedule/adjustments', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const { class_id, date, custom_hours, type, reason } = req.body;
    if (!class_id || !date) {
        res.status(400).json({ message: 'Vui lòng chọn lớp học và ngày áp dụng' });
        return;
    }
    const { rows } = await pool.query(
        `INSERT INTO schedule_adjustments (class_id, date, custom_hours, type, reason)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [Number(class_id), date, custom_hours || null, type || 'rescheduled', reason || null]
    );
    res.status(201).json({ adjustment: rows[0], message: 'Đã tạo điều chỉnh lịch đột xuất thành công.' });
}));

app.delete('/api/schedule/adjustments/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const id = Number(req.params.id);
    await pool.query('DELETE FROM schedule_adjustments WHERE id = $1', [id]);
    res.json({ message: 'Đã xóa điều chỉnh lịch.' });
}));

// --- Sessions (Timeline) Endpoints ---
app.get('/api/sessions/class/:classId', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const { classId } = req.params;
    await syncAttendanceFromTimeline(Number(classId));
    const { rows } = await pool.query(
        `SELECT s.*,
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
         ORDER BY s.start_time ASC`,
        [classId]
    );
    res.json({ sessions: rows });
}));

app.post('/api/sessions', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const { class_id, title, description, start_time, end_time } = req.body;
    const { rows } = await pool.query(
        `INSERT INTO sessions (class_id, title, description, start_time, end_time, status) 
         VALUES ($1, $2, $3, $4, $5, 'not_started') RETURNING *`,
        [class_id, title, description, start_time, end_time]
    );
    res.json({ message: 'Tạo buổi học thành công', session: rows[0] });
}));

app.put('/api/sessions/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const { id } = req.params;
    const { title, description, start_time, end_time, status } = req.body;
    const { rows } = await pool.query(
        `UPDATE sessions 
         SET title = $1, description = $2, start_time = $3, end_time = $4, status = $5
         WHERE id = $6 RETURNING *`,
        [title, description, start_time, end_time, status, id]
    );
    res.json({ message: 'Cập nhật buổi học thành công', session: rows[0] });
}));

app.delete('/api/sessions/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const { id } = req.params;
    await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
    res.json({ message: 'Xóa buổi học thành công' });
}));

// --- Attendance Endpoints ---
app.get('/api/attendance/class/:classId', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
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
        pool.query(
            `SELECT student_id, status, note FROM attendance WHERE class_id = $1 AND date = $2`,
            [classId, date]
        )
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

app.post('/api/attendance/save', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
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
        await pool.query(
            `INSERT INTO attendance (class_id, student_id, date, status, note)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (class_id, student_id, date)
             DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note`,
            [Number(class_id), r.student_id, date, r.status || 'present', r.note || null]
        );
    }

    res.json({ message: `Đã lưu kết quả điểm danh ngày ${date} thành công!` });
}));

app.get('/api/attendance/student', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const userId = (req as AuthedRequest).user!.id;
    await syncAttendanceFromTimeline(undefined, userId);
    const { rows } = await pool.query(
        `SELECT a.id, a.class_id, c.name AS class_name, a.date, a.status, a.note, a.created_at,
                s.id AS session_id, s.title AS session_title, s.start_time AS session_start_time, s.end_time AS session_end_time,
                ROW_NUMBER() OVER (PARTITION BY a.class_id ORDER BY COALESCE(s.start_time, a.date::timestamp), a.created_at)::int AS session_number
         FROM attendance a
         JOIN classes c ON c.id = a.class_id
         LEFT JOIN sessions s ON s.class_id = a.class_id AND s.start_time::date = a.date
         WHERE a.student_id = $1
         ORDER BY a.date DESC, a.created_at DESC`,
        [userId]
    );
    res.json({ attendance: rows });
}));

app.get('/api/materials/all', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const user = (req as AuthedRequest).user!;
    let where = '';
    let params: any[] = [];

    if (user.role === 'student') {
        where = 'WHERE m.class_id IN (SELECT class_id FROM enrollments WHERE student_id = $1)';
        params = [user.id];
    } else if (user.role === 'teacher') {
        where = 'WHERE m.class_id IN (SELECT id FROM classes WHERE teacher_id = $1)';
        params = [user.id];
    }

    const { rows } = await pool.query(
        `SELECT m.*, c.name AS class_name, u.full_name AS uploaded_by_name
         FROM materials m
         JOIN classes c ON c.id = m.class_id
         LEFT JOIN users u ON u.id = m.uploaded_by
         ${where}
         ORDER BY m.created_at DESC`,
        params
    );
    res.json({ materials: rows });
}));

app.get('/api/materials/class/:classId', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const classId = Number(req.params.classId);
    const { rows } = await pool.query(
        `SELECT m.*, u.full_name AS uploaded_by_name
         FROM materials m LEFT JOIN users u ON u.id = m.uploaded_by
         WHERE m.class_id = $1 ORDER BY m.created_at DESC`,
        [classId]
    );
    res.json({ materials: rows });
}));

app.post('/api/materials', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const userId = (req as AuthedRequest).user!.id;
    const { class_id, title, note, file_name, file_data, file_size, file_type } = req.body;
    if (!class_id || (!title && !file_name)) {
        res.status(400).json({ message: 'Vui lòng chọn lớp học và tài liệu' });
        return;
    }

    const { rows } = await pool.query(
        `INSERT INTO materials (class_id, title, note, file_name, file_data, file_size, file_type, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
            Number(class_id),
            title || file_name || 'Tài liệu học tập',
            note || null,
            file_name || null,
            file_data || null,
            file_size || null,
            file_type || null,
            userId,
        ]
    );

    res.status(201).json({ material: rows[0], message: 'Đã tải tài liệu lên thành công!' });
}));

app.put('/api/materials/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const id = Number(req.params.id);
    const { title, note, file_name, file_data, file_size, file_type } = req.body;

    const { rows } = await pool.query(
        `UPDATE materials
         SET title = COALESCE($1, title),
             note = $2,
             file_name = COALESCE($3, file_name),
             file_data = COALESCE($4, file_data),
             file_size = COALESCE($5, file_size),
             file_type = COALESCE($6, file_type)
         WHERE id = $7 RETURNING *`,
        [title || null, note || null, file_name || null, file_data || null, file_size || null, file_type || null, id]
    );

    if (!rows.length) {
        res.status(404).json({ message: 'Không tìm thấy tài liệu' });
        return;
    }

    res.json({ material: rows[0], message: 'Đã cập nhật tài liệu thành công!' });
}));

app.delete('/api/materials/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const id = Number(req.params.id);
    await pool.query('DELETE FROM materials WHERE id = $1', [id]);
    res.json({ message: 'Đã xóa tài liệu thành công!' });
}));

app.get('/api/notifications', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const user = (req as AuthedRequest).user!;
    let where = '';
    let params: any[] = [];

    if (user.role === 'student') {
        where = `WHERE n.receiver_type = 'all'
          OR n.class_id IS NULL
          OR n.class_id IN (SELECT class_id FROM enrollments WHERE student_id = $1)
          OR $1 = ANY(n.receiver_ids)`;
        params = [user.id];
    }

    const { rows } = await pool.query(
        `SELECT n.*, c.name AS class_name, COALESCE(author.full_name, sender.full_name) AS created_by_name, sender.full_name AS sender_name
         FROM notifications n
         LEFT JOIN classes c ON c.id = n.class_id
         LEFT JOIN users author ON author.id = n.created_by
         LEFT JOIN users sender ON sender.id = n.sender_id
         ${where}
         ORDER BY n.created_at DESC
         LIMIT 100`,
        params
    );
    res.json({ notifications: rows });
}));

app.post('/api/notifications', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const user = (req as AuthedRequest).user!;
    const { title, content, type, class_id, receiver_type, receiver_ids, priority } = req.body;
    const trimmedTitle = String(title || '').trim();
    const trimmedContent = String(content || '').trim();
    const normalizedPriority = ['normal', 'important', 'urgent'].includes(priority) ? priority : 'normal';
    const normalizedType = class_id ? 'class' : (type || 'general');
    const ids = Array.isArray(receiver_ids) ? receiver_ids.map(Number).filter(Boolean) : [];

    if (trimmedTitle.length < 8 || trimmedContent.length < 20) {
        res.status(400).json({ message: 'Vui lòng nhập tiêu đề tối thiểu 8 ký tự và nội dung tối thiểu 20 ký tự.' });
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

    const { rows } = await pool.query(
        `INSERT INTO notifications (title, content, type, class_id, target_role, sender_id, created_by, receiver_type, receiver_ids, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9) RETURNING *`,
        [
            trimmedTitle,
            trimmedContent,
            normalizedType,
            class_id ? Number(class_id) : null,
            receiver_type || 'all',
            user.id,
            receiver_type || 'all',
            ids,
            normalizedPriority,
        ]
    );

    res.status(201).json({ notification: rows[0], message: 'Đã đăng thông báo thành công!' });
}));

app.delete('/api/notifications/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const id = Number(req.params.id);
    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    res.json({ message: 'Đã xóa thông báo thành công!' });
}));

app.get('/api/classes/:id', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const classId = Number(req.params.id);
    const [klass, students, sessions, materials, tests, tuitions] = await Promise.all([
        pool.query('SELECT c.*, u.full_name AS teacher_name FROM classes c LEFT JOIN users u ON u.id = c.teacher_id WHERE c.id=$1', [classId]),
        pool.query(`SELECT u.id, u.full_name, u.username, u.phone, u.student_code, e.progress, e.attendance_rate, e.teacher_note
                FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.class_id=$1 ORDER BY u.full_name`, [classId]),
        pool.query('SELECT * FROM sessions WHERE class_id=$1 ORDER BY start_time', [classId]),
        pool.query('SELECT m.*, u.full_name AS uploaded_by_name FROM materials m LEFT JOIN users u ON u.id=m.uploaded_by WHERE m.class_id=$1 ORDER BY m.created_at DESC', [classId]),
        pool.query('SELECT * FROM tests WHERE class_id=$1 ORDER BY due_date NULLS LAST', [classId]),
        pool.query(`SELECT t.*, u.full_name AS student_name FROM tuitions t JOIN users u ON u.id=t.student_id WHERE t.class_id=$1 ORDER BY u.full_name`, [classId]),
    ]);
    res.json({ class: klass.rows[0], students: students.rows, sessions: sessions.rows, materials: materials.rows, tests: tests.rows, tuitions: tuitions.rows });
}));

app.get('/api/users', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const user = (req as AuthedRequest).user!;
    const role = req.query.role;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (role) {
        params.push(role);
        conditions.push(`role = $${params.length}`);
    }

    if (user.role === 'teacher' && role === 'student') {
        params.push(user.id);
        conditions.push(`(
            id IN (
                SELECT student_id FROM enrollments WHERE class_id IN (SELECT id FROM classes WHERE teacher_id = $${params.length})
            )
        )`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT id, full_name, username, phone, student_code, role, specialty, status, note, created_at FROM users ${where} ORDER BY created_at DESC`, params);
    res.json({ users: rows });
}));

app.post('/api/users/student', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin'])) return;
    const { username, password, class_id } = req.body;
    const { rows } = await pool.query(
        `INSERT INTO users (username, role, password)
     VALUES ($1,'student',$2) RETURNING id, full_name, username, role`,
        [username, password || 'student123'],
    );
    if (class_id) {
        await pool.query('INSERT INTO enrollments (class_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [class_id, rows[0].id]);
        await pool.query('INSERT INTO tuitions (class_id, student_id, amount_due, status) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [class_id, rows[0].id, 0, 'unpaid']);
    }
    res.status(201).json({ user: rows[0] });
}));

app.post('/api/users/teacher', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin'])) return;
    const { username, password } = req.body;
    const { rows } = await pool.query(
        `INSERT INTO users (username, role, password)
     VALUES ($1,'teacher',$2) RETURNING id, full_name, username, role`,
        [username, password || 'teacher123'],
    );
    res.status(201).json({ user: rows[0] });
}));

app.post('/api/users/students/import', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin'])) return;
    const { csv, class_id } = req.body;
    const lines = String(csv || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const created = [];

    for (const [index, line] of lines.entries()) {
        const [full_name, email, phone] = line.split(',').map((item) => item?.trim());
        if (!full_name || !email) continue;
        const password = `vat${String(index + 1).padStart(4, '0')}`;
        const studentCode = createStudentCode(index);
        const { rows } = await pool.query(
            `INSERT INTO users (full_name, username, role, password)
       VALUES ($1,$2,'student',$3)
       ON CONFLICT (username) DO NOTHING
       RETURNING id, full_name, username, role, password`,
            [full_name, email, password],
        );
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
    if (!requireRole(req, res, ['owner', 'admin'])) return;
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
        if (parts.length === 0 || !parts[0]) continue;

        let [fullName, username, password, role, phone, specialty] = parts;

        if (!username) {
            username = fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
            if (!username) username = `user${Date.now()}${index}`;
        }

        const userRole: Role = (role === 'teacher' || role === 'admin' || role === 'owner' || role === 'student') ? role : (default_role as Role);
        const userPassword = password || 'vat1234';
        const studentCode = userRole === 'student' ? createStudentCode(index) : null;

        try {
            const { rows } = await pool.query(
                `INSERT INTO users (full_name, username, role, password, phone, specialty, student_code)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (username) DO NOTHING
                 RETURNING id, full_name, username, role, phone, specialty, student_code`,
                [fullName, username, userRole, userPassword, phone || null, specialty || null, studentCode],
            );
            if (rows[0]) {
                created.push(rows[0]);
            } else {
                skipped++;
            }
        } catch (err) {
            console.error(`Error importing row: ${line}`, err);
            skipped++;
        }
    }

    res.status(201).json({ count: created.length, created, skipped, message: `Tải lên thành công ${created.length} tài khoản${skipped ? `, bỏ qua ${skipped} tài khoản bị trùng.` : '.'}` });
}));


app.post('/api/materials', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const { class_id, session_id, title, description, file_url, external_link } = req.body;
    const { rows } = await pool.query(
        `INSERT INTO materials (class_id, session_id, title, description, file_url, external_link, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [class_id, session_id || null, title, description, file_url, external_link, req.user!.id],
    );
    res.status(201).json({ material: rows[0] });
}));

app.post('/api/tests', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const { class_id, session_id, title, description, type, due_date, max_score, status } = req.body;
    const { rows } = await pool.query(
        `INSERT INTO tests (class_id, session_id, title, description, type, due_date, max_score, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [class_id, session_id || null, title, description, type || 'assignment', due_date || null, max_score || 10, status || 'published', req.user!.id],
    );
    res.status(201).json({ test: rows[0] });
}));

app.patch('/api/tuitions/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin'])) return;
    const { amount_paid, status, paid_at, note } = req.body;
    const { rows } = await pool.query(
        `UPDATE tuitions SET amount_paid=$1, status=$2, paid_at=$3, note=$4, updated_at=now() WHERE id=$5 RETURNING *`,
        [amount_paid, status, paid_at || null, note, req.params.id],
    );
    res.json({ tuition: rows[0] });
}));

app.get('/api/tuitions', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const user = (req as AuthedRequest).user!;

    let query = `
        SELECT t.*, u.full_name AS student_name, u.student_code, c.name AS class_name
        FROM tuitions t
        JOIN users u ON u.id=t.student_id
        JOIN classes c ON c.id=t.class_id
    `;
    const params: any[] = [];

    if (user.role === 'student') {
        query += ' WHERE t.student_id = $1';
        params.push(user.id);
    } else if (user.role !== 'admin' && user.role !== 'owner') {
        res.status(403).json({ message: 'Forbidden' });
        return;
    }

    query += ' ORDER BY t.updated_at DESC';

    const { rows } = await pool.query(query, params);
    res.json({ tuitions: rows });
}));

app.post('/api/submissions/:id/grade', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const { score, feedback } = req.body;
    const { rows } = await pool.query(
        `UPDATE submissions SET score=$1, feedback=$2, graded_by=$3, graded_at=now() WHERE id=$4 RETURNING *`,
        [score, feedback, req.user!.id, req.params.id],
    );
    res.json({ submission: rows[0] });
}));

// --- Feedbacks Endpoints ---
app.get('/api/feedbacks', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const user = (req as AuthedRequest).user!;
    let query = `
        SELECT f.*, u.full_name AS student_name, u.student_code
        FROM feedbacks f
        JOIN users u ON u.id = f.student_id
    `;
    const params: any[] = [];
    if (user.role === 'student') {
        query += ' WHERE f.student_id = $1';
        params.push(user.id);
    } else if (user.role !== 'admin' && user.role !== 'owner' && user.role !== 'teacher') {
        res.status(403).json({ message: 'Forbidden' });
        return;
    }
    query += ' ORDER BY f.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json({ feedbacks: rows });
}));

app.post('/api/feedbacks', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['student'])) return;
    const user = (req as AuthedRequest).user!;
    const { subject, content } = req.body;
    const { rows } = await pool.query(
        `INSERT INTO feedbacks (student_id, subject, content) VALUES ($1, $2, $3) RETURNING *`,
        [user.id, subject, content]
    );
    res.json({ message: 'Đã gửi phản hồi', feedback: rows[0] });
}));

app.put('/api/feedbacks/:id/respond', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const { admin_response } = req.body;
    const { id } = req.params;
    const { rows } = await pool.query(
        `UPDATE feedbacks SET admin_response = $1, status = 'resolved', updated_at = now() WHERE id = $2 RETURNING *`,
        [admin_response, id]
    );
    res.json({ message: 'Đã trả lời phản hồi', feedback: rows[0] });
}));

// ==========================================
// ONLINE EXAMINATION SYSTEM ENDPOINTS
// ==========================================

// Get list of online exams
app.get('/api/online-exams', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const user = (req as AuthedRequest).user!;
    let where = '';
    let params: any[] = [];

    if (user.role === 'student') {
        where = `WHERE e.status = 'published' AND (e.class_id IS NULL OR e.class_id IN (SELECT class_id FROM enrollments WHERE student_id = $1))`;
        params = [user.id];
    } else if (user.role === 'teacher') {
        where = `WHERE e.class_id IN (SELECT id FROM classes WHERE teacher_id = $1) OR e.created_by = $1`;
        params = [user.id];
    }

    const { rows } = await pool.query(
        `SELECT e.*, c.name AS class_name, u.full_name AS teacher_name,
                (SELECT COUNT(*)::int FROM question_bank q WHERE q.exam_id = e.id) AS question_count,
                (SELECT COUNT(*)::int FROM exam_submissions s WHERE s.exam_id = e.id) AS submission_count
         FROM online_exams e
         LEFT JOIN classes c ON c.id = e.class_id
         LEFT JOIN users u ON u.id = e.created_by
         ${where}
         ORDER BY e.created_at DESC`,
        params
    );
    res.json({ exams: rows });
}));

// Get single online exam with questions
app.get('/api/online-exams/:id', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const examId = Number(req.params.id);

    const examRes = await pool.query(
        `SELECT e.*, c.name AS class_name, u.full_name AS teacher_name
         FROM online_exams e
         LEFT JOIN classes c ON c.id = e.class_id
         LEFT JOIN users u ON u.id = e.created_by
         WHERE e.id = $1`,
        [examId]
    );

    if (!examRes.rows.length) {
        res.status(404).json({ message: 'Không tìm thấy bài kiểm tra' });
        return;
    }

    const questionsRes = await pool.query(
        `SELECT * FROM question_bank WHERE exam_id = $1 ORDER BY id ASC`,
        [examId]
    );

    res.json({ exam: examRes.rows[0], questions: questionsRes.rows });
}));

// Create new online exam with questions
app.post('/api/online-exams', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const userId = (req as AuthedRequest).user!.id;
    const {
        title, subject, class_id, description, start_time, end_time, duration_minutes,
        show_answers_after_submit, show_score_after_submit, max_attempts,
        shuffle_questions, shuffle_options, display_mode, auto_submit, status, questions
    } = req.body;

    if (!title) {
        res.status(400).json({ message: 'Vui lòng nhập tên bài kiểm tra' });
        return;
    }

    const examResult = await pool.query(
        `INSERT INTO online_exams (
            title, subject, class_id, description, start_time, end_time, duration_minutes,
            show_answers_after_submit, show_score_after_submit, max_attempts,
            shuffle_questions, shuffle_options, display_mode, auto_submit, status, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [
            title.trim(), subject || 'Chung', class_id ? Number(class_id) : null, description || null,
            start_time || null, end_time || null, Number(duration_minutes || 45),
            Boolean(show_answers_after_submit), show_score_after_submit !== false, Number(max_attempts || 1),
            shuffle_questions !== false, shuffle_options !== false, display_mode || 'one', auto_submit !== false,
            status || 'published', userId
        ]
    );

    const exam = examResult.rows[0];

    // Insert questions into question_bank
    if (Array.isArray(questions) && questions.length > 0) {
        for (const q of questions) {
            await pool.query(
                `INSERT INTO question_bank (
                    exam_id, subject, chapter, topic, difficulty, type, question_text,
                    options, correct_answers, points, grading_guide, tags, created_by
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [
                    exam.id, q.subject || subject || 'Chung', q.chapter || null, q.topic || null,
                    q.difficulty || 'medium', q.type || 'single_choice', q.question_text || '',
                    JSON.stringify(q.options || []), JSON.stringify(q.correct_answers || []),
                    Number(q.points || 1.0), q.grading_guide || null, q.tags || [], userId
                ]
            );
        }
    }

    res.status(201).json({ exam, message: 'Tạo bài kiểm tra trực tuyến thành công!' });
}));

// Update online exam and questions
app.put('/api/online-exams/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const examId = Number(req.params.id);
    const userId = (req as AuthedRequest).user!.id;
    const {
        title, subject, class_id, description, start_time, end_time, duration_minutes,
        show_answers_after_submit, show_score_after_submit, max_attempts,
        shuffle_questions, shuffle_options, display_mode, auto_submit, status, questions
    } = req.body;

    const examResult = await pool.query(
        `UPDATE online_exams SET
            title = COALESCE($1, title), subject = COALESCE($2, subject), class_id = $3,
            description = $4, start_time = $5, end_time = $6, duration_minutes = COALESCE($7, duration_minutes),
            show_answers_after_submit = $8, show_score_after_submit = $9, max_attempts = COALESCE($10, max_attempts),
            shuffle_questions = $11, shuffle_options = $12, display_mode = COALESCE($13, display_mode),
            auto_submit = $14, status = COALESCE($15, status)
        WHERE id = $16 RETURNING *`,
        [
            title, subject, class_id ? Number(class_id) : null, description || null,
            start_time || null, end_time || null, Number(duration_minutes || 45),
            Boolean(show_answers_after_submit), show_score_after_submit !== false, Number(max_attempts || 1),
            shuffle_questions !== false, shuffle_options !== false, display_mode || 'one', auto_submit !== false,
            status, examId
        ]
    );

    if (!examResult.rows.length) {
        res.status(404).json({ message: 'Không tìm thấy bài kiểm tra' });
        return;
    }

    // Replace questions if provided
    if (Array.isArray(questions)) {
        await pool.query('DELETE FROM question_bank WHERE exam_id = $1', [examId]);
        for (const q of questions) {
            await pool.query(
                `INSERT INTO question_bank (
                    exam_id, subject, chapter, topic, difficulty, type, question_text,
                    options, correct_answers, points, grading_guide, tags, created_by
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [
                    examId, q.subject || subject || 'Chung', q.chapter || null, q.topic || null,
                    q.difficulty || 'medium', q.type || 'single_choice', q.question_text || '',
                    JSON.stringify(q.options || []), JSON.stringify(q.correct_answers || []),
                    Number(q.points || 1.0), q.grading_guide || null, q.tags || [], userId
                ]
            );
        }
    }

    res.json({ exam: examResult.rows[0], message: 'Đã cập nhật bài kiểm tra!' });
}));

// Delete online exam
app.delete('/api/online-exams/:id', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const examId = Number(req.params.id);
    await pool.query('DELETE FROM online_exams WHERE id = $1', [examId]);
    res.json({ message: 'Đã xóa bài kiểm tra thành công!' });
}));

// Student Starts Exam Attempt
app.post('/api/online-exams/:id/start', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const user = (req as AuthedRequest).user!;
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

    // Create new attempt submission
    const subRes = await pool.query(
        `INSERT INTO exam_submissions (exam_id, student_id, attempt_number, start_time, status, answers)
         VALUES ($1, $2, $3, NOW(), 'in_progress', '{}'::jsonb) RETURNING *`,
        [examId, user.id, attemptCount + 1]
    );

    res.json({ submission: subRes.rows[0], exam });
}));

// Student Autosave Exam Attempt Answers (Every 30s)
app.post('/api/online-exams/submissions/:id/autosave', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const subId = Number(req.params.id);
    const { answers, proctoring_logs } = req.body;

    await pool.query(
        `UPDATE exam_submissions SET answers = $1, proctoring_logs = $2 WHERE id = $3 AND status = 'in_progress'`,
        [JSON.stringify(answers || {}), JSON.stringify(proctoring_logs || []), subId]
    );

    res.json({ message: 'Tự động lưu bài làm thành công' });
}));

// Student Submit Exam Attempt & Auto-Grade MCQs
app.post('/api/online-exams/submissions/:id/submit', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const subId = Number(req.params.id);
    const { answers, proctoring_logs } = req.body;

    const subRes = await pool.query('SELECT * FROM exam_submissions WHERE id = $1', [subId]);
    if (!subRes.rows.length) {
        res.status(404).json({ message: 'Không tìm thấy lượt làm bài' });
        return;
    }
    const sub = subRes.rows[0];

    const questionsRes = await pool.query('SELECT * FROM question_bank WHERE exam_id = $1', [sub.exam_id]);
    const questions = questionsRes.rows;

    let autoScore = 0;
    let maxScore = 0;
    let hasEssay = false;

    const finalAnswers = answers || sub.answers || {};

    for (const q of questions) {
        const pts = Number(q.points || 1.0);
        maxScore += pts;

        if (['essay', 'writing', 'speaking', 'mindmap'].includes(q.type)) {
            hasEssay = true;
            continue;
        }

        const studentAns = finalAnswers[q.id];
        const correctAns = q.correct_answers || [];

        if (q.type === 'single_choice' || q.type === 'true_false') {
            if (studentAns && (studentAns === correctAns[0] || (Array.isArray(correctAns) && correctAns.includes(studentAns)))) {
                autoScore += pts;
            }
        } else if (q.type === 'multiple_choice') {
            if (Array.isArray(studentAns) && Array.isArray(correctAns)) {
                const isExact = studentAns.length === correctAns.length && studentAns.every(val => correctAns.includes(val));
                if (isExact) autoScore += pts;
            }
        } else if (q.type === 'fill_blank') {
            if (typeof studentAns === 'string' && typeof correctAns[0] === 'string') {
                if (studentAns.trim().toLowerCase() === correctAns[0].trim().toLowerCase()) {
                    autoScore += pts;
                }
            }
        } else if (q.type === 'matching' || q.type === 'ordering' || q.type === 'drag_drop') {
            if (JSON.stringify(studentAns) === JSON.stringify(correctAns)) {
                autoScore += pts;
            }
        }
    }

    const updatedStatus = hasEssay ? 'pending_essay' : 'graded';

    const result = await pool.query(
        `UPDATE exam_submissions SET
            answers = $1, submit_time = NOW(), status = $2, total_score = $3, max_score = $4, proctoring_logs = $5
         WHERE id = $6 RETURNING *`,
        [JSON.stringify(finalAnswers), updatedStatus, autoScore, maxScore, JSON.stringify(proctoring_logs || []), subId]
    );

    res.json({ submission: result.rows[0], message: 'Nộp bài kiểm tra thành công!' });
}));

// Teacher Get All Submissions for Exam & Analytics
app.get('/api/online-exams/:id/submissions', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const examId = Number(req.params.id);

    const { rows } = await pool.query(
        `SELECT s.*, u.full_name AS student_name, u.student_code, u.username
         FROM exam_submissions s
         JOIN users u ON u.id = s.student_id
         WHERE s.exam_id = $1
         ORDER BY s.submit_time DESC NULLS LAST`,
        [examId]
    );

    res.json({ submissions: rows });
}));

// Teacher Grade Essay & Feedback
app.put('/api/online-exams/submissions/:id/grade', asyncHandler(async (req, res) => {
    if (!requireRole(req, res, ['owner', 'admin', 'teacher'])) return;
    const subId = Number(req.params.id);
    const userId = (req as AuthedRequest).user!.id;
    const { essay_scores, teacher_feedback, total_score } = req.body;

    const { rows } = await pool.query(
        `UPDATE exam_submissions SET
            essay_scores = $1, teacher_feedback = $2, total_score = $3, status = 'graded',
            graded_by = $4, graded_at = NOW()
         WHERE id = $5 RETURNING *`,
        [JSON.stringify(essay_scores || {}), teacher_feedback || null, Number(total_score || 0), userId, subId]
    );

    res.json({ submission: rows[0], message: 'Đã lưu điểm và nhận xét thành công!' });
}));

// Student History & Results
app.get('/api/online-exams/student/results', asyncHandler(async (req, res) => {
    if (!requireUser(req, res)) return;
    const userId = (req as AuthedRequest).user!.id;

    const { rows } = await pool.query(
        `SELECT s.*, e.title AS exam_title, e.subject, e.show_answers_after_submit, e.show_score_after_submit, c.name AS class_name
         FROM exam_submissions s
         JOIN online_exams e ON e.id = s.exam_id
         LEFT JOIN classes c ON c.id = e.class_id
         WHERE s.student_id = $1
         ORDER BY s.start_time DESC`,
        [userId]
    );

    res.json({ results: rows });
}));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ message: 'Có lỗi hệ thống, vui lòng thử lại.', error: String(err) });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Backend API listening on http://0.0.0.0:${port}`);
});
