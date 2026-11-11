import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';
import { Badge, EmptyState, Panel, PrimaryButton } from '../../../components/shared/ui';
import { BookIcon, CheckCircleIcon, FileIcon, UploadIcon } from '../../../components/shared/icons';
import { API_URL } from '../../../services/api';
import type { ClassItem, User } from '../../../types';
import type { ExamMedia, OnlineExam, QuestionItem, QuestionOption, QuestionType } from '../../exams/types';

type DeliveryMode = 'same' | 'different';

type BankQuestion = QuestionItem & {
    id: number;
    class_id?: number | null;
    class_name?: string;
    class_code?: string;
    class_subject?: string;
    grade_level?: string;
    exam_title?: string;
    created_by_name?: string;
    created_at?: string;
};

export type ParsedExcelQuestion = {
    tempId: string;
    question_text: string;
    type: QuestionType;
    options: QuestionOption[];
    correct_answers: string[];
    points: number;
    duration?: string;
    chapter: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    grading_guide: string;
    isValid: boolean;
    errorMsg?: string;
};

type QuestionBankPanelProps = {
    user: User;
    classes: ClassItem[];
    selectedClassId?: number | null;
    setSelectedClassId?: (id: number) => void;
};

const questionTypes: { id: QuestionType; label: string }[] = [
    { id: 'single_choice', label: 'Trắc nghiệm 1 đáp án' },
    { id: 'multiple_choice', label: 'Trắc nghiệm nhiều đáp án' },
    { id: 'true_false', label: 'Đúng / Sai' },
    { id: 'fill_blank', label: 'Điền khuyết' },
    { id: 'essay', label: 'Tự luận' },
];

const typeLabels: Record<string, string> = {
    single_choice: '1 đáp án',
    multiple_choice: 'Nhiều đáp án',
    true_false: 'Đúng / Sai',
    fill_blank: 'Điền khuyết',
    essay: 'Tự luận',
};

function formatDate(value?: string) {
    if (!value) return 'Mới tạo';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Mới tạo';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function getQuestionChapter(question: BankQuestion) {
    return String(question.chapter || question.grade_level || question.topic || '').trim() || 'Chưa phân chương';
}

function getQuestionClassId(question: BankQuestion) {
    const value = Number(question.class_id || 0);
    return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeOptionText(text: string) {
    return text.trim().replace(/^[A-Z]\s*[.)-]\s*/i, '').trim();
}

function parseOptions(text: string): QuestionOption[] {
    return text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => ({
            id: String.fromCharCode(65 + index),
            text: normalizeOptionText(line) || line,
        }));
}

function parseCorrectAnswers(text: string) {
    return text
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.length === 1 ? item.toUpperCase() : item);
}

