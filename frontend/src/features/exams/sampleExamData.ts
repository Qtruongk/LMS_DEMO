import type { ExamSubmission, OnlineExam, QuestionItem } from './types';

const now = new Date();
const addDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

const subjects = ['Tiếng Anh', 'Toán tư duy', 'Khoa học', 'Ngữ văn', 'IELTS Foundation'];
const skills = ['Từ vựng', 'Ngữ pháp', 'Đọc hiểu', 'Nghe hiểu', 'Viết', 'Nói', 'Logic', 'Mindmap'];

export const SAMPLE_EXAMS: OnlineExam[] = Array.from({ length: 20 }, (_, index) => {
    const id = 9000 + index + 1;
    const subject = subjects[index % subjects.length];
    const skill = skills[index % skills.length];
    return {
        id,
        title: `Bài kiểm tra mẫu ${String(index + 1).padStart(2, '0')} - ${skill}`,
        subject,
        class_id: (index % 4) + 1,
        class_name: `Lớp ${['A1', 'A2', 'B1', 'IELTS Teen'][index % 4]}`,
        teacher_name: 'Giảng viên Demo',
        description: `Đề mẫu dùng để kiểm thử đầy đủ UX tạo đề, giao bài, làm bài toàn màn hình, tự chấm và chấm thủ công. Học sinh được làm ${index % 3 === 0 ? 3 : 2} lần.`,
        start_time: addDays(-2),
        end_time: addDays(7 + (index % 8)),
        due_time: addDays(5 + (index % 9)),
        duration_minutes: [25, 30, 35, 45, 60][index % 5],
        instructions: 'Đọc kỹ yêu cầu, làm trong môi trường yên tĩnh, bật toàn màn hình, không chuyển tab. Câu trắc nghiệm tự chấm, câu nói/viết/mindmap giáo viên chấm sau.',
        show_answers_after_submit: index % 2 === 0,
        show_score_after_submit: true,
        max_attempts: index % 3 === 0 ? 3 : 2,
        shuffle_questions: true,
        shuffle_options: true,
        display_mode: index % 2 === 0 ? 'one' : 'all',
        auto_submit: true,
        status: 'published',
        created_by: 1,
        created_at: addDays(-10 + index),
        question_count: 8,
        submission_count: 18 + index,
        proctoring_enabled: true,
        homework_enabled: index % 2 === 0,
        assigned_teacher_ids: [1, 2 + (index % 3)],
        rubric_locked_after_grade: true,
    };
});

