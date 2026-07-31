import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://lms_user:lms_password@127.0.0.1:5432/lms_demo' });

const teacher = {
    fullName: 'Giảng viên Xuân Minh',
    username: 'xuanminh',
    phone: '0908123456',
    password: 'xuanminh123',
    specialty: 'Giảng viên Cơ khí Ô tô',
};

const classPlans = [
    {
        code: 'XM-AUTO-01',
        name: 'Kỹ thuật Ô tô A1',
        subject: 'Kỹ thuật Ô tô',
        schedule: 'Thứ 2, 4 • 19:30 - 21:00',
        location: 'Phòng VAT-201',
        description: 'Lớp nền tảng kỹ thuật ô tô do giảng viên Xuân Minh phụ trách.',
    },
    {
        code: 'XM-AUTO-02',
        name: 'Điện Ô tô B1',
        subject: 'Điện Ô tô',
        schedule: 'Thứ 3, 5 • 19:30 - 21:00',
        location: 'Phòng VAT-202',
        description: 'Lớp điện ô tô thực hành theo nhóm nhỏ do giảng viên Xuân Minh phụ trách.',
    },
    {
        code: 'XM-AUTO-03',
        name: 'Chẩn đoán Hệ thống C1',
        subject: 'Chẩn đoán Ô tô',
        schedule: 'Thứ 7 • 08:00 - 10:00',
        location: 'Xưởng VAT-01',
        description: 'Lớp chẩn đoán lỗi và đọc dữ liệu hệ thống do giảng viên Xuân Minh phụ trách.',
    },
];

const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Phan', 'Võ', 'Hồ', 'Dương', 'Mai', 'Tạ', 'Cao'];
const middleNames = ['Văn', 'Minh', 'Gia', 'Quang', 'Hữu', 'Đức', 'Nhật', 'Thanh', 'Tuấn', 'Anh', 'Thành', 'Bảo', 'Khánh', 'Ngọc', 'Trọng', 'Hoài'];
const firstNames = ['An', 'Bình', 'Cường', 'Dũng', 'Hải', 'Hùng', 'Khang', 'Lâm', 'Nam', 'Phong', 'Quân', 'Sơn', 'Tấn', 'Tuấn', 'Việt', 'Long', 'Đạt', 'Kiên', 'Trí', 'Phúc', 'Huy', 'Nhân', 'Tài', 'Vinh', 'Toàn', 'Hiếu', 'Nghĩa', 'Thắng', 'Duy', 'Khôi', 'Lộc', 'Minh'];

function dateOnly(date: Date) {
    return date.toISOString().split('T')[0];
}

function pastClassDate(sessionIndex: number, classIndex: number) {
    const date = new Date();
    date.setDate(date.getDate() - ((10 - sessionIndex) * 3 + classIndex));
    date.setHours(19, 30, 0, 0);
    return date;
}