function cleanHeaderKey(val: any): string {
    return String(val || '')
        .trim()
        .toLowerCase()
        .replace(/[đĐ]/g, 'd')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function downloadExcelTemplate() {
    const headers = [
        'Nội dung câu hỏi',
        'Lựa chọn A',
        'Lựa chọn B',
        'Lựa chọn C',
        'Lựa chọn D',
        'Giải thích',
        'Loại câu hỏi',
        'Thời gian làm',
        'Đáp án đúng',
    ];

    const sampleRows = [
        [
            '1. In her leisure time, Lan often ______ her friends to ask about homework and weekend plans.',
            'messages',
            'folds',
            'balances',
            'trains',
            'message = nhắn tin cho ai.',
            '1 đáp án',
            '1 phút',
            'A',
        ],
        [
            '2. Minh is very ______ on doing DIY projects and often makes things from recycled materials.',
            'cruel',
            'keen',
            'weird',
            'satisfied',
            'be keen on = rất thích, say mê.',
            '1 đáp án',
            '1 phút',
            'B',
        ],
        [
            '3. To make an origami bird, you need to ______ the paper carefully several times.',
            'message',
            'train',
            'fold',
            'prefer',
            'fold = gấp, gập.',
            '1 đáp án',
            '1 phút',
            'C',
        ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
        { wch: 45 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
        { wch: 35 },
        { wch: 18 },
        { wch: 16 },
        { wch: 15 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NganHangCauHoi');
    XLSX.writeFile(wb, 'Mau_cau_hoi_ngan_hang_VAT_LMS.xlsx');
}

function downloadCsvTemplate() {
    const csvContent = '\uFEFF'
        + 'Nội dung câu hỏi,Lựa chọn A,Lựa chọn B,Lựa chọn C,Lựa chọn D,Giải thích,Loại câu hỏi,Thời gian làm,Đáp án đúng\n'
        + '"1. In her leisure time, Lan often ______ her friends to ask about homework and weekend plans.","messages","folds","balances","trains","message = nhắn tin cho ai.","1 đáp án","1 phút","A"\n'
        + '"2. Minh is very ______ on doing DIY projects and often makes things from recycled materials.","cruel","keen","weird","satisfied","be keen on = rất thích, say mê.","1 đáp án","1 phút","B"\n'
        + '"3. To make an origami bird, you need to ______ the paper carefully several times.","message","train","fold","prefer","fold = gấp, gập.","1 đáp án","1 phút","C"\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Mau_cau_hoi_ngan_hang_VAT_LMS.csv';
    link.click();
}

function downloadWordTemplate() {
    const link = document.createElement('a');
    link.href = '/Mau_cau_hoi_ngan_hang_VAT_LMS.docx';
    link.download = 'Mau_cau_hoi_ngan_hang_VAT_LMS.docx';
    link.click();
}

function parseWordText(text: string, defaultChapter: string): ParsedExcelQuestion[] {
    if (!text || !text.trim()) return [];

    const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const questionRegex = /(?:^|\n)(?:PHẦN\s+[^\n]+\n)?(?:\s*)(?:Câu|Bài|Question)\s*(\d+)[\s.:)]+/gi;
    const matches: { index: number; qNum: string }[] = [];
    let m: RegExpExecArray | null;

    while ((m = questionRegex.exec(clean)) !== null) {
        matches.push({ index: m.index, qNum: m[1] });
    }

    const blocks: string[] = [];
    if (matches.length > 0) {
        for (let i = 0; i < matches.length; i++) {
            const start = matches[i].index;
            const end = i + 1 < matches.length ? matches[i + 1].index : clean.length;
            blocks.push(clean.substring(start, end).trim());
        }
    } else {
        blocks.push(...clean.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean));
    }

    const results: ParsedExcelQuestion[] = [];

    blocks.forEach((block, idx) => {
        if (!block || block.length < 5) return;

        const ansMatch = block.match(/(?:^|\n)(?:Đáp\s*án|Đ\/A|Key|Answer)\s*[:：]\s*([^\n]+)/i);
        const timeMatch = block.match(/(?:^|\n)(?:Thời\s*gian\s*(?:làm)?|Thời\s*lượng|Time|Duration)\s*[:：]\s*([^\n]+)/i);
        const guideMatch = block.match(/(?:^|\n)(?:Hướng\s*dẫn\s*(?:giải|chấm)?|Lời\s*giải|Giải\s*thích|Rubric|Explanation)\s*[:：]\s*([\s\S]+)$/i);

        const rawAns = ansMatch ? ansMatch[1].trim() : '';
        const rawTime = timeMatch ? timeMatch[1].trim() : '1 phút';
        const guide = guideMatch ? guideMatch[1].trim() : '';
        const chapter = defaultChapter.trim() || 'Bài tập mới';

        const options: QuestionOption[] = [];
        const textWithoutMeta = block
            .replace(/(?:^|\n)(?:Đáp\s*án|Đ\/A|Key|Answer)\s*[:：][^\n]*/gi, '')
            .replace(/(?:^|\n)(?:Thời\s*gian\s*(?:làm)?|Thời\s*lượng|Time|Duration)\s*[:：][^\n]*/gi, '')
            .replace(/(?:^|\n)(?:Điểm|Point|Points|Thang\s*điểm)\s*[:：][^\n]*/gi, '')
            .replace(/(?:^|\n)(?:Chương|Phân\s*loại|Chapter)\s*[:：][^\n]*/gi, '')
            .replace(/(?:^|\n)(?:Chủ\s*đề|Topic|Bài)\s*[:：][^\n]*/gi, '')
            .replace(/(?:^|\n)(?:Độ\s*khó|Mức\s*độ|Difficulty)\s*[:：][^\n]*/gi, '')
            .replace(/(?:^|\n)(?:Hướng\s*dẫn\s*(?:giải|chấm)?|Lời\s*giải|Giải\s*thích|Rubric|Explanation)\s*[:：][\s\S]*$/gi, '')
            .trim();

        const lines = textWithoutMeta.split('\n').map((l) => l.trim()).filter(Boolean);
        const questionLines: string[] = [];

        for (const line of lines) {
            const optMatch = line.match(/^([A-F])[\s.)\-:]\s*(.+)$/i);
            if (optMatch) {
                options.push({
                    id: optMatch[1].toUpperCase(),
                    text: optMatch[2].trim(),
                });
            } else {
                const multiOpt: RegExpExecArray[] = [];
                const optRegex = new RegExp('([A-F])[\\s.):-]\\s*([^A-F.):\\n-]+)(?=(?:\\s+[A-F][\\s.):-]|$)', 'gi');
                let optMatchMulti: RegExpExecArray | null;
                while ((optMatchMulti = optRegex.exec(line)) !== null) {
                    multiOpt.push(optMatchMulti);
                }
                if (multiOpt.length >= 2) {
                    multiOpt.forEach((mo) => {
                        options.push({
                            id: mo[1].toUpperCase(),
                            text: mo[2].trim(),
                        });
                    });
                } else if (options.length === 0) {
                    questionLines.push(line);
                }
            }
        }

        let questionText = questionLines.join('\n').trim();
        questionText = questionText.replace(/^(?:Câu|Bài|Question)\s*\d+[\s.:)]+\s*/i, '').trim();

        const lowerBlock = block.toLowerCase();
        let qType: QuestionType = 'single_choice';

        const isEssayExplicit = lowerBlock.includes('tự luận') || lowerBlock.includes('essay') || lowerBlock.includes('bài tập tự luận') || lowerBlock.includes('hướng dẫn chấm');
        const isTFExplicit = lowerBlock.includes('đúng / sai') || lowerBlock.includes('đúng sai') || lowerBlock.includes('true / false') || lowerBlock.includes('true/false');
        const isFillExplicit = lowerBlock.includes('điền khuyết') || lowerBlock.includes('fill') || questionText.includes('.....') || questionText.includes('___') || questionText.includes('[...]');

        if (isEssayExplicit && options.length === 0) {
            qType = 'essay';
        } else if (isTFExplicit || (options.length === 2 && options.some((o) => o.text.toLowerCase().includes('đúng') || o.text.toLowerCase().includes('true')))) {
            qType = 'true_false';
            if (options.length === 0) {
                options.push({ id: 'A', text: 'Đúng' });
                options.push({ id: 'B', text: 'Sai' });
            }
        } else if (isFillExplicit && options.length === 0) {
            qType = 'fill_blank';
        } else if (options.length >= 2) {
            const isMultiple = lowerBlock.includes('nhiều đáp án') || lowerBlock.includes('multiple') || rawAns.includes(',') || rawAns.includes(';') || (rawAns.length > 1 && /^[A-F]+$/i.test(rawAns));
            qType = isMultiple ? 'multiple_choice' : 'single_choice';
        } else {
            qType = 'essay';
        }

        let correctAnswers: string[] = [];
        if (qType === 'true_false') {
            const normAns = cleanHeaderKey(rawAns);
            if (normAns.includes('dung') || normAns.includes('true') || normAns === 'a') {
                correctAnswers = ['A'];
            } else if (normAns.includes('sai') || normAns.includes('false') || normAns === 'b') {
                correctAnswers = ['B'];
            } else if (rawAns) {
                correctAnswers = [rawAns];
            }
        } else if (qType === 'single_choice' || qType === 'multiple_choice') {
            correctAnswers = parseCorrectAnswers(rawAns);
        } else {
            correctAnswers = rawAns ? [rawAns] : [];
        }

        let isValid = true;
        let errorMsg = '';
        if (!questionText) {
            isValid = false;
            errorMsg = 'Thiếu nội dung câu hỏi';
        } else if ((qType === 'single_choice' || qType === 'multiple_choice') && options.length < 2) {
            isValid = false;
            errorMsg = 'Cần ít nhất 2 phương án (A, B)';
        } else if (qType !== 'essay' && correctAnswers.length === 0) {
            isValid = false;
            errorMsg = 'Chưa điền đáp án đúng';
        }

        results.push({
            tempId: `word-q-${idx}-${Date.now()}`,
            question_text: questionText,
            type: qType,
            options,
            correct_answers: correctAnswers,
            points: 1,
            duration: rawTime,
            chapter,
            topic: '',
            difficulty: 'medium',
            grading_guide: guide,
            isValid,
            errorMsg,
        });
    });

    return results;
}

function parseExcelBuffer(buffer: ArrayBuffer, defaultChapter: string): ParsedExcelQuestion[] {
    const wb = XLSX.read(buffer, { type: 'array' });
    if (!wb.SheetNames.length) return [];
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const rawData: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, blankrows: false });
    if (!rawData.length) return [];

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, rawData.length); r++) {
        const row = rawData[r];
        if (row && row.some((cell: any) => {
            const key = cleanHeaderKey(cell);
            return key.includes('cauhoi') || key.includes('noidung') || key.includes('question');
        })) {
            headerRowIdx = r;
            break;
        }
    }
    if (headerRowIdx === -1) headerRowIdx = 0;

    const headers = (rawData[headerRowIdx] || []).map(cleanHeaderKey);
    const findColIdx = (keywords: string[]) => {
        return headers.findIndex((h: string) => keywords.some((kw) => {
            if (h === kw) return true;
            if (kw.length > 1) {
                if (kw === 'dapan' && /^dapan[a-f]$/.test(h)) return false;
                return h.includes(kw);
            }
            return false;
        }));
    };

    const qTextIdx = findColIdx(['cauhoi', 'noidung', 'question', 'debai']);
    const optAIdx = findColIdx(['luachona', 'dapana', 'opta', 'a']);
    const optBIdx = findColIdx(['luachonb', 'dapanb', 'optb', 'b']);
    const optCIdx = findColIdx(['luachonc', 'dapanc', 'optc', 'c']);
    const optDIdx = findColIdx(['luachond', 'dapand', 'optd', 'd']);
    const guideIdx = findColIdx(['giaithich', 'huongdan', 'rubric', 'guide', 'explanation']);
    const typeIdx = findColIdx(['loaicauhoi', 'loai', 'type', 'theloai']);
    const timeIdx = findColIdx(['thoigianlam', 'thoigian', 'duration', 'time', 'thoigianlambai']);
    const correctIdx = headers.findIndex((h: string) => {
        if (h === 'dapandung' || h === 'dapan' || h === 'correct' || h === 'answer' || h === 'key' || h === 'traloidung') return true;
        if (h.includes('dapandung') || h.includes('correct') || h.includes('answer') || h.includes('traloidung')) return true;
        return false;
    });

    const results: ParsedExcelQuestion[] = [];

    for (let r = headerRowIdx + 1; r < rawData.length; r++) {
        const row = rawData[r];
        if (!row || !row.length) continue;

        const rawText = qTextIdx >= 0 && row[qTextIdx] !== undefined ? String(row[qTextIdx]).trim() : '';
        if (!rawText) continue;

        const rawType = typeIdx >= 0 && row[typeIdx] !== undefined ? cleanHeaderKey(row[typeIdx]) : '';
        let qType: QuestionType = 'single_choice';
        if (rawType.includes('nhieu') || rawType.includes('multiple')) {
            qType = 'multiple_choice';
        } else if (rawType.includes('dung') || rawType.includes('sai') || rawType.includes('tf') || rawType.includes('true')) {
            qType = 'true_false';
        } else if (rawType.includes('dien') || rawType.includes('khuyet') || rawType.includes('fill')) {
            qType = 'fill_blank';
        } else if (rawType.includes('luan') || rawType.includes('essay')) {
            qType = 'essay';
        }

        const options: QuestionOption[] = [];
        if (qType === 'true_false') {
            options.push({ id: 'A', text: 'Đúng' });
            options.push({ id: 'B', text: 'Sai' });
        } else if (qType !== 'essay' && qType !== 'fill_blank') {
            const rawA = optAIdx >= 0 && row[optAIdx] !== undefined ? String(row[optAIdx]).trim() : '';
            const rawB = optBIdx >= 0 && row[optBIdx] !== undefined ? String(row[optBIdx]).trim() : '';
            const rawC = optCIdx >= 0 && row[optCIdx] !== undefined ? String(row[optCIdx]).trim() : '';
            const rawD = optDIdx >= 0 && row[optDIdx] !== undefined ? String(row[optDIdx]).trim() : '';
            if (rawA) options.push({ id: 'A', text: normalizeOptionText(rawA) });
            if (rawB) options.push({ id: 'B', text: normalizeOptionText(rawB) });
            if (rawC) options.push({ id: 'C', text: normalizeOptionText(rawC) });
            if (rawD) options.push({ id: 'D', text: normalizeOptionText(rawD) });
        }

        const rawAnswers = correctIdx >= 0 && row[correctIdx] !== undefined ? String(row[correctIdx]).trim() : '';
        let correctAnswers: string[] = [];
        if (qType === 'true_false') {
            const normAns = cleanHeaderKey(rawAnswers);
            if (normAns.includes('dung') || normAns.includes('true') || normAns === 'a') {
                correctAnswers = ['A'];
            } else if (normAns.includes('sai') || normAns.includes('false') || normAns === 'b') {
                correctAnswers = ['B'];
            } else {
                correctAnswers = rawAnswers ? [rawAnswers] : [];
            }
        } else if (qType === 'single_choice' || qType === 'multiple_choice') {
            correctAnswers = parseCorrectAnswers(rawAnswers);
        } else {
            correctAnswers = rawAnswers ? [rawAnswers] : [];
        }

        const rawGuide = guideIdx >= 0 && row[guideIdx] !== undefined ? String(row[guideIdx]).trim() : '';
        const rawTime = timeIdx >= 0 && row[timeIdx] !== undefined ? String(row[timeIdx]).trim() : '';
        const chapter = defaultChapter.trim() || 'Bài tập mới';

        let isValid = true;
        let errorMsg = '';
        if (!rawText) {
            isValid = false;
            errorMsg = 'Thiếu nội dung câu hỏi';
        } else if ((qType === 'single_choice' || qType === 'multiple_choice') && options.length < 2) {
            isValid = false;
            errorMsg = 'Cần ít nhất 2 phương án (A, B)';
        } else if (qType !== 'essay' && correctAnswers.length === 0) {
            isValid = false;
            errorMsg = 'Chưa điền đáp án đúng';
        }

        results.push({
            tempId: `excel-row-${r}-${Date.now()}`,
            question_text: rawText,
            type: qType,
            options,
            correct_answers: correctAnswers,
            points: 1,
            duration: rawTime || '1 phút',
            chapter,
            topic: '',
            difficulty: 'medium',
            grading_guide: rawGuide,
            isValid,
            errorMsg,
        });
    }

    return results;
}

function mediaKind(file: File): ExamMedia['type'] {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
}

function readMediaFile(file: File): Promise<ExamMedia> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ type: mediaKind(file), url: String(reader.result || ''), name: file.name });
        reader.onerror = () => reject(reader.error || new Error('Không thể đọc tệp.'));
        reader.readAsDataURL(file);
    });
}