export const makeSampleQuestions = (examId: number): QuestionItem[] => [
    {
        id: examId * 10 + 1,
        exam_id: examId,
        type: 'single_choice',
        difficulty: 'easy',
        question_text: 'Chọn đáp án đúng: “She ____ to school every morning.”',
        media: [{ type: 'image', url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900', name: 'Lớp học minh họa' }],
        options: [
            { id: 'A', text: 'go' },
            { id: 'B', text: 'goes' },
            { id: 'C', text: 'going' },
            { id: 'D', text: 'gone' },
        ],
        correct_answers: ['B'],
        points: 1,
    },
    {
        id: examId * 10 + 2,
        exam_id: examId,
        type: 'true_false',
        difficulty: 'easy',
        question_text: 'True/False: “The Earth moves around the Sun.”',
        options: [
            { id: 'A', text: 'True' },
            { id: 'B', text: 'False' },
        ],
        correct_answers: ['A'],
        points: 1,
    },
    {
        id: examId * 10 + 3,
        exam_id: examId,
        type: 'fill_blank',
        difficulty: 'medium',
        question_text: 'Điền từ còn thiếu: “If it rains, we ____ stay at home.”',
        correct_answers: ['will'],
        points: 1,
        grading_guide: 'Chấp nhận will hoặc sẽ trong ngữ cảnh phù hợp.',
    },
    {
        id: examId * 10 + 4,
        exam_id: examId,
        type: 'ordering',
        difficulty: 'medium',
        question_text: 'Sắp xếp các cụm từ để tạo câu đúng.',
        options: [
            { id: 'A', text: 'I' },
            { id: 'B', text: 'usually' },
            { id: 'C', text: 'do homework' },
            { id: 'D', text: 'after dinner' },
        ],
        correct_answers: ['A', 'B', 'C', 'D'],
        points: 1.5,
    },
    {
        id: examId * 10 + 5,
        exam_id: examId,
        type: 'drag_drop',
        difficulty: 'medium',
        question_text: 'Kéo thả/ghép cặp từ với nghĩa tương ứng.',
        options: [
            { id: 'A', text: 'brave → dũng cảm' },
            { id: 'B', text: 'honest → trung thực' },
            { id: 'C', text: 'curious → tò mò' },
        ],
        correct_answers: ['A', 'B', 'C'],
        points: 1.5,
    },
    {
        id: examId * 10 + 6,
        exam_id: examId,
        type: 'mindmap',
        difficulty: 'hard',
        question_text: 'Vẽ mindmap bằng chữ về chủ đề “Healthy lifestyle”. Có ít nhất 4 nhánh chính.',
        points: 2,
        grading_guide: 'Chấm theo đủ nhánh, logic, từ vựng đúng, trình bày dễ đọc.',
    },
    {
        id: examId * 10 + 7,
        exam_id: examId,
        type: 'speaking',
        difficulty: 'hard',
        question_text: 'Nói 45-60 giây về một thói quen học tập tốt. Có thể đính kèm audio câu trả lời.',
        media: [{ type: 'audio', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', name: 'Audio hướng dẫn phát âm' }],
        points: 2,
        grading_guide: 'Chấm phát âm, độ trôi chảy, cấu trúc câu và nội dung.',
    },
    {
        id: examId * 10 + 8,
        exam_id: examId,
        type: 'writing',
        difficulty: 'hard',
        question_text: 'Viết đoạn văn 80-100 từ nêu ý kiến: “Homework should be balanced with rest.”',
        points: 2,
        grading_guide: 'Chấm ý tưởng, tổ chức đoạn, ngữ pháp, từ vựng. Giáo viên nhận xét bằng text/audio.',
    },
];

export const SAMPLE_QUESTIONS: Record<number, QuestionItem[]> = SAMPLE_EXAMS.reduce<Record<number, QuestionItem[]>>((acc, exam) => {
    acc[exam.id] = makeSampleQuestions(exam.id);
    return acc;
}, {});

export const SAMPLE_RESULTS: ExamSubmission[] = SAMPLE_EXAMS.slice(0, 8).map((exam, index) => ({
    id: 7000 + index,
    exam_id: exam.id,
    student_id: 101,
    student_name: 'Học sinh Demo',
    student_code: 'STU-DEMO',
    exam_title: exam.title,
    subject: exam.subject,
    class_name: exam.class_name,
    attempt_number: (index % 2) + 1,
    start_time: addDays(-index - 1),
    submit_time: addDays(-index),
    status: index % 3 === 0 ? 'pending_essay' : 'graded',
    total_score: index % 3 === 0 ? undefined : 7.5 + (index % 3),
    max_score: 12,
    answers: {},
    essay_scores: {
        [exam.id * 10 + 8]: { score: 1.5, feedback: 'Bố cục rõ, cần thêm ví dụ cá nhân.' },
    },
    teacher_feedback: index % 3 === 0 ? 'Giáo viên đang chấm phần tự luận/nói.' : 'Em làm tốt phần trắc nghiệm, cần luyện thêm phát âm và ví dụ trong bài viết.',
    proctoring_logs: [
        { at: addDays(-index), type: 'fullscreen_enter', detail: 'Bắt đầu làm bài toàn màn hình' },
        { at: addDays(-index), type: 'answer_change', question_id: exam.id * 10 + 1, detail: 'Chọn đáp án B' },
    ],
}));
