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
const classSeeds = [
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
        description: 'Lớp điện ô tô, đọc sơ đồ mạch và thực hành chẩn đoán.',
    },
    {
        code: 'XM-AUTO-03',
        name: 'Chẩn đoán lỗi Ô tô C1',
        subject: 'Chẩn đoán lỗi Ô tô',
        schedule: 'Thứ 7 • 08:00 - 11:00',
        location: 'Xưởng thực hành VAT',
        description: 'Lớp thực hành OBD-II, phân tích triệu chứng và lập quy trình sửa chữa.',
    },
];
const baseQuestionTemplates = [
    {
        type: 'single_choice',
        text: 'Khi kiểm tra hệ thống khởi động, thông số nào cần đo trước để loại trừ lỗi nguồn cấp?',
        options: [
            { id: 'A', text: 'Điện áp ắc quy khi nghỉ và khi đề' },
            { id: 'B', text: 'Áp suất lốp trước' },
            { id: 'C', text: 'Nhiệt độ nước rửa kính' },
            { id: 'D', text: 'Độ sáng đèn khoang hành lý' },
        ],
        correct: ['A'],
        points: 0.5,
        guide: 'Ưu tiên kiểm tra nguồn cấp, sụt áp và tình trạng ắc quy trước khi tháo cụm khởi động.',
    },
    {
        type: 'multiple_choice',
        text: 'Chọn các dấu hiệu thường gặp khi ly hợp bị trượt trong quá trình vận hành.',
        options: [
            { id: 'A', text: 'Vòng tua tăng nhưng tốc độ xe tăng chậm' },
            { id: 'B', text: 'Có mùi khét sau khi leo dốc hoặc tải nặng' },
            { id: 'C', text: 'Bàn đạp phanh mềm bất thường' },
            { id: 'D', text: 'Khó tăng tốc dù đã vào số đúng' },
        ],
        correct: ['A', 'B', 'D'],
        points: 0.5,
        guide: 'Ly hợp trượt thường làm mất truyền mô-men, vòng tua tăng, xe yếu và có mùi bố ly hợp.',
    },
    {
        type: 'true_false',
        text: 'Cảm biến vị trí trục khuỷu lỗi có thể làm động cơ khó nổ hoặc không nổ.',
        options: [
            { id: 'true', text: 'Đúng' },
            { id: 'false', text: 'Sai' },
        ],
        correct: ['true'],
        points: 0.5,
        guide: 'ECU cần tín hiệu trục khuỷu để xác định thời điểm phun và đánh lửa.',
    },
    {
        type: 'fill_blank',
        text: 'Thiết bị dùng để đọc mã lỗi chuẩn OBD-II thường được gọi là máy ____.',
        options: [],
        correct: ['scan'],
        points: 0.5,
        guide: 'Đáp án chấp nhận: scan hoặc scanner chẩn đoán.',
    },
    {
        type: 'ordering',
        text: 'Sắp xếp quy trình chẩn đoán lỗi điện cơ bản theo thứ tự hợp lý.',
        options: [
            { id: 'A', text: 'Xác nhận triệu chứng' },
            { id: 'B', text: 'Kiểm tra nguồn và mass' },
            { id: 'C', text: 'Đọc sơ đồ mạch' },
            { id: 'D', text: 'Khoanh vùng và kiểm tra linh kiện' },
        ],
        correct: ['A', 'C', 'B', 'D'],
        points: 0.5,
        guide: 'Quy trình tốt bắt đầu từ xác nhận hiện tượng, đọc sơ đồ, kiểm tra nguồn/mass rồi khoanh vùng linh kiện.',
    },
    {
        type: 'single_choice',
        text: 'Trong hộp số, bộ đồng tốc có nhiệm vụ chính là gì?',
        options: [
            { id: 'A', text: 'Đồng bộ tốc độ bánh răng trước khi gài số' },
            { id: 'B', text: 'Tăng áp suất nhiên liệu' },
            { id: 'C', text: 'Làm mát két nước' },
            { id: 'D', text: 'Điều khiển quạt điều hòa' },
        ],
        correct: ['A'],
        points: 0.5,
        guide: 'Bộ đồng tốc giúp quá trình gài số êm và giảm va đập bánh răng.',
    },
    {
        type: 'multiple_choice',
        text: 'Những thao tác nào an toàn trước khi đo điện trên xe?',
        options: [
            { id: 'A', text: 'Xác định đúng thang đo đồng hồ' },
            { id: 'B', text: 'Kiểm tra cực tính và điểm mass' },
            { id: 'C', text: 'Chập trực tiếp cầu chì để thử tải' },
            { id: 'D', text: 'Đọc cảnh báo an toàn của nhà sản xuất' },
        ],
        correct: ['A', 'B', 'D'],
        points: 0.5,
        guide: 'Không chập mạch thử tải tùy tiện; cần chọn thang đo và điểm đo an toàn.',
    },
    {
        type: 'true_false',
        text: 'Mã lỗi DTC luôn chỉ ra chính xác linh kiện hỏng cần thay ngay.',
        options: [
            { id: 'true', text: 'Đúng' },
            { id: 'false', text: 'Sai' },
        ],
        correct: ['false'],
        points: 0.5,
        guide: 'DTC chỉ là chỉ dẫn vùng lỗi, cần kiểm tra dữ liệu động, nguồn, mass và dây dẫn.',
    },
    {
        type: 'fill_blank',
        text: 'Dây nối mass trong sơ đồ điện thường ký hiệu bằng điểm nối về ____.',
        options: [],
        correct: ['mass'],
        points: 0.5,
        guide: 'Mass còn được gọi là ground hoặc điểm âm thân xe.',
    },
    {
        type: 'single_choice',
        text: 'Khi bàn đạp phanh bị rung lúc phanh gấp, hệ thống nào có thể đang hoạt động?',
        options: [
            { id: 'A', text: 'ABS' },
            { id: 'B', text: 'Điều hòa' },
            { id: 'C', text: 'Gạt mưa' },
            { id: 'D', text: 'Âm thanh' },
        ],
        correct: ['A'],
        points: 0.5,
        guide: 'ABS điều tiết áp suất phanh nhanh nên người lái có thể cảm nhận rung ở bàn đạp.',
    },
    {
        type: 'multiple_choice',
        text: 'Khi động cơ quá nhiệt, cần kiểm tra các hạng mục nào?',
        options: [
            { id: 'A', text: 'Mức nước làm mát' },
            { id: 'B', text: 'Hoạt động quạt két nước' },
            { id: 'C', text: 'Van hằng nhiệt' },
            { id: 'D', text: 'Mã màu sơn xe' },
        ],
        correct: ['A', 'B', 'C'],
        points: 0.5,
        guide: 'Quá nhiệt liên quan trực tiếp đến nước làm mát, quạt, van hằng nhiệt, bơm nước và két nước.',
    },
    {
        type: 'true_false',
        text: 'Kiểm tra sụt áp trên dây dẫn giúp phát hiện tiếp xúc kém hoặc điện trở cao.',
        options: [
            { id: 'true', text: 'Đúng' },
            { id: 'false', text: 'Sai' },
        ],
        correct: ['true'],
        points: 0.5,
        guide: 'Sụt áp bất thường cho thấy điểm nối, dây hoặc mass có điện trở cao.',
    },
    {
        type: 'fill_blank',
        text: 'Cơ cấu biến đổi chuyển động tịnh tiến của piston thành quay là trục ____.',
        options: [],
        correct: ['khuỷu'],
        points: 0.5,
        guide: 'Trục khuỷu nhận lực từ thanh truyền và biến thành mô-men quay.',
    },
    {
        type: 'ordering',
        text: 'Sắp xếp các bước cơ bản khi tiếp nhận xe có đèn Check Engine sáng.',
        options: [
            { id: 'A', text: 'Phỏng vấn khách hàng' },
            { id: 'B', text: 'Quét mã lỗi và lưu freeze frame' },
            { id: 'C', text: 'Kiểm tra dữ liệu động liên quan' },
            { id: 'D', text: 'Xác nhận sửa chữa bằng chạy thử' },
        ],
        correct: ['A', 'B', 'C', 'D'],
        points: 0.5,
        guide: 'Luồng tiếp nhận chuẩn cần ghi nhận hiện tượng, đọc lỗi, kiểm tra dữ liệu và xác nhận sau sửa chữa.',
    },
    {
        type: 'single_choice',
        text: 'Cầu chì trong mạch điện ô tô có vai trò chính là gì?',
        options: [
            { id: 'A', text: 'Bảo vệ mạch khi quá dòng' },
            { id: 'B', text: 'Tăng áp suất dầu' },
            { id: 'C', text: 'Lọc bụi khí nạp' },
            { id: 'D', text: 'Làm kín buồng đốt' },
        ],
        correct: ['A'],
        points: 0.5,
        guide: 'Cầu chì đứt khi dòng vượt ngưỡng để bảo vệ dây dẫn và thiết bị.',
    },
    {
        type: 'multiple_choice',
        text: 'Các dữ liệu nào trên máy chẩn đoán hỗ trợ phân tích lỗi phun xăng?',
        options: [
            { id: 'A', text: 'Short Term Fuel Trim' },
            { id: 'B', text: 'Long Term Fuel Trim' },
            { id: 'C', text: 'Tín hiệu O2/AF sensor' },
            { id: 'D', text: 'Màu ghế da' },
        ],
        correct: ['A', 'B', 'C'],
        points: 0.5,
        guide: 'Fuel trim và cảm biến oxy/AF cho biết ECU đang hiệu chỉnh hòa khí như thế nào.',
    },
    {
        type: 'true_false',
        text: 'Khi đo điện trở, nên ngắt nguồn mạch để tránh làm hỏng đồng hồ hoặc sai kết quả.',
        options: [
            { id: 'true', text: 'Đúng' },
            { id: 'false', text: 'Sai' },
        ],
        correct: ['true'],
        points: 0.5,
        guide: 'Đo điện trở trên mạch đang cấp nguồn có thể gây sai số hoặc hỏng thiết bị đo.',
    },
    {
        type: 'fill_blank',
        text: 'Hệ thống chống bó cứng phanh được viết tắt là ____.',
        options: [],
        correct: ['ABS'],
        points: 0.5,
        guide: 'ABS là Anti-lock Braking System.',
    },
    {
        type: 'essay',
        text: 'Trình bày quy trình kiểm tra xe khó khởi động theo hướng an toàn, có thứ tự và có tiêu chí kết luận.',
        options: [],
        correct: [],
        points: 1,
        guide: 'Bài tốt nêu được xác nhận hiện tượng, kiểm tra ắc quy/sụt áp, đọc DTC, kiểm tra nhiên liệu, đánh lửa, cảm biến, kết luận và khuyến nghị sửa chữa.',
    },
    {
        type: 'writing',
        text: 'Viết báo cáo ngắn cho khách hàng sau khi phát hiện lỗi tiếp xúc kém tại giắc cảm biến.',
        options: [],
        correct: [],
        points: 1,
        guide: 'Báo cáo cần dễ hiểu: hiện tượng, nguyên nhân, thao tác đã làm, kết quả kiểm tra lại và khuyến nghị theo dõi.',
    },
];
const examSeeds = [
    {
        title: 'Xuân Minh - Kiểm tra 01: Nền tảng kỹ thuật ô tô',
        subject: 'Kỹ thuật Ô tô',
        classCode: 'XM-AUTO-01',
        description: 'Đánh giá kiến thức nền tảng về động cơ, truyền lực, phanh và an toàn thực hành.',
        duration: 45,
    },
    {
        title: 'Xuân Minh - Kiểm tra 02: Điện thân xe và đọc sơ đồ',
        subject: 'Điện Ô tô',
        classCode: 'XM-AUTO-02',
        description: 'Kiểm tra khả năng đọc sơ đồ, đo điện, xác định nguồn, mass, cầu chì và rơ-le.',
        duration: 50,
    },
    {
        title: 'Xuân Minh - Kiểm tra 03: Chẩn đoán OBD-II',
        subject: 'Chẩn đoán lỗi Ô tô',
        classCode: 'XM-AUTO-03',
        description: 'Đánh giá quy trình tiếp nhận, đọc DTC, phân tích dữ liệu động và xác nhận sửa chữa.',
        duration: 60,
    },
    {
        title: 'Xuân Minh - Kiểm tra 04: Hệ thống truyền lực và hộp số',
        subject: 'Kỹ thuật Ô tô',
        classCode: 'XM-AUTO-01',
        description: 'Bài kiểm tra về ly hợp, hộp số, truyền động, triệu chứng hư hỏng và cách kiểm tra.',
        duration: 45,
    },
    {
        title: 'Xuân Minh - Kiểm tra 05: Tổng hợp thực hành xưởng',
        subject: 'Chẩn đoán lỗi Ô tô',
        classCode: 'XM-AUTO-03',
        description: 'Đề tổng hợp 20 câu mô phỏng tình huống xưởng để học sinh luyện kỹ năng ra quyết định.',
        duration: 60,
    },
];
async function ensureOnlineExamSchema(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS online_exams (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            subject TEXT,
            class_id INT REFERENCES classes(id) ON DELETE CASCADE,
            description TEXT,
            instructions TEXT,
            start_time TIMESTAMP,
            end_time TIMESTAMP,
            due_time TIMESTAMP,
            duration_minutes INT DEFAULT 45,
            show_answers_after_submit BOOLEAN DEFAULT true,
            show_score_after_submit BOOLEAN DEFAULT true,
            max_attempts INT DEFAULT 1,
            shuffle_questions BOOLEAN DEFAULT false,
            shuffle_options BOOLEAN DEFAULT false,
            display_mode VARCHAR(20) DEFAULT 'one',
            auto_submit BOOLEAN DEFAULT true,
            status VARCHAR(20) DEFAULT 'draft',
            created_by INT REFERENCES users(id) ON DELETE SET NULL,
            proctoring_enabled BOOLEAN DEFAULT true,
            homework_enabled BOOLEAN DEFAULT false,
            assigned_teacher_ids JSONB DEFAULT '[]'::jsonb,
            rubric_locked_after_grade BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await client.query(`
        CREATE TABLE IF NOT EXISTS question_bank (
            id SERIAL PRIMARY KEY,
            exam_id INT REFERENCES online_exams(id) ON DELETE CASCADE,
            subject TEXT,
            chapter TEXT,
            topic TEXT,
            difficulty VARCHAR(20) DEFAULT 'medium',
            type VARCHAR(50) NOT NULL,
            question_text TEXT NOT NULL,
            media JSONB DEFAULT '[]'::jsonb,
            options JSONB DEFAULT '[]'::jsonb,
            correct_answers JSONB DEFAULT '[]'::jsonb,
            points NUMERIC(5,2) DEFAULT 1.0,
            grading_guide TEXT,
            tags TEXT[],
            created_by INT REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await client.query(`
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
            graded_at TIMESTAMP,
            proctoring_logs JSONB DEFAULT '[]'::jsonb,
            assigned_grader_name TEXT,
            teacher_audio_feedback_url TEXT,
            UNIQUE(exam_id, student_id, attempt_number)
        );
    `);
    await client.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS instructions TEXT;`);
    await client.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS due_time TIMESTAMP;`);
    await client.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS proctoring_enabled BOOLEAN DEFAULT true;`);
    await client.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS homework_enabled BOOLEAN DEFAULT false;`);
    await client.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS assigned_teacher_ids JSONB DEFAULT '[]'::jsonb;`);
    await client.query(`ALTER TABLE online_exams ADD COLUMN IF NOT EXISTS rubric_locked_after_grade BOOLEAN DEFAULT true;`);
    await client.query(`ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;`);
    await client.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS assigned_grader_name TEXT;`);
    await client.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS teacher_audio_feedback_url TEXT;`);
    await client.query(`ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS proctoring_logs JSONB DEFAULT '[]'::jsonb;`);
}
async function ensureTeacherAndClasses(client) {
    const teacherResult = await client.query(`INSERT INTO users (full_name, username, phone, role, password, specialty, status, note)
         VALUES ($1, $2, $3, 'teacher', $4, $5, 'active', 'Giảng viên được seed dữ liệu bài kiểm tra trực tuyến')
         ON CONFLICT (username)
         DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, role = 'teacher', password = EXCLUDED.password, specialty = EXCLUDED.specialty, status = 'active', updated_at = now()
         RETURNING id`, [teacher.fullName, teacher.username, teacher.phone, teacher.password, teacher.specialty]);
    const teacherId = Number(teacherResult.rows[0].id);
    const classIds = new Map();
    for (const [index, item] of classSeeds.entries()) {
        const classResult = await client.query(`INSERT INTO classes (name, code, description, subject, teacher_id, start_date, end_date, status, schedule, progress, location, internal_note)
             VALUES ($1, $2, $3, $4, $5, CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '75 days', 'active', $6, $7, $8, $9)
             ON CONFLICT (code)
             DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, subject = EXCLUDED.subject, teacher_id = EXCLUDED.teacher_id, status = 'active', schedule = EXCLUDED.schedule, progress = EXCLUDED.progress, location = EXCLUDED.location, internal_note = EXCLUDED.internal_note, updated_at = now()
             RETURNING id`, [item.name, item.code, item.description, item.subject, teacherId, item.schedule, 70 + index * 5, item.location, 'Seed: lớp có bài kiểm tra online của giảng viên Xuân Minh']);
        classIds.set(item.code, Number(classResult.rows[0].id));
    }
    return { teacherId, classIds };
}
function buildQuestion(examNumber, questionNumber) {
    const template = baseQuestionTemplates[(questionNumber - 1) % baseQuestionTemplates.length];
    const chapter = questionNumber <= 5 ? 'Nhận biết' : questionNumber <= 14 ? 'Vận dụng' : 'Tình huống xưởng';
    const difficulty = questionNumber <= 7 ? 'easy' : questionNumber <= 16 ? 'medium' : 'hard';
    return {
        ...template,
        text: `Câu ${questionNumber}. [Đề ${examNumber}] ${template.text}`,
        chapter,
        difficulty,
        tags: ['xuan-minh', `de-${examNumber}`, chapter.toLowerCase().replaceAll(' ', '-')],
    };
}
async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensureOnlineExamSchema(client);
        const { teacherId, classIds } = await ensureTeacherAndClasses(client);
        const examIds = [];
        for (const [examIndex, examSeed] of examSeeds.entries()) {
            const classId = classIds.get(examSeed.classCode);
            if (!classId)
                throw new Error(`Không tìm thấy lớp ${examSeed.classCode}`);
            const examNumber = examIndex + 1;
            const existingExam = await client.query('SELECT id FROM online_exams WHERE title = $1 AND class_id = $2 LIMIT 1', [examSeed.title, classId]);
            let examId = Number(existingExam.rows[0]?.id || 0);
            if (examId) {
                await client.query(`UPDATE online_exams SET
                        subject = $2,
                        description = $3,
                        instructions = $4,
                        start_time = now() - interval '2 hours',
                        end_time = now() + interval '21 days',
                        due_time = now() + interval '14 days',
                        duration_minutes = $5,
                        show_answers_after_submit = true,
                        show_score_after_submit = true,
                        max_attempts = 2,
                        shuffle_questions = true,
                        shuffle_options = true,
                        display_mode = 'one',
                        auto_submit = true,
                        status = 'published',
                        created_by = $6,
                        proctoring_enabled = true,
                        homework_enabled = false,
                        assigned_teacher_ids = $7::jsonb,
                        rubric_locked_after_grade = true
                     WHERE id = $1`, [
                    examId,
                    examSeed.subject,
                    examSeed.description,
                    'Đọc kỹ đề, làm bài trong không gian tập trung. Hệ thống tự lưu định kỳ, ghi nhận cảnh báo chuyển tab/toàn màn hình và tự nộp khi hết giờ.',
                    examSeed.duration,
                    teacherId,
                    JSON.stringify([teacherId]),
                ]);
            }
            else {
                const examResult = await client.query(`INSERT INTO online_exams (
                        title, subject, class_id, description, instructions, start_time, end_time, due_time,
                        duration_minutes, show_answers_after_submit, show_score_after_submit, max_attempts,
                        shuffle_questions, shuffle_options, display_mode, auto_submit, status, created_by,
                        proctoring_enabled, homework_enabled, assigned_teacher_ids, rubric_locked_after_grade
                    )
                    VALUES (
                        $1, $2, $3, $4, $5,
                        now() - interval '2 hours', now() + interval '21 days', now() + interval '14 days',
                        $6, true, true, 2, true, true, 'one', true, 'published', $7,
                        true, false, $8::jsonb, true
                    )
                    RETURNING id`, [
                    examSeed.title,
                    examSeed.subject,
                    classId,
                    examSeed.description,
                    'Đọc kỹ đề, làm bài trong không gian tập trung. Hệ thống tự lưu định kỳ, ghi nhận cảnh báo chuyển tab/toàn màn hình và tự nộp khi hết giờ.',
                    examSeed.duration,
                    teacherId,
                    JSON.stringify([teacherId]),
                ]);
                examId = Number(examResult.rows[0].id);
            }
            examIds.push(examId);
            await client.query('DELETE FROM question_bank WHERE exam_id = $1', [examId]);
            for (let questionNumber = 1; questionNumber <= 20; questionNumber += 1) {
                const question = buildQuestion(examNumber, questionNumber);
                await client.query(`INSERT INTO question_bank (
                        exam_id, subject, chapter, topic, difficulty, type, question_text,
                        media, options, correct_answers, points, grading_guide, tags, created_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, '[]'::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12::text[], $13)`, [
                    examId,
                    examSeed.subject,
                    question.chapter,
                    'Đề kiểm tra trực tuyến Xuân Minh',
                    question.difficulty,
                    question.type,
                    question.text,
                    JSON.stringify(question.options),
                    JSON.stringify(question.correct),
                    question.points,
                    question.guide,
                    question.tags,
                    teacherId,
                ]);
            }
        }
        await client.query('COMMIT');
        const summary = await client.query(`SELECT e.id, e.title, c.code AS class_code, COUNT(q.id)::int AS questions
             FROM online_exams e
             JOIN classes c ON c.id = e.class_id
             LEFT JOIN question_bank q ON q.exam_id = e.id
             WHERE e.id = ANY($1::int[])
             GROUP BY e.id, e.title, c.code
             ORDER BY e.id`, [examIds]);
        console.log(JSON.stringify({ ok: true, teacherId, exams: summary.rows }, null, 2));
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        process.exitCode = 1;
    }
    finally {
        client.release();
        await pool.end();
    }
}
main();
//# sourceMappingURL=seed_xuan_minh_exams.js.map