export function QuestionBankPanel({ user, classes, selectedClassId, setSelectedClassId }: QuestionBankPanelProps) {
    const firstClassId = selectedClassId ? String(selectedClassId) : classes[0]?.id ? String(classes[0].id) : '';
    const [questions, setQuestions] = useState<BankQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');
    const [filterClassId, setFilterClassId] = useState(firstClassId || 'all');
    const [filterSubject, setFilterSubject] = useState('all');
    const [filterChapter, setFilterChapter] = useState('all');
    const [formClassId, setFormClassId] = useState(firstClassId);
    const [formSubject, setFormSubject] = useState(classes.find((item) => String(item.id) === firstClassId)?.subject || '');
    const [formChapter, setFormChapter] = useState('');
    const [formTopic, setFormTopic] = useState('');
    const [formType, setFormType] = useState<QuestionType>('single_choice');
    const [questionText, setQuestionText] = useState('');
    const [optionText, setOptionText] = useState('A. \nB. \nC. \nD. ');
    const [answerText, setAnswerText] = useState('');
    const [points, setPoints] = useState('1');
    const [importMedia, setImportMedia] = useState<ExamMedia[]>([]);
    const [examClassId, setExamClassId] = useState(firstClassId);
    const [examTitle, setExamTitle] = useState('');
    const [examQuestionCount, setExamQuestionCount] = useState('10');
    const [examDuration, setExamDuration] = useState('45');
    const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('same');
    const [shuffleQuestions, setShuffleQuestions] = useState(true);
    const [randomPoolOpen, setRandomPoolOpen] = useState(false);
    const [manualCreateOpen, setManualCreateOpen] = useState(false);
    const [inputMode, setInputMode] = useState<'manual' | 'excel' | 'fixed_cluster'>('manual');
    const [importExcelFile, setImportExcelFile] = useState<File | null>(null);
    const [parsedQuestions, setParsedQuestions] = useState<ParsedExcelQuestion[]>([]);
    const [parsingExcel, setParsingExcel] = useState(false);
    const [previewTypeFilter, setPreviewTypeFilter] = useState<'all' | QuestionType>('all');
    const [exerciseTitle, setExerciseTitle] = useState('');
    const [batchMode, setBatchMode] = useState<'by_chapter' | 'split_count' | 'single'>('by_chapter');
    const [batchSplitSize, setBatchSplitSize] = useState('10');
    const [batchPrefix, setBatchPrefix] = useState('Bài tập cố định');
    const [batchDuration, setBatchDuration] = useState('45');
    const [libraryExams, setLibraryExams] = useState<OnlineExam[]>([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [assignModalExam, setAssignModalExam] = useState<OnlineExam | null>(null);
    const [assignClassId, setAssignClassId] = useState(firstClassId);
    const [assignTitle, setAssignTitle] = useState('');
    const [assignStartTime, setAssignStartTime] = useState('');
    const [assignDueTime, setAssignDueTime] = useState('');
    const [assignDuration, setAssignDuration] = useState('45');
    const [assigning, setAssigning] = useState(false);
    const [previewExamDetail, setPreviewExamDetail] = useState<{ exam: OnlineExam; questions: BankQuestion[] } | null>(null);

    const headers = useMemo(() => ({ 'Content-Type': 'application/json', 'x-user-id': String(user.id) }), [user.id]);
    const selectedFormClass = classes.find((item) => String(item.id) === formClassId);
    const selectedExamClass = classes.find((item) => String(item.id) === examClassId);

    const loadQuestions = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/question-bank`, { headers });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Không thể tải ngân hàng câu hỏi.');
            setQuestions(data.questions ?? []);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Không thể tải ngân hàng câu hỏi.');
        } finally {
            setLoading(false);
        }
    };

    const loadLibraryExams = async () => {
        setLoadingLibrary(true);
        try {
            const res = await fetch(`${API_URL}/api/online-exams/library`, { headers });
            const data = await res.json();
            if (res.ok) {
                setLibraryExams(data.exams ?? []);
            }
        } catch {
            // ignore
        } finally {
            setLoadingLibrary(false);
        }
    };

    useEffect(() => {
        void loadQuestions();
        void loadLibraryExams();
    }, [headers]);

    useEffect(() => {
        if (selectedClassId) {
            const nextId = String(selectedClassId);
            setFilterClassId(nextId);
            setFormClassId(nextId);
            setExamClassId(nextId);
            const subject = classes.find((item) => item.id === selectedClassId)?.subject;
            if (subject) setFormSubject(subject);
        } else if (!formClassId && classes[0]?.id) {
            const nextId = String(classes[0].id);
            setFormClassId(nextId);
            setExamClassId(nextId);
            if (classes[0].subject) setFormSubject(classes[0].subject);
        }
    }, [classes, formClassId, selectedClassId]);

    const classFilteredQuestions = useMemo(() => questions.filter((question) => {
        if (filterClassId === 'all') return true;
        return getQuestionClassId(question) === Number(filterClassId);
    }), [filterClassId, questions]);

    const subjectOptions = useMemo(() => Array.from(new Set([
        ...classes.map((item) => item.subject).filter(Boolean),
        ...classFilteredQuestions.map((question) => question.subject || question.class_subject || '').filter(Boolean),
    ])).sort((a, b) => a.localeCompare(b, 'vi')), [classFilteredQuestions, classes]);

    const subjectFilteredQuestions = useMemo(() => classFilteredQuestions.filter((question) => {
        if (filterSubject === 'all') return true;
        return String(question.subject || question.class_subject || '').trim() === filterSubject;
    }), [classFilteredQuestions, filterSubject]);

    const chapterOptions = useMemo(() => Array.from(new Set(subjectFilteredQuestions.map(getQuestionChapter))).sort((a, b) => a.localeCompare(b, 'vi')), [subjectFilteredQuestions]);

    const filteredQuestions = useMemo(() => subjectFilteredQuestions.filter((question) => {
        if (filterChapter === 'all') return true;
        return getQuestionChapter(question) === filterChapter;
    }), [filterChapter, subjectFilteredQuestions]);

    const sortQuestionsNaturally = useCallback(<T extends { question_text: string; id?: number }>(list: T[]): T[] => {
        return [...list].sort((a, b) => {
            const numA = parseInt(a.question_text.match(/^\s*(?:Câu|Bài|Question\s*)?(\d+)/i)?.[1] || '');
            const numB = parseInt(b.question_text.match(/^\s*(?:Câu|Bài|Question\s*)?(\d+)/i)?.[1] || '');
            if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
            return (a.id || 0) - (b.id || 0);
        });
    }, []);

    const groupedQuestions = useMemo(() => {
        const map = new Map<string, BankQuestion[]>();
        filteredQuestions.forEach((question) => {
            const chapter = getQuestionChapter(question);
            map.set(chapter, [...(map.get(chapter) ?? []), question]);
        });
        return Array.from(map.entries())
            .map(([chapter, items]) => [chapter, sortQuestionsNaturally(items)] as [string, BankQuestion[]])
            .sort(([a], [b]) => a.localeCompare(b, 'vi'));
    }, [filteredQuestions, sortQuestionsNaturally]);

    const handleFilterClassChange = (value: string) => {
        setFilterClassId(value);
        setFilterChapter('all');
        if (value !== 'all') {
            setSelectedClassId?.(Number(value));
            setExamClassId(value);
        }
    };

    const handleFormClassChange = (value: string) => {
        setFormClassId(value);
        const classSubject = classes.find((item) => String(item.id) === value)?.subject;
        if (classSubject) setFormSubject(classSubject);
    };

    const handleQuestionFiles = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (!files.length) return;
        try {
            const invalid = files.find((file) => file.size > 8 * 1024 * 1024);
            if (invalid) throw new Error(`Tệp "${invalid.name}" vượt quá giới hạn 8MB.`);
            const media = await Promise.all(files.map(readMediaFile));
            setImportMedia((previous) => [...previous, ...media]);
            if (!questionText.trim() && media.length) setQuestionText(`Đề nhập từ file: ${media.map((item) => item.name).filter(Boolean).join(', ')}`);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Không thể đọc tệp đề.');
        }
    };

    const createQuestion = async () => {
        const classId = Number(formClassId);
        const subject = formSubject.trim();
        const chapter = formChapter.trim();
        const text = questionText.trim() || (importMedia.length ? `Đề nhập từ file: ${importMedia.map((item) => item.name).filter(Boolean).join(', ')}` : '');

        if (!classId) {
            setNotice('Vui lòng chọn lớp cho câu hỏi.');
            return;
        }
        if (!subject) {
            setNotice('Vui lòng nhập môn học.');
            return;
        }
        if (!chapter) {
            setNotice('Vui lòng nhập chương/phân loại.');
            return;
        }
        if (!text) {
            setNotice('Vui lòng nhập nội dung câu hỏi hoặc tải file Word/PDF/hình ảnh.');
            return;
        }

        const options = formType === 'essay' ? [] : parseOptions(optionText);
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/api/question-bank`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    class_id: classId,
                    subject,
                    chapter,
                    grade_level: chapter,
                    topic: formTopic.trim() || null,
                    difficulty: 'medium',
                    type: formType,
                    question_text: text,
                    options,
                    correct_answers: formType === 'essay' ? [] : parseCorrectAnswers(answerText),
                    points: Number(points) || 1,
                    grading_guide: formType === 'essay' ? answerText.trim() || null : null,
                    tags: ['question-bank'],
                    media: importMedia,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Không thể thêm câu hỏi.');
            setQuestions((previous) => [data.question, ...previous]);
            setFilterClassId(String(classId));
            setFilterSubject(subject);
            setFilterChapter(chapter);
            setQuestionText('');
            setOptionText('A. \nB. \nC. \nD. ');
            setAnswerText('');
            setPoints('1');
            setImportMedia([]);
            setNotice('Đã thêm câu hỏi vào ngân hàng.');
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Không thể thêm câu hỏi.');
        } finally {
            setSaving(false);
        }
    };

    const handleExcelFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const rawFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
        const suggestedTitle = rawFileName ? rawFileName.charAt(0).toUpperCase() + rawFileName.slice(1) : 'Bài tập mới';
        setExerciseTitle(suggestedTitle);
        setExamTitle(suggestedTitle);

        setImportExcelFile(file);
        setParsingExcel(true);
        setNotice('');
        try {
            const ext = file.name.split('.').pop()?.toLowerCase();
            let parsed: ParsedExcelQuestion[] = [];

            if (ext === 'docx') {
                const buffer = await file.arrayBuffer();
                const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
                parsed = parseWordText(value, suggestedTitle);
            } else {
                const buffer = await file.arrayBuffer();
                parsed = parseExcelBuffer(buffer, suggestedTitle);
            }

            setParsedQuestions(parsed);
            if (parsed.length === 0) {
                setNotice(`Không tìm thấy câu hỏi nào trong tệp "${file.name}". Vui lòng kiểm tra định dạng hoặc tải file mẫu Word/Excel.`);
            } else {
                const validCount = parsed.filter((q) => q.isValid).length;
                const typeSummary = [
                    { label: '1 đáp án', count: parsed.filter((q) => q.type === 'single_choice').length },
                    { label: 'Nhiều đáp án', count: parsed.filter((q) => q.type === 'multiple_choice').length },
                    { label: 'Đúng/Sai', count: parsed.filter((q) => q.type === 'true_false').length },
                    { label: 'Điền khuyết', count: parsed.filter((q) => q.type === 'fill_blank').length },
                    { label: 'Tự luận', count: parsed.filter((q) => q.type === 'essay').length },
                ].filter((item) => item.count > 0).map((item) => `${item.label}: ${item.count}`).join(' • ');

                setNotice(`Đã trích xuất ${parsed.length} câu hỏi từ tệp "${file.name}" (${validCount} hợp lệ). Phân loại: [${typeSummary}]. Giáo viên vui lòng đặt tên bài tập bên dưới và lưu vào hệ thống.`);
            }
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Không thể đọc tệp Word/Excel/CSV.');
            setParsedQuestions([]);
        } finally {
            setParsingExcel(false);
        }
    };

    const handleBulkImport = async () => {
        const classId = Number(formClassId);
        const subject = formSubject.trim();
        const validQuestions = parsedQuestions.filter((q) => q.isValid);
        const finalChapter = exerciseTitle.trim() || formChapter.trim() || 'Bài tập mới';

        if (!classId) {
            setNotice('Vui lòng chọn lớp để nhập câu hỏi.');
            return;
        }
        if (!subject) {
            setNotice('Vui lòng nhập môn học cho các câu hỏi.');
            return;
        }
        if (!finalChapter) {
            setNotice('Vui lòng nhập tên bài tập.');
            return;
        }
        if (validQuestions.length === 0) {
            setNotice('Không có câu hỏi hợp lệ nào để nhập. Vui lòng kiểm tra lại dữ liệu trong file.');
            return;
        }

        setSaving(true);
        try {
            // Tự động tính điểm chia đều cho các câu trên thang 10
            const pointPerQuestion = validQuestions.length > 0 ? Number((10 / validQuestions.length).toFixed(2)) : 1;

            const response = await fetch(`${API_URL}/api/question-bank/bulk`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    class_id: classId,
                    subject,
                    chapter: finalChapter,
                    questions: validQuestions.map((q) => ({
                        question_text: q.question_text,
                        type: q.type,
                        options: q.options,
                        correct_answers: q.correct_answers,
                        points: pointPerQuestion,
                        chapter: finalChapter,
                        topic: null,
                        difficulty: 'medium',
                        grading_guide: q.grading_guide || null,
                        tags: ['excel-import', 'question-bank', `exercise:${finalChapter}`],
                    })),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Không thể lưu câu hỏi hàng loạt.');

            if (Array.isArray(data.questions)) {
                setQuestions((previous) => [...data.questions, ...previous]);
            } else {
                void loadQuestions();
            }

            setFilterClassId(String(classId));
            setFilterSubject(subject);
            setFilterChapter(finalChapter);
            setNotice(`🎉 Đã nhập thành công ${validQuestions.length} câu hỏi vào bài tập "${finalChapter}"! Điểm được tự động tính trên thang 10.`);
            setParsedQuestions([]);
            setImportExcelFile(null);
            setExerciseTitle('');
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Không thể lưu câu hỏi hàng loạt.');
        } finally {
            setSaving(false);
        }
    };

    const createExamFromBank = async () => {
        const classId = Number(examClassId || filterClassId);
        if (!classId) {
            setNotice('Vui lòng chọn lớp nhận bài kiểm tra.');
            return;
        }
        if (!filteredQuestions.length) {
            setNotice('Bộ lọc hiện tại chưa có câu hỏi để tạo bài kiểm tra.');
            return;
        }

        const randomCount = Math.min(filteredQuestions.length, Math.max(1, Number(examQuestionCount) || 1));
        const subject = filterSubject !== 'all' ? filterSubject : selectedExamClass?.subject || filteredQuestions[0]?.subject || 'Chung';
        const chapter = filterChapter !== 'all' ? filterChapter : 'nhiều chương';
        const finalTitle = examTitle.trim() || `Bài kiểm tra ${subject} - ${chapter}`;
        // Điểm mỗi câu được tự động tính trên thang điểm 10
        const pointPerQuestion = randomCount > 0 ? Number((10 / randomCount).toFixed(2)) : 1;
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/api/online-exams`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: finalTitle,
                    subject,
                    class_id: classId,
                    description: `Tạo từ ngân hàng câu hỏi: ${filteredQuestions.length} câu nguồn, mỗi học viên nhận ${randomCount} câu. Điểm tự động tính trên thang 10.`,
                    duration_minutes: Number(examDuration) || 45,
                    show_answers_after_submit: true,
                    show_score_after_submit: true,
                    max_attempts: 1,
                    shuffle_questions: shuffleQuestions,
                    shuffle_options: shuffleQuestions,
                    display_mode: 'one',
                    auto_submit: true,
                    status: 'published',
                    random_question_count: randomCount,
                    question_delivery_mode: deliveryMode,
                    gradebook_name: 'Bảng điểm',
                    grade_column_name: finalTitle,
                    questions: filteredQuestions.map((question) => ({
                        class_id: classId,
                        subject: question.subject || subject,
                        chapter: question.chapter || question.grade_level || chapter,
                        topic: question.topic || null,
                        difficulty: question.difficulty || 'medium',
                        type: question.type || 'single_choice',
                        question_text: question.question_text,
                        options: Array.isArray(question.options) ? question.options : [],
                        correct_answers: Array.isArray(question.correct_answers) ? question.correct_answers : [],
                        points: pointPerQuestion,
                        grading_guide: question.grading_guide || null,
                        tags: question.tags || ['question-bank'],
                        media: Array.isArray(question.media) ? question.media : [],
                    })),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Không thể tạo bài kiểm tra từ ngân hàng.');
            setExamTitle('');
            setNotice(`Đã tạo bài kiểm tra "${finalTitle}" (${randomCount} câu; điểm tự động tính thang 10).`);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Không thể tạo bài kiểm tra từ ngân hàng.');
        } finally {
            setSaving(false);
        }
    };

    const calculatedBatchItems = useMemo(() => {
        if (!filteredQuestions.length) return [];
        const subject = filterSubject !== 'all' ? filterSubject : selectedExamClass?.subject || filteredQuestions[0]?.subject || 'Chung';
        const duration = Number(batchDuration) || 45;
        const prefix = batchPrefix.trim() || 'Bài tập cố định';

        if (batchMode === 'by_chapter') {
            const map = new Map<string, BankQuestion[]>();
            filteredQuestions.forEach((q) => {
                const ch = getQuestionChapter(q);
                map.set(ch, [...(map.get(ch) ?? []), q]);
            });
            return Array.from(map.entries()).map(([ch, qList]) => ({
                title: `${prefix}: ${ch}`,
                subject,
                duration_minutes: duration,
                description: `Tạo từ ngân hàng câu hỏi phân loại "${ch}" (${qList.length} câu cố định). Điểm tự động tính thang 10.`,
                questions: qList,
            }));
        } else if (batchMode === 'split_count') {
            const size = Math.max(1, Number(batchSplitSize) || 10);
            const items = [];
            for (let i = 0; i < filteredQuestions.length; i += size) {
                const chunk = filteredQuestions.slice(i, i + size);
                const partIdx = Math.floor(i / size) + 1;
                items.push({
                    title: `${prefix} - Bài ${partIdx} (${chunk.length} câu)`,
                    subject,
                    duration_minutes: duration,
                    description: `Bộ bài tập cố định phần ${partIdx} từ câu ${i + 1} đến ${i + chunk.length}. Điểm tự động tính thang 10.`,
                    questions: chunk,
                });
            }
            return items;
        } else {
            return [{
                title: `${prefix} - ${subject} (${filteredQuestions.length} câu)`,
                subject,
                duration_minutes: duration,
                description: `Toàn bộ ${filteredQuestions.length} câu hỏi cố định từ ngân hàng. Điểm tự động tính thang 10.`,
                questions: filteredQuestions,
            }];
        }
    }, [filteredQuestions, filterSubject, selectedExamClass, batchDuration, batchPrefix, batchMode, batchSplitSize]);

    const handleBatchCreateLibraryExams = async () => {
        if (!calculatedBatchItems.length) {
            setNotice('Không có câu hỏi nào trong bộ lọc để tạo cụm bài tập.');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/online-exams/batch-library`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ items: calculatedBatchItems }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Không thể tạo cụm bài tập vào thư viện.');
            setNotice(data.message || `Đã tạo thành công cụm ${calculatedBatchItems.length} bài tập cố định vào Thư viện!`);
            void loadLibraryExams();
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Có lỗi khi tạo cụm bài tập.');
        } finally {
            setSaving(false);
        }
    };

    const handleAssignLibraryExam = async () => {
        if (!assignModalExam) return;
        const targetClassId = Number(assignClassId);
        if (!targetClassId) {
            setNotice('Vui lòng chọn lớp học để giao bài.');
            return;
        }
        setAssigning(true);
        try {
            const res = await fetch(`${API_URL}/api/online-exams/${assignModalExam.id}/assign-class`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    class_id: targetClassId,
                    title: assignTitle.trim() || assignModalExam.title,
                    start_time: assignStartTime || null,
                    end_time: assignDueTime || null,
                    duration_minutes: Number(assignDuration) || assignModalExam.duration_minutes || 45,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Không thể giao bài tập cho lớp.');
            const targetClassName = classes.find((c) => c.id === targetClassId)?.name || `Lớp ${targetClassId}`;
            setNotice(`Đã giao bài "${assignTitle.trim() || assignModalExam.title}" cho lớp ${targetClassName} thành công! Học viên lớp này có thể vào làm bài ngay.`);
            setAssignModalExam(null);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Có lỗi khi giao bài tập cho lớp.');
        } finally {
            setAssigning(false);
        }
    };

    const handleDeleteLibraryExam = async (examId: number, title: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa bài tập "${title}" khỏi Thư viện không?`)) return;
        try {
            const res = await fetch(`${API_URL}/api/online-exams/${examId}`, { method: 'DELETE', headers });
            if (res.ok) {
                setNotice(`Đã xóa bài tập "${title}" khỏi Thư viện.`);
                setLibraryExams((prev) => prev.filter((item) => item.id !== examId));
            }
        } catch {
            setNotice('Không thể xóa bài tập khỏi thư viện.');
        }
    };

    const handleViewExamDetail = async (exam: OnlineExam) => {
        try {
            const res = await fetch(`${API_URL}/api/online-exams/${exam.id}`, { headers });
            const data = await res.json();
            if (res.ok && data.exam) {
                setPreviewExamDetail({ exam: data.exam, questions: data.questions ?? [] });
            }
        } catch {
            setNotice('Không thể xem chi tiết bài tập.');
        }
    };

    const exportQuestionsToExcel = () => {
        if (!filteredQuestions.length) {
            setNotice('Không có câu hỏi trong bộ lọc để xuất file.');
            return;
        }
        const headers = [
            'Nội dung câu hỏi',
            'Lựa chọn A',
            'Lựa chọn B',
            'Lựa chọn C',
            'Lựa chọn D',
            'Giải thích',
            'Loại câu hỏi',
            'Thời gian làm',
            'Đáp án đúng',
        ];
        const sorted = sortQuestionsNaturally(filteredQuestions);
        const rows = sorted.map((q) => {
            const optMap: Record<string, string> = {};
            (q.options || []).forEach((opt) => {
                optMap[opt.id.toUpperCase()] = opt.text;
            });
            return [
                q.question_text,
                optMap['A'] || '',
                optMap['B'] || '',
                optMap['C'] || '',
                optMap['D'] || '',
                q.grading_guide || '',
                typeLabels[q.type] || q.type,
                '1 phút',
                (q.correct_answers || []).join(', '),
            ];
        });
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = [
            { wch: 45 },
            { wch: 22 },
            { wch: 22 },
            { wch: 22 },
            { wch: 22 },
            { wch: 35 },
            { wch: 18 },
            { wch: 16 },
            { wch: 15 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'NganHangCauHoi');
        const filename = `NganHangCauHoi_${filterSubject !== 'all' ? filterSubject : 'TatCa'}_${Date.now()}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    const handleDeleteQuestion = async (id: number) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng?')) return;
        try {
            const res = await fetch(`${API_URL}/api/question-bank/${id}`, { method: 'DELETE', headers });
            if (!res.ok) throw new Error('Không thể xóa câu hỏi');
            setQuestions((prev) => prev.filter((q) => q.id !== id));
            setNotice('Đã xóa câu hỏi khỏi ngân hàng thành công.');
        } catch (e) {
            setNotice(e instanceof Error ? e.message : 'Lỗi xóa câu hỏi');
        }
    };

    const handleDeduplicate = async (chapter?: string) => {
        if (!window.confirm('Hệ thống sẽ giữ lại 1 bản ghi duy nhất cho mỗi câu hỏi và tự động dọn dẹp các câu bị trùng lặp. Bạn có muốn tiếp tục?')) return;
        try {
            const res = await fetch(`${API_URL}/api/question-bank/deduplicate`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    class_id: filterClassId !== 'all' ? Number(filterClassId) : undefined,
                    chapter: chapter || (filterChapter !== 'all' ? filterChapter : undefined),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Không thể dọn dẹp câu trùng');
            setNotice(data.message || 'Đã dọn dẹp câu hỏi trùng lặp thành công.');
            void loadQuestions();
        } catch (e) {
            setNotice(e instanceof Error ? e.message : 'Lỗi dọn dẹp');
        }
    };

    const handleDeleteChapter = async (chapter: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ câu hỏi trong bài tập "${chapter}"?`)) return;
        try {
            const queryParams = filterClassId !== 'all' ? `?class_id=${filterClassId}` : '';
            const res = await fetch(`${API_URL}/api/question-bank/chapter/${encodeURIComponent(chapter)}${queryParams}`, {
                method: 'DELETE',
                headers,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Không thể xóa bài tập');
            setNotice(data.message || 'Đã xóa toàn bộ câu hỏi trong bài tập.');
            void loadQuestions();
        } catch (e) {
            setNotice(e instanceof Error ? e.message : 'Lỗi xóa bài tập');
        }
    };



    return (
        <Panel title="Ngân hàng câu hỏi" noPadding>
            <div className="grid gap-5 p-5 sm:p-6">
                {notice && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">{notice}</div>}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <QuestionBankMetric icon={BookIcon} label="Tổng câu" value={questions.length} />
                    <QuestionBankMetric icon={FileIcon} label="Trong bộ lọc" value={filteredQuestions.length} />
                    <QuestionBankMetric icon={UploadIcon} label="Chương" value={chapterOptions.length} />
                    <QuestionBankMetric icon={CheckCircleIcon} label="Lớp đang lọc" value={filterClassId === 'all' ? classes.length : 1} />
                </div>

                <section className="grid gap-3 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 lg:grid-cols-3">
                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                        Lọc theo lớp
                        <select value={filterClassId} onChange={(event) => handleFilterClassChange(event.target.value)} className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]">
                            <option value="all">Tất cả lớp</option>
                            {classes.map((item) => <option key={item.id} value={item.id}>{item.name} • {item.subject}</option>)}
                        </select>
                    </label>
                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                        Lọc theo môn
                        <select value={filterSubject} onChange={(event) => { setFilterSubject(event.target.value); setFilterChapter('all'); }} className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]">
                            <option value="all">Tất cả môn</option>
                            {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                        </select>
                    </label>
                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                        Lọc theo chương
                        <select value={filterChapter} onChange={(event) => setFilterChapter(event.target.value)} className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]">
                            <option value="all">Tất cả chương</option>
                            {chapterOptions.map((chapter) => <option key={chapter} value={chapter}>{chapter}</option>)}
                        </select>
                    </label>
                </section>

                <div className="grid gap-5">
                    <section className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] p-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">
                                    {inputMode === 'fixed_cluster' ? 'Tạo cụm bài tập cố định' : 'Tạo câu hỏi'}
                                </p>
                                <h3 className="mt-0.5 text-lg font-black text-[var(--color-text)]">
                                    {inputMode === 'manual'
                                        ? 'Nhập tay hoặc đính kèm tệp'
                                        : inputMode === 'excel'
                                        ? 'Nhập hàng loạt từ Word / Excel / CSV'
                                        : 'Tạo cụm bài cố định (Lưu vào Thư viện)'}
                                </h3>
                            </div>
                            <div className="flex flex-wrap rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-1">
                                <button
                                    type="button"
                                    onClick={() => setInputMode('manual')}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${inputMode === 'manual' ? 'bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}
                                >
                                    ✏️ Nhập thủ công
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputMode('excel')}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${inputMode === 'excel' ? 'bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}
                                >
                                    📄 Tải file Word / Excel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputMode('fixed_cluster')}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${inputMode === 'fixed_cluster' ? 'bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}
                                >
                                    📦 Tạo cụm bài cố định
                                </button>
                            </div>
                        </div>

                        {inputMode === 'manual' && (
                            <div className="p-3 sm:p-4">
                                <button
                                    type="button"
                                    onClick={() => setManualCreateOpen((prev) => !prev)}
                                    className="flex w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl bg-gradient-to-b from-[#be5144] via-[#9f3a2d] to-[#802b20] hover:from-[#cb5b4e] hover:via-[#ac4234] hover:to-[#8d3226] py-3 px-4 text-white font-black shadow-[0_8px_20px_-4px_rgba(159,58,45,0.45),0_3px_6px_-2px_rgba(128,43,32,0.3)] border-t border-[#fca5a5]/30 border-b-4 border-[#5f1e16] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-4px_rgba(159,58,45,0.55)] active:translate-y-0.5 active:border-b-2 active:shadow-md"
                                >
                                    <span className="text-sm font-black tracking-wide drop-shadow-sm">
                                        {manualCreateOpen ? 'Thu gọn' : 'Bắt đầu soạn'}
                                    </span>
                                    <span className={`text-xs font-black transition-transform duration-200 drop-shadow-sm ${manualCreateOpen ? 'rotate-180' : ''}`}>
                                        ▼
                                    </span>
                                </button>
                            </div>
                        )}

                        {inputMode === 'manual' ? (
                            manualCreateOpen ? (
                                <div className="grid gap-4 p-4 border-t border-[var(--color-border)]">
                                <div className="grid gap-3 lg:grid-cols-2">
                                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                        Lớp
                                        <select value={formClassId} onChange={(event) => handleFormClassChange(event.target.value)} className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]">
                                            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                        Môn
                                        <input value={formSubject} onChange={(event) => setFormSubject(event.target.value)} placeholder={selectedFormClass?.subject || 'Môn học'} className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" />
                                    </label>
                                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                        Chương / phân loại
                                        <input value={formChapter} onChange={(event) => setFormChapter(event.target.value)} placeholder="Ví dụ: Chương 1" className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" />
                                    </label>
                                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                        Chủ đề nhỏ
                                        <input value={formTopic} onChange={(event) => setFormTopic(event.target.value)} placeholder="Unit / lesson" className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" />
                                    </label>
                                </div>
                                <div className="grid gap-3 lg:grid-cols-[220px_120px]">
                                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                        Loại câu
                                        <select value={formType} onChange={(event) => setFormType(event.target.value as QuestionType)} className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]">
                                            {questionTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                                        </select>
                                    </label>
                                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                        Điểm
                                        <input type="number" min="0" step="0.25" value={points} onChange={(event) => setPoints(event.target.value)} className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" />
                                    </label>
                                </div>
                                <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                    Nội dung câu hỏi
                                    <textarea value={questionText} onChange={(event) => setQuestionText(event.target.value)} rows={4} placeholder="Nhập đề hoặc tải file bên dưới" className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-3 text-sm font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" />
                                </label>
                                {formType !== 'essay' && (
                                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                        Đáp án lựa chọn (mỗi dòng 1 đáp án)
                                        <textarea value={optionText} onChange={(event) => setOptionText(event.target.value)} rows={4} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-3 text-sm font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" />
                                    </label>
                                )}
                                <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                    {formType === 'essay' ? 'Hướng dẫn chấm / đáp án mẫu' : 'Đáp án đúng (A, B hoặc nhiều dòng)'}
                                    <textarea value={answerText} onChange={(event) => setAnswerText(event.target.value)} rows={3} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-3 text-sm font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" />
                                </label>
                                <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]">
                                    <UploadIcon size={18} />
                                    <span>Nhập đề bằng Word/PDF/hình ảnh</span>
                                    <input type="file" multiple accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/*" onChange={handleQuestionFiles} className="hidden" />
                                </label>
                                {importMedia.length > 0 && (
                                    <div className="grid gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3">
                                        {importMedia.map((media, index) => (
                                            <div key={`${media.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-card)] px-3 py-2 text-xs font-black text-[var(--color-text-secondary)]">
                                                <span className="truncate">{media.name || 'Tệp đề'} • {media.type}</span>
                                                <button type="button" onClick={() => setImportMedia((previous) => previous.filter((_, mediaIndex) => mediaIndex !== index))} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] transition hover:bg-red-50 hover:text-red-600">×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <PrimaryButton type="button" onClick={createQuestion} disabled={saving} className="min-h-11 rounded-2xl text-sm font-black">
                                    {saving ? 'Đang lưu...' : 'Thêm vào ngân hàng'}
                                </PrimaryButton>
                            </div>
                        ) : null) : inputMode === 'excel' ? (
                            <div className="grid gap-4 p-4">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                        Lớp tiếp nhận
                                        <select value={formClassId} onChange={(event) => handleFormClassChange(event.target.value)} className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]">
                                            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                        Môn học
                                        <input value={formSubject} onChange={(event) => setFormSubject(event.target.value)} placeholder={selectedFormClass?.subject || 'Môn học'} className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" />
                                    </label>
                                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                        Tên bài tập / Phân loại
                                        <input value={exerciseTitle || formChapter} onChange={(event) => { setExerciseTitle(event.target.value); setFormChapter(event.target.value); }} placeholder="Ví dụ: Bài tập trắc nghiệm Unit 1" className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" />
                                    </label>
                                </div>

                                <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="max-w-md">
                                            <p className="text-xs font-black text-blue-900 dark:text-blue-200">Tải file mẫu để nhập câu hỏi tự động</p>
                                            <p className="mt-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                                                Hệ thống tự nhận diện 5 loại câu hỏi: Trắc nghiệm 1 đáp án, nhiều đáp án, đúng/sai, điền khuyết, tự luận.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={downloadWordTemplate}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-blue-700"
                                            >
                                                📘 Tải file mẫu Word (.docx)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={downloadExcelTemplate}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700"
                                            >
                                                📥 Tải file mẫu Excel (.xlsx)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={downloadCsvTemplate}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-black text-blue-700 shadow-sm transition hover:bg-blue-50 dark:border-blue-800 dark:bg-gray-800 dark:text-blue-300"
                                            >
                                                📄 Tải file mẫu CSV
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <label className="relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] p-5 text-center transition hover:border-[var(--color-primary)] hover:bg-[var(--color-card)]">
                                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                                        <UploadIcon size={22} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-black text-[var(--color-text)]">
                                            {importExcelFile ? `Đã chọn: ${importExcelFile.name}` : 'Nhấn để chọn tệp hoặc kéo thả file Word (.docx) hoặc Excel (.xlsx, .csv) vào đây'}
                                        </span>
                                        <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-muted)]">
                                            Hỗ trợ tự động bóc tách đề thi từ Word (.docx), Excel (.xlsx, .xls) và CSV (tối đa 15MB)
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        accept=".docx,.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                                        onChange={handleExcelFileInput}
                                        className="hidden"
                                    />
                                </label>

                                {parsingExcel && (
                                    <div className="flex items-center justify-center gap-3 py-4 text-sm font-bold text-[var(--color-text-secondary)]">
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
                                        <span>Đang đọc và phân tích cấu trúc đề thi...</span>
                                    </div>
                                )}

                                {parsedQuestions.length > 0 && (
                                    <div className="grid gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                                        {/* TÊN BÀI TẬP VÀ QUY TẮC TÍNH ĐIỂM */}
                                        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-blue-900 dark:text-blue-200">
                                                        <span>📝 Tên bài tập (Giáo viên tự đặt tên)</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={exerciseTitle}
                                                        onChange={(e) => setExerciseTitle(e.target.value)}
                                                        placeholder="Nhập tên bài tập..."
                                                        className="mt-1 w-full rounded-xl border border-blue-300 bg-white px-3.5 py-2 text-sm font-black text-gray-900 shadow-xs outline-none focus:border-blue-600 dark:border-blue-800 dark:bg-gray-900 dark:text-white"
                                                    />
                                                    <p className="mt-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                                                        Tên bài tập sẽ được lưu vào hệ thống và hiển thị cho học sinh khi làm bài.
                                                    </p>
                                                </div>
                                                <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-left md:text-right dark:border-emerald-800 dark:bg-emerald-950/40">
                                                    <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300">⚡ Tự động tính điểm</span>
                                                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-200">
                                                        (Số câu đúng / {parsedQuestions.length}) × 10
                                                    </p>
                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Làm tròn lên hàng chục</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-black text-[var(--color-text)]">
                                                    Xem trước ({parsedQuestions.length} câu)
                                                </span>
                                                <Badge tone={parsedQuestions.every((q) => q.isValid) ? 'success' : 'warning'}>
                                                    {parsedQuestions.filter((q) => q.isValid).length} hợp lệ
                                                </Badge>
                                                {parsedQuestions.some((q) => !q.isValid) && (
                                                    <Badge tone="danger">
                                                        {parsedQuestions.filter((q) => !q.isValid).length} chưa hoàn thiện
                                                    </Badge>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setParsedQuestions([]); setImportExcelFile(null); setExerciseTitle(''); }}
                                                className="text-xs font-bold text-red-600 hover:underline"
                                            >
                                                Xóa danh sách tải lên
                                            </button>
                                        </div>

                                        {/* TYPE FILTER PILLS */}
                                        <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--color-border)]/60 pt-2">
                                            <span className="mr-1 text-xs font-black text-[var(--color-text-secondary)]">Lọc theo dạng:</span>
                                            {[
                                                { id: 'all', label: `Tất cả (${parsedQuestions.length})` },
                                                { id: 'single_choice', label: `1 đáp án (${parsedQuestions.filter((q) => q.type === 'single_choice').length})` },
                                                { id: 'multiple_choice', label: `Nhiều đáp án (${parsedQuestions.filter((q) => q.type === 'multiple_choice').length})` },
                                                { id: 'true_false', label: `Đúng/Sai (${parsedQuestions.filter((q) => q.type === 'true_false').length})` },
                                                { id: 'fill_blank', label: `Điền khuyết (${parsedQuestions.filter((q) => q.type === 'fill_blank').length})` },
                                                { id: 'essay', label: `Tự luận (${parsedQuestions.filter((q) => q.type === 'essay').length})` },
                                            ].map((tab) => (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    onClick={() => setPreviewTypeFilter(tab.id as any)}
                                                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${previewTypeFilter === tab.id ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}
                                                >
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                                            {parsedQuestions
                                                .filter((q) => previewTypeFilter === 'all' || q.type === previewTypeFilter)
                                                .map((q, idx) => (
                                                    <div
                                                        key={q.tempId}
                                                        className={`rounded-xl border p-3 text-xs ${q.isValid ? 'border-[var(--color-border)] bg-[var(--color-card)]' : 'border-red-300 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/20'}`}
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-black text-[var(--color-text)]">#{idx + 1}</span>
                                                                <select
                                                                    value={q.type}
                                                                    onChange={(e) => {
                                                                        const newType = e.target.value as QuestionType;
                                                                        setParsedQuestions((prev) => prev.map((item) => item.tempId === q.tempId ? { ...item, type: newType } : item));
                                                                    }}
                                                                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-2 py-0.5 text-[11px] font-black text-[var(--color-text)] outline-none"
                                                                >
                                                                    {questionTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                                                                </select>
                                                                <span className="rounded-lg bg-[var(--color-bg-soft)] px-2 py-0.5 font-bold text-[var(--color-text-secondary)]">
                                                                    ⏱️ {q.duration || '1 phút'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                {q.isValid ? (
                                                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                                                        <CheckCircleIcon size={14} /> Hợp lệ
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                                                                        ⚠️ {q.errorMsg || 'Thiếu dữ liệu'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <p className="mt-1.5 line-clamp-2 font-bold text-[var(--color-text)]">
                                                            {q.question_text}
                                                        </p>

                                                        {q.options.length > 0 && (
                                                            <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-[var(--color-text-secondary)] sm:grid-cols-4">
                                                                {q.options.map((opt) => (
                                                                    <div key={opt.id} className="truncate rounded bg-[var(--color-bg-soft)] px-2 py-1">
                                                                        <span className="font-black text-[var(--color-text)]">{opt.id}.</span> {opt.text}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)]/50 pt-1 text-[11px]">
                                                            <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                                                Đáp án: {q.correct_answers.join(', ') || '(Tự luận / chấm sau)'}
                                                            </span>
                                                            {q.grading_guide ? (
                                                                <span className="max-w-md truncate font-semibold text-blue-700 dark:text-blue-300">
                                                                    💡 Giải thích: {q.grading_guide}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>

                                        <div className="pt-2">
                                            <PrimaryButton
                                                type="button"
                                                onClick={handleBulkImport}
                                                disabled={saving || parsedQuestions.filter((q) => q.isValid).length === 0}
                                                className="min-h-11 w-full rounded-2xl text-sm font-black"
                                            >
                                                {saving ? 'Đang lưu vào hệ thống...' : `Lưu ${parsedQuestions.filter((q) => q.isValid).length} câu hỏi vào bài tập "${exerciseTitle.trim() || 'Bài tập mới'}"`}
                                            </PrimaryButton>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4 p-4">
                                <div className="flex items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50/70 px-4 py-3 text-xs dark:border-purple-900/40 dark:bg-purple-950/20">
                                    <span className="rounded-lg bg-purple-200/80 px-2 py-0.5 text-[10px] font-black uppercase text-purple-900 dark:bg-purple-900 dark:text-purple-200">
                                        Kho Thư viện bài tập
                                    </span>
                                    <span className="font-black text-purple-950 dark:text-purple-100">
                                        Chức năng tạo cụm bài cố định đưa vào Thư viện (Library)
                                    </span>
                                </div>

                                <div className="grid gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)] sm:col-span-2">
                                            Phương thức tạo cụm bài cố định
                                            <select
                                                value={batchMode}
                                                onChange={(e) => setBatchMode(e.target.value as any)}
                                                className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                            >
                                                <option value="by_chapter">Tách theo từng Bài / Phân loại ({chapterOptions.length} bài)</option>
                                                <option value="split_count">Chia đều số câu mỗi bài (chia theo lô câu)</option>
                                                <option value="single">Gộp toàn bộ câu hỏi đang lọc thành 1 bài cố định</option>
                                            </select>
                                        </label>

                                        {batchMode === 'split_count' && (
                                            <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)] sm:col-span-2">
                                                Số câu hỏi mỗi bài
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="50"
                                                    value={batchSplitSize}
                                                    onChange={(e) => setBatchSplitSize(e.target.value)}
                                                    className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                                />
                                            </label>
                                        )}

                                        <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                            Tiền tố tên bài
                                            <input
                                                value={batchPrefix}
                                                onChange={(e) => setBatchPrefix(e.target.value)}
                                                placeholder="Bài tập cố định"
                                                className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                            />
                                        </label>

                                        <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                            Thời lượng mỗi bài (phút)
                                            <input
                                                type="number"
                                                min="5"
                                                value={batchDuration}
                                                onChange={(e) => setBatchDuration(e.target.value)}
                                                className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                            />
                                        </label>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)]/70 pt-3 text-xs">
                                        <span className="font-bold text-[var(--color-text-secondary)]">
                                            Nguồn câu hỏi: <strong className="text-[var(--color-text)]">{filterSubject === 'all' ? 'Tất cả môn' : filterSubject}</strong> • Đang chọn <strong className="text-[var(--color-primary)]">{filteredQuestions.length} câu</strong>
                                        </span>
                                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                            Điểm auto: Thang điểm 10
                                        </span>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between text-xs font-black text-[var(--color-text)]">
                                        <span>Xem trước cụm bài tập sẽ tạo ({calculatedBatchItems.length} bài):</span>
                                        <span className="text-[var(--color-text-muted)] font-bold">
                                            Tổng: {calculatedBatchItems.reduce((acc, item) => acc + item.questions.length, 0)} câu
                                        </span>
                                    </div>

                                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                                        {calculatedBatchItems.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-center text-xs font-bold text-[var(--color-text-muted)]">
                                                Chưa có câu hỏi trong bộ lọc để tạo cụm bài. Hãy kiểm tra lại bộ lọc môn/chương ở trên.
                                            </div>
                                        ) : (
                                            calculatedBatchItems.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-xs">
                                                    <div className="min-w-0 pr-3">
                                                        <span className="block truncate font-black text-[var(--color-text)]">{item.title}</span>
                                                        <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-muted)]">{item.description}</span>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-black text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                                            {item.questions.length} câu
                                                        </span>
                                                        <span className="rounded-lg bg-[var(--color-bg-soft)] px-2 py-0.5 font-bold text-[var(--color-text-secondary)]">
                                                            ⏱️ {item.duration_minutes}p
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <PrimaryButton
                                    type="button"
                                    onClick={handleBatchCreateLibraryExams}
                                    disabled={saving || !calculatedBatchItems.length}
                                    className="min-h-12 w-full rounded-2xl text-sm font-black shadow-sm"
                                >
                                    {saving ? 'Đang tạo cụm bài...' : `📚 Lưu cụm ${calculatedBatchItems.length} bài tập cố định vào Thư viện`}
                                </PrimaryButton>
                            </div>
                        )}
                    </section>

                    {inputMode === 'manual' && (
                        <section className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] p-4">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-indigo-500/10 to-purple-500/20 text-xl dark:border-indigo-800/40">
                                        🎲
                                    </span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">
                                                Tạo bài kiểm tra
                                            </span>
                                            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--color-text-secondary)]">
                                                {filteredQuestions.length} câu khả dụng
                                            </span>
                                        </div>
                                        <h3 className="mt-0.5 text-lg font-black text-[var(--color-text)]">
                                            Random từ pool câu hỏi
                                        </h3>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 sm:p-4">
                                <button
                                    type="button"
                                    onClick={() => setRandomPoolOpen((prev) => !prev)}
                                    className="flex w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl bg-gradient-to-b from-[#be5144] via-[#9f3a2d] to-[#802b20] hover:from-[#cb5b4e] hover:via-[#ac4234] hover:to-[#8d3226] py-3 px-4 text-white font-black shadow-[0_8px_20px_-4px_rgba(159,58,45,0.45),0_3px_6px_-2px_rgba(128,43,32,0.3)] border-t border-[#fca5a5]/30 border-b-4 border-[#5f1e16] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-4px_rgba(159,58,45,0.55)] active:translate-y-0.5 active:border-b-2 active:shadow-md"
                                >
                                    <span className="text-sm font-black tracking-wide drop-shadow-sm">
                                        {randomPoolOpen ? 'Thu gọn' : 'Bắt đầu soạn'}
                                    </span>
                                    <span className={`text-xs font-black transition-transform duration-200 drop-shadow-sm ${randomPoolOpen ? 'rotate-180' : ''}`}>
                                        ▼
                                    </span>
                                </button>
                            </div>

                            {randomPoolOpen && (
                                <div className="grid gap-4 p-4 sm:p-5 border-t border-[var(--color-border)]">
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                        <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                            Lớp nhận bài kiểm tra
                                            <select
                                                value={examClassId}
                                                onChange={(event) => setExamClassId(event.target.value)}
                                                className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                            >
                                                {classes.map((item) => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.name} • {item.subject}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                            Tên bài kiểm tra
                                            <input
                                                value={examTitle}
                                                onChange={(event) => setExamTitle(event.target.value)}
                                                placeholder="Tự tạo theo môn/chương nếu bỏ trống"
                                                className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                            />
                                        </label>
                                        <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                            Mỗi học viên nhận (câu)
                                            <input
                                                type="number"
                                                min="1"
                                                max={Math.max(1, filteredQuestions.length)}
                                                value={examQuestionCount}
                                                onChange={(event) => setExamQuestionCount(event.target.value)}
                                                className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                            />
                                        </label>
                                        <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                                            Thời lượng (phút)
                                            <input
                                                type="number"
                                                min="1"
                                                value={examDuration}
                                                onChange={(event) => setExamDuration(event.target.value)}
                                                className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                            />
                                        </label>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-xs font-bold text-[var(--color-text)] sm:text-sm">
                                            <input
                                                type="radio"
                                                name="poolDeliveryMode"
                                                checked={deliveryMode === 'same'}
                                                onChange={() => setDeliveryMode('same')}
                                            />
                                            <span>{examQuestionCount || 10} câu giống nhau cho cả lớp</span>
                                        </label>
                                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-xs font-bold text-[var(--color-text)] sm:text-sm">
                                            <input
                                                type="radio"
                                                name="poolDeliveryMode"
                                                checked={deliveryMode === 'different'}
                                                onChange={() => setDeliveryMode('different')}
                                            />
                                            <span>Mỗi học viên nhận {examQuestionCount || 10} câu khác nhau</span>
                                        </label>
                                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-xs font-bold text-[var(--color-text)] sm:text-sm">
                                            <input
                                                type="checkbox"
                                                checked={shuffleQuestions}
                                                onChange={(event) => setShuffleQuestions(event.target.checked)}
                                            />
                                            <span>Đổi thứ tự câu hỏi khi làm bài</span>
                                        </label>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                        <p className="text-xs text-[var(--color-text-secondary)]">
                                            💡 Điểm số sẽ được tự động chuẩn hoá về <strong>thang điểm 10</strong> theo quy định.
                                        </p>
                                        <PrimaryButton
                                            type="button"
                                            onClick={createExamFromBank}
                                            disabled={saving || !filteredQuestions.length}
                                            className="min-h-11 rounded-2xl px-6 text-sm font-black shadow-sm"
                                        >
                                            {saving ? 'Đang tạo...' : `🎲 Tạo bài kiểm tra từ pool (${examQuestionCount || 10} câu)`}
                                        </PrimaryButton>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </div>

                <section className="grid gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-black text-[var(--color-text)]">Danh sách câu hỏi theo bài tập / phân loại</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={exportQuestionsToExcel}
                                disabled={!filteredQuestions.length}
                                className="min-h-10 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 text-xs font-black text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            >
                                📊 Xuất Excel
                            </button>
                            <button type="button" onClick={() => void loadQuestions()} disabled={loading} className="min-h-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-black text-[var(--color-text)] transition hover:border-[var(--color-primary)] disabled:opacity-60">{loading ? 'Đang tải...' : 'Làm mới'}</button>
                        </div>
                    </div>
                    {loading ? (
                        <div className="grid gap-3">
                            {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-3xl bg-[var(--color-bg-soft)]" />)}
                        </div>
                    ) : groupedQuestions.length ? (
                        <div className="grid gap-3">
                            {groupedQuestions.map(([chapter, items]) => (
                                <details key={chapter} open className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
                                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 bg-[var(--color-bg-soft)] px-4 py-3 text-sm font-black text-[var(--color-text)]">
                                        <div className="flex items-center gap-2">
                                            <span>{chapter}</span>
                                            <span className="rounded-full bg-[var(--color-card)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-text-muted)]">{items.length} câu</span>
                                        </div>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => void handleDeduplicate(chapter)}
                                                className="rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300"
                                                title="Dọn dẹp các câu hỏi bị trùng lặp trong bài tập này"
                                            >
                                                🧹 Dọn câu trùng
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleDeleteChapter(chapter)}
                                                className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
                                                title="Xóa toàn bộ câu hỏi trong bài tập này"
                                            >
                                                🗑️ Xóa toàn bộ
                                            </button>
                                        </div>
                                    </summary>
                                    <div className="grid gap-3 p-4">
                                        {items.map((question, index) => (
                                            <article key={question.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge>{typeLabels[question.type] || question.type}</Badge>
                                                            <Badge tone="neutral">{question.class_name || selectedExamClass?.name || 'Chưa gắn lớp'}</Badge>
                                                            {question.media?.length ? <Badge tone="warning">Có file đề</Badge> : null}
                                                        </div>
                                                        <h4 className="mt-2 whitespace-pre-line text-sm font-black leading-6 text-[var(--color-text)]">
                                                            Câu {index + 1}: {question.question_text.replace(/^(?:Câu|Bài|Question\s*)?\d+[\s.:)]+\s*/i, '')}
                                                        </h4>
                                                        <p className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">{question.subject || 'Chưa có môn'} • Thang điểm 10 tự động • {formatDate(question.created_at)}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDeleteQuestion(question.id)}
                                                        className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 shrink-0"
                                                        title="Xóa câu hỏi này khỏi ngân hàng"
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                                {question.options?.length ? (
                                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                        {question.options.map((option) => (
                                                            <div key={option.id} className="rounded-xl bg-[var(--color-card)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                                                                <span className="font-black text-[var(--color-text)]">{option.id}.</span> {option.text || 'Đáp án'}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : null}
                                                {question.correct_answers?.length ? <p className="mt-3 text-xs font-black text-emerald-700 dark:text-emerald-300">Đáp án: {question.correct_answers.join(', ')}</p> : null}
                                                {question.grading_guide ? <p className="mt-3 text-xs font-semibold leading-5 text-[var(--color-text-secondary)]"><span className="font-bold text-[var(--color-primary)]">Giải thích:</span> {question.grading_guide}</p> : null}
                                                {question.media?.length ? <p className="mt-3 text-xs font-bold text-[var(--color-text-muted)]">File: {question.media.map((media) => media.name || 'Tệp đề').join(', ')}</p> : null}
                                            </article>
                                        ))}
                                    </div>
                                </details>
                            ))}
                        </div>
                    ) : (
                        <EmptyState title="Chưa có câu hỏi" />
                    )}
                </section>

                {/* Library Fixed Exercises Section */}
                <section className="grid gap-4 rounded-3xl border border-purple-200/80 bg-gradient-to-b from-purple-50/40 to-transparent p-5 dark:border-purple-900/40 dark:from-purple-950/20">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="rounded-lg bg-purple-600 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white">
                                    Thư viện số
                                </span>
                                <h3 className="text-lg font-black text-[var(--color-text)]">
                                    Kho cụm bài tập & Đề thi cố định ({libraryExams.length} bài)
                                </h3>
                            </div>
                            <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-muted)]">
                                Các bài tập mẫu được lưu sẵn trong Thư viện. Giáo viên có thể gán nhanh cho bất kỳ lớp nào khi đến bài học tương ứng.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void loadLibraryExams()}
                            disabled={loadingLibrary}
                            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-bold text-[var(--color-text)] transition hover:border-[var(--color-primary)]"
                        >
                            {loadingLibrary ? 'Đang tải...' : '🔄 Làm mới Thư viện'}
                        </button>
                    </div>

                    {loadingLibrary ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-32 animate-pulse rounded-2xl bg-[var(--color-bg-soft)]" />
                            ))}
                        </div>
                    ) : libraryExams.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {libraryExams.map((exam) => (
                                <article
                                    key={exam.id}
                                    className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm transition hover:border-purple-300 dark:hover:border-purple-800"
                                >
                                    <div>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="rounded-lg bg-purple-100 px-2.5 py-0.5 text-[11px] font-black text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                                {exam.subject || 'Chung'}
                                            </span>
                                            <span className="rounded-lg bg-[var(--color-bg-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-text-secondary)]">
                                                ⏱️ {exam.duration_minutes} phút
                                            </span>
                                        </div>
                                        <h4 className="mt-2.5 text-sm font-black text-[var(--color-text)] line-clamp-2">
                                            {exam.title}
                                        </h4>
                                        <p className="mt-1 text-xs text-[var(--color-text-muted)] line-clamp-2">
                                            {exam.description || 'Bài tập cố định trong Thư viện'}
                                        </p>
                                    </div>

                                    <div className="mt-4 border-t border-[var(--color-border)]/60 pt-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-black text-emerald-700 dark:text-emerald-300">
                                                📝 {exam.question_count ?? 0} câu hỏi cố định
                                            </span>
                                            <span className="text-[11px] text-[var(--color-text-muted)]">
                                                Auto thang 10
                                            </span>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void handleViewExamDetail(exam)}
                                                className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-2.5 py-1.5 text-xs font-bold text-[var(--color-text)] transition hover:bg-[var(--color-card)] whitespace-nowrap"
                                            >
                                                Xem câu
                                            </button>
                                            <PrimaryButton
                                                type="button"
                                                onClick={() => {
                                                    setAssignModalExam(exam);
                                                    setAssignTitle(exam.title);
                                                    setAssignDuration(String(exam.duration_minutes || 45));
                                                    setAssignStartTime('');
                                                    setAssignDueTime('');
                                                }}
                                                className="flex-1 rounded-xl px-2.5 py-1.5 text-xs font-black shadow-xs whitespace-nowrap"
                                            >
                                                Giao cho lớp
                                            </PrimaryButton>
                                            <button
                                                type="button"
                                                onClick={() => void handleDeleteLibraryExam(exam.id, exam.title)}
                                                className="grid h-8 w-8 place-items-center rounded-xl text-[var(--color-text-muted)] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                                                title="Xóa bài tập khỏi Thư viện"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center">
                            <p className="text-sm font-bold text-[var(--color-text)]">
                                Chưa có bài tập cố định nào trong Thư viện
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                Hãy sử dụng công cụ "📦 Tạo cụm bài cố định" ở trên để tạo sẵn các bài tập theo chương hoặc theo nhóm câu hỏi.
                            </p>
                        </div>
                    )}
                </section>

                {/* Modal Giao bài tập cho lớp */}
                {assignModalExam && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                        <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl">
                            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
                                <div>
                                    <span className="rounded-lg bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                        Thư viện → Lớp học
                                    </span>
                                    <h3 className="text-base font-black text-[var(--color-text)]">
                                        Giao bài tập cho lớp
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAssignModalExam(null)}
                                    className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="grid gap-4 p-6 text-xs font-bold text-[var(--color-text-secondary)]">
                                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3">
                                    <p className="text-[11px] text-[var(--color-text-muted)]">Bài tập nguồn trong Thư viện:</p>
                                    <p className="mt-0.5 text-sm font-black text-[var(--color-text)]">{assignModalExam.title}</p>
                                    <p className="mt-1 text-xs text-purple-700 dark:text-purple-300">
                                        {assignModalExam.question_count ?? 0} câu hỏi cố định • Môn {assignModalExam.subject || 'Chung'} • Điểm tự động tính thang 10
                                    </p>
                                </div>

                                <label className="grid gap-1.5">
                                    Lớp học nhận bài *
                                    <select
                                        value={assignClassId}
                                        onChange={(e) => setAssignClassId(e.target.value)}
                                        className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                    >
                                        {classes.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} • Môn {c.subject}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="grid gap-1.5">
                                    Tên bài hiển thị cho lớp
                                    <input
                                        type="text"
                                        value={assignTitle}
                                        onChange={(e) => setAssignTitle(e.target.value)}
                                        placeholder={assignModalExam.title}
                                        className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                    />
                                </label>

                                <div className="grid grid-cols-2 gap-3">
                                    <label className="grid gap-1.5">
                                        Thời gian mở bài (tùy chọn)
                                        <input
                                            type="datetime-local"
                                            value={assignStartTime}
                                            onChange={(e) => setAssignStartTime(e.target.value)}
                                            className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-xs font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </label>
                                    <label className="grid gap-1.5">
                                        Hạn chót nộp bài (tùy chọn)
                                        <input
                                            type="datetime-local"
                                            value={assignDueTime}
                                            onChange={(e) => setAssignDueTime(e.target.value)}
                                            className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-xs font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                        />
                                    </label>
                                </div>

                                <label className="grid gap-1.5">
                                    Thời lượng làm bài (phút)
                                    <input
                                        type="number"
                                        min="1"
                                        value={assignDuration}
                                        onChange={(e) => setAssignDuration(e.target.value)}
                                        className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                    />
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg-soft)] px-6 py-4">
                                <button
                                    type="button"
                                    onClick={() => setAssignModalExam(null)}
                                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-xs font-bold text-[var(--color-text)]"
                                >
                                    Hủy
                                </button>
                                <PrimaryButton
                                    type="button"
                                    onClick={handleAssignLibraryExam}
                                    disabled={assigning}
                                    className="rounded-2xl px-5 py-2 text-xs font-black"
                                >
                                    {assigning ? 'Đang giao bài...' : 'Xác nhận giao bài cho lớp'}
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Xem chi tiết câu hỏi bài tập */}
                {previewExamDetail && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                        <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl">
                            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-lg bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                            {previewExamDetail.exam.subject || 'Chung'}
                                        </span>
                                        <h3 className="text-base font-black text-[var(--color-text)]">
                                            {previewExamDetail.exam.title}
                                        </h3>
                                    </div>
                                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                                        {previewExamDetail.questions.length} câu hỏi cố định • ⏱️ {previewExamDetail.exam.duration_minutes} phút • Thang 10 tự động
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPreviewExamDetail(null)}
                                    className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto p-6">
                                {previewExamDetail.questions.map((q, idx) => (
                                    <div key={q.id || idx} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-black text-[var(--color-text)]">Câu #{idx + 1} ({typeLabels[q.type] || q.type})</span>
                                            <span className="font-bold text-purple-700 dark:text-purple-300">{(10 / previewExamDetail.questions.length).toFixed(2)} điểm</span>
                                        </div>
                                        <p className="mt-2 text-sm font-bold text-[var(--color-text)] whitespace-pre-wrap">{q.question_text}</p>
                                        {q.options?.length ? (
                                            <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                                {q.options.map((opt) => (
                                                    <div key={opt.id} className="rounded-xl bg-[var(--color-card)] px-3 py-1.5 font-semibold text-[var(--color-text-secondary)]">
                                                        <span className="font-black text-[var(--color-text)]">{opt.id}.</span> {opt.text}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                        {q.correct_answers?.length ? (
                                            <p className="mt-2.5 font-black text-emerald-700 dark:text-emerald-300">
                                                Đáp án đúng: {q.correct_answers.join(', ')}
                                            </p>
                                        ) : null}
                                        {q.grading_guide ? (
                                            <p className="mt-1 font-semibold text-blue-700 dark:text-blue-300">
                                                💡 Hướng dẫn/Giải thích: {q.grading_guide}
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg-soft)] px-6 py-4">
                                <button
                                    type="button"
                                    onClick={() => setPreviewExamDetail(null)}
                                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-xs font-bold text-[var(--color-text)]"
                                >
                                    Đóng
                                </button>
                                <PrimaryButton
                                    type="button"
                                    onClick={() => {
                                        const examToAssign = previewExamDetail.exam;
                                        setPreviewExamDetail(null);
                                        setAssignModalExam(examToAssign);
                                        setAssignTitle(examToAssign.title);
                                        setAssignDuration(String(examToAssign.duration_minutes || 45));
                                    }}
                                    className="rounded-2xl px-5 py-2 text-xs font-black"
                                >
                                    Giao bài này cho lớp
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
}

function QuestionBankMetric({ icon: Icon, label, value }: { icon: typeof BookIcon; label: string; value: number }) {
    return (
        <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Icon size={18} strokeWidth={2.8} /></span>
            <p className="mt-3 text-2xl font-black text-[var(--color-text)]">{value}</p>
            <p className="text-[11px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
        </article>
    );
}