function addMinutes(date: Date, minutes: number) {
    const next = new Date(date);
    next.setMinutes(next.getMinutes() + minutes);
    return next;
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

        const teacherResult = await client.query(
            `INSERT INTO users (full_name, username, phone, role, password, specialty, status, note)
             VALUES ($1, $2, $3, 'teacher', $4, $5, 'active', 'Giảng viên được seed dữ liệu 3 lớp và lịch sử điểm danh')
             ON CONFLICT (username)
             DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, role = 'teacher', password = EXCLUDED.password, specialty = EXCLUDED.specialty, status = 'active', updated_at = now()
             RETURNING id`,
            [teacher.fullName, teacher.username, teacher.phone, teacher.password, teacher.specialty]
        );
        const teacherId = Number(teacherResult.rows[0].id);

        const classIds: number[] = [];
        for (const [classIndex, plan] of classPlans.entries()) {
            const classResult = await client.query(
                `INSERT INTO classes (name, code, description, subject, teacher_id, start_date, end_date, status, schedule, progress, location, internal_note)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '75 days', 'active', $6, $7, $8, $9)
                 ON CONFLICT (code)
                 DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, subject = EXCLUDED.subject, teacher_id = EXCLUDED.teacher_id, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, status = 'active', schedule = EXCLUDED.schedule, progress = EXCLUDED.progress, location = EXCLUDED.location, internal_note = EXCLUDED.internal_note, updated_at = now()
                 RETURNING id`,
                [plan.name, plan.code, plan.description, plan.subject, teacherId, plan.schedule, 68 + classIndex * 7, plan.location, 'Seed: lớp của giảng viên Xuân Minh, 32 học sinh/lớp']
            );
            const classId = Number(classResult.rows[0].id);
            classIds.push(classId);

            const studentIds: number[] = [];
            for (let studentIndex = 1; studentIndex <= 32; studentIndex += 1) {
                const seedIndex = classIndex * 32 + studentIndex;
                const fullName = `${lastNames[seedIndex % lastNames.length]} ${middleNames[(seedIndex + classIndex) % middleNames.length]} ${firstNames[(seedIndex + studentIndex) % firstNames.length]}`;
                const username = `xm${classIndex + 1}_student_${String(studentIndex).padStart(2, '0')}`;
                const studentCode = `XM${classIndex + 1}-${String(studentIndex).padStart(3, '0')}`;
                const phone = `09${String(61000000 + classIndex * 1000 + studentIndex).padStart(8, '0')}`;
                const studentResult = await client.query(
                    `INSERT INTO users (full_name, username, phone, student_code, role, password, status, note)
                     VALUES ($1, $2, $3, $4, 'student', 'student123', 'active', $5)
                     ON CONFLICT (username)
                     DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, student_code = EXCLUDED.student_code, role = 'student', status = 'active', updated_at = now()
                     RETURNING id`,
                    [fullName, username, phone, studentCode, `Seed: học sinh lớp ${plan.code} của giảng viên Xuân Minh`]
                );
                const studentId = Number(studentResult.rows[0].id);
                studentIds.push(studentId);
                await client.query(
                    `INSERT INTO enrollments (class_id, student_id, learning_status, attendance_rate, progress, teacher_note)
                     VALUES ($1, $2, 'dang_hoc', $3, $4, $5)
                     ON CONFLICT (class_id, student_id)
                     DO UPDATE SET learning_status = 'dang_hoc', attendance_rate = EXCLUDED.attendance_rate, progress = EXCLUDED.progress, teacher_note = EXCLUDED.teacher_note`,
                    [classId, studentId, 86 + ((studentIndex + classIndex) % 13), 45 + ((studentIndex * 3 + classIndex) % 50), 'Theo dõi đều, cập nhật từ dữ liệu seed điểm danh']
                );
            }

            await client.query('DELETE FROM enrollments WHERE class_id = $1 AND NOT (student_id = ANY($2::int[]))', [classId, studentIds]);
            await client.query('DELETE FROM attendance WHERE class_id = $1 AND NOT (student_id = ANY($2::int[]))', [classId, studentIds]);

            for (let sessionIndex = 1; sessionIndex <= 10; sessionIndex += 1) {
                const start = pastClassDate(sessionIndex, classIndex);
                const end = addMinutes(start, 90);
                const title = `Buổi ${sessionIndex}: ${plan.subject} - thực hành và điểm danh`;
                await client.query(
                    `INSERT INTO sessions (class_id, title, description, start_time, end_time, status, teacher_notes, completed_at)
                     SELECT $1, $2, $3, $4::timestamptz, $5::timestamptz, 'completed', $6, $5::timestamptz
                     WHERE NOT EXISTS (
                        SELECT 1 FROM sessions WHERE class_id = $1 AND title = $2 AND start_time::date = $4::timestamptz::date
                     )`,
                    [classId, title, `Dữ liệu buổi học trước đó cho ${plan.name}. Có đủ điểm danh 32 học sinh.`, start.toISOString(), end.toISOString(), 'Seed lịch sử điểm danh cho giảng viên Xuân Minh']
                );

                const attDate = dateOnly(start);
                for (let studentIndex = 0; studentIndex < studentIds.length; studentIndex += 1) {
                    const marker = (sessionIndex + studentIndex + classIndex) % 16;
                    const status = marker === 0 ? 'absent' : marker === 3 ? 'late' : marker === 7 ? 'excused' : 'present';
                    const note = status === 'present'
                        ? 'Có mặt đúng giờ'
                        : status === 'late'
                            ? 'Đi muộn, đã cập nhật sau buổi học'
                            : status === 'excused'
                                ? 'Nghỉ có phép, phụ huynh đã báo'
                                : 'Vắng mặt, cần giảng viên theo dõi bổ sung';
                    await client.query(
                        `INSERT INTO attendance (class_id, student_id, date, status, note)
                         VALUES ($1, $2, $3, $4, $5)
                         ON CONFLICT (class_id, student_id, date)
                         DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note`,
                        [classId, studentIds[studentIndex], attDate, status, note]
                    );
                }
            }
        }

        await client.query(
            `UPDATE classes SET teacher_id = NULL, updated_at = now()
             WHERE teacher_id = $1 AND id <> ALL($2::int[])`,
            [teacherId, classIds]
        );

        await client.query('COMMIT');

        const summary = await client.query(
            `SELECT c.id, c.code, c.name, COUNT(DISTINCT e.student_id)::int AS students, COUNT(DISTINCT a.date)::int AS attendance_days, COUNT(a.id)::int AS attendance_rows
             FROM classes c
             LEFT JOIN enrollments e ON e.class_id = c.id
             LEFT JOIN attendance a ON a.class_id = c.id
             WHERE c.id = ANY($1::int[])
             GROUP BY c.id, c.code, c.name
             ORDER BY c.code`,
            [classIds]
        );
        console.log(JSON.stringify({ teacherId, classes: summary.rows }, null, 2));
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
