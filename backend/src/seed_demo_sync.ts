import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://lms_user:lms_password@127.0.0.1:5432/lms_demo' });

type Queryable = Pick<Pool, 'query'>;

const now = new Date();
const addDays = (days: number, hour = 19, minute = 30) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hour, minute, 0, 0);
    return date;
};

async function ensureRuntimeSchema(db: Queryable) {
    await db.query(`
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
    `);

    await db.query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_hours TEXT;`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS note TEXT;`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_name TEXT;`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_data TEXT;`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_size TEXT;`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_type TEXT;`);
    await db.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS instructions TEXT;`);
    await db.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS due_time TIMESTAMP;`);
    await db.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS proctoring_enabled BOOLEAN DEFAULT true;`);
    await db.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS homework_enabled BOOLEAN DEFAULT false;`);
    await db.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS assigned_teacher_ids JSONB DEFAULT '[]'::jsonb;`);
    await db.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS rubric_locked_after_grade BOOLEAN DEFAULT true;`);
    await db.query(`ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;`);
    await db.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS proctoring_logs JSONB DEFAULT '[]'::jsonb;`);
    await db.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS teacher_audio_feedback_url TEXT;`);
    await db.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS assigned_grader_name TEXT;`);
}

async function upsertUser(db: Queryable, user: {
    username: string;
    password: string;
    role: 'student' | 'teacher' | 'admin' | 'owner';
    fullName: string;
    phone?: string;
    studentCode?: string | null;
    specialty?: string;
    note?: string;
}) {
    const { rows } = await db.query(
        `INSERT INTO users (full_name, username, phone, student_code, role, password, specialty, note, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')
         ON CONFLICT (username) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            student_code = EXCLUDED.student_code,
            role = EXCLUDED.role,
            password = EXCLUDED.password,
            specialty = EXCLUDED.specialty,
            note = EXCLUDED.note,
            status = 'active'
         RETURNING id`,
        [user.fullName, user.username, user.phone || null, user.studentCode || null, user.role, user.password, user.specialty || null, user.note || null]
    );
    return Number(rows[0].id);
}

async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureRuntimeSchema(client);

        const ownerId = await upsertUser(client, {
            username: 'owner',
            password: 'owner123',
            role: 'owner',
            fullName: 'Chủ trung tâm VAT',
            phone: '0900000001',
            specialty: 'Điều hành trung tâm',
            note: 'Tài khoản chủ trung tâm có toàn quyền quản lý',
        });

        const adminId = await upsertUser(client, {
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            fullName: 'Quản trị VAT',
            phone: '0900000000',
            specialty: 'Quản trị đào tạo',
            note: 'Tài khoản quản trị mặc định',
        });

        const teacherId = await upsertUser(client, {
            username: 'xuanminh',
            password: 'xuanminh123',
            role: 'teacher',
            fullName: 'Giảng viên Xuân Minh',
            phone: '0908123456',
            specialty: 'Giảng viên Cơ khí Ô tô',
            note: 'Tài khoản giảng viên dùng để kiểm thử dữ liệu thật từ DB',
        });

        const studentSeeds = [
            ['Nguyễn Văn An', 'an.nguyen', 'VAT-S001', '0901000001'],
            ['Trần Thị Bình', 'binh.tran', 'VAT-S002', '0901000002'],
            ['Lê Minh Khang', 'khang.le', 'VAT-S003', '0901000003'],
            ['Phạm Gia Hân', 'han.pham', 'VAT-S004', '0901000004'],
            ['Đặng Nhật Nam', 'nam.dang', 'VAT-S005', '0901000005'],
        ] as const;
        const studentIds: number[] = [];
        for (const [fullName, username, code, phone] of studentSeeds) {
            studentIds.push(await upsertUser(client, {
                username,
                password: 'student123',
                role: 'student',
                fullName,
                phone,
                studentCode: code,
                specialty: 'Học viên VAT',
            }));
        }

        const classSeeds = [
            {
                code: 'XM-AUTO-01',
                name: 'Kỹ thuật Ô tô A1',
                subject: 'Kỹ thuật Ô tô',
                schedule: 'Thứ 2, 4 • 19:30 - 21:00',
                class_hours: '19:30 - 21:00',
                location: 'Phòng VAT-201',
                description: 'Lớp nền tảng kỹ thuật ô tô do giảng viên Xuân Minh phụ trách.',
            },
            {
                code: 'XM-ELEC-01',
                name: 'Điện Ô tô B1',
                subject: 'Điện Ô tô',
                schedule: 'Thứ 3, 5 • 18:00 - 20:00',
                class_hours: '18:00 - 20:00',
                location: 'Phòng VAT-203',
                description: 'Lớp thực hành mạch điện, cảm biến và hệ thống khởi động.',
            },
            {
                code: 'XM-DIAG-01',
                name: 'Chẩn đoán Hệ thống C1',
                subject: 'Chẩn đoán lỗi Ô tô',
                schedule: 'Thứ 7 • 08:30 - 11:30',
                class_hours: '08:30 - 11:30',
                location: 'Xưởng thực hành VAT',
                description: 'Lớp chẩn đoán lỗi bằng máy đọc OBD-II và quy trình kiểm tra thực tế.',
            },
        ];
        const classIds: number[] = [];
        for (const klass of classSeeds) {
            const { rows } = await client.query(
                `INSERT INTO classes (name, code, subject, teacher_id, start_date, end_date, schedule, class_hours, location, description, status, progress)
                 VALUES ($1,$2,$3,$4,CURRENT_DATE - interval '14 days', CURRENT_DATE + interval '75 days',$5,$6,$7,$8,'active',$9)
                 ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    subject = EXCLUDED.subject,
                    teacher_id = EXCLUDED.teacher_id,
                    schedule = EXCLUDED.schedule,
                    class_hours = EXCLUDED.class_hours,
                    location = EXCLUDED.location,
                    description = EXCLUDED.description,
                    status = 'active',
                    progress = EXCLUDED.progress
                 RETURNING id`,
                [klass.name, klass.code, klass.subject, teacherId, klass.schedule, klass.class_hours, klass.location, klass.description, 35 + classIds.length * 18]
            );
            classIds.push(Number(rows[0].id));
        }

        for (const classId of classIds) {
            for (let i = 0; i < studentIds.length; i += 1) {
                await client.query(
                    `INSERT INTO enrollments (class_id, student_id, learning_status, attendance_rate, progress, teacher_note)
                     VALUES ($1,$2,'dang_hoc',$3,$4,$5)
                     ON CONFLICT (class_id, student_id) DO UPDATE SET
                        attendance_rate = EXCLUDED.attendance_rate,
                        progress = EXCLUDED.progress,
                        teacher_note = EXCLUDED.teacher_note`,
                    [classId, studentIds[i], 92 - i * 4, 45 + i * 8, i === 2 ? 'Cần hỗ trợ thêm phần nền tảng.' : 'Tiến độ ổn định.']
                );
            }
        }

        const sessionSeeds = [
            ['Buổi 1: Khởi động lộ trình học cá nhân', 'Giới thiệu mục tiêu lớp học, kiểm tra đầu vào nhanh, thống nhất quy tắc tương tác và giao nhiệm vụ chuẩn bị.', -5, 'completed', '3 học sinh cần hỗ trợ thêm phần nền tảng.'],
            ['Buổi 2: Luyện tập trọng tâm và sửa lỗi thường gặp', 'Ôn kiến thức cốt lõi, chia nhóm luyện tập theo mức độ, giáo viên ghi chú lỗi lặp lại để phản hồi cá nhân.', 1, 'not_started', 'Chuẩn bị phiếu bài tập mức cơ bản và nâng cao.'],
            ['Buổi 3: Mini test và phản hồi tiến độ', 'Làm bài kiểm tra 20 phút, chấm nhanh theo nhóm năng lực và gửi nhận xét sau buổi học.', 3, 'not_started', 'Cần chuẩn bị rubric nhận xét ngắn gọn.'],
        ] as const;
        for (const classId of classIds) {
            for (let i = 0; i < sessionSeeds.length; i += 1) {
                const [title, description, dayOffset, status, note] = sessionSeeds[i]!;
                await client.query(
                    `INSERT INTO sessions (class_id, title, description, start_time, end_time, status, teacher_notes, completed_at)
                     SELECT $1::int,$2::text,$3::text,$4::timestamptz,$5::timestamptz,$6::session_status,$7::text,CASE WHEN $6::text = 'completed' THEN $5::timestamptz ELSE NULL::timestamptz END
                     WHERE NOT EXISTS (SELECT 1 FROM sessions WHERE class_id = $1::int AND title = $2::text)`,
                    [classId, title, description, addDays(dayOffset + i, 19, 30), addDays(dayOffset + i, 21, 0), status, note]
                );
            }
        }

        const materialSeeds = [
            ['Giáo trình buổi 1: Tổng quan hệ thống truyền lực', 'Tài liệu PDF tóm tắt kiến thức trọng tâm, checklist trước giờ học và bài tập tự luyện.', 'Giảng viên nên cho học sinh đọc trước phần sơ đồ nguyên lý.', 'giao-trinh-he-thong-truyen-luc.pdf', '2.4 MB', 'application/pdf', null],
            ['Video mô phỏng mạch điện khởi động', 'Link bài giảng trực tuyến, dùng để học sinh xem lại trước khi làm phiếu thực hành.', 'Ưu tiên gửi cho nhóm còn yếu phần đọc sơ đồ mạch.', null, null, null, 'https://vat-learning.example/video-mach-dien-khoi-dong'],
            ['Phiếu bài tập: Đọc mã lỗi OBD-II', 'Bài tập thực hành gồm dữ liệu mẫu, tình huống lỗi và phần ghi chú kết luận.', 'Dùng sau buổi demo máy chẩn đoán.', 'phieu-bai-tap-doc-ma-loi-obd.xlsx', '856 KB', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null],
        ] as const;
        for (let i = 0; i < materialSeeds.length; i += 1) {
            const [title, description, note, fileName, fileSize, fileType, link] = materialSeeds[i]!;
            await client.query(
                `INSERT INTO materials (class_id, title, description, note, file_name, file_size, file_type, external_link, uploaded_by, visibility, created_at)
                 SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,'visible',now() - ($10 || ' days')::interval
                 WHERE NOT EXISTS (SELECT 1 FROM materials WHERE class_id = $1 AND title = $2)`,
                [classIds[i % classIds.length], title, description, note, fileName, fileSize, fileType, link, teacherId, i]
            );
        }

        for (const classId of classIds) {
            for (let i = 0; i < studentIds.length; i += 1) {
                const status = i === 2 ? 'absent' : i === 3 ? 'late' : 'present';
                const note = i === 2 ? 'Chưa điểm danh' : i === 3 ? 'Đến muộn 10 phút' : 'Có mặt đúng giờ';
                await client.query(
                    `INSERT INTO attendance (class_id, student_id, date, status, note)
                     VALUES ($1,$2,CURRENT_DATE,$3,$4)
                     ON CONFLICT (class_id, student_id, date) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note`,
                    [classId, studentIds[i], status, note]
                );
            }
        }

        const feedbackSeeds = [
            [studentIds[0], '[Nội dung học] Đề xuất bổ sung ví dụ thực hành trong buổi học', 'Em mong mỗi phần lý thuyết có thêm ví dụ thực hành ngắn để dễ hiểu hơn.', 'resolved', 'Cảm ơn em đã góp ý. Giảng viên sẽ bổ sung ví dụ thực hành ở buổi học tiếp theo.'],
            [studentIds[2], '[Lịch học] Đề xuất cập nhật lịch học bù rõ ràng hơn', 'Em mong lịch học bù được thông báo sớm hơn để chủ động sắp xếp thời gian.', 'pending', null],
            [studentIds[3], '[Cần hỗ trợ] Cần hỗ trợ về bài tập và tài liệu học', 'Em cần được hướng dẫn thêm về phần bài tập đã giao, mong giảng viên hỗ trợ thêm ví dụ.', 'pending', null],
        ] as const;
        for (const [studentId, subject, content, status, response] of feedbackSeeds) {
            await client.query(
                `INSERT INTO feedbacks (student_id, subject, content, status, admin_response, created_at, updated_at)
                 SELECT $1::int,$2::text,$3::text,$4::text,$5::text,now() - interval '2 days',now() - interval '1 days'
                 WHERE NOT EXISTS (SELECT 1 FROM feedbacks WHERE student_id = $1::int AND subject = $2::text)`,
                [studentId, subject, content, status, response]
            );
        }

        const examRows: number[] = [];
        const examSeeds = [
            ['Kiểm tra 45 phút: Hệ thống truyền lực', 'Kỹ thuật Ô tô', classIds[0], 'Đánh giá kiến thức nền tảng về ly hợp, hộp số và truyền động.', 45],
            ['Quiz nhanh: Mạch điện khởi động', 'Điện Ô tô', classIds[1], 'Kiểm tra nhanh khả năng đọc sơ đồ và nhận biết lỗi mạch khởi động.', 30],
            ['Bài tập về nhà: Chẩn đoán OBD-II', 'Chẩn đoán lỗi Ô tô', classIds[2], 'Bài tập tình huống đọc mã lỗi, phân tích nguyên nhân và đề xuất hướng xử lý.', 60],
        ] as const;
        for (const [title, subject, classId, description, duration] of examSeeds) {
            const { rows } = await client.query(
                `INSERT INTO online_exams (title, subject, class_id, description, instructions, start_time, end_time, due_time, duration_minutes, status, created_by, proctoring_enabled, homework_enabled, assigned_teacher_ids)
                 SELECT $1::text,$2::text,$3::int,$4::text,'Đọc kỹ đề, làm bài trung thực và nộp trước hạn.',now() - interval '1 day',now() + interval '14 days',now() + interval '7 days',$5::int,'published',$6::int,true,false,$7::jsonb
                 WHERE NOT EXISTS (SELECT 1 FROM online_exams WHERE title = $1::text AND class_id = $3::int)
                 RETURNING id`,
                [title, subject, classId, description, duration, teacherId, JSON.stringify([teacherId])]
            );
            if (rows[0]?.id) examRows.push(Number(rows[0].id));
            else {
                const existing = await client.query('SELECT id FROM online_exams WHERE title = $1 AND class_id = $2', [title, classId]);
                examRows.push(Number(existing.rows[0].id));
            }
        }

        for (const examId of examRows) {
            const questions = [
                ['single_choice', 'Bộ phận nào truyền mô-men từ động cơ đến hộp số?', JSON.stringify([{ id: 'A', text: 'Ly hợp' }, { id: 'B', text: 'Bugi' }, { id: 'C', text: 'Kim phun' }, { id: 'D', text: 'Ắc quy' }]), JSON.stringify(['A']), 2, 'Chọn đáp án mô tả đúng vai trò của ly hợp.'],
                ['true_false', 'Cảm biến vị trí trục khuỷu có thể ảnh hưởng đến khả năng khởi động động cơ.', JSON.stringify([{ id: 'true', text: 'Đúng' }, { id: 'false', text: 'Sai' }]), JSON.stringify(['true']), 2, 'Cảm biến trục khuỷu là tín hiệu quan trọng cho ECU.'],
                ['essay', 'Trình bày quy trình kiểm tra khi xe có hiện tượng khó khởi động.', JSON.stringify([]), JSON.stringify([]), 6, 'Nêu đủ bước quan sát, đọc lỗi, kiểm tra nguồn, kiểm tra cảm biến và kết luận.'],
            ] as const;
            for (const [type, text, options, answers, points, guide] of questions) {
                await client.query(
                    `INSERT INTO question_bank (exam_id, subject, type, question_text, options, correct_answers, points, grading_guide, created_by)
                     SELECT $1,'Ô tô',$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8
                     WHERE NOT EXISTS (SELECT 1 FROM question_bank WHERE exam_id = $1 AND question_text = $3)`,
                    [examId, type, text, options, answers, points, guide, teacherId]
                );
            }
        }

        const firstExam = examRows[0];
        if (firstExam) {
            await client.query(
                `INSERT INTO exam_submissions (exam_id, student_id, attempt_number, start_time, submit_time, status, total_score, max_score, answers, essay_scores, teacher_feedback, graded_by, graded_at, assigned_grader_name)
                 SELECT $1,$2,1,now() - interval '3 days',now() - interval '3 days' + interval '42 minutes','graded',8.5,10,$3::jsonb,$4::jsonb,$5,$6,now() - interval '2 days','Giảng viên Xuân Minh'
                 WHERE NOT EXISTS (SELECT 1 FROM exam_submissions WHERE exam_id = $1 AND student_id = $2)`,
                [firstExam, studentIds[0], JSON.stringify({ 1: 'A', 2: 'true' }), JSON.stringify({ 3: { score: 4.5, feedback: 'Bài làm có đủ bước kiểm tra chính.' } }), 'Bài làm tốt, cần trình bày kết luận ngắn gọn hơn.', teacherId]
            );
        }

        await client.query('COMMIT');
        console.log(JSON.stringify({ ok: true, adminId, teacherId, studentIds, classIds, examIds: examRows }, null, 2));
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

main();
