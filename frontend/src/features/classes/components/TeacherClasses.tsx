import { memo, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from 'react';
import { Badge, Button, EmptyState, Panel, PrimaryButton } from '../../../components/shared/ui';
import { BookIcon, ChartIcon, FileIcon, UploadIcon, UsersIcon, XIcon } from '../../../components/shared/icons';
import { API_URL } from '../../../services/api';
import type { ClassDetail, ClassItem, ClassTopic, GradebookData, Material, NotificationAttachment, NotificationItem, TestItem, User } from '../../../types';
import { RichNotificationContent, stripHtml } from '../../notifications/components/notificationContent';
import { AttendancePanel } from './AttendancePanel';
import { QuestionBankPanel } from './QuestionBankPanel';

type TeacherClassTab = 'stream' | 'attendance' | 'assignments' | 'question-bank' | 'gradebook' | 'people';
type ReviewTab = 'pending' | 'graded';
type AssignmentPanelTab = 'assignment' | 'material' | 'topic';
type AssignmentKind = 'quiz' | 'essay';
type ContentMode = 'text' | 'image';
type GradeDraft = { score: string; feedback: string };
type QuizOption = { id: string; text: string; correct: boolean; imageName?: string; imageData?: string; imageType?: string };
type QuizQuestion = { id: string; title: string; options: QuizOption[]; points: string; required: boolean; imageName?: string; imageData?: string; imageType?: string };

function makeLocalId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createQuizOption(label = 'Option 1'): QuizOption {
    return { id: makeLocalId('option'), text: label, correct: false };
}

function createQuizQuestion(order = 1): QuizQuestion {
    return {
        id: makeLocalId('question'),
        title: order === 1 ? 'Untitled Question' : `Câu hỏi ${order}`,
        options: [createQuizOption('Option 1')],
        points: '0',
        required: true,
    };
}

function getTopicKey(topic: ClassTopic) {
    return topic.id > 0 ? String(topic.id) : `title-${topic.title}`;
}

function getAssignmentTopicKey(assignment: TestItem) {
    if (assignment.topic_id) return String(assignment.topic_id);
    if (assignment.topic_title) return `title-${assignment.topic_title}`;
    return 'none';
}

function formatQuizPrompt(questions: QuizQuestion[]) {
    return questions.map((question, questionIndex) => {
        const options = question.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option.text.trim() || `Option ${optionIndex + 1}`}${option.imageName ? ` (Hình: ${option.imageName})` : ''}`).join('\n');
        const imageLine = question.imageName ? `\nHình: ${question.imageName}` : '';
        return `Câu ${questionIndex + 1}: ${question.title.trim() || 'Untitled Question'}${imageLine}\n${options}\nĐiểm: ${Number(question.points) || 0}${question.required ? '\nBắt buộc' : ''}`;
    }).join('\n\n');
}

function formatQuizAnswers(questions: QuizQuestion[]) {
    return questions.map((question, questionIndex) => {
        const correctOptions = question.options
            .map((option, optionIndex) => option.correct ? `${String.fromCharCode(65 + optionIndex)}. ${option.text.trim() || `Option ${optionIndex + 1}`}${option.imageName ? ` (Hình: ${option.imageName})` : ''}` : '')
            .filter(Boolean)
            .join(', ');
        return `Câu ${questionIndex + 1}: ${correctOptions || 'Chưa chọn đáp án đúng'} (${Number(question.points) || 0} điểm)`;
    }).join('\n');
}

function buildQuizQuestionsFromAssignment(assignment: TestItem): QuizQuestion[] {
    const payload = Array.isArray(assignment.quiz_payload) ? assignment.quiz_payload : [];
    if (!payload.length) return [createQuizQuestion()];

    return payload.map((question, questionIndex) => ({
        id: question.id || makeLocalId('question'),
        title: question.title || `Câu hỏi ${questionIndex + 1}`,
        points: String(question.points ?? '0'),
        required: question.required ?? true,
        imageName: question.imageName,
        imageData: question.imageData,
        imageType: question.imageType,
        options: Array.isArray(question.options) && question.options.length ? question.options.map((option, optionIndex) => ({
            id: option.id || makeLocalId('option'),
            text: option.text || `Option ${optionIndex + 1}`,
            correct: Boolean(option.correct),
            imageName: option.imageName,
            imageData: option.imageData,
            imageType: option.imageType,
        })) : [createQuizOption('Option 1')],
    }));
}

type TeacherClassesProps = {
    classes: ClassItem[];
    selectedClassId: number | null;
    setSelectedClassId?: (id: number) => void;
    detail: ClassDetail | null;
    teacherView?: 'review' | 'class';
    initialTab?: TeacherClassTab;
    hideClassTabs?: boolean;
    user?: User;
    onNavigate?: (module: string, classId?: number) => void;
    onClassworkChanged?: () => void;
};

type ReviewItem = {
    id: number;
    title: string;
    due_date?: string;
    submitted_at?: string;
    class_name?: string;
    class_code?: string;
    student_name?: string;
    username?: string;
};

const classTabs: { id: TeacherClassTab; label: string }[] = [
    { id: 'stream', label: 'Bảng tin' },
    { id: 'attendance', label: 'Điểm danh' },
    { id: 'assignments', label: 'Bài tập' },
    { id: 'question-bank', label: 'Ngân hàng câu hỏi' },
    { id: 'gradebook', label: 'Bảng điểm' },
    { id: 'people', label: 'Thành viên' },
];

const assignmentTabs: { id: AssignmentPanelTab; label: string }[] = [
    { id: 'assignment', label: 'Bài tập' },
    { id: 'material', label: 'Tài liệu' },
    { id: 'topic', label: 'Chủ đề' },
];

const reviewTabs: { id: ReviewTab; label: string; emptyTitle: string }[] = [
    { id: 'pending', label: 'Cần đánh giá', emptyTitle: 'Không có bài tập nào gần đây để xem xét' },
    { id: 'graded', label: 'Đã đánh giá', emptyTitle: 'Chưa có bài đã đánh giá gần đây' },
];

function formatDate(value?: string) {
    if (!value) return 'Đang cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Đang cập nhật';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function formatFileSize(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
    return `${Math.round(size / 1024 / 102.4) / 10} MB`;
}

function toDateTimeLocalValue(value?: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 16);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}

function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Không thể đọc tệp.'));
        reader.readAsDataURL(file);
    });
}

function buildGradeDrafts(gradebook?: GradebookData | null) {
    const drafts: Record<string, GradeDraft> = {};
    gradebook?.rows.forEach((row) => {
        row.scores.forEach((cell) => {
            drafts[`${row.student_id}-${cell.test_id}`] = {
                score: cell.score === null || cell.score === undefined ? '' : String(cell.score),
                feedback: cell.feedback || '',
            };
        });
    });
    return drafts;
}

function assignmentKindLabel(kind?: string) {
    return kind === 'essay' ? 'Tự luận' : 'Trắc nghiệm';
}

export const TeacherClasses = memo(function TeacherClasses({ classes, selectedClassId, setSelectedClassId, detail, teacherView = 'review', initialTab = 'stream', hideClassTabs = false, user, onClassworkChanged }: TeacherClassesProps) {
    const [activeTab, setActiveTab] = useState<TeacherClassTab>(initialTab);
    const [reviewTab, setReviewTab] = useState<ReviewTab>('pending');
    const [showReview, setShowReview] = useState(teacherView !== 'class');
    const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [tests, setTests] = useState<TestItem[]>([]);
    const [topics, setTopics] = useState<ClassTopic[]>([]);
    const [assignmentCreateMenuOpen, setAssignmentCreateMenuOpen] = useState(false);
    const [assignmentCreateModal, setAssignmentCreateModal] = useState<AssignmentPanelTab | null>(null);
    const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
    const [assignmentKind, setAssignmentKind] = useState<AssignmentKind>('quiz');
    const [assignmentTitle, setAssignmentTitle] = useState('');
    const [assignmentDueDate, setAssignmentDueDate] = useState('');
    const [assignmentMaxScore, setAssignmentMaxScore] = useState('10');
    const [selectedTopicId, setSelectedTopicId] = useState('');
    const [promptMode, setPromptMode] = useState<ContentMode>('text');
    const [promptText, setPromptText] = useState('');
    const [promptImageName, setPromptImageName] = useState('');
    const [promptImageData, setPromptImageData] = useState('');
    const [promptImageType, setPromptImageType] = useState('');
    const [answerMode, setAnswerMode] = useState<ContentMode>('text');
    const [answerText, setAnswerText] = useState('');
    const [answerImageName, setAnswerImageName] = useState('');
    const [answerImageData, setAnswerImageData] = useState('');
    const [answerImageType, setAnswerImageType] = useState('');
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(() => [createQuizQuestion()]);
    const [materialTitle, setMaterialTitle] = useState('');
    const [materialDescription, setMaterialDescription] = useState('');
    const [materialExternalLink, setMaterialExternalLink] = useState('');
    const [materialFileName, setMaterialFileName] = useState('');
    const [materialFileData, setMaterialFileData] = useState('');
    const [materialFileType, setMaterialFileType] = useState('');
    const [materialFileSize, setMaterialFileSize] = useState('');
    const [topicTitle, setTopicTitle] = useState('');
    const [topicDescription, setTopicDescription] = useState('');
    const [classworkTopicFilter, setClassworkTopicFilter] = useState('all');
    const [collapsedTopicKeys, setCollapsedTopicKeys] = useState<Record<string, boolean>>({});
    const [gradebook, setGradebook] = useState<GradebookData | null>(null);
    const [gradeDrafts, setGradeDrafts] = useState<Record<string, GradeDraft>>({});
    const [gradebookLoading, setGradebookLoading] = useState(false);
    const [savingGradeKey, setSavingGradeKey] = useState('');
    const [noticeTitle, setNoticeTitle] = useState('');
    const [noticeContent, setNoticeContent] = useState('');
    const [noticeClassId, setNoticeClassId] = useState('');
    const [noticeAttachments, setNoticeAttachments] = useState<NotificationAttachment[]>([]);
    const [notices, setNotices] = useState<NotificationItem[]>([]);
    const [showNoticeModal, setShowNoticeModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const noticeEditorRef = useRef<HTMLDivElement>(null);

    const activeClasses = useMemo(() => classes.filter((item) => item.status !== 'completed' && item.status !== 'canceled' && item.status !== 'archived'), [classes]);
    const selectedClass = activeClasses.find((item) => item.id === selectedClassId) ?? activeClasses[0] ?? null;
    const activeDetail = detail && selectedClass && detail.class.id === selectedClass.id ? detail : null;
    const assignments = tests.filter((item) => item.type === 'assignment');
    const gradedItems = assignments.filter((item) => (item.graded_count ?? 0) > 0);
    const displayedReviewItems = reviewTab === 'pending' ? reviewItems : gradedItems.map((item) => ({ id: item.id, title: item.title, due_date: item.due_date, class_name: selectedClass?.name, class_code: selectedClass?.code }));
    const activeReviewTab = reviewTabs.find((item) => item.id === reviewTab) ?? reviewTabs[0];
    const headers = useMemo(() => ({ 'Content-Type': 'application/json', 'x-user-id': String(user?.id ?? '') }), [user?.id]);
    const topicOptions = useMemo(() => {
        const map = new Map<string, ClassTopic>();
        topics.forEach((topic) => map.set(String(topic.id), topic));
        assignments.forEach((assignment) => {
            if (assignment.topic_title && !Array.from(map.values()).some((topic) => topic.title === assignment.topic_title)) {
                map.set(`assignment-${assignment.topic_title}`, { id: -map.size - 1, class_id: selectedClass?.id ?? 0, title: assignment.topic_title, });
            }
        });
        return Array.from(map.values());
    }, [assignments, selectedClass?.id, topics]);
    const selectedTopic = topicOptions.find((topic) => getTopicKey(topic) === selectedTopicId || String(topic.id) === selectedTopicId);
    const quizTotalScore = useMemo(() => quizQuestions.reduce((sum, question) => sum + (Number(question.points) || 0), 0), [quizQuestions]);
    const classworkTopicSections = useMemo(() => topicOptions
        .filter((topic) => classworkTopicFilter === 'all' || getTopicKey(topic) === classworkTopicFilter)
        .map((topic) => {
            const key = getTopicKey(topic);
            return {
                key,
                topic,
                assignments: assignments.filter((assignment) => getAssignmentTopicKey(assignment) === key),
            };
        }), [assignments, classworkTopicFilter, topicOptions]);
    const ungroupedAssignments = useMemo(() => classworkTopicFilter === 'all' ? assignments.filter((assignment) => getAssignmentTopicKey(assignment) === 'none') : [], [assignments, classworkTopicFilter]);
    const allTopicSectionsCollapsed = classworkTopicSections.length > 0 && classworkTopicSections.every((section) => collapsedTopicKeys[section.key]);
    const hasClassworkContent = Boolean(assignments.length || materials.length || topicOptions.length);
    const streamNotices = useMemo(() => notices.filter((item) => !selectedClass || !item.class_id || item.class_id === selectedClass.id).slice(0, 8), [notices, selectedClass?.id]);

    useEffect(() => {
        if (!selectedClassId && activeClasses[0]?.id) {
            setSelectedClassId?.(activeClasses[0].id);
        }
    }, [activeClasses, selectedClassId, setSelectedClassId]);

    useEffect(() => {
        setShowReview(teacherView !== 'class');
    }, [teacherView]);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        setMaterials(activeDetail?.materials ?? []);
        setTests(activeDetail?.tests ?? []);
        setTopics(activeDetail?.topics ?? []);
        setNotices(activeDetail?.notifications ?? []);
        setNoticeClassId(activeDetail?.class.id ? String(activeDetail.class.id) : selectedClass ? String(selectedClass.id) : '');
        setClassworkTopicFilter('all');
        setCollapsedTopicKeys({});
    }, [activeDetail, selectedClass]);

    useEffect(() => {
        if (!user?.id) return;
        fetch(`${API_URL}/api/teacher/review-items`, { headers })
            .then((response) => response.json())
            .then((data) => setReviewItems(data.reviewItems ?? []))
            .catch(() => setReviewItems([]));
    }, [headers, user?.id]);

    useEffect(() => {
        if (activeTab !== 'gradebook' || !selectedClass || !user?.id) return;
        let cancelled = false;
        setGradebookLoading(true);
        fetch(`${API_URL}/api/classes/${selectedClass.id}/gradebook`, { headers })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Không thể tải bảng điểm.');
                if (!cancelled) {
                    setGradebook(data.gradebook ?? null);
                    setGradeDrafts(buildGradeDrafts(data.gradebook));
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setGradebook(null);
                    setMessage(error instanceof Error ? error.message : 'Không thể tải bảng điểm.');
                }
            })
            .finally(() => {
                if (!cancelled) setGradebookLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [activeTab, headers, selectedClass?.id, user?.id]);

    const resetAssignmentForm = () => {
        setAssignmentTitle('');
        setAssignmentDueDate('');
        setAssignmentMaxScore('10');
        setSelectedTopicId('');
        setPromptMode('text');
        setPromptText('');
        setPromptImageName('');
        setPromptImageData('');
        setPromptImageType('');
        setAnswerMode('text');
        setAnswerText('');
        setAnswerImageName('');
        setAnswerImageData('');
        setAnswerImageType('');
        setQuizQuestions([createQuizQuestion()]);
    };

    const resetMaterialForm = () => {
        setMaterialTitle('');
        setMaterialDescription('');
        setMaterialExternalLink('');
        setMaterialFileName('');
        setMaterialFileData('');
        setMaterialFileType('');
        setMaterialFileSize('');
    };

    const resetTopicForm = () => {
        setTopicTitle('');
        setTopicDescription('');
    };

    const openAssignmentCreateModal = (modal: AssignmentPanelTab) => {
        setAssignmentCreateMenuOpen(false);
        setEditingAssignmentId(null);
        if (modal === 'assignment') resetAssignmentForm();
        if (modal === 'material') resetMaterialForm();
        if (modal === 'topic') resetTopicForm();
        setAssignmentCreateModal(modal);
    };

    const openAssignmentEditModal = (assignment: TestItem) => {
        setAssignmentCreateMenuOpen(false);
        setEditingAssignmentId(assignment.id);
        setAssignmentKind(assignment.assignment_kind === 'essay' ? 'essay' : 'quiz');
        setAssignmentTitle(assignment.title || '');
        setAssignmentDueDate(toDateTimeLocalValue(assignment.due_date));
        setAssignmentMaxScore(String(assignment.max_score ?? '10'));
        setSelectedTopicId(assignment.topic_id ? String(assignment.topic_id) : (assignment.topic_title ? `title-${assignment.topic_title}` : ''));
        setPromptMode(assignment.prompt_mode === 'image' ? 'image' : 'text');
        setPromptText(assignment.prompt_text || '');
        setPromptImageName(assignment.prompt_image_name || '');
        setPromptImageData(assignment.prompt_image_data || '');
        setPromptImageType(assignment.prompt_image_type || '');
        setAnswerMode(assignment.answer_mode === 'image' ? 'image' : 'text');
        setAnswerText(assignment.answer_text || '');
        setAnswerImageName(assignment.answer_image_name || '');
        setAnswerImageData(assignment.answer_image_data || '');
        setAnswerImageType(assignment.answer_image_type || '');
        setQuizQuestions(buildQuizQuestionsFromAssignment(assignment));
        setAssignmentCreateModal('assignment');
    };

    const closeAssignmentCreateModal = () => {
        if (saving) return;
        if (assignmentCreateModal === 'assignment') {
            resetAssignmentForm();
            setEditingAssignmentId(null);
        }
        setAssignmentCreateModal(null);
    };

    const handleAssignmentFile = async (event: ChangeEvent<HTMLInputElement>, target: 'prompt' | 'answer') => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 6 * 1024 * 1024) {
            setMessage('Mỗi hình ảnh chỉ được tối đa 6MB.');
            return;
        }
        try {
            const dataUrl = await readFileAsDataUrl(file);
            if (target === 'prompt') {
                setPromptImageName(file.name);
                setPromptImageData(dataUrl);
                setPromptImageType(file.type);
            } else {
                setAnswerImageName(file.name);
                setAnswerImageData(dataUrl);
                setAnswerImageType(file.type);
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể đọc hình ảnh.');
        }
    };

    const handleMaterialFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            setMessage('Tài liệu chỉ được tối đa 10MB.');
            return;
        }
        try {
            const dataUrl = await readFileAsDataUrl(file);
            setMaterialFileName(file.name);
            setMaterialFileData(dataUrl);
            setMaterialFileType(file.type || 'application/octet-stream');
            setMaterialFileSize(formatFileSize(file.size));
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể đọc tài liệu.');
        }
    };

    const updateQuizQuestion = (questionId: string, patch: Partial<QuizQuestion>) => {
        setQuizQuestions((previous) => previous.map((question) => question.id === questionId ? { ...question, ...patch } : question));
    };

    const addQuizQuestion = () => {
        setQuizQuestions((previous) => [...previous, createQuizQuestion(previous.length + 1)]);
    };

    const duplicateQuizQuestion = (questionId: string) => {
        setQuizQuestions((previous) => {
            const index = previous.findIndex((question) => question.id === questionId);
            if (index < 0) return previous;
            const clone: QuizQuestion = {
                ...previous[index],
                id: makeLocalId('question'),
                title: `${previous[index].title || 'Untitled Question'} - bản sao`,
                options: previous[index].options.map((option) => ({ ...option, id: makeLocalId('option') })),
            };
            return [...previous.slice(0, index + 1), clone, ...previous.slice(index + 1)];
        });
    };

    const deleteQuizQuestion = (questionId: string) => {
        setQuizQuestions((previous) => previous.length > 1 ? previous.filter((question) => question.id !== questionId) : previous);
    };

    const updateQuizOption = (questionId: string, optionId: string, text: string) => {
        setQuizQuestions((previous) => previous.map((question) => question.id === questionId ? {
            ...question,
            options: question.options.map((option) => option.id === optionId ? { ...option, text } : option),
        } : question));
    };

    const addQuizOption = (questionId: string) => {
        setQuizQuestions((previous) => previous.map((question) => question.id === questionId ? {
            ...question,
            options: [...question.options, createQuizOption(`Option ${question.options.length + 1}`)],
        } : question));
    };

    const updateQuizOptionMedia = (questionId: string, optionId: string, patch: Partial<QuizOption>) => {
        setQuizQuestions((previous) => previous.map((question) => question.id === questionId ? {
            ...question,
            options: question.options.map((option) => option.id === optionId ? { ...option, ...patch } : option),
        } : question));
    };

    const deleteQuizOption = (questionId: string, optionId: string) => {
        setQuizQuestions((previous) => previous.map((question) => question.id === questionId && question.options.length > 1 ? {
            ...question,
            options: question.options.filter((option) => option.id !== optionId),
        } : question));
    };

    const setCorrectQuizOption = (questionId: string, optionId: string) => {
        setQuizQuestions((previous) => previous.map((question) => question.id === questionId ? {
            ...question,
            options: question.options.map((option) => ({ ...option, correct: option.id === optionId })),
        } : question));
    };

    const handleQuizQuestionImage = async (event: ChangeEvent<HTMLInputElement>, questionId: string) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 6 * 1024 * 1024) {
            setMessage('Mỗi hình ảnh câu hỏi chỉ được tối đa 6MB.');
            return;
        }
        try {
            const dataUrl = await readFileAsDataUrl(file);
            updateQuizQuestion(questionId, { imageName: file.name, imageData: dataUrl, imageType: file.type });
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể đọc hình ảnh câu hỏi.');
        } finally {
            event.target.value = '';
        }
    };

    const removeQuizQuestionImage = (questionId: string) => {
        updateQuizQuestion(questionId, { imageName: '', imageData: '', imageType: '' });
    };

    const handleQuizOptionImage = async (event: ChangeEvent<HTMLInputElement>, questionId: string, optionId: string) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 6 * 1024 * 1024) {
            setMessage('Mỗi hình ảnh đáp án chỉ được tối đa 6MB.');
            return;
        }
        try {
            const dataUrl = await readFileAsDataUrl(file);
            updateQuizOptionMedia(questionId, optionId, { imageName: file.name, imageData: dataUrl, imageType: file.type });
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể đọc hình ảnh đáp án.');
        } finally {
            event.target.value = '';
        }
    };

    const removeQuizOptionImage = (questionId: string, optionId: string) => {
        updateQuizOptionMedia(questionId, optionId, { imageName: '', imageData: '', imageType: '' });
    };

    const toggleTopicCollapse = (topicKey: string) => {
        setCollapsedTopicKeys((previous) => ({ ...previous, [topicKey]: !previous[topicKey] }));
    };

    const toggleAllTopics = () => {
        setCollapsedTopicKeys(() => {
            const next: Record<string, boolean> = {};
            classworkTopicSections.forEach((section) => {
                next[section.key] = !allTopicSectionsCollapsed;
            });
            return next;
        });
    };

    const saveAssignment = async () => {
        if (!selectedClass) return;
        if (!assignmentTitle.trim()) {
            setMessage('Vui lòng nhập tiêu đề bài tập.');
            return;
        }

        const normalizedQuizQuestions = quizQuestions.map((question, questionIndex) => ({
            ...question,
            title: question.title.trim() || `Câu hỏi ${questionIndex + 1}`,
            points: String(Number(question.points) || 0),
            options: question.options.map((option, optionIndex) => ({ ...option, text: option.text.trim() || `Option ${optionIndex + 1}` })),
        }));

        if (assignmentKind === 'quiz') {
            const invalidQuestionIndex = normalizedQuizQuestions.findIndex((question) => !question.title.trim());
            if (invalidQuestionIndex >= 0) {
                setMessage(`Vui lòng nhập nội dung câu hỏi ${invalidQuestionIndex + 1}.`);
                return;
            }
            const invalidOptionsIndex = normalizedQuizQuestions.findIndex((question) => question.options.length < 2 || question.options.some((option) => !option.text.trim()));
            if (invalidOptionsIndex >= 0) {
                setMessage(`Câu hỏi ${invalidOptionsIndex + 1} cần ít nhất 2 lựa chọn có nội dung.`);
                return;
            }
            const missingCorrectIndex = normalizedQuizQuestions.findIndex((question) => !question.options.some((option) => option.correct));
            if (missingCorrectIndex >= 0) {
                setMessage(`Vui lòng chọn đáp án đúng cho câu hỏi ${missingCorrectIndex + 1}.`);
                return;
            }
        } else {
            if (promptMode === 'text' && !promptText.trim()) {
                setMessage('Vui lòng nhập đề tự luận.');
                return;
            }
            if (promptMode === 'image' && !promptImageData) {
                setMessage('Vui lòng tải hình ảnh đề tự luận.');
                return;
            }
            if (answerMode === 'image' && !answerImageData) {
                setMessage('Vui lòng tải hình ảnh đáp án hoặc chuyển sang đánh máy.');
                return;
            }
        }

        const quizPromptText = formatQuizPrompt(normalizedQuizQuestions);
        const quizAnswerText = formatQuizAnswers(normalizedQuizQuestions);
        const resolvedPromptMode = assignmentKind === 'quiz' ? 'text' : promptMode;
        const resolvedAnswerMode = assignmentKind === 'quiz' ? 'text' : answerMode;
        const resolvedPromptText = assignmentKind === 'quiz' ? quizPromptText : promptText.trim();
        const resolvedAnswerText = assignmentKind === 'quiz' ? quizAnswerText : answerText.trim();
        const resolvedMaxScore = assignmentKind === 'quiz' && quizTotalScore > 0 ? quizTotalScore : Number(assignmentMaxScore) || 10;

        setSaving(true);
        try {
            const editingId = editingAssignmentId;
            const response = await fetch(`${API_URL}/api/tests${editingId ? `/${editingId}` : ''}`, {
                method: editingId ? 'PUT' : 'POST',
                headers,
                body: JSON.stringify({
                    class_id: selectedClass.id,
                    title: assignmentTitle.trim(),
                    description: assignmentKind === 'quiz' ? `${normalizedQuizQuestions.length} câu trắc nghiệm` : (promptText.trim() || (promptImageName ? `Đề bài bằng hình ảnh: ${promptImageName}` : '')),
                    type: 'assignment',
                    due_date: assignmentDueDate || null,
                    max_score: resolvedMaxScore,
                    status: 'published',
                    assignment_kind: assignmentKind,
                    prompt_mode: resolvedPromptMode,
                    prompt_text: resolvedPromptText,
                    prompt_image_name: assignmentKind === 'quiz' ? null : (promptImageName || null),
                    prompt_image_data: assignmentKind === 'quiz' ? null : (promptImageData || null),
                    prompt_image_type: assignmentKind === 'quiz' ? null : (promptImageType || null),
                    answer_mode: resolvedAnswerMode,
                    answer_text: resolvedAnswerText,
                    answer_image_name: assignmentKind === 'quiz' ? null : (answerImageName || null),
                    answer_image_data: assignmentKind === 'quiz' ? null : (answerImageData || null),
                    answer_image_type: assignmentKind === 'quiz' ? null : (answerImageType || null),
                    topic_id: selectedTopicId && Number(selectedTopicId) > 0 ? Number(selectedTopicId) : null,
                    topic_title: selectedTopic?.title || null,
                    quiz_payload: assignmentKind === 'quiz' ? normalizedQuizQuestions : [],
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Không thể lưu bài tập.');
            setTests((previous) => editingId ? previous.map((item) => item.id === editingId ? data.test : item) : [data.test, ...previous]);
            setGradebook(null);
            onClassworkChanged?.();
            setMessage(editingId ? 'Đã cập nhật bài tập.' : (assignmentKind === 'essay' ? 'Đã tạo bài tự luận cho học sinh.' : 'Đã tạo bài trắc nghiệm cho học sinh.'));
            resetAssignmentForm();
            setEditingAssignmentId(null);
            setAssignmentCreateModal(null);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể lưu bài tập.');
        } finally {
            setSaving(false);
        }
    };

    const uploadMaterial = async () => {
        if (!selectedClass) return;
        if (!materialTitle.trim()) {
            setMessage('Vui lòng nhập tiêu đề tài liệu.');
            return;
        }
        if (!materialFileData && !materialExternalLink.trim()) {
            setMessage('Vui lòng tải tài liệu hoặc nhập liên kết tài liệu.');
            return;
        }
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/api/materials`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    class_id: selectedClass.id,
                    title: materialTitle.trim(),
                    description: materialDescription.trim(),
                    external_link: materialExternalLink.trim() || null,
                    file_name: materialFileName || null,
                    file_data: materialFileData || null,
                    file_size: materialFileSize || null,
                    file_type: materialFileType || null,
                    material_kind: 'document',
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Không thể tải tài liệu.');
            setMaterials((previous) => [data.material, ...previous]);
            resetMaterialForm();
            setAssignmentCreateModal(null);
            setMessage('Đã tải tài liệu lên lớp.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể tải tài liệu.');
        } finally {
            setSaving(false);
        }
    };

    const createTopic = async () => {
        if (!selectedClass) return;
        if (!topicTitle.trim()) {
            setMessage('Vui lòng nhập tên chủ đề.');
            return;
        }
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/api/classes/${selectedClass.id}/topics`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ title: topicTitle.trim(), description: topicDescription.trim() }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Không thể tạo chủ đề.');
            setTopics((previous) => [data.topic, ...previous]);
            resetTopicForm();
            setAssignmentCreateModal(null);
            setMessage('Đã tạo chủ đề để sắp xếp bài tập.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể tạo chủ đề.');
        } finally {
            setSaving(false);
        }
    };

    const saveGrade = async (studentId: number, testId: number) => {
        if (!selectedClass) return;
        const key = `${studentId}-${testId}`;
        const draft = gradeDrafts[key] ?? { score: '', feedback: '' };
        if (draft.score.trim() === '') {
            setMessage('Vui lòng nhập điểm trước khi lưu.');
            return;
        }
        setSavingGradeKey(key);
        try {
            const response = await fetch(`${API_URL}/api/classes/${selectedClass.id}/gradebook/grade`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    test_id: testId,
                    student_id: studentId,
                    score: Number(draft.score),
                    feedback: draft.feedback.trim(),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Không thể lưu điểm.');
            setGradebook(data.gradebook ?? null);
            setGradeDrafts(buildGradeDrafts(data.gradebook));
            setMessage('Đã cập nhật bảng điểm.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể lưu điểm.');
        } finally {
            setSavingGradeKey('');
        }
    };

    const updateGradeDraft = (key: string, field: keyof GradeDraft, value: string) => {
        setGradeDrafts((previous) => ({
            ...previous,
            [key]: {
                score: previous[key]?.score ?? '',
                feedback: previous[key]?.feedback ?? '',
                [field]: value,
            },
        }));
    };

    const syncNoticeEditor = () => {
        setNoticeContent(noticeEditorRef.current?.innerHTML || '');
    };

    const formatNotice = (command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList') => {
        noticeEditorRef.current?.focus();
        document.execCommand(command, false);
        syncNoticeEditor();
    };

    const closeNoticeModal = () => {
        if (saving) return;
        setShowNoticeModal(false);
    };

    const resetNoticeForm = () => {
        setNoticeTitle('');
        setNoticeContent('');
        setNoticeClassId(selectedClass ? String(selectedClass.id) : '');
        setNoticeAttachments([]);
        if (noticeEditorRef.current) noticeEditorRef.current.innerHTML = '';
    };

    const handleNoticeAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        if (!files.length) return;
        if (noticeAttachments.length + files.length > 3) {
            setMessage('Mỗi thông báo chỉ được tải tối đa 3 tệp.');
            event.target.value = '';
            return;
        }
        try {
            const attachments = await Promise.all(files.map(async (file) => {
                if (file.size > 6 * 1024 * 1024) throw new Error(`Tệp "${file.name}" vượt quá giới hạn 6MB.`);
                const data = await readFileAsDataUrl(file);
                return { id: makeLocalId('notice-file'), name: file.name, type: file.type || 'application/octet-stream', size: file.size, data, uploaded_at: new Date().toISOString() };
            }));
            setNoticeAttachments((previous) => [...previous, ...attachments]);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể đọc tệp thông báo.');
        } finally {
            event.target.value = '';
        }
    };

    const removeNoticeAttachment = (id?: string) => {
        setNoticeAttachments((previous) => previous.filter((item) => item.id !== id));
    };

    const postNotice = async () => {
        const plainNoticeContent = stripHtml(noticeContent).trim();
        const targetClassId = Number(noticeClassId || selectedClass?.id || 0);
        if (!targetClassId || !noticeTitle.trim() || !plainNoticeContent) return;
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/api/notifications`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    class_id: targetClassId,
                    title: noticeTitle.trim(),
                    content: plainNoticeContent,
                    content_html: noticeContent.trim(),
                    attachments: noticeAttachments,
                    type: 'class',
                    receiver_type: 'student',
                    priority: 'important',
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Không thể đăng thông báo.');
            setNotices((previous) => [data.notification, ...previous]);
            resetNoticeForm();
            setShowNoticeModal(false);
            setMessage('Đã đăng thông báo lên bảng tin lớp.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể đăng thông báo.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid min-h-[calc(100vh-160px)] gap-5">
            <section className="min-w-0">
                {showReview ? (
                    <div className="overflow-hidden rounded-[30px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
                        <div className="p-5">
                            <h2 className="text-xl font-black text-[var(--color-text)]">Cần đánh giá</h2>
                        </div>
                        <div className="flex gap-2 overflow-x-auto border-y border-[var(--color-border)] px-3 py-2">
                            {reviewTabs.map((tab) => (
                                <button key={tab.id} type="button" onClick={() => setReviewTab(tab.id)} className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-black transition ${reviewTab === tab.id ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text)]'}`}>{tab.label}</button>
                            ))}
                        </div>
                        <div className="p-5">
                            {displayedReviewItems.length ? (
                                <div className="grid gap-3">
                                    {displayedReviewItems.map((item) => (
                                        <article key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-base font-black text-[var(--color-text)]">{item.title}</h3>
                                                    <p className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">{reviewTab === 'pending' && 'submitted_at' in item ? `Nộp ${formatDate(item.submitted_at)}` : `Hạn ${formatDate(item.due_date)}`}</p>
                                                </div>
                                                <Badge tone={reviewTab === 'pending' ? 'warning' : 'success'}>{reviewTab === 'pending' ? 'Cần đánh giá' : 'Đã đánh giá'}</Badge>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState title={activeReviewTab.emptyTitle} />
                            )}
                        </div>
                    </div>
                ) : selectedClass ? (
                    <div className="grid gap-5">
                        {!hideClassTabs && <nav className="fixed left-0 right-0 top-0 z-50 overflow-hidden border-b border-slate-200 bg-white shadow-sm dark:border-[var(--color-border)] dark:bg-[var(--color-card)] lg:left-[var(--sidebar-offset)]" aria-label="Menu lớp học">
                            <div className="flex h-16 items-end gap-8 overflow-x-auto px-6 sm:px-8">
                                {classTabs.map((tab) => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`relative flex h-full shrink-0 items-center px-1 pt-1 text-sm font-black transition ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 hover:text-blue-700 dark:text-[var(--color-text-secondary)] dark:hover:text-blue-300'}`}>
                                            {tab.label}
                                            <span className={`absolute bottom-0 left-0 h-1 w-full bg-blue-600 transition ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                                        </button>
                                    );
                                })}
                            </div>
                        </nav>}

                        {message && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">{message}</div>}

                        {activeTab === 'stream' && (
                            <Panel
                                title="Bảng tin"
                                action={<PrimaryButton type="button" onClick={() => setShowNoticeModal(true)} className="rounded-2xl px-5 py-3 text-sm font-black">Thông báo mới</PrimaryButton>}
                            >
                                <div className="grid gap-3">
                                    {streamNotices.map((item) => <NoticeRow key={item.id} item={item} />)}
                                    {!streamNotices.length && <EmptyState title="Chưa có thông báo lớp" />}
                                </div>
                            </Panel>
                        )}

                        {activeTab === 'attendance' && (
                            user ? (
                                <AttendancePanel
                                    user={user}
                                    classes={[selectedClass]}
                                    selectedClassId={selectedClass.id}
                                    setSelectedClassId={(id) => setSelectedClassId?.(id)}
                                    embedded
                                />
                            ) : (
                                <EmptyState title="Chưa thể mở điểm danh" />
                            )
                        )}

                        {activeTab === 'assignments' && (
                            <Panel title="Bài tập trên lớp" noPadding>
                                <div className="grid gap-7 p-5 sm:p-6">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="grid gap-4">
                                            <div className="relative w-max">
                                                <PrimaryButton type="button" onClick={() => setAssignmentCreateMenuOpen((value) => !value)} className="rounded-full px-5 py-3 text-sm font-black shadow-sm">
                                                    <span className="mr-2 text-lg leading-none">+</span> Tạo
                                                </PrimaryButton>
                                                {assignmentCreateMenuOpen && (
                                                    <div className="absolute left-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 text-left shadow-2xl">
                                                        {assignmentTabs.map((tab) => (
                                                            <button key={tab.id} type="button" onClick={() => openAssignmentCreateModal(tab.id)} className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--color-bg-soft)]">
                                                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                                                                    {tab.id === 'assignment' ? <FileIcon size={16} /> : tab.id === 'material' ? <UploadIcon size={16} /> : <BookIcon size={16} />}
                                                                </span>
                                                                <span className="min-w-0">
                                                                    <span className="block text-sm font-black text-[var(--color-text)]">{tab.label}</span>

                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <label className="relative block w-full max-w-sm rounded-md border border-slate-400 bg-[var(--color-card)] px-4 pb-2 pt-4 text-left dark:border-[var(--color-border)]">
                                                <span className="absolute -top-2 left-3 bg-[var(--color-card)] px-1 text-xs font-semibold text-[var(--color-text-muted)]">Bộ lọc theo chủ đề</span>
                                                <select value={classworkTopicFilter} onChange={(event) => setClassworkTopicFilter(event.target.value)} className="h-9 w-full bg-transparent text-sm font-semibold text-[var(--color-text)] outline-none">
                                                    <option value="all">Tất cả chủ đề</option>
                                                    {topicOptions.map((topic) => <option key={getTopicKey(topic)} value={getTopicKey(topic)}>{topic.title}</option>)}
                                                </select>
                                            </label>
                                        </div>
                                        {topicOptions.length > 0 && (
                                            <button type="button" onClick={toggleAllTopics} className="mt-20 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-950/30">
                                                <span className="text-lg leading-none">⌄⌃</span>
                                                {allTopicSectionsCollapsed ? 'Mở rộng tất cả' : 'Thu gọn tất cả'}
                                            </button>
                                        )}
                                    </div>

                                    {hasClassworkContent ? (
                                        <div className="grid gap-7">
                                            {classworkTopicSections.map((section) => (
                                                <TopicSection
                                                    key={section.key}
                                                    topic={section.topic}
                                                    collapsed={Boolean(collapsedTopicKeys[section.key])}
                                                    onToggle={() => toggleTopicCollapse(section.key)}
                                                >
                                                    {section.assignments.length ? (
                                                        <div className="grid gap-3 pt-3">
                                                            {section.assignments.map((item) => (
                                                                <ClassworkItem
                                                                    key={item.id}
                                                                    icon={<FileIcon size={17} />}
                                                                    eyebrow={assignmentKindLabel(item.assignment_kind)}
                                                                    title={item.title}
                                                                    meta={`Hạn nộp ${formatDate(item.due_date)} • Đã nộp ${item.submitted_count ?? 0}/${item.enrolled_count ?? selectedClass.student_count ?? 0} • Cần chấm ${item.ungraded_count ?? 0}`}
                                                                    onEdit={() => openAssignmentEditModal(item)}
                                                                />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="pt-3 text-sm font-semibold text-[var(--color-text-secondary)]">Học viên sẽ thấy chủ đề này sau khi bạn thêm bài tập</p>
                                                    )}
                                                </TopicSection>
                                            ))}

                                            {ungroupedAssignments.length > 0 && (
                                                <section className="grid gap-3 border-t border-[var(--color-border)] pt-5">
                                                    <h3 className="text-xl font-semibold uppercase tracking-[-0.02em] text-[var(--color-text)]">Chưa gắn chủ đề</h3>
                                                    <div className="grid gap-3">
                                                        {ungroupedAssignments.map((item) => (
                                                            <ClassworkItem
                                                                key={item.id}
                                                                icon={<FileIcon size={17} />}
                                                                eyebrow={assignmentKindLabel(item.assignment_kind)}
                                                                title={item.title}
                                                                meta={`Hạn nộp ${formatDate(item.due_date)} • Đã nộp ${item.submitted_count ?? 0}/${item.enrolled_count ?? selectedClass.student_count ?? 0} • Cần chấm ${item.ungraded_count ?? 0}`}
                                                                onEdit={() => openAssignmentEditModal(item)}
                                                            />
                                                        ))}
                                                    </div>
                                                </section>
                                            )}

                                            {classworkTopicFilter === 'all' && materials.length > 0 && (
                                                <section className="grid gap-3 border-t border-[var(--color-border)] pt-5">
                                                    <h3 className="text-xl font-semibold uppercase tracking-[-0.02em] text-[var(--color-text)]">Tài liệu</h3>
                                                    <div className="grid gap-3">
                                                        {materials.map((item) => <MaterialRow key={item.id} item={item} />)}
                                                    </div>
                                                </section>
                                            )}
                                        </div>
                                    ) : (
                                        <ClassworkEmptyState />
                                    )}
                                </div>
                            </Panel>
                        )}

                        {activeTab === 'question-bank' && user && (
                            <QuestionBankPanel
                                user={user}
                                classes={activeClasses}
                                selectedClassId={selectedClass.id}
                                setSelectedClassId={setSelectedClassId}
                            />
                        )}

                        {activeTab === 'gradebook' && (
                            <Panel title="Bảng điểm" action={<Button size="sm" onClick={() => setActiveTab('assignments')}>Tạo bài tập</Button>}>
                                {gradebookLoading ? (
                                    <div className="grid gap-3">
                                        {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-3xl bg-[var(--color-bg-soft)]" />)}
                                    </div>
                                ) : gradebook && gradebook.assignments.length ? (
                                    <div className="overflow-x-auto rounded-3xl border border-[var(--color-border)]">
                                        <table className="w-full min-w-[980px] border-collapse bg-[var(--color-card)] text-left text-xs">
                                            <thead className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]">
                                                <tr>
                                                    <th className="sticky left-0 z-10 min-w-[220px] border-b border-r border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm font-black text-[var(--color-text)]">Tên</th>
                                                    {gradebook.assignments.map((assignment) => (
                                                        <th key={assignment.id} className="min-w-[260px] border-b border-r border-[var(--color-border)] px-4 py-3 align-top">
                                                            <span className="block text-sm font-black text-[var(--color-text)]">{assignment.title}</span>
                                                            <span className="mt-1 block font-semibold">{assignmentKindLabel(assignment.assignment_kind)} • {assignment.topic_title || 'Chưa gắn chủ đề'} • {assignment.max_score ?? 10} điểm</span>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {gradebook.rows.map((row) => (
                                                    <tr key={row.student_id} className="border-b border-[var(--color-border)] last:border-b-0">
                                                        <td className="sticky left-0 z-10 border-r border-[var(--color-border)] bg-[var(--color-card)] px-4 py-4 align-top">
                                                            <p className="text-sm font-black text-[var(--color-text)]">{row.student_name || row.username}</p>
                                                            <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">{row.student_code || 'Chưa có mã'} • @{row.username}</p>
                                                        </td>
                                                        {gradebook.assignments.map((assignment) => {
                                                            const cell = row.scores.find((item) => item.test_id === assignment.id);
                                                            const key = `${row.student_id}-${assignment.id}`;
                                                            const draft = gradeDrafts[key] ?? { score: '', feedback: '' };
                                                            const statusText = cell?.status === 'graded' ? 'Đã chấm' : cell?.status === 'submitted' ? 'Đã nộp' : 'Chưa nộp';
                                                            return (
                                                                <td key={assignment.id} className="border-r border-[var(--color-border)] px-4 py-4 align-top">
                                                                    <div className="grid gap-2">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <Badge tone={cell?.status === 'graded' ? 'success' : cell?.status === 'submitted' ? 'warning' : 'neutral'}>{statusText}</Badge>
                                                                            <span className="text-[11px] font-bold text-[var(--color-text-muted)]">{cell?.submitted_at ? `Nộp ${formatDate(cell.submitted_at)}` : 'Chưa có bài nộp'}</span>
                                                                        </div>
                                                                        {cell?.answer || cell?.file_url ? (
                                                                            <div className="grid gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3">
                                                                                <p className="text-[11px] font-black uppercase tracking-wide text-[var(--color-primary)]">Bài nộp</p>
                                                                                {cell.answer && <p className="max-h-28 overflow-auto whitespace-pre-wrap text-xs font-semibold leading-5 text-[var(--color-text-secondary)]">{cell.answer}</p>}
                                                                                {cell.file_url && <p className="truncate text-[11px] font-bold text-[var(--color-text-muted)]">Tệp: {cell.file_url}</p>}
                                                                            </div>
                                                                        ) : null}
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max={Number(assignment.max_score ?? 10)}
                                                                            step="0.25"
                                                                            value={draft.score}
                                                                            onChange={(event) => updateGradeDraft(key, 'score', event.target.value)}
                                                                            placeholder="Điểm"
                                                                            className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-3 text-sm font-black text-slate-950 outline-none focus:border-[var(--color-primary)] dark:bg-white dark:text-slate-950"
                                                                        />
                                                                        <textarea
                                                                            value={draft.feedback}
                                                                            onChange={(event) => updateGradeDraft(key, 'feedback', event.target.value)}
                                                                            placeholder="Nhận xét / phản hồi"
                                                                            rows={2}
                                                                            className="rounded-2xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-slate-950 outline-none focus:border-[var(--color-primary)] dark:bg-white dark:text-slate-950"
                                                                        />
                                                                        <Button size="sm" variant="primary" onClick={() => void saveGrade(row.student_id, assignment.id)} disabled={savingGradeKey === key || draft.score.trim() === ''}>
                                                                            {savingGradeKey === key ? 'Đang lưu...' : 'Lưu điểm'}
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <EmptyState title="Chưa có cột điểm" action={<PrimaryButton type="button" onClick={() => setActiveTab('assignments')}>Tạo bài tập đầu tiên</PrimaryButton>} />
                                )}
                            </Panel>
                        )}

                        {activeTab === 'people' && (
                            <Panel title="Thành viên">
                                <div className="grid gap-3">
                                    <Row icon={BookIcon} title={selectedClass.teacher_name || 'Giáo viên phụ trách'} meta="Giáo viên" />
                                    {(activeDetail?.students ?? []).map((item) => <Row key={item.id} icon={UsersIcon} title={item.full_name || item.username} meta={`Học sinh • @${item.username}`} />)}
                                </div>
                            </Panel>
                        )}
                    </div>
                ) : (
                    <EmptyState title="Chưa có lớp học" />
                )}
            </section>
            {assignmentCreateModal === 'assignment' && (
                <CreateModal title={editingAssignmentId ? 'Chỉnh sửa bài tập' : 'Tạo bài tập'} saving={saving} onClose={closeAssignmentCreateModal}>
                    <div className="grid gap-5">
                        <div className="grid gap-3 lg:grid-cols-[1fr_220px_140px]">
                            <input value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} placeholder="Tiêu đề bài tập" className="h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-bold outline-none focus:border-[var(--color-primary)]" />
                            <input type="datetime-local" value={assignmentDueDate} onChange={(event) => setAssignmentDueDate(event.target.value)} className="h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-bold outline-none focus:border-[var(--color-primary)]" />
                            <input type="number" min="0" step="0.25" value={assignmentKind === 'quiz' && quizTotalScore > 0 ? String(quizTotalScore) : assignmentMaxScore} onChange={(event) => setAssignmentMaxScore(event.target.value)} disabled={assignmentKind === 'quiz' && quizTotalScore > 0} placeholder="Điểm tối đa" className="h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-bold outline-none focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-70" />
                        </div>

                        <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
                            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2">
                                <button type="button" onClick={() => setAssignmentKind('quiz')} className={`rounded-xl px-4 py-3 text-sm font-black transition ${assignmentKind === 'quiz' ? 'bg-blue-600 text-white shadow-sm' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)]'}`}>Trắc nghiệm</button>
                                <button type="button" onClick={() => setAssignmentKind('essay')} className={`rounded-xl px-4 py-3 text-sm font-black transition ${assignmentKind === 'essay' ? 'bg-purple-600 text-white shadow-sm' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)]'}`}>Tự luận</button>
                            </div>
                            <select value={selectedTopicId} onChange={(event) => setSelectedTopicId(event.target.value)} className="h-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-bold outline-none focus:border-[var(--color-primary)]">
                                <option value="">Chọn chủ đề / học phần</option>
                                {topicOptions.map((topic) => <option key={getTopicKey(topic)} value={getTopicKey(topic)}>{topic.title}</option>)}
                            </select>
                        </div>

                        {assignmentKind === 'quiz' ? (
                            <div className="relative rounded-[2rem] bg-indigo-50 p-3 dark:bg-indigo-950/20 sm:p-5">
                                <div className="grid gap-4 lg:grid-cols-[1fr_56px]">
                                    <div className="grid gap-4">
                                        {quizQuestions.map((question, index) => (
                                            <QuizQuestionCard
                                                key={question.id}
                                                question={question}
                                                index={index}
                                                canDelete={quizQuestions.length > 1}
                                                onQuestionChange={(value) => updateQuizQuestion(question.id, { title: value })}
                                                onPointsChange={(value) => updateQuizQuestion(question.id, { points: value })}
                                                onRequiredChange={(value) => updateQuizQuestion(question.id, { required: value })}
                                                onImageChange={(event) => void handleQuizQuestionImage(event, question.id)}
                                                onRemoveImage={() => removeQuizQuestionImage(question.id)}
                                                onOptionChange={(optionId, value) => updateQuizOption(question.id, optionId, value)}
                                                onOptionImageChange={(event, optionId) => void handleQuizOptionImage(event, question.id, optionId)}
                                                onRemoveOptionImage={(optionId) => removeQuizOptionImage(question.id, optionId)}
                                                onCorrectChange={(optionId) => setCorrectQuizOption(question.id, optionId)}
                                                onAddOption={() => addQuizOption(question.id)}
                                                onDeleteOption={(optionId) => deleteQuizOption(question.id, optionId)}
                                                onDuplicate={() => duplicateQuizQuestion(question.id)}
                                                onDelete={() => deleteQuizQuestion(question.id)}
                                            />
                                        ))}
                                    </div>
                                    <div className="sticky top-24 hidden h-max rounded-2xl border border-slate-200 bg-white p-2 shadow-md lg:grid">
                                        <button type="button" onClick={addQuizQuestion} className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition hover:bg-blue-50 hover:text-blue-600" title="Thêm câu hỏi">⊕</button>
                                        <button type="button" className="grid h-10 w-10 place-items-center rounded-xl text-slate-400" title="Nhập câu hỏi">⇥</button>
                                        <button type="button" className="grid h-10 w-10 place-items-center rounded-xl text-slate-400" title="Thêm tiêu đề">Tt</button>
                                        <button type="button" className="grid h-10 w-10 place-items-center rounded-xl text-slate-400" title="Thêm hình ảnh">▧</button>
                                    </div>
                                </div>
                                <button type="button" onClick={addQuizQuestion} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border border-blue-200 bg-white px-5 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50 lg:hidden">+ Thêm câu hỏi</button>
                            </div>
                        ) : (
                            <div className="grid gap-3 rounded-[2rem] border-l-4 border-purple-500 bg-purple-50 p-4 dark:bg-purple-950/20">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-black text-[var(--color-text)]">Đề tự luận</p>
                                        <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Ô nhập chỉ hiển thị khi chọn kiểu tự luận.</p>
                                    </div>
                                    <ModeSwitch value={promptMode} onChange={setPromptMode} />
                                </div>
                                {promptMode === 'text' ? (
                                    <textarea value={promptText} onChange={(event) => setPromptText(event.target.value)} rows={8} placeholder="Nhập đề tự luận / yêu cầu bài làm..." className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:border-[var(--color-primary)] dark:bg-white dark:text-slate-950" />
                                ) : (
                                    <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-purple-200 bg-white p-4 text-center text-sm font-bold text-slate-600 dark:bg-white dark:text-slate-600">
                                        <UploadIcon size={22} />
                                        <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleAssignmentFile(event, 'prompt')} />
                                        {promptImageName || 'Tải hình ảnh đề tự luận'}
                                        {promptImageData && <img src={promptImageData} alt="Ảnh đề tự luận" className="max-h-44 rounded-2xl border border-slate-200 object-contain" />}
                                    </label>
                                )}
                                <div className="grid gap-3 rounded-2xl border border-purple-200 bg-white p-4 dark:bg-white">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-black text-slate-950">Đáp án / rubric tự luận</p>
                                            <p className="text-xs font-semibold text-slate-600">Tách riêng khỏi đề bài; có thể đánh máy hoặc tải hình ảnh đáp án.</p>
                                        </div>
                                        <ModeSwitch value={answerMode} onChange={setAnswerMode} />
                                    </div>
                                    {answerMode === 'text' ? (
                                        <textarea value={answerText} onChange={(event) => setAnswerText(event.target.value)} rows={4} placeholder="Rubric / hướng dẫn chấm (không bắt buộc)" className="w-full rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:border-purple-500" />
                                    ) : (
                                        <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-purple-200 bg-purple-50 p-4 text-center text-sm font-bold text-slate-600">
                                            <UploadIcon size={22} />
                                            <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleAssignmentFile(event, 'answer')} />
                                            {answerImageName || 'Tải hình ảnh đáp án / rubric'}
                                            {answerImageData && <img src={answerImageData} alt="Ảnh đáp án tự luận" className="max-h-36 rounded-2xl border border-slate-200 object-contain" />}
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-end">
                            <button type="button" onClick={closeAssignmentCreateModal} disabled={saving} className="min-h-11 rounded-2xl px-5 text-sm font-black text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)] disabled:opacity-50">Hủy</button>
                            <PrimaryButton type="button" onClick={saveAssignment} disabled={saving || !assignmentTitle.trim()} className="min-h-11 rounded-2xl px-6 text-sm font-black">
                                {saving ? (editingAssignmentId ? 'Đang lưu...' : 'Đang tạo...') : editingAssignmentId ? 'Lưu thay đổi' : assignmentKind === 'essay' ? 'Tạo bài tự luận' : `Tạo ${quizQuestions.length} câu trắc nghiệm`}
                            </PrimaryButton>
                        </div>
                    </div>
                </CreateModal>
            )}
            {assignmentCreateModal === 'material' && (
                <CreateModal title="Tạo tài liệu" saving={saving} onClose={closeAssignmentCreateModal}>
                    <div className="grid gap-4">
                        <div className="grid gap-3 lg:grid-cols-2">
                            <input value={materialTitle} onChange={(event) => setMaterialTitle(event.target.value)} placeholder="Tên tài liệu" className="h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-bold outline-none focus:border-[var(--color-primary)]" />
                            <input value={materialExternalLink} onChange={(event) => setMaterialExternalLink(event.target.value)} placeholder="Liên kết tài liệu nếu có" className="h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-bold outline-none focus:border-[var(--color-primary)]" />
                            <textarea value={materialDescription} onChange={(event) => setMaterialDescription(event.target.value)} placeholder="Mô tả tài liệu" rows={4} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)] lg:col-span-2" />
                            <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 text-sm font-bold text-[var(--color-text-secondary)] lg:col-span-2">
                                <UploadIcon size={18} />
                                <input type="file" className="hidden" onChange={(event) => void handleMaterialFile(event)} />
                                {materialFileName ? `${materialFileName} • ${materialFileSize}` : 'Tải tài liệu lên'}
                            </label>
                        </div>
                        <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-end">
                            <button type="button" onClick={closeAssignmentCreateModal} disabled={saving} className="min-h-11 rounded-2xl px-5 text-sm font-black text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)] disabled:opacity-50">Hủy</button>
                            <PrimaryButton type="button" onClick={uploadMaterial} disabled={saving || !materialTitle.trim()} className="min-h-11 rounded-2xl px-6 text-sm font-black">{saving ? 'Đang tải...' : 'Tải tài liệu'}</PrimaryButton>
                        </div>
                    </div>
                </CreateModal>
            )}
            {assignmentCreateModal === 'topic' && (
                <CreateModal title="Tạo chủ đề" saving={saving} onClose={closeAssignmentCreateModal}>
                    <div className="grid gap-4">
                        <input value={topicTitle} onChange={(event) => setTopicTitle(event.target.value)} placeholder="Tên chủ đề / chương" className="h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-bold outline-none focus:border-[var(--color-primary)]" />
                        <textarea value={topicDescription} onChange={(event) => setTopicDescription(event.target.value)} placeholder="Mô tả ngắn" rows={4} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)]" />
                        <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-end">
                            <button type="button" onClick={closeAssignmentCreateModal} disabled={saving} className="min-h-11 rounded-2xl px-5 text-sm font-black text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)] disabled:opacity-50">Hủy</button>
                            <PrimaryButton type="button" onClick={createTopic} disabled={saving || !topicTitle.trim()} className="min-h-11 rounded-2xl px-6 text-sm font-black">{saving ? 'Đang tạo...' : 'Tạo chủ đề'}</PrimaryButton>
                        </div>
                    </div>
                </CreateModal>
            )}
            {showNoticeModal && selectedClass && (
                <NoticeModal
                    title={noticeTitle}
                    content={noticeContent}
                    classId={noticeClassId || String(selectedClass.id)}
                    classes={activeClasses}
                    attachments={noticeAttachments}
                    editorRef={noticeEditorRef}
                    saving={saving}
                    canSubmit={Boolean(noticeTitle.trim() && stripHtml(noticeContent).trim())}
                    onTitleChange={setNoticeTitle}
                    onClassChange={setNoticeClassId}
                    onContentChange={syncNoticeEditor}
                    onFormat={formatNotice}
                    onAttachmentChange={handleNoticeAttachment}
                    onRemoveAttachment={removeNoticeAttachment}
                    onClose={closeNoticeModal}
                    onSubmit={postNotice}
                />
            )}
        </div>
    );
});

function CreateModal({ title, saving, onClose, children }: { title: string; subtitle?: string; saving: boolean; onClose: () => void; children: ReactNode }) {
    return (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-card)] px-5 py-4 sm:px-6">
                    <div>
                        <h2 className="text-xl font-black text-[var(--color-text)]">{title}</h2>
                    </div>
                    <button type="button" onClick={onClose} disabled={saving} aria-label="Đóng" className="grid h-10 w-10 place-items-center rounded-2xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text)] disabled:opacity-50">
                        <XIcon size={20} />
                    </button>
                </div>
                <div className="p-5 sm:p-6">{children}</div>
            </div>
        </div>
    );
}

