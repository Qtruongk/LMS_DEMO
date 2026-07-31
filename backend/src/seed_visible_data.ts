import dotenv from 'dotenv';
import { Pool, type PoolClient } from 'pg';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://lms_user:lms_password@127.0.0.1:5432/lms_demo' });

type Queryable = Pick<PoolClient, 'query'>;
type Role = 'admin' | 'teacher' | 'student';

const now = new Date();

function atDay(dayOffset: number, hour = 19, minute = 30) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, minute, 0, 0);
    return date;
}

async function ensureSchema(db: Queryable) {
    await db.query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_hours TEXT;`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS note TEXT;`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_name TEXT;`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_data TEXT;`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_size TEXT;`);
    await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_type TEXT;`);

    await db.query(`
        CREATE TABLE IF NOT EXISTS schedule_adjustments (
            id SERIAL PRIMARY KEY,
            class_id INT REFERENCES classes(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            custom_hours TEXT,
            reason TEXT,
            type VARCHAR(20) DEFAULT 'makeup',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            class_id INT REFERENCES classes(id) ON DELETE CASCADE,
            student_id INT REFERENCES users(id) ON DELETE CASCADE,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            status VARCHAR(20) DEFAULT 'present',
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(class_id, student_id, date)
        );
    `);

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
    `);

    await db.query(`
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
    `);

    await db.query(`
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
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS class_id INT REFERENCES classes(id) ON DELETE CASCADE;`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_role VARCHAR(20) DEFAULT 'all';`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id INT REFERENCES users(id) ON DELETE SET NULL;`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL;`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS receiver_type TEXT DEFAULT 'all';`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS receiver_ids INTEGER[] DEFAULT '{}';`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority notification_priority NOT NULL DEFAULT 'normal';`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_status JSONB NOT NULL DEFAULT '{}';`);
}

async function upsertUser(db: Queryable, user: {
    username: string;
    password: string;
    role: Role;
    fullName: string;
    phone: string;
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
        [user.fullName, user.username, user.phone, user.studentCode || null, user.role, user.password, user.specialty || null, user.note || null]
    );
    return Number(rows[0].id);
}

