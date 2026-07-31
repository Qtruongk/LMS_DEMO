import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lms_demo' });

async function runMassSeeding() {
    console.log('🚀 Starting Enterprise Mass Data Seeding...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Generate 20 Teachers
        console.log('📦 Seeding 20 Teachers...');
        const teacherIds: number[] = [];
        const departments = ['Khoa Công nghệ Ô TÔ', 'Khoa Điện - Điện Tử', 'Khoa Cơ Khí Chế Tạo', 'Khoa Tự Động Hóa', 'Khoa Công nghệ Thông tin'];

        for (let i = 1; i <= 20; i++) {
            const username = `teacher_ent_${i}`;
            const fullName = `ThS. Nguyễn Văn Giáo Viên ${i}`;
            const dept = departments[i % departments.length];
            const res = await client.query(
                `INSERT INTO users (full_name, username, phone, role, password, specialty, note)
                 VALUES ($1, $2, $3, 'teacher', '123456', $4, 'Giảng viên chính cơ sở')
                 ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
                 RETURNING id;`,
                [fullName, username, `0908000${String(i).padStart(3, '0')}`, dept]
            );
            teacherIds.push(res.rows[0].id);
        }

        // 2. Generate 50 Classes
        console.log('🏫 Seeding 50 Classes...');
        const classIds: number[] = [];
        const subjects = ['Điện Ô Tô Chuyên Sâu', 'Động Cơ Đốt Trong', 'Hệ Thống Phanh ABS/ESP', 'Tự Động Hóa PLC', 'Lập Trình Vi Điều Khiển', 'Chẩn Đoán Lỗi OBD-II', 'Công Nghệ Xe Hybrid & EV'];
        const locations = ['Cơ sở chính (TP.HCM)', 'Cơ sở Bình Dương', 'Cơ sở Hà Nội', 'Phòng Thí Nghiệm Ô Tô 1', 'Phòng Thí Nghiệm Ô Tô 2'];

        for (let i = 1; i <= 50; i++) {
            const className = `Lớp ${subjects[i % subjects.length]} - K${20 + (i % 5)}.${i}`;
            const code = `VAT-ENT-${1000 + i}`;
            const subject = subjects[i % subjects.length];
            const teacherId = teacherIds[i % teacherIds.length];
            const location = locations[i % locations.length];
            const schedule = `Thứ ${(i % 6) + 2}, 18:30 - 21:00`;

            const res = await client.query(
                `INSERT INTO classes (name, code, subject, teacher_id, schedule, location, class_hours)
                 VALUES ($1, $2, $3, $4, $5, $6, '18:30 - 21:00')
                 ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
                 RETURNING id;`,
                [className, code, subject, teacherId, schedule, location]
            );
            classIds.push(res.rows[0].id);
        }

        // 3. Generate 500 Students
        console.log('🎓 Seeding 500 Students...');
        const studentIds: number[] = [];
        const familyNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Phan', 'Võ', 'Đặng', 'Bùi'];
        const middleNames = ['Văn', 'Thị', 'Đình', 'Minh', 'Thành', 'Hữu', 'Ngọc', 'Đức', 'Quang'];
        const firstNames = ['An', 'Bình', 'Cường', 'Dũng', 'Hải', 'Hùng', 'Linh', 'Nam', 'Phong', 'Quân', 'Sơn', 'Tấn', 'Tuấn', 'Việt'];

        for (let i = 1; i <= 500; i++) {
            const fname = familyNames[i % familyNames.length];
            const mname = middleNames[(i * 3) % middleNames.length];
            const lname = firstNames[(i * 7) % firstNames.length];
            const fullName = `${fname} ${mname} ${lname}`;
            const username = `student_ent_${i}`;
            const studentCode = `SV2026ENT${String(i).padStart(4, '0')}`;

            const res = await client.query(
                `INSERT INTO users (full_name, username, phone, student_code, role, password)
                 VALUES ($1, $2, $3, $4, 'student', '123456')
                 ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
                 RETURNING id;`,
                [fullName, username, `0912${String(i).padStart(6, '0')}`, studentCode]
            );
            const stId = res.rows[0].id;
            studentIds.push(stId);

            // Enroll into 2 random classes
            const class1 = classIds[i % classIds.length];
            const class2 = classIds[(i + 5) % classIds.length];

            await client.query(
                `INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
                [class1, stId]
            );
            await client.query(
                `INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
                [class2, stId]
            );
        }

        // 4. Generate 60 Online Exams
        console.log('📝 Seeding 60 Online Exams...');
        const examTypes = ['quiz', 'midterm', 'final', 'practice'];
        const examIds: number[] = [];

        for (let i = 1; i <= 60; i++) {
            const classId = classIds[i % classIds.length];
            const teacherId = teacherIds[i % teacherIds.length];
            const type = examTypes[i % examTypes.length];
            const subject = subjects[i % subjects.length];
            const title = type === 'midterm'
                ? `Bài Thi Giữa Kỳ Enterprise - Môn ${subject} #${i}`
                : type === 'final'
                    ? `Bài Thi Cuối Kỳ Chuẩn Hóa - Môn ${subject} #${i}`
                    : `Bài Kiểm Tra Trắc Nghiệm Tốc Độ #${i}`;

            const duration = type === 'final' ? 90 : type === 'midterm' ? 60 : 45;
            const res = await client.query(
                `INSERT INTO online_exams (title, subject, class_id, created_by, duration_minutes, max_attempts, show_answers_after_submit, show_score_after_submit, shuffle_questions, shuffle_options, status, description)
                 VALUES ($1, $2, $3, $4, $5, 2, true, true, true, true, 'published', 'Bài thi chuẩn đánh giá năng lực học viên LMS Enterprise')
                 RETURNING id;`,
                [title, subject, classId, teacherId, duration]
            );
            examIds.push(res.rows[0].id);
        }

        // 5. Generate Question Bank (1000+ Questions)
        console.log('📚 Seeding 1000+ Questions in Question Bank...');

        const questionTemplates = [
            // MCQ Math LaTeX
            {
                type: 'single_choice',
                content: 'Tính tích phân xác định sau: $$\\int_{0}^{\\pi} \\sin(x) dx$$',
                points: 1,
                options: [
                    { id: 'opt_1', text: '$2$', isCorrect: true },
                    { id: 'opt_2', text: '$0$', isCorrect: false },
                    { id: 'opt_3', text: '$\\pi$', isCorrect: false },
                    { id: 'opt_4', text: '$-1$', isCorrect: false },
                ],
                correctAnswers: ['opt_1'],
                explanation: 'Ta có $\\int \\sin(x)dx = -\\cos(x)$. Thế vế $-\\cos(\\pi) - (-\\cos(0)) = 1 + 1 = 2$.'
            },
            // Chemistry Formula
            {
                type: 'single_choice',
                content: 'Cho dung dịch axit $H_2SO_4$ tác dụng với $Fe_2O_3$. Sản phẩm muối thu được là gì?',
                points: 1,
                options: [
                    { id: 'opt_1', text: '$Fe_2(SO_4)_3 + H_2O$', isCorrect: true },
                    { id: 'opt_2', text: '$FeSO_4 + H_2$', isCorrect: false },
                    { id: 'opt_3', text: '$FeS + O_2$', isCorrect: false },
                    { id: 'opt_4', text: '$Fe(OH)_3$', isCorrect: false },
                ],
                correctAnswers: ['opt_1'],
                explanation: 'Phương trình hóa học: $Fe_2O_3 + 3H_2SO_4 \\rightarrow Fe_2(SO_4)_3 + 3H_2O$.'
            },
            // Technical Automotive Question
            {
                type: 'single_choice',
                content: 'Điện áp chuẩn của cảm biến oxy (Oxygen Sensor) dạng Narrowband khi hỗn hợp khí đậm (Rich Mixture) là bao nhiêu?',
                points: 1,
                options: [
                    { id: 'opt_1', text: 'Khoảng 0.8V - 0.9V', isCorrect: true },
                    { id: 'opt_2', text: 'Khoảng 0.1V - 0.2V', isCorrect: false },
                    { id: 'opt_3', text: 'Đúng 5.0V', isCorrect: false },
                    { id: 'opt_4', text: 'Khoảng 12V DC', isCorrect: false },
                ],
                correctAnswers: ['opt_1'],
                explanation: 'Cảm biến Oxy pha trò dao động từ 0.1V (Hỗn hợp nhạt) đến 0.9V (Hỗn hợp đậm).'
            },
            // True False Question
            {
                type: 'true_false',
                content: 'Hệ thống chống bó cứng phanh (ABS) giúp giảm quãng đường phanh trên mọi địa hình kể cả đường tuyết dày.',
                points: 1,
                options: [
                    { id: 'opt_true', text: 'Đúng', isCorrect: false },
                    { id: 'opt_false', text: 'Sai', isCorrect: true },
                ],
                correctAnswers: ['opt_false'],
                explanation: 'Trên đường tuyết dày hoặc sỏi đá rời, ABS có thể làm tăng quãng đường phanh nhưng giúp duy trì khả năng lái kiểm soát vệt bánh.'
            },
            // Code Syntax Question
            {
                type: 'single_choice',
                content: 'Đoạn mã C++ điều khiển đọc tín hiệu cảm biến ADC sau sẽ trả về giá trị trong khoảng nào?\n```cpp\nint val = analogRead(A0);\nfloat voltage = val * (5.0 / 1023.0);\n```',
                points: 1,
                options: [
                    { id: 'opt_1', text: 'Từ 0.0V đến 5.0V', isCorrect: true },
                    { id: 'opt_2', text: 'Từ 0 đến 1023V', isCorrect: false },
                    { id: 'opt_3', text: 'Từ -5V đến +5V', isCorrect: false },
                    { id: 'opt_4', text: 'Chỉ nhận 0V hoặc 5V', isCorrect: false },
                ],
                correctAnswers: ['opt_1'],
                explanation: 'Chuyển đổi ADC 10-bit trên Arduino biến đổi dải giá trị 0-1023 sang điện áp tuyến tính 0-5V.'
            },
            // Fill in the Blank
            {
                type: 'fill_in_blank',
                content: 'Mã lỗi OBD-II chuẩn bắt đầu bằng chữ cái [blank] dành cho hệ thống Động cơ và Hộp số (Powertrain).',
                points: 1,
                options: [
                    { id: 'blank_1', text: 'P', isCorrect: true },
                ],
                correctAnswers: ['P'],
                explanation: 'Chữ P viết tắt cho Powertrain (Động cơ & Hộp số).'
            }
        ];

        let totalQ = 0;
        for (const examId of examIds) {
            const count = 18 + (examId % 5);
            for (let q = 1; q <= count; q++) {
                totalQ++;
                const tmpl = questionTemplates[(totalQ + q) % questionTemplates.length]!;
                const qContent = `[Câu ${q}] ${tmpl.content}`;

                await client.query(
                    `INSERT INTO question_bank (exam_id, subject, type, question_text, points, options, correct_answers, grading_guide)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
                    [examId, 'Điện Ô Tô', tmpl.type, qContent, tmpl.points, JSON.stringify(tmpl.options), JSON.stringify(tmpl.correctAnswers), tmpl.explanation]
                );
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Mass Data Seeding Completed Successfully! Created 20 Teachers, 50 Classes, 500 Students, 60 Exams and ${totalQ} Questions.`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMassSeeding();