function ClassworkEmptyState() {
    return (
        <div className="grid min-h-[420px] place-items-center border-t border-[var(--color-border)] text-center">
            <div className="mx-auto max-w-sm px-4">
                <div className="mx-auto mb-8 grid h-24 w-36 place-items-center rounded-[2rem] bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                    <FileIcon size={42} />
                </div>
                <h3 className="text-base font-black text-[var(--color-text)]">Đây là nơi giao bài tập</h3>
            </div>
        </div>
    );
}

function TopicSection({ topic, collapsed, onToggle, children }: { topic: ClassTopic; collapsed: boolean; onToggle: () => void; children: ReactNode }) {
    return (
        <section className="grid gap-2">
            <div className="flex items-center gap-3 border-b border-slate-300 pb-4 dark:border-[var(--color-border)]">
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xl font-semibold uppercase tracking-[-0.02em] text-[var(--color-text)]">{topic.title}</h3>

                </div>
                <button type="button" onClick={onToggle} aria-label={collapsed ? 'Mở rộng chủ đề' : 'Thu gọn chủ đề'} className="grid h-10 w-10 place-items-center rounded-full text-xl font-black text-slate-600 transition hover:bg-[var(--color-bg-soft)] dark:text-[var(--color-text-secondary)]">
                    {collapsed ? '⌄' : '⌃'}
                </button>
                <button type="button" aria-label="Tùy chọn chủ đề" className="grid h-10 w-10 place-items-center rounded-full text-xl font-black text-slate-600 transition hover:bg-[var(--color-bg-soft)] dark:text-[var(--color-text-secondary)]">⋮</button>
            </div>
            {!collapsed && children}
        </section>
    );
}

