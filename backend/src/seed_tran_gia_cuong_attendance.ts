import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://lms_user:lms_password@127.0.0.1:5432/lms_demo' });

const student = {
    fullName: 'Trần Gia Cường',
    username: 'trangiacuong',
    phone: '0909555123',
    password: 'student123',
    studentCode: 'VAT-ST-GC001',
};

const lessonTopics = [
    'Kiểm tra an toàn khoang máy và dụng cụ cơ bản',
    'Nhận diện hệ thống điện thân xe',
    'Thực hành đọc sơ đồ mạch điện',
    'Bảo dưỡng hệ thống phanh cơ bản',
    'Đo kiểm cảm biến và tín hiệu ECU',
    'Quy trình kiểm tra hệ thống làm mát',
    'Thực hành tháo lắp cụm lọc gió và bugi',
    'Phân tích lỗi thường gặp bằng máy chẩn đoán',
    'Kiểm tra hệ thống treo và lốp',
    'Ôn tập quy trình bảo dưỡng định kỳ',
];

type SeedAttendanceStatus = 'present' | 'absent';

const statusPattern: SeedAttendanceStatus[] = [
    'present', 'present', 'absent', 'present', 'present',
    'present', 'present', 'absent', 'present', 'present',
    'present', 'present', 'absent', 'present', 'present',
    'present', 'absent', 'present', 'present', 'present',
];

function dateOnly(date: Date) {
    return date.toISOString().slice(0, 10);
}

function addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60_000);
}

function setLessonTime(date: Date, hour = 19, minute = 30) {
    const lesson = new Date(date);
    lesson.setHours(hour, minute, 0, 0);
    return lesson;
}

function collectPastLessonDates(count: number, classDays: number[]) {
    const dates: Date[] = [];
    const cursor = new Date();
    cursor.setHours(19, 30, 0, 0);

    while (dates.length < count) {
        if (classDays.includes(cursor.getDay()) && cursor.getTime() <= Date.now()) {
            dates.push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() - 1);
        cursor.setHours(19, 30, 0, 0);
    }

    return dates.reverse();
}

function parseClassDays(schedule: string) {
    const days: number[] = [];
    const pattern = /thứ\s*([2-7])/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(schedule))) {
        days.push(Number(match[1]) - 1);
    }
    if (schedule.toLowerCase().includes('chủ nhật')) days.push(0);
    return days.length ? [...new Set(days)] : [2, 4];
}

function parseStartTime(schedule: string, classHours?: string | null) {
    const source = `${schedule} ${classHours || ''}`;
    const match = source.match(/(\d{1,2}):(\d{2})/);
    return { hour: Number(match?.[1] || 19), minute: Number(match?.[2] || 30) };
}

