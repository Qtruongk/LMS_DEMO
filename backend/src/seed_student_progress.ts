import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://lms_user:lms_password@127.0.0.1:5432/lms_demo' });

async function seed() {
    console.log('Seeding student test score progression...');

    // 1. Find class TA9
    const { rows: classes } = await pool.query("SELECT id, teacher_id FROM classes WHERE code = 'TA9' OR name ILIKE '%Tiếng Anh 9%' LIMIT 1");
    if (!classes.length) {
        console.error('Class TA9 not found!');
        await pool.end();
        return;
    }
    const classId = classes[0].id;
    const teacherId = classes[0].teacher_id || 1960;
    console.log(`Found class ID: ${classId}, teacher ID: ${teacherId}`);

    // 2. Define sequence of tests
    const testsData = [
        {
            title: 'Khảo sát đầu vào - Diagnostic Test',
            description: 'Đánh giá năng lực ngữ pháp và từ vựng đầu năm học.',
            max_score: 10,
            date: '2026-08-10T08:00:00.000Z',
            assignment_kind: 'quiz',
        },
        {
            title: 'Kiểm tra 15 phút - Unit 1: Vocabulary & Grammar',
            description: 'Kiểm tra từ vựng chủ đề Unit 1 và các thì cơ bản.',
            max_score: 10,
            date: '2026-08-18T08:00:00.000Z',
            assignment_kind: 'quiz',
        },
        {
            title: 'Kiểm tra 1 tiết - Unit 1 & 2: Grammar Mastery',
            description: 'Kiểm tra tổng hợp kiến thức Unit 1 và Unit 2.',
            max_score: 10,
            date: '2026-08-27T08:00:00.000Z',
            assignment_kind: 'quiz',
        },
        {
            title: 'Kiểm tra 15 phút - Unit 3: Reading Skills',
            description: 'Đọc hiểu đoạn văn ngắn và trả lời câu hỏi trắc nghiệm.',
            max_score: 10,
            date: '2026-09-03T08:00:00.000Z',
            assignment_kind: 'quiz',
        },
        {
            title: 'Bài thi giữa kỳ I - Comprehensive Test',
            description: 'Bài kiểm tra giữa kỳ đánh giá 4 kỹ năng ngôn ngữ.',
            max_score: 10,
            date: '2026-09-08T08:00:00.000Z',
            assignment_kind: 'quiz',
        },
        {
            title: 'Kiểm tra chuyên đề - Advanced English Test',
            description: 'Bài kiểm tra nâng cao kỹ năng viết và ứng dụng ngữ pháp.',
            max_score: 10,
            date: '2026-09-12T08:00:00.000Z',
            assignment_kind: 'quiz',
        },
    ];

    const createdTests: { id: number; title: string; max_score: number; date: string }[] = [];

    for (const item of testsData) {
        let { rows } = await pool.query(
            "SELECT id, title, max_score FROM tests WHERE class_id = $1 AND title = $2",
            [classId, item.title]
        );
        if (!rows.length) {
            const inserted = await pool.query(
                `INSERT INTO tests (class_id, title, description, type, max_score, status, created_by, assignment_kind, created_at, due_date)
                 VALUES ($1, $2, $3, 'assignment', $4, 'published', $5, $6, $7, $7)
                 RETURNING id, title, max_score`,
                [classId, item.title, item.description, item.max_score, teacherId, item.assignment_kind, item.date]
            );
            rows = inserted.rows;
        }
        createdTests.push({ id: rows[0].id, title: rows[0].title, max_score: Number(rows[0].max_score), date: item.date });
    }

    // 3. Get enrolled students in class TA9
    const { rows: students } = await pool.query(
        `SELECT u.id, u.username, u.full_name
         FROM enrollments e
         JOIN users u ON u.id = e.student_id
         WHERE e.class_id = $1
         ORDER BY u.id`,
        [classId]
    );
    console.log(`Enrolled students in class TA9: ${students.length}`);

    // Progress profile for student 1961 (Lê Nguyễn Minh Thy)
    const thyScores = [
        { score: 6.0, feedback: 'Nắm được từ vựng cơ bản, cần củng cố thì quá khứ đơn và hoàn thành.' },
        { score: 7.0, feedback: 'Đã tiến bộ ở phần chia động từ, chú ý thêm cách dùng mạo từ.' },
        { score: 7.8, feedback: 'Bài làm tốt, kỹ năng ngữ pháp đã chắc chắn hơn nhiều.' },
        { score: 8.5, feedback: 'Rất tốt! Khả năng đọc hiểu và suy luận từ vựng xuất sắc.' },
        { score: 9.0, feedback: 'Bài thi đạt điểm Giỏi, phát huy phong độ này nhé!' },
        { score: 9.4, feedback: 'Xuất sắc! Điểm số tăng đều và thể hiện sự nỗ lực rất lớn.' },
    ];

    for (const student of students) {
        const isThy = student.id === 1961 || student.username === 'lenguyenminhthytienganh01';
        for (let idx = 0; idx < createdTests.length; idx++) {
            const test = createdTests[idx];
            if (!test) continue;
            let scoreVal: number;
            let feedbackText: string;

            if (isThy && thyScores[idx]) {
                scoreVal = thyScores[idx]!.score;
                feedbackText = thyScores[idx]!.feedback;
            } else {
                const base = 5.5 + ((student.id % 25) / 10);
                const step = (idx * 0.45);
                scoreVal = Math.min(9.8, Math.round((base + step) * 10) / 10);
                feedbackText = idx >= 4 ? 'Tiến bộ vượt bậc, làm bài rất cẩn thận!' : 'Cần chú ý đọc kỹ yêu cầu câu hỏi.';
            }

            await pool.query(
                `INSERT INTO submissions (test_id, student_id, score, feedback, submitted_at, graded_by, graded_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $5)
                 ON CONFLICT (test_id, student_id)
                 DO UPDATE SET score = EXCLUDED.score, feedback = EXCLUDED.feedback, submitted_at = EXCLUDED.submitted_at, graded_at = EXCLUDED.graded_at`,
                [test.id, student.id, scoreVal, feedbackText, test.date, teacherId]
            );
        }
    }

    console.log('Seeded progress test data successfully!');
    await pool.end();
}

seed().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
});