function QuizQuestionCard({
    question,
    index,
    canDelete,
    onQuestionChange,
    onPointsChange,
    onRequiredChange,
    onImageChange,
    onRemoveImage,
    onOptionChange,
    onOptionImageChange,
    onRemoveOptionImage,
    onCorrectChange,
    onAddOption,
    onDeleteOption,
    onDuplicate,
    onDelete,
}: {
    question: QuizQuestion;
    index: number;
    canDelete: boolean;
    onQuestionChange: (value: string) => void;
    onPointsChange: (value: string) => void;
    onRequiredChange: (value: boolean) => void;
    onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onRemoveImage: () => void;
    onOptionChange: (optionId: string, value: string) => void;
    onOptionImageChange: (event: ChangeEvent<HTMLInputElement>, optionId: string) => void;
    onRemoveOptionImage: (optionId: string) => void;
    onCorrectChange: (optionId: string) => void;
    onAddOption: () => void;
    onDeleteOption: (optionId: string) => void;
    onDuplicate: () => void;
    onDelete: () => void;
}) {
    return (
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-700 dark:bg-white dark:text-slate-950">
            <div className="h-1.5 bg-blue-600" />
            <div className="grid gap-5 p-4 sm:p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_46px_220px] lg:items-start">
                    <input
                        value={question.title}
                        onChange={(event) => onQuestionChange(event.target.value)}
                        placeholder={`Câu hỏi ${index + 1}`}
                        className="h-14 border-0 border-b border-slate-300 bg-slate-50 px-4 text-base font-medium text-slate-950 outline-none transition focus:border-blue-600"
                    />
                    <label className="grid h-12 w-12 cursor-pointer place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100" title="Thêm hình ảnh câu hỏi">
                        <UploadIcon size={18} />
                        <input type="file" accept="image/*" className="hidden" onChange={onImageChange} />
                    </label>
                    <select value="quiz" disabled className="h-14 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none">
                        <option value="quiz">Trắc nghiệm</option>
                    </select>
                </div>

                {question.imageData && (
                    <div className="relative w-max max-w-full">
                        <img src={question.imageData} alt={question.imageName || question.title} className="max-h-44 rounded-2xl border border-slate-200 object-contain" />
                        <button type="button" onClick={onRemoveImage} className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white shadow-lg">×</button>
                    </div>
                )}

                <div className="grid gap-3">
                    {question.options.map((option, optionIndex) => (
                        <div key={option.id} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2 sm:grid-cols-[24px_1fr_44px_34px] sm:items-center">
                            <input type="radio" checked={option.correct} onChange={() => onCorrectChange(option.id)} className="h-5 w-5 accent-blue-600" aria-label={`Đáp án đúng ${optionIndex + 1}`} />
                            <div className="grid gap-2">
                                <input
                                    value={option.text}
                                    onChange={(event) => onOptionChange(option.id, event.target.value)}
                                    placeholder={`Option ${optionIndex + 1}`}
                                    className="h-11 border-0 border-b border-slate-200 bg-transparent px-2 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-600"
                                />
                                {option.imageData && (
                                    <div className="relative w-max max-w-full">
                                        <img src={option.imageData} alt={option.imageName || `Ảnh đáp án ${optionIndex + 1}`} className="max-h-28 rounded-xl border border-slate-200 object-contain" />
                                        <button type="button" onClick={() => onRemoveOptionImage(option.id)} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-xs text-white shadow-lg">×</button>
                                    </div>
                                )}
                            </div>
                            <label className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-blue-600" title="Tải hình ảnh đáp án">
                                <UploadIcon size={16} />
                                <input type="file" accept="image/*" className="hidden" onChange={(event) => onOptionImageChange(event, option.id)} />
                            </label>
                            <button type="button" onClick={() => onDeleteOption(option.id)} disabled={question.options.length <= 1} className="grid h-9 w-9 place-items-center rounded-full text-lg text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-30">×</button>
                        </div>
                    ))}
                    <button type="button" onClick={onAddOption} className="w-max pl-8 text-sm font-semibold text-slate-500 transition hover:text-blue-600">
                        Thêm tùy chọn <span className="text-slate-400">hoặc</span> <span className="font-black text-blue-600">thêm “Câu trả lời khác”</span>
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <label className="inline-flex items-center gap-2 text-sm font-black text-blue-600">
                        <input type="radio" checked={question.options.some((option) => option.correct)} readOnly className="h-5 w-5 accent-blue-600" />
                        Đáp án
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                            <input type="number" min="0" step="0.25" value={question.points} onChange={(event) => onPointsChange(event.target.value)} className="h-10 w-20 rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600" />
                            điểm
                        </label>
                        <button type="button" onClick={onDuplicate} className="grid h-10 w-10 place-items-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100">⧉</button>
                        <button type="button" onClick={onDelete} disabled={!canDelete} className="grid h-10 w-10 place-items-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-30">🗑</button>
                        <span className="hidden h-8 w-px bg-slate-200 sm:block" />
                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                            Bắt buộc
                            <input type="checkbox" checked={question.required} onChange={(event) => onRequiredChange(event.target.checked)} className="h-5 w-5 accent-blue-600" />
                        </label>
                    </div>
                </div>
            </div>
        </article>
    );
}