async function main() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(`
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
        `);

        const existingStudent = await client.query(
            `SELECT u.id, u.username, u.student_code, c.id AS class_id, c.name AS class_name, c.schedule, c.class_hours
             FROM users u
             JOIN enrollments e ON e.student_id = u.id
             JOIN classes c ON c.id = e.class_id
             WHERE u.role = 'student'
               AND u.full_name = $1
               AND c.name = 'Điện Ô tô B1'
             ORDER BY c.id DESC, u.id DESC
             LIMIT 1`,
            [student.fullName]
        );

        let studentId: number;
        let classId: number;
        let className: string;
        let schedule: string;
        let classHours: string | null;

        if (existingStudent.rows.length) {
            const row = existingStudent.rows[0];
            studentId = Number(row.id);
            classId = Number(row.class_id);
            className = row.class_name;
            schedule = row.schedule || 'Thứ 3, 5 • 19:30 - 21:00';
            classHours = row.class_hours || '19:30 - 21:00';
            await client.query(
                `UPDATE users
                 SET full_name = $1, phone = COALESCE(phone, $2), role = 'student', password = COALESCE(password, $3), status = 'active', updated_at = now()
                 WHERE id = $4`,
                [student.fullName, student.phone, student.password, studentId]
            );
        } else {
            const studentResult = await client.query(
                `INSERT INTO users (full_name, username, phone, student_code, role, password, status, note)
                 VALUES ($1, $2, $3, $4, 'student', $5, 'active', 'Tài khoản học sinh có 20 bản ghi điểm danh mẫu')
                 ON CONFLICT (username)
                 DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, student_code = EXCLUDED.student_code, role = 'student', password = EXCLUDED.password, status = 'active', updated_at = now()
                 RETURNING id`,
                [student.fullName, student.username, student.phone, student.studentCode, student.password]
            );
            studentId = Number(studentResult.rows[0].id);

            const classResult = await client.query(
                `SELECT id, name, schedule, class_hours
                 FROM classes
                 WHERE name = 'Điện Ô tô B1'
                 ORDER BY id DESC
                 LIMIT 1`
            );
            if (!classResult.rows.length) throw new Error('Không tìm thấy lớp Điện Ô tô B1 để cập nhật dữ liệu web hiện tại.');
            classId = Number(classResult.rows[0].id);
            className = classResult.rows[0].name;
            schedule = classResult.rows[0].schedule || 'Thứ 3, 5 • 19:30 - 21:00';
            classHours = classResult.rows[0].class_hours || '19:30 - 21:00';
        }

        await client.query(
            `INSERT INTO enrollments (class_id, student_id, learning_status, attendance_rate, progress, teacher_note)
             VALUES ($1, $2, 'dang_hoc', 80, 76, 'Dữ liệu mẫu: Trần Gia Cường có 16 buổi có mặt và 4 buổi vắng ngẫu nhiên')
             ON CONFLICT (class_id, student_id)
             DO UPDATE SET learning_status = 'dang_hoc', attendance_rate = EXCLUDED.attendance_rate, progress = EXCLUDED.progress, teacher_note = EXCLUDED.teacher_note`,
            [classId, studentId]
        );

        const classDays = parseClassDays(schedule);
        const { hour, minute } = parseStartTime(schedule, classHours);
        const lessonDates = collectPastLessonDates(20, classDays);

        await client.query('DELETE FROM attendance WHERE class_id = $1 AND student_id = $2', [classId, studentId]);

        for (const [index, lessonDate] of lessonDates.entries()) {
            const start = setLessonTime(lessonDate, hour, minute);
            const end = addMinutes(start, 90);
            const status = statusPattern[index] ?? 'present';
            const topic = lessonTopics[index % lessonTopics.length];
            const note = status === 'present'
                ? `Có mặt đúng giờ. Nội dung: ${topic}.`
                : `Vắng mặt ngẫu nhiên theo dữ liệu mẫu, cần giáo viên nhắc học bù. Nội dung bị lỡ: ${topic}.`;

            await client.query(
                `INSERT INTO sessions (class_id, title, description, start_time, end_time, status, teacher_notes, completed_at)
                 SELECT $1, $2, $3, $4::timestamptz, $5::timestamptz, 'completed', $6, $5::timestamptz
                 WHERE NOT EXISTS (
                    SELECT 1 FROM sessions WHERE class_id = $1 AND start_time::date = $4::timestamptz::date
                 )`,
                [classId, `Buổi ${index + 1}: ${topic}`, `Buổi học mẫu đồng bộ với điểm danh của Trần Gia Cường.`, start.toISOString(), end.toISOString(), `Giảng viên ghi nhận: ${topic}. Học sinh cần chuẩn bị vở ghi, dụng cụ và hoàn thành bài tự luyện sau buổi học.`]
            );

            await client.query(
                `INSERT INTO attendance (class_id, student_id, date, status, note)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (class_id, student_id, date)
                 DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note`,
                [classId, studentId, dateOnly(start), status, note]
            );
        }

        await client.query('COMMIT');

        const summary = await client.query(
            `SELECT u.id AS student_id, u.full_name, u.username, u.student_code, c.id AS class_id, c.name AS class_name,
                    COUNT(a.id)::int AS attendance_records,
                    SUM((a.status = 'present')::int)::int AS present_records,
                    SUM((a.status = 'absent')::int)::int AS absent_records,
                    ROUND((SUM((a.status = 'absent')::int)::numeric / NULLIF(COUNT(a.id), 0)) * 100)::int AS absent_percent,
                    array_agg(a.date ORDER BY a.date) FILTER (WHERE a.status = 'absent') AS absent_dates
             FROM users u
             JOIN enrollments e ON e.student_id = u.id
             JOIN classes c ON c.id = e.class_id
             LEFT JOIN attendance a ON a.student_id = u.id AND a.class_id = c.id
             WHERE u.id = $1 AND c.id = $2
             GROUP BY u.id, u.full_name, u.username, u.student_code, c.id, c.name`,
            [studentId, classId]
        );
        console.log(JSON.stringify(summary.rows[0], null, 2));
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
