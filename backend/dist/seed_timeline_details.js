import dotenv from 'dotenv';
import { Pool } from 'pg';
dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sessionPlans = [
    {
        note: `Nội dung giảng viên đã ghi:\n- Điểm danh đầu giờ và nhắc quy định an toàn khi thực hành.\n- Ôn nhanh cấu tạo tổng quan, vị trí các cụm chi tiết chính.\n- Thực hành theo nhóm nhỏ: quan sát, ghi nhận lỗi thường gặp, báo cáo kết quả cuối buổi.\n- Dặn dò: xem lại phiếu thao tác, chuẩn bị câu hỏi cho buổi tiếp theo.`,
        materials: [
            {
                title: 'Phiếu thao tác thực hành trong buổi học',
                description: 'Các bước thực hành theo nhóm, checklist an toàn và tiêu chí giáo viên dùng để nhận xét.',
                note: 'Học sinh đọc trước phần checklist an toàn trước khi vào lớp.',
                file_name: 'phieu-thao-tac-thuc-hanh.pdf',
                file_size: '620 KB',
                file_type: 'PDF',
                external_link: 'https://example.com/vat/phieu-thao-tac-thuc-hanh.pdf',
            },
            {
                title: 'Bảng ghi chú lỗi thường gặp',
                description: 'Mẫu ghi chú giúp học sinh tự đánh dấu lỗi trong quá trình thực hành và cách sửa nhanh.',
                note: 'Dùng trong 15 phút cuối buổi để tự đánh giá.',
                file_name: 'bang-ghi-chu-loi-thuong-gap.xlsx',
                file_size: '180 KB',
                file_type: 'XLSX',
                external_link: 'https://example.com/vat/bang-ghi-chu-loi-thuong-gap.xlsx',
            },
        ],
    },
    {
        note: `Nội dung giảng viên đã ghi:\n- Kiểm tra nhanh bài cũ bằng 5 câu hỏi trọng tâm.\n- Chữa các lỗi học sinh hay nhầm trong buổi trước.\n- Hướng dẫn quy trình làm bài theo từng bước: đọc yêu cầu, phân tích, thực hành, kiểm tra lại.\n- Bài tự luyện: hoàn thành phiếu luyện tập và ghi 3 câu chưa hiểu.`,
        materials: [
            {
                title: 'Phiếu luyện tập sau buổi học',
                description: 'Bài tự luyện có đáp án gợi ý, giúp học sinh ôn đúng phần giáo viên vừa chữa.',
                note: 'Hoàn thành trước buổi học kế tiếp.',
                file_name: 'phieu-luyen-tap-sau-buoi-hoc.pdf',
                file_size: '540 KB',
                file_type: 'PDF',
                external_link: 'https://example.com/vat/phieu-luyen-tap-sau-buoi-hoc.pdf',
            },
        ],
    },
    {
        note: `Nội dung giảng viên đã ghi:\n- Tổng hợp tiến độ từng nhóm và phản hồi điểm mạnh/yếu.\n- Học sinh trình bày kết quả thực hành trong 3 phút.\n- Giáo viên chốt kiến thức cốt lõi, nhấn mạnh phần cần nhớ.\n- Dặn dò: đọc tài liệu tóm tắt và chuẩn bị câu hỏi phản hồi.`,
        materials: [
            {
                title: 'Tóm tắt kiến thức cốt lõi',
                description: 'Bản tóm tắt ngắn gọn các ý chính, thuật ngữ cần nhớ và phần hay xuất hiện trong kiểm tra.',
                note: 'Ưu tiên đọc phần được đánh dấu màu đỏ.',
                file_name: 'tom-tat-kien-thuc-cot-loi.pdf',
                file_size: '390 KB',
                file_type: 'PDF',
                external_link: 'https://example.com/vat/tom-tat-kien-thuc-cot-loi.pdf',
            },
            {
                title: 'Slide minh hoạ buổi học',
                description: 'Slide giáo viên đã dùng trên lớp, gồm hình minh hoạ và ví dụ thực tế.',
                note: 'Xem lại trước khi làm bài tự luyện.',
                file_name: 'slide-minh-hoa-buoi-hoc.pptx',
                file_size: '2.4 MB',
                file_type: 'PPTX',
                external_link: 'https://example.com/vat/slide-minh-hoa-buoi-hoc.pptx',
            },
        ],
    },
];
async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS note TEXT;');
        await client.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_name TEXT;');
        await client.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_data TEXT;');
        await client.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_size TEXT;');
        await client.query('ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_type TEXT;');
        const sessions = await client.query(`
      SELECT s.id, s.class_id, s.title, s.start_time, c.name AS class_name
      FROM sessions s
      JOIN classes c ON c.id = s.class_id
      ORDER BY c.id, s.start_time, s.id
    `);
        for (let index = 0; index < sessions.rows.length; index += 1) {
            const session = sessions.rows[index];
            const plan = sessionPlans[index % sessionPlans.length] ?? sessionPlans[0];
            const teacherNote = `${plan.note}\n\nLớp: ${session.class_name}\nBuổi học: ${session.title}`;
            await client.query(`UPDATE sessions
         SET teacher_notes = $1
         WHERE id = $2`, [teacherNote, session.id]);
            for (const material of plan.materials) {
                await client.query(`INSERT INTO materials (class_id, session_id, title, description, note, file_name, file_size, file_type, file_url, external_link, visibility, created_at)
           SELECT $1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, 'visible', now()
           WHERE NOT EXISTS (
             SELECT 1 FROM materials WHERE session_id = $2 AND title = $3
           )`, [
                    session.class_id,
                    session.id,
                    material.title,
                    material.description,
                    material.note,
                    material.file_name,
                    material.file_size,
                    material.file_type,
                    material.external_link,
                ]);
            }
        }
        await client.query('COMMIT');
        console.log(`Updated ${sessions.rows.length} sessions with teacher notes and lesson materials.`);
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
//# sourceMappingURL=seed_timeline_details.js.map