function ClassworkItem({ icon, eyebrow, title, onEdit }: { icon: ReactNode; eyebrow: string; title: string; meta: string; onEdit?: () => void }) {
    return (
        <article className="flex items-start gap-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary-border)] hover:shadow-lg">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">{icon}</span>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">{eyebrow}</p>
                <h3 className="mt-1 truncate text-base font-black text-[var(--color-text)]">{title}</h3>
            </div>
            {onEdit && <button type="button" onClick={onEdit} className="shrink-0 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-black text-[var(--color-primary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]">Chỉnh sửa</button>}
        </article>
    );
}

function ModeSwitch({ value, onChange }: { value: ContentMode; onChange: (value: ContentMode) => void }) {
    return (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--color-bg-soft)] p-1 text-[11px] font-black">
            <button type="button" onClick={() => onChange('text')} className={`rounded-lg px-3 py-2 transition ${value === 'text' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card)]'}`}>Đánh máy</button>
            <button type="button" onClick={() => onChange('image')} className={`rounded-lg px-3 py-2 transition ${value === 'image' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card)]'}`}>Up hình</button>
        </div>
    );
}

function Row({ icon: Icon, title }: { icon: (props: { size?: number; className?: string }) => JSX.Element; title: string; meta: string }) {
    return (
        <article className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm"><Icon size={17} /></span>
            <div className="min-w-0">
                <h3 className="truncate text-sm font-black text-[var(--color-text)]">{title}</h3>
            </div>
        </article>
    );
}