async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureSchema(client);

        const adminId = await upsertUser(client, {
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            fullName: 'Quản trị VAT',
            phone: '0900000000',
            specialty: 'Quản trị đào tạo',
            note: 'Tài khoản quản trị mặc định để kiểm tra toàn bộ hệ thống.',
        });

        const teacherProfiles = [
            ['xuanminh', 'xuanminh123', 'Giảng viên Xuân Minh', '0908123456', 'Cơ khí Ô tô', 'Phụ trách kỹ thuật ô tô, truyền lực và chẩn đoán lỗi.'],
            ['thanhha', 'thanhha123', 'Giảng viên Thanh Hà', '0908123499', 'Điện - Điện tử Ô tô', 'Phụ trách điện ô tô, cảm biến và mạch điều khiển.'],
            ['quanghuy', 'quanghuy123', 'Giảng viên Quang Huy', '0908123488', 'Dịch vụ xưởng', 'Phụ trách quy trình dịch vụ, an toàn và thực hành xưởng.'],
        ] as const;
        const teacherIds: number[] = [];
        for (const [username, password, fullName, phone, specialty, note] of teacherProfiles) {
            teacherIds.push(await upsertUser(client, { username, password, role: 'teacher', fullName, phone, specialty, note }));
        }

        const studentProfiles = [
            ['an.nguyen', 'Nguyễn Văn An', '0912000001', 'VAT-S001', 'Mục tiêu: nắm chắc truyền lực và đi thực tập xưởng.'],
            ['binh.tran', 'Trần Thị Bình', '0912000002', 'VAT-S002', 'Học tốt phần lý thuyết, cần thêm tình huống thực hành.'],
            ['khang.le', 'Lê Minh Khang', '0912000003', 'VAT-S003', 'Cần hỗ trợ đều về đọc sơ đồ điện.'],
            ['han.pham', 'Phạm Ngọc Hân', '0912000004', 'VAT-S004', 'Tiến độ tốt, phù hợp bài nâng cao.'],
            ['nam.dang', 'Đặng Hoài Nam', '0912000005', 'VAT-S005', 'Cần nhắc lịch học và bài tập sau buổi.'],
            ['mai.vo', 'Võ Thanh Mai', '0912000006', 'VAT-S006', 'Quan tâm mảng cố vấn dịch vụ.'],
            ['duy.hoang', 'Hoàng Đức Duy', '0912000007', 'VAT-S007', 'Thực hành tốt, cần rèn báo cáo kỹ thuật.'],
            ['linh.do', 'Đỗ Khánh Linh', '0912000008', 'VAT-S008', 'Mạnh về chẩn đoán lỗi và tổng hợp dữ liệu.'],
            ['phuc.ngo', 'Ngô Gia Phúc', '0912000009', 'VAT-S009', 'Cần luyện thao tác an toàn xưởng.'],
            ['tram.bui', 'Bùi Minh Trâm', '0912000010', 'VAT-S010', 'Phù hợp nhóm trưởng dự án nhỏ.'],
            ['son.truong', 'Trương Bảo Sơn', '0912000011', 'VAT-S011', 'Cần tăng chuyên cần trong tháng này.'],
            ['yen.ha', 'Hà Phương Yến', '0912000012', 'VAT-S012', 'Tiếp thu nhanh, nên giao bài phân tích nâng cao.'],
        ] as const;
        const studentIds: number[] = [];
        for (const [username, fullName, phone, studentCode, note] of studentProfiles) {
            studentIds.push(await upsertUser(client, {
                username,
                password: 'student123',
                role: 'student',
                fullName,
                phone,
                studentCode,
                specialty: 'Học viên VAT',
                note,
            }));
        }

        const classSeeds = [
            ['XM-AUTO-01', 'Kỹ thuật Ô tô A1', 'Kỹ thuật Ô tô', teacherIds[0], 'Thứ 2, 4 • 19:30 - 21:00', '19:30 - 21:00', 'Phòng VAT-201', 'Lớp nền tảng về truyền lực, ly hợp, hộp số và quy trình kiểm tra an toàn.', 48],
            ['XM-ELEC-01', 'Điện Ô tô B1', 'Điện Ô tô', teacherIds[1], 'Thứ 3, 5 • 18:00 - 20:00', '18:00 - 20:00', 'Phòng VAT-203', 'Lớp thực hành mạch điện, cảm biến, khởi động và hệ thống sạc.', 42],
            ['XM-DIAG-01', 'Chẩn đoán Hệ thống C1', 'Chẩn đoán lỗi Ô tô', teacherIds[0], 'Thứ 7 • 08:30 - 11:30', '08:30 - 11:30', 'Xưởng thực hành VAT', 'Lớp sử dụng máy đọc lỗi OBD-II và phân tích quy trình chẩn đoán.', 57],
            ['XM-SERVICE-01', 'Cố vấn Dịch vụ D1', 'Dịch vụ Ô tô', teacherIds[2], 'Chủ nhật • 14:00 - 17:00', '14:00 - 17:00', 'Phòng VAT-301', 'Lớp kỹ năng tiếp nhận xe, báo giá, chăm sóc khách hàng và xử lý tình huống.', 35],
            ['XM-HYBRID-01', 'Công nghệ Hybrid E1', 'Hybrid & EV', teacherIds[1], 'Thứ 6 • 18:30 - 21:00', '18:30 - 21:00', 'Lab Điện cao áp VAT', 'Lớp nhập môn xe hybrid, an toàn điện cao áp và pin HV.', 22],
        ] as const;
        const classIds: number[] = [];
        for (const [code, name, subject, teacherId, schedule, classHours, location, description, progress] of classSeeds) {
            const { rows } = await client.query(
                `INSERT INTO classes (name, code, subject, teacher_id, start_date, end_date, schedule, class_hours, location, description, status, progress)
                 VALUES ($1,$2,$3,$4,CURRENT_DATE - interval '21 days',CURRENT_DATE + interval '90 days',$5,$6,$7,$8,'active',$9)
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
                [name, code, subject, teacherId, schedule, classHours, location, description, progress]
            );
            classIds.push(Number(rows[0].id));
        }

        for (let classIndex = 0; classIndex < classIds.length; classIndex += 1) {
            const classId = classIds[classIndex];
            const roster = studentIds.filter((_, studentIndex) => studentIndex % 5 === classIndex || studentIndex % 2 === classIndex % 2).slice(0, 8);
            for (let i = 0; i < roster.length; i += 1) {
                await client.query(
                    `INSERT INTO enrollments (class_id, student_id, learning_status, attendance_rate, progress, teacher_note)
                     VALUES ($1,$2,'dang_hoc',$3,$4,$5)
                     ON CONFLICT (class_id, student_id) DO UPDATE SET
                        attendance_rate = EXCLUDED.attendance_rate,
                        progress = EXCLUDED.progress,
                        teacher_note = EXCLUDED.teacher_note`,
                    [classId, roster[i], 96 - ((i + classIndex) % 5) * 4, Math.min(95, 38 + classIndex * 8 + i * 4), `Theo dõi tuần ${i + 1}: cần hoàn thành checklist trước buổi học.`]
                );

                const amountDue = 3200000 + classIndex * 350000;
                const amountPaid = i % 4 === 0 ? amountDue : i % 4 === 1 ? Math.round(amountDue / 2) : 0;
                const status = amountPaid >= amountDue ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';
                await client.query(
                    `INSERT INTO tuitions (student_id, class_id, amount_due, amount_paid, status, paid_at, note, updated_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,now())
                     ON CONFLICT (student_id, class_id) DO UPDATE SET
                        amount_due = EXCLUDED.amount_due,
                        amount_paid = EXCLUDED.amount_paid,
                        status = EXCLUDED.status,
                        paid_at = EXCLUDED.paid_at,
                        note = EXCLUDED.note,
                        updated_at = now()`,
                    [roster[i], classId, amountDue, amountPaid, status, amountPaid > 0 ? atDay(-3 - i, 10, 0) : null, status === 'paid' ? 'Đã hoàn tất học phí.' : 'Cần nhắc thanh toán theo lịch trung tâm.']
                );
            }
        }

        const sessionTemplates = [
            ['Buổi định hướng: Mục tiêu kỹ năng và an toàn lớp học', 'Giới thiệu lộ trình, checklist an toàn và cách ghi nhật ký học tập.', -14, 'completed', 'Đa số học viên đã nắm quy tắc xưởng.'],
            ['Lý thuyết trọng tâm và minh họa bằng sơ đồ thực tế', 'Giảng viên trình bày nguyên lý, học viên đặt câu hỏi theo nhóm.', -7, 'completed', 'Cần gửi tài liệu tóm tắt sau buổi.'],
            ['Thực hành nhóm: Quy trình kiểm tra và ghi nhận lỗi', 'Chia nhóm thao tác theo checklist, ghi log quan sát và ảnh minh chứng.', -2, 'completed', 'Nhóm 2 cần bổ sung bước kết luận.'],
            ['Luyện tập cá nhân có phản hồi nhanh', 'Bài tập ngắn theo năng lực, giảng viên phản hồi trực tiếp từng học viên.', 0, 'in_progress', 'Chuẩn bị rubric đánh giá 15 phút.'],
            ['Mini test và chữa lỗi thường gặp', 'Kiểm tra nhanh, chấm theo rubric, tổng hợp lỗi để giao bài tự học.', 3, 'not_started', 'In phiếu câu hỏi và chuẩn bị đáp án.'],
            ['Dự án nhỏ cuối mô-đun', 'Học viên trình bày quy trình xử lý tình huống thực tế trong xưởng.', 9, 'not_started', 'Cần máy chiếu và bộ tình huống.'],
        ] as const;
        for (const classId of classIds) {
            for (const [title, description, offset, status, note] of sessionTemplates) {
                await client.query(
                    `INSERT INTO sessions (class_id, title, description, start_time, end_time, status, teacher_notes, completed_at)
                     SELECT $1::int,$2::text,$3::text,$4::timestamptz,$5::timestamptz,$6::session_status,$7::text,CASE WHEN $6::text = 'completed' THEN $5::timestamptz ELSE NULL::timestamptz END
                     WHERE NOT EXISTS (SELECT 1 FROM sessions WHERE class_id = $1::int AND title = $2::text)`,
                    [classId, title, description, atDay(offset + classIds.indexOf(classId), 19, 30), atDay(offset + classIds.indexOf(classId), 21, 0), status, note]
                );
            }
        }

        for (let i = 0; i < classIds.length; i += 1) {
            await client.query(
                `INSERT INTO schedule_adjustments (class_id, date, custom_hours, reason, type)
                 SELECT $1::int,$2::date,$3::text,$4::text,$5::text
                 WHERE NOT EXISTS (SELECT 1 FROM schedule_adjustments WHERE class_id = $1::int AND date = $2::date AND custom_hours = $3::text)`,
                [classIds[i], atDay(5 + i).toISOString().slice(0, 10), i % 2 === 0 ? '18:30 - 20:30' : '08:30 - 11:00', 'Điều chỉnh theo lịch xưởng thực hành và giảng viên.', i % 2 === 0 ? 'rescheduled' : 'makeup']
            );
        }

        const materialSeeds = [
            ['Giáo trình truyền lực căn bản', 'PDF tổng hợp cấu tạo ly hợp, hộp số, trục các đăng và quy trình kiểm tra.', 'Đọc trước 15 phút, ghi lại 2 câu hỏi về sơ đồ truyền lực.', 'giao-trinh-truyen-luc-can-ban.pdf', '3.1 MB', 'application/pdf', null],
            ['Video mô phỏng mạch khởi động', 'Video giải thích dòng điện qua khóa điện, rơ-le, motor đề và tín hiệu cảm biến.', 'Xem lại trước buổi thực hành đo điện áp.', null, null, null, 'https://vat-learning.example/video-mach-khoi-dong'],
            ['Checklist an toàn xưởng', 'Biểu mẫu kiểm tra bảo hộ, dụng cụ, cầu nâng và vùng làm việc trước khi thao tác.', 'Bắt buộc hoàn thành trước khi vào xưởng.', 'checklist-an-toan-xuong.docx', '420 KB', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null],
            ['Phiếu bài tập đọc mã lỗi OBD-II', 'Tình huống xe báo lỗi, dữ liệu freeze-frame và yêu cầu kết luận nguyên nhân.', 'Làm sau buổi demo máy chẩn đoán.', 'phieu-bai-tap-obd-ii.xlsx', '856 KB', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null],
            ['Slide cố vấn dịch vụ chuyên nghiệp', 'Slide quy trình tiếp nhận xe, đặt câu hỏi, báo giá và chăm sóc sau sửa chữa.', 'Dùng để thảo luận tình huống khách hàng khó.', 'slide-co-van-dich-vu.pptx', '5.8 MB', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', null],
            ['Nghiên cứu pin HV và an toàn điện cao áp', 'Tài liệu nghiên cứu nhập môn về pin hybrid, relay chính, service plug và PPE.', 'Chỉ đọc phần cảnh báo an toàn trước buổi lab.', 'nghien-cuu-pin-hv.pdf', '4.6 MB', 'application/pdf', null],
            ['Ghi chú nhanh: Cảm biến vị trí trục khuỷu', 'Tóm tắt dấu hiệu lỗi CKP, cách đo tín hiệu và lỗi thường gặp.', 'Phù hợp ôn tập trước mini test.', 'ghi-chu-cam-bien-ckp.pdf', '1.2 MB', 'application/pdf', null],
            ['Biểu mẫu báo cáo thực hành nhóm', 'Template báo cáo gồm mục tiêu, dụng cụ, quy trình, ảnh minh chứng và kết luận.', 'Mỗi nhóm nộp một file sau buổi thực hành.', 'template-bao-cao-thuc-hanh.docx', '390 KB', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null],
            ['Video quy trình tiếp nhận xe tại xưởng', 'Tư liệu quay tại xưởng mô phỏng hội thoại cố vấn dịch vụ và khách hàng.', 'Ghi lại 3 câu hỏi mở nên dùng khi tiếp nhận xe.', null, null, null, 'https://vat-learning.example/video-tiep-nhan-xe'],
            ['Sơ đồ hệ thống sạc và máy phát', 'Tài liệu hình ảnh sơ đồ sạc, chân giắc máy phát và quy trình kiểm tra diode.', 'Dùng song song với đồng hồ VOM trong buổi thực hành.', 'so-do-he-thong-sac.pdf', '2.7 MB', 'application/pdf', null],
        ] as const;
        for (let i = 0; i < materialSeeds.length; i += 1) {
            const [title, description, note, fileName, fileSize, fileType, link] = materialSeeds[i]!;
            await client.query(
                `INSERT INTO materials (class_id, title, description, note, file_name, file_size, file_type, external_link, uploaded_by, visibility, created_at)
                 SELECT $1::int,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text,$9::int,'visible',now() - ($10::int || ' days')::interval
                 WHERE NOT EXISTS (SELECT 1 FROM materials WHERE class_id = $1::int AND title = $2::text)`,
                [classIds[i % classIds.length], title, description, note, fileName, fileSize, fileType, link, teacherIds[i % teacherIds.length], i]
            );
        }

        for (const classId of classIds) {
            const roster = await client.query('SELECT student_id FROM enrollments WHERE class_id = $1 ORDER BY student_id LIMIT 8', [classId]);
            const dates = [-14, -10, -7, -3, -1, 0];
            for (const [dateIndex, offset] of dates.entries()) {
                for (let i = 0; i < roster.rows.length; i += 1) {
                    const status = (i + dateIndex) % 11 === 0 ? 'absent' : (i + dateIndex) % 7 === 0 ? 'excused' : (i + dateIndex) % 5 === 0 ? 'late' : 'present';
                    const note = status === 'present' ? 'Có mặt đúng giờ' : status === 'late' ? 'Đến muộn 10 phút' : status === 'excused' ? 'Nghỉ có phép, đã báo trước' : 'Vắng không phép, cần giảng viên nhắc lại';
                    await client.query(
                        `INSERT INTO attendance (class_id, student_id, date, status, note)
                         VALUES ($1,$2,$3::date,$4,$5)
                         ON CONFLICT (class_id, student_id, date) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note`,
                        [classId, roster.rows[i].student_id, atDay(offset).toISOString().slice(0, 10), status, note]
                    );
                }
            }
        }

        const notificationSeeds = [
            ['Lịch thực hành xưởng tuần này', 'Các lớp kiểm tra lại lịch thực hành, chuẩn bị đồ bảo hộ và có mặt trước giờ 10 phút.', 'class', 'urgent', classIds[0]],
            ['Tài liệu mới đã được đăng', 'Bộ tài liệu truyền lực, sơ đồ điện và checklist an toàn đã có trong mục tài liệu.', 'general', 'important', null],
            ['Nhắc hoàn thành phiếu bài tập OBD-II', 'Học viên lớp chẩn đoán nộp phiếu bài tập trước 22:00 ngày mai để giảng viên phản hồi.', 'class', 'important', classIds[2]],
            ['Thông báo mini test đầu giờ', 'Buổi học kế tiếp có mini test 15 phút về nội dung đã học trong tuần trước.', 'class', 'urgent', classIds[1]],
            ['Cập nhật quy định điểm danh', 'Học viên vào lớp đúng giờ, trường hợp nghỉ cần gửi phản hồi trước buổi học.', 'general', 'normal', null],
            ['Lịch học bù cố vấn dịch vụ', 'Lớp cố vấn dịch vụ có một buổi học bù theo lịch đã cập nhật trong mục thời khóa biểu.', 'class', 'important', classIds[3]],
            ['Chuẩn bị cho lab Hybrid', 'Học viên đọc kỹ tài liệu an toàn điện cao áp trước khi tham gia buổi lab.', 'class', 'urgent', classIds[4]],
            ['Khảo sát chất lượng sau buổi học', 'Vui lòng gửi phản hồi ngắn để trung tâm cải thiện tài liệu, tốc độ giảng và thiết bị thực hành.', 'general', 'normal', null],
            ['Nhắc thanh toán học phí', 'Một số học viên còn công nợ học phí, vui lòng kiểm tra mục tài chính cá nhân.', 'general', 'important', null],
            ['Bảo trì hệ thống LMS', 'Hệ thống có thể gián đoạn 5 phút trong khung giờ tối nay. Vui lòng lưu bài làm trước khi nộp.', 'general', 'urgent', null],
        ] as const;
        for (let i = 0; i < notificationSeeds.length; i += 1) {
            const [title, content, type, priority, classId] = notificationSeeds[i]!;
            await client.query(
                `INSERT INTO notifications (title, content, type, class_id, target_role, sender_id, created_by, receiver_type, receiver_ids, priority, created_at, read_status)
                 SELECT $1::text,$2::text,$3::text,$4::int,'all',$5::int,$5::int,'all','{}'::int[],$6::notification_priority,now() - ($7::int || ' hours')::interval,'{}'::jsonb
                 WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE title = $1::text)`,
                [title, content, type, classId, adminId, priority, i + 1]
            );
        }

        const feedbackSeeds = [
            [studentIds[0], '[Nội dung học] Cần thêm ví dụ thực hành truyền lực', 'Em hiểu lý thuyết nhưng muốn có thêm video thao tác với hộp số thật.', 'resolved', 'Giảng viên đã bổ sung video và checklist trong mục tài liệu.'],
            [studentIds[1], '[Lịch học] Mong báo lịch học bù sớm hơn', 'Em cần chủ động sắp xếp ca làm nên mong lịch học bù được thông báo trước ít nhất 2 ngày.', 'pending', null],
            [studentIds[2], '[Cần hỗ trợ] Chưa rõ cách đọc sơ đồ mạch khởi động', 'Em cần giảng viên hướng dẫn lại cách lần theo nguồn và mass trong sơ đồ.', 'pending', null],
            [studentIds[3], '[Thiết bị] Đề xuất thêm đồng hồ VOM cho nhóm', 'Khi thực hành nhóm hơi thiếu thiết bị đo nên thời gian chờ lâu.', 'resolved', 'Trung tâm đã bổ sung thêm 4 đồng hồ VOM cho buổi tới.'],
            [studentIds[4], '[Tài liệu] Link video bị khó truy cập', 'Video mô phỏng đôi lúc tải chậm, mong có thêm file tải về.', 'pending', null],
            [studentIds[5], '[Góp ý] Popup làm bài online dễ dùng', 'Giao diện làm bài rõ, nếu có cảnh báo thời gian còn lại nổi bật hơn sẽ tốt.', 'resolved', 'Đã chuyển góp ý cho nhóm kỹ thuật và cập nhật cảnh báo thời gian.'],
        ] as const;
        for (const [studentId, subject, content, status, response] of feedbackSeeds) {
            await client.query(
                `INSERT INTO feedbacks (student_id, subject, content, status, admin_response, created_at, updated_at)
                 SELECT $1::int,$2::text,$3::text,$4::text,$5::text,now() - interval '2 days',now() - interval '1 day'
                 WHERE NOT EXISTS (SELECT 1 FROM feedbacks WHERE student_id = $1::int AND subject = $2::text)`,
                [studentId, subject, content, status, response]
            );
        }

        const testSeeds = [
            ['Quiz truyền lực căn bản', classIds[0], 'quiz', 'Kiểm tra nhanh 10 câu về ly hợp và hộp số.', 10, 'published'],
            ['Bài tập sơ đồ điện khởi động', classIds[1], 'assignment', 'Nộp ảnh phân tích sơ đồ và kết luận dòng điện.', 10, 'published'],
            ['Test chẩn đoán OBD-II', classIds[2], 'test', 'Phân tích mã lỗi, freeze-frame và đề xuất quy trình kiểm tra.', 10, 'published'],
            ['Bài tập tình huống cố vấn dịch vụ', classIds[3], 'assignment', 'Viết kịch bản tiếp nhận xe và báo giá sơ bộ.', 10, 'published'],
        ] as const;
        const testIds: number[] = [];
        for (const [title, classId, type, description, maxScore, status] of testSeeds) {
            const { rows } = await client.query(
                `INSERT INTO tests (class_id, title, description, type, due_date, max_score, status, created_by)
                 SELECT $1::int,$2::text,$3::text,$4::test_type,now() + interval '6 days',$5::numeric,$6::publish_status,$7::int
                 WHERE NOT EXISTS (SELECT 1 FROM tests WHERE class_id = $1::int AND title = $2::text)
                 RETURNING id`,
                [classId, title, description, type, maxScore, status, teacherIds[0]]
            );
            if (rows[0]?.id) testIds.push(Number(rows[0].id));
            else {
                const existing = await client.query('SELECT id FROM tests WHERE class_id = $1 AND title = $2', [classId, title]);
                testIds.push(Number(existing.rows[0].id));
            }
        }
        for (let i = 0; i < testIds.length; i += 1) {
            const roster = await client.query('SELECT student_id FROM enrollments WHERE class_id = $1 ORDER BY student_id LIMIT 5', [testSeeds[i]![1]]);
            for (let j = 0; j < roster.rows.length; j += 1) {
                const graded = j % 3 !== 0;
                await client.query(
                    `INSERT INTO submissions (test_id, student_id, answer, submitted_at, score, feedback, graded_by, graded_at)
                     VALUES ($1,$2,$3,now() - interval '1 day',$4,$5,$6,$7)
                     ON CONFLICT (test_id, student_id) DO UPDATE SET
                        answer = EXCLUDED.answer,
                        score = EXCLUDED.score,
                        feedback = EXCLUDED.feedback,
                        graded_by = EXCLUDED.graded_by,
                        graded_at = EXCLUDED.graded_at`,
                    [testIds[i], roster.rows[j].student_id, 'Bài làm gồm phân tích quy trình, ảnh minh chứng và kết luận kỹ thuật.', graded ? 7 + (j % 3) : null, graded ? 'Bài làm đạt yêu cầu, cần bổ sung kết luận ngắn hơn.' : null, graded ? teacherIds[0] : null, graded ? atDay(-1, 22, 0) : null]
                );
            }
        }

        const examSeeds = [
            ['Kiểm tra 45 phút: Hệ thống truyền lực', 'Kỹ thuật Ô tô', classIds[0], 'Đánh giá kiến thức nền tảng về ly hợp, hộp số và truyền động.', 45],
            ['Quiz nhanh: Mạch điện khởi động', 'Điện Ô tô', classIds[1], 'Kiểm tra khả năng đọc sơ đồ và nhận biết lỗi mạch khởi động.', 30],
            ['Bài tập về nhà: Chẩn đoán OBD-II', 'Chẩn đoán lỗi Ô tô', classIds[2], 'Bài tập tình huống đọc mã lỗi, phân tích nguyên nhân và đề xuất xử lý.', 60],
            ['Đánh giá kỹ năng cố vấn dịch vụ', 'Dịch vụ Ô tô', classIds[3], 'Bài kiểm tra tình huống tiếp nhận xe, hỏi bệnh và tư vấn khách hàng.', 40],
            ['An toàn điện cao áp Hybrid', 'Hybrid & EV', classIds[4], 'Kiểm tra nhận biết rủi ro và quy trình cô lập điện cao áp.', 35],
        ] as const;
        const examRows: number[] = [];
        for (const [title, subject, classId, description, duration] of examSeeds) {
            const { rows } = await client.query(
                `INSERT INTO online_exams (title, subject, class_id, description, instructions, start_time, end_time, due_time, duration_minutes, status, created_by, proctoring_enabled, homework_enabled, assigned_teacher_ids)
                 SELECT $1::text,$2::text,$3::int,$4::text,'Đọc kỹ đề, làm bài trung thực và nộp trước hạn.',now() - interval '1 day',now() + interval '14 days',now() + interval '7 days',$5::int,'published',$6::int,true,false,$7::jsonb
                 WHERE NOT EXISTS (SELECT 1 FROM online_exams WHERE title = $1::text AND class_id = $3::int)
                 RETURNING id`,
                [title, subject, classId, description, duration, teacherIds[0], JSON.stringify(teacherIds)]
            );
            if (rows[0]?.id) examRows.push(Number(rows[0].id));
            else {
                const existing = await client.query('SELECT id FROM online_exams WHERE title = $1 AND class_id = $2', [title, classId]);
                examRows.push(Number(existing.rows[0].id));
            }
        }

        const questions = [
            ['single_choice', 'Khi kiểm tra ly hợp bị trượt, bước nào nên thực hiện trước?', JSON.stringify([{ id: 'A', text: 'Kiểm tra hành trình tự do bàn đạp' }, { id: 'B', text: 'Thay ngay hộp số' }, { id: 'C', text: 'Xả hết dầu động cơ' }, { id: 'D', text: 'Tháo bình ắc quy' }]), JSON.stringify(['A']), 1, 'Chọn bước kiểm tra ban đầu, ít xâm lấn và đúng quy trình.'],
            ['true_false', 'Khi làm việc với hệ thống điện cao áp, có thể bỏ qua găng tay cách điện nếu xe đã tắt khóa.', JSON.stringify([{ id: 'true', text: 'Đúng' }, { id: 'false', text: 'Sai' }]), JSON.stringify(['false']), 1, 'Luôn tuân thủ PPE và quy trình cô lập điện cao áp.'],
            ['essay', 'Trình bày quy trình 5 bước khi tiếp nhận xe khách hàng báo lỗi khó khởi động.', JSON.stringify([]), JSON.stringify([]), 4, 'Cần có hỏi bệnh, xác nhận hiện tượng, kiểm tra an toàn, lập phiếu và hẹn phản hồi.'],
        ] as const;
        for (const examId of examRows) {
            for (const [type, questionText, options, correctAnswers, points, guide] of questions) {
                await client.query(
                    `INSERT INTO question_bank (exam_id, subject, type, question_text, options, correct_answers, points, grading_guide, created_by)
                     SELECT $1::int,'Ô tô',$2::text,$3::text,$4::jsonb,$5::jsonb,$6::numeric,$7::text,$8::int
                     WHERE NOT EXISTS (SELECT 1 FROM question_bank WHERE exam_id = $1::int AND question_text = $3::text)`,
                    [examId, type, questionText, options, correctAnswers, points, guide, teacherIds[0]]
                );
            }
        }

        for (let i = 0; i < Math.min(examRows.length, 4); i += 1) {
            for (let j = 0; j < 3; j += 1) {
                await client.query(
                    `INSERT INTO exam_submissions (exam_id, student_id, attempt_number, start_time, submit_time, status, total_score, max_score, answers, essay_scores, teacher_feedback, graded_by, graded_at, assigned_grader_name)
                     SELECT $1::int,$2::int,1,now() - interval '3 days',now() - interval '3 days' + interval '42 minutes',$3::text,$4::numeric,10,$5::jsonb,$6::jsonb,$7::text,$8::int,now() - interval '2 days',$9::text
                     WHERE NOT EXISTS (SELECT 1 FROM exam_submissions WHERE exam_id = $1::int AND student_id = $2::int)`,
                    [examRows[i], studentIds[(i + j) % studentIds.length], j === 2 ? 'submitted' : 'graded', j === 2 ? null : 7.5 + j, JSON.stringify({ 1: 'A', 2: 'false' }), JSON.stringify({ 3: { score: 3.5 + j * 0.5, feedback: 'Có đủ ý chính, cần thêm ví dụ thực tế.' } }), j === 2 ? null : 'Bài làm tốt, cần trình bày kết luận ngắn gọn hơn.', teacherIds[0], 'Giảng viên Xuân Minh']
                );
            }
        }

        await client.query('COMMIT');
        console.log(JSON.stringify({ ok: true, adminId, teacherIds, studentCount: studentIds.length, classIds, onlineExamIds: examRows, testIds }, null, 2));
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