function MaterialRow({ item }: { item: Material }) {
    
    return (
        <article className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm"><ChartIcon size={17} /></span>
            <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-black text-[var(--color-text)]">{item.title}</h3>

            </div>
        </article>
    );
}

function NoticeRow({ item }: { item: NotificationItem }) {
    const content = item.content_html || item.content || 'Cập nhật bảng tin';
    const attachments = item.attachments ?? [];

    return (
        <article className="flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm"><FileIcon size={17} /></span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-black text-[var(--color-text)]">{item.title}</h3>
                    <span className="text-[11px] font-black text-[var(--color-text-muted)]">{formatDate(item.created_at)}</span>
                </div>
                <RichNotificationContent html={item.content_html || content} fallback={item.content || content} className="mt-1 line-clamp-3 text-xs" />
                {attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {attachments.map((attachment, index) => (
                            <a key={attachment.id || `${attachment.name}-${index}`} href={attachment.data} download={attachment.name} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs font-black text-[var(--color-primary)]">
                                <UploadIcon size={14} /> {attachment.name}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </article>
    );
}

function NoticeModal({
    title,
    content,
    classId,
    classes,
    attachments,
    editorRef,
    saving,
    canSubmit,
    onTitleChange,
    onClassChange,
    onContentChange,
    onFormat,
    onAttachmentChange,
    onRemoveAttachment,
    onClose,
    onSubmit,
}: {
    title: string;
    content: string;
    classId: string;
    classes: ClassItem[];
    attachments: NotificationAttachment[];
    editorRef: RefObject<HTMLDivElement>;
    saving: boolean;
    canSubmit: boolean;
    onTitleChange: (value: string) => void;
    onClassChange: (value: string) => void;
    onContentChange: () => void;
    onFormat: (command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList') => void;
    onAttachmentChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onRemoveAttachment: (id?: string) => void;
    onClose: () => void;
    onSubmit: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="class-notice-title">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--color-primary)]">Bảng tin lớp</p>
                        <h2 id="class-notice-title" className="mt-1 text-xl font-black text-[var(--color-text)]">Thông báo mới</h2>
                    </div>
                    <button type="button" onClick={onClose} disabled={saving} className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] disabled:opacity-50" aria-label="Đóng popup">
                        <XIcon size={18} />
                    </button>
                </div>
                <div className="grid gap-4 px-5 py-5 sm:px-6">
                    <label className="grid gap-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                        Dành cho
                        <select value={classId} onChange={(event) => onClassChange(event.target.value)} disabled={saving} className="h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-border)] disabled:opacity-60">
                            {classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name} • {klass.code}</option>)}
                        </select>
                    </label>
                    <input
                        value={title}
                        onChange={(event) => onTitleChange(event.target.value)}
                        placeholder="Tiêu đề thông báo"
                        className="h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-border)]"
                    />
                    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)]">
                        <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)] p-2">
                            <button type="button" onClick={() => onFormat('bold')} className="h-9 min-w-9 rounded-xl px-3 text-sm font-black text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]">B</button>
                            <button type="button" onClick={() => onFormat('italic')} className="h-9 min-w-9 rounded-xl px-3 text-sm font-black italic text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]">I</button>
                            <button type="button" onClick={() => onFormat('underline')} className="h-9 min-w-9 rounded-xl px-3 text-sm font-black underline text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]">U</button>
                            <button type="button" onClick={() => onFormat('insertUnorderedList')} className="h-9 rounded-xl px-3 text-sm font-black text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]">• Bullet</button>
                            <label className="ml-auto inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-black text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]" title="Tải tệp lên">
                                <UploadIcon size={16} />
                                <span>Tệp</span>
                                <input type="file" multiple className="hidden" onChange={onAttachmentChange} />
                            </label>
                        </div>
                        <div
                            ref={editorRef}
                            contentEditable={!saving}
                            suppressContentEditableWarning
                            onInput={onContentChange}
                            data-placeholder="Nội dung thông báo cho học sinh"
                            className="min-h-[180px] px-4 py-3 text-sm font-semibold leading-6 text-[var(--color-text)] outline-none empty:before:text-[var(--color-text-muted)] empty:before:content-[attr(data-placeholder)] [&_b]:font-black [&_strong]:font-black [&_em]:italic [&_i]:italic [&_u]:underline [&_ul]:ml-5 [&_ul]:list-disc [&_li]:my-1"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    </div>
                    {attachments.length > 0 && (
                        <div className="grid gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3">
                            {attachments.map((attachment, index) => (
                                <div key={attachment.id || `${attachment.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-card)] px-3 py-2 text-xs font-black text-[var(--color-text-secondary)]">
                                    <span className="truncate">{attachment.name} • {attachment.size ? formatFileSize(attachment.size) : 'Tệp đính kèm'}</span>
                                    <button type="button" onClick={() => onRemoveAttachment(attachment.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] transition hover:bg-red-50 hover:text-red-600" aria-label="Xóa tệp">×</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg-soft)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                    <button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-2xl px-5 text-sm font-black text-[var(--color-text-secondary)] transition hover:bg-[var(--color-card)] disabled:opacity-50">Hủy</button>
                    <PrimaryButton type="button" onClick={onSubmit} disabled={saving || !canSubmit} className="min-h-11 rounded-2xl px-6 text-sm font-black">
                        {saving ? 'Đang đăng...' : 'Đăng lên'}
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
}
