import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, PrimaryButton } from '../../../components/shared/ui';
import { BookIcon, DownloadIcon, FileIcon, InfoIcon, PlayIcon, SearchIcon, StarIcon, UploadIcon, XIcon } from '../../../components/shared/icons';
import { API_URL } from '../../../services/api';
import type { ClassItem, Material, User } from '../../../types';
import type { OnlineExam, QuestionItem } from '../../exams/types';

type LibraryCategory = 'Sách' | 'Slide' | 'Ghi chú' | 'Nghiên cứu' | 'Video' | 'Biểu mẫu';
type LibraryFilter = 'all' | 'favorite' | 'video' | 'template' | 'recent';
type SortMode = 'popular' | 'newest' | 'az';

type LibraryItem = Material & {
    category: LibraryCategory;
    author: string;
    fileType: string;
    fileSize: string;
    downloads: number;
    views: number;
    descriptionText: string;
    tags: string[];
    isFavorite: boolean;
    isRecent: boolean;
    readingMinutes: number;
    updatedAt: string;
};

type RequestForm = {
    title: string;
    category: LibraryCategory;
    purpose: string;
    contact: string;
};

const categories: (LibraryCategory | 'Tất cả')[] = ['Tất cả', 'Sách', 'Slide', 'Ghi chú', 'Nghiên cứu', 'Video', 'Biểu mẫu'];

const filterItems: { key: LibraryFilter; label: string; helper: string }[] = [
    { key: 'all', label: 'Tất cả', helper: 'Toàn bộ kho' },
    { key: 'favorite', label: 'Yêu thích', helper: 'Đã đánh dấu' },
    { key: 'video', label: 'Video', helper: 'Học trực quan' },
    { key: 'template', label: 'Biểu mẫu', helper: 'Mẫu dùng nhanh' },
    { key: 'recent', label: 'Mới cập nhật', helper: '7 ngày gần đây' },
];

function getCurrentUserId() {
    try {
        const saved = localStorage.getItem('vat_user') || localStorage.getItem('lms_user');
        return saved ? JSON.parse(saved).id : null;
    } catch {
        return null;
    }
}

function detectCategory(item: Material, index: number): LibraryCategory {
    const source = `${item.title} ${item.description || ''} ${item.note || ''} ${item.file_name || ''} ${item.external_link || ''}`.toLowerCase();
    if (source.includes('video') || source.includes('youtube') || source.includes('clip')) return 'Video';
    if (source.includes('mẫu') || source.includes('form') || source.includes('biểu mẫu') || source.includes('xlsx')) return 'Biểu mẫu';
    if (source.includes('slide') || source.includes('ppt')) return 'Slide';
    if (source.includes('nghiên cứu') || source.includes('research')) return 'Nghiên cứu';
    if (source.includes('ghi chú') || source.includes('note')) return 'Ghi chú';
    return (['Sách', 'Slide', 'Ghi chú', 'Nghiên cứu'] as const)[index % 4];
}

function detectFileType(item: Material) {
    if (item.external_link && !item.file_name) return 'LINK';
    const source = item.file_name || item.file_type || 'FILE';
    const ext = source.split('.').pop()?.split('/').pop()?.toUpperCase();
    return ext || 'FILE';
}

function formatDate(value?: string) {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(value?: string) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function OnlineLibraryView({ classes = [], user }: { classes?: ClassItem[]; user?: User }) {
    const [libraryTab, setLibraryTab] = useState<'materials' | 'fixed_exams'>('materials');
    const [materials, setMaterials] = useState<Material[]>([]);
    const [libraryExams, setLibraryExams] = useState<OnlineExam[]>([]);
    const [loadingExams, setLoadingExams] = useState(false);
    const [examQuery, setExamQuery] = useState('');
    const [examSubjectFilter, setExamSubjectFilter] = useState('all');
    const [assignModalExam, setAssignModalExam] = useState<OnlineExam | null>(null);
    const [assignClassId, setAssignClassId] = useState(classes[0]?.id ? String(classes[0].id) : '');
    const [assignTitle, setAssignTitle] = useState('');
    const [assignStartTime, setAssignStartTime] = useState('');
    const [assignDueTime, setAssignDueTime] = useState('');
    const [assignDuration, setAssignDuration] = useState('45');
    const [assigning, setAssigning] = useState(false);
    const [previewExamDetail, setPreviewExamDetail] = useState<{ exam: OnlineExam; questions: QuestionItem[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<LibraryFilter>('all');
    const [category, setCategory] = useState<LibraryCategory | 'Tất cả'>('Tất cả');
    const [sortMode, setSortMode] = useState<SortMode>('popular');
    const [favorites, setFavorites] = useState<number[]>([1, 3, 5]);
    const [previewItem, setPreviewItem] = useState<LibraryItem | null>(null);
    const [showRequestPopup, setShowRequestPopup] = useState(false);
    const [notice, setNotice] = useState('');
    const [requestForm, setRequestForm] = useState<RequestForm>({
        title: 'Video mô phỏng quy trình kiểm tra hệ thống phanh ABS',
        category: 'Video',
        purpose: 'Em muốn xem thêm video minh hoạ từng bước để dễ hình dung trước khi thực hành trên xe thật.',
        contact: 'hocvien@vat.edu.vn',
    });

    const loadMaterials = useCallback(async () => {
        const userId = getCurrentUserId();
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/materials/all`, {
                headers: userId ? { 'x-user-id': String(userId) } : undefined,
            });
            if (!response.ok) throw new Error('Không thể tải thư viện từ cơ sở dữ liệu');
            const data = await response.json();
            setMaterials(Array.isArray(data.materials) ? data.materials : []);
        } catch (error) {
            console.error('Lỗi tải thư viện số:', error);
            setMaterials([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadLibraryExams = useCallback(async () => {
        setLoadingExams(true);
        try {
            const currentId = user?.id || getCurrentUserId();
            const res = await fetch(`${API_URL}/api/online-exams/library`, {
                headers: currentId ? { 'x-user-id': String(currentId) } : undefined,
            });
            const data = await res.json();
            if (res.ok) {
                setLibraryExams(data.exams ?? []);
            }
        } catch {
            setLibraryExams([]);
        } finally {
            setLoadingExams(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadMaterials();
        loadLibraryExams();
    }, [loadMaterials, loadLibraryExams]);

    const handleAssignExam = async () => {
        if (!assignModalExam) return;
        const targetClassId = Number(assignClassId);
        if (!targetClassId) {
            setNotice('Vui lòng chọn lớp học để giao bài.');
            return;
        }
        setAssigning(true);
        try {
            const currentId = user?.id || getCurrentUserId();
            const res = await fetch(`${API_URL}/api/online-exams/${assignModalExam.id}/assign-class`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(currentId ? { 'x-user-id': String(currentId) } : {}),
                },
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
            setNotice(`Đã giao bài "${assignTitle.trim() || assignModalExam.title}" cho lớp ${targetClassName} thành công!`);
            setAssignModalExam(null);
            setTimeout(() => setNotice(''), 4500);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Có lỗi khi giao bài tập cho lớp.');
        } finally {
            setAssigning(false);
        }
    };

    const handleDeleteExam = async (examId: number, title: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa bài tập "${title}" khỏi Thư viện không?`)) return;
        try {
            const currentId = user?.id || getCurrentUserId();
            const res = await fetch(`${API_URL}/api/online-exams/${examId}`, {
                method: 'DELETE',
                headers: currentId ? { 'x-user-id': String(currentId) } : undefined,
            });
            if (res.ok) {
                setNotice(`Đã xóa bài tập "${title}" khỏi Thư viện.`);
                setLibraryExams((prev) => prev.filter((item) => item.id !== examId));
                setTimeout(() => setNotice(''), 3000);
            }
        } catch {
            setNotice('Không thể xóa bài tập khỏi thư viện.');
        }
    };

    const handleViewExamDetail = async (exam: OnlineExam) => {
        try {
            const currentId = user?.id || getCurrentUserId();
            const res = await fetch(`${API_URL}/api/online-exams/${exam.id}`, {
                headers: currentId ? { 'x-user-id': String(currentId) } : undefined,
            });
            const data = await res.json();
            if (res.ok && data.exam) {
                setPreviewExamDetail({ exam: data.exam, questions: data.questions ?? [] });
            }
        } catch {
            setNotice('Không thể xem chi tiết bài tập.');
        }
    };

    const examSubjectOptions = useMemo(() => Array.from(new Set([
        ...classes.map((c) => c.subject).filter(Boolean),
        ...libraryExams.map((e) => e.subject).filter(Boolean),
    ])).sort((a, b) => (a || '').localeCompare(b || '', 'vi')), [classes, libraryExams]);

    const filteredLibraryExams = useMemo(() => {
        return libraryExams.filter((exam) => {
            if (examSubjectFilter !== 'all' && (exam.subject || 'Chung') !== examSubjectFilter) return false;
            if (examQuery.trim()) {
                const kw = examQuery.trim().toLowerCase();
                const matchTitle = (exam.title || '').toLowerCase().includes(kw);
                const matchSub = (exam.subject || '').toLowerCase().includes(kw);
                const matchDesc = (exam.description || '').toLowerCase().includes(kw);
                if (!matchTitle && !matchSub && !matchDesc) return false;
            }
            return true;
        });
    }, [libraryExams, examSubjectFilter, examQuery]);

    const enrichedLibrary = useMemo<LibraryItem[]>(() => materials.map((item, index) => {
        const descriptionText = item.description || item.note || 'Tài nguyên học tập đã được trung tâm cập nhật để học sinh tự học, xem lại và chuẩn bị trước buổi học.';
        const updatedAt = item.created_at || new Date().toISOString();
        const categoryValue = detectCategory(item, index);
        return {
            ...item,
            category: categoryValue,
            author: item.uploaded_by_name || 'Thư viện VAT',
            fileType: detectFileType(item),
            fileSize: item.file_size || (item.external_link ? 'Online' : `${Math.max(1, (index % 8) + 2)}.${index % 9} MB`),
            downloads: 48 + index * 13,
            views: 120 + index * 27,
            descriptionText,
            tags: [categoryValue, item.class_name || 'Tự học', detectFileType(item).toLowerCase()].slice(0, 3),
            updatedAt,
            isFavorite: favorites.includes(item.id),
            isRecent: new Date(updatedAt).getTime() > Date.now() - 7 * 86400000,
            readingMinutes: Math.max(5, Math.min(45, Math.round(descriptionText.length / 45) + 8)),
        };
    }), [favorites, materials]);

    const filteredItems = useMemo(() => enrichedLibrary.filter((item) => {
        const keyword = query.trim().toLowerCase();
        const matchesKeyword = !keyword || [item.title, item.author, item.descriptionText, item.fileType, item.class_name, ...item.tags]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword));
        const matchesCategory = category === 'Tất cả' || item.category === category;
        const matchesFilter = filter === 'all'
            || (filter === 'favorite' && item.isFavorite)
            || (filter === 'video' && item.category === 'Video')
            || (filter === 'template' && item.category === 'Biểu mẫu')
            || (filter === 'recent' && item.isRecent);
        return matchesKeyword && matchesCategory && matchesFilter;
    }).sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        if (sortMode === 'newest') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        if (sortMode === 'az') return a.title.localeCompare(b.title, 'vi');
        return b.views - a.views;
    }), [category, enrichedLibrary, filter, query, sortMode]);

    const toggleFavorite = (id: number) => {
        setFavorites((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
    };

    const handleDownload = (item: LibraryItem) => {
        if (item.external_link) {
            window.open(item.external_link, '_blank', 'noopener,noreferrer');
            return;
        }
        if (item.file_data && item.file_name) {
            const link = document.createElement('a');
            link.href = item.file_data;
            link.download = item.file_name;
            link.click();
            return;
        }
        setNotice('Tài liệu này chưa có file hoặc link đính kèm trong cơ sở dữ liệu.');
        setTimeout(() => setNotice(''), 3200);
    };

    const submitRequest = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setNotice(`Đã ghi nhận yêu cầu thư viện số: ${requestForm.title}. Giáo vụ sẽ kiểm tra và cập nhật thông báo.`);
        setShowRequestPopup(false);
        setTimeout(() => setNotice(''), 4200);
    };

    return (
        <div className="mx-auto grid w-full max-w-7xl gap-5 pb-8">
            <AnimatePresence>
                {notice && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 shadow-sm">
                        {notice}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Library Module Tab Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm sm:px-5">
                <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-black">
                    <button
                        type="button"
                        onClick={() => setLibraryTab('materials')}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${libraryTab === 'materials' ? 'bg-red-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-950'}`}
                    >
                        <BookIcon size={16} />
                        <span>Kho tài liệu & Sách số</span>
                        <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px]">{materials.length}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setLibraryTab('fixed_exams')}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${libraryTab === 'fixed_exams' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-950'}`}
                    >
                        <span>📝 Kho bài tập & Đề thi cố định</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${libraryTab === 'fixed_exams' ? 'bg-white/25 text-white' : 'bg-purple-100 text-purple-800'}`}>
                            {libraryExams.length}
                        </span>
                    </button>
                </div>
                {libraryTab === 'fixed_exams' && (
                    <span className="text-xs font-bold text-purple-700">
                        ⚡ Chọn bài bất kỳ để giao nhanh cho lớp học khi đến bài tương ứng
                    </span>
                )}
            </div>

            {libraryTab === 'fixed_exams' ? (
                /* Fixed Exams & Exercises Library View */
                <section className="grid gap-5">
                    <div className="grid gap-3 rounded-[2rem] border border-purple-200/80 bg-white p-4 shadow-sm sm:p-5">
                        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                            <div className="relative">
                                <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={examQuery}
                                    onChange={(e) => setExamQuery(e.target.value)}
                                    placeholder="Tìm bài tập cố định trong Thư viện theo tên bài, môn học..."
                                    className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-50"
                                />
                            </div>
                            <select
                                value={examSubjectFilter}
                                onChange={(e) => setExamSubjectFilter(e.target.value)}
                                className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-950 outline-none focus:border-purple-300"
                            >
                                <option value="all">Tất cả môn học</option>
                                {examSubjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {loadingExams ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-44 animate-pulse rounded-[2rem] bg-slate-100" />
                            ))}
                        </div>
                    ) : filteredLibraryExams.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredLibraryExams.map((exam) => (
                                <article
                                    key={exam.id}
                                    className="flex flex-col justify-between rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-purple-300 hover:shadow-md"
                                >
                                    <div>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="rounded-xl bg-purple-100 px-3 py-1 text-xs font-black text-purple-700">
                                                {exam.subject || 'Chung'}
                                            </span>
                                            <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                                ⏱️ {exam.duration_minutes} phút
                                            </span>
                                        </div>
                                        <h3 className="mt-3 text-base font-black text-slate-950 line-clamp-2">
                                            {exam.title}
                                        </h3>
                                        <p className="mt-1 text-xs font-medium text-slate-500 line-clamp-2">
                                            {exam.description || 'Bài tập cố định trong Thư viện'}
                                        </p>
                                    </div>

                                    <div className="mt-5 border-t border-slate-100 pt-4">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-black text-emerald-700">
                                                📝 {exam.question_count ?? 0} câu hỏi cố định
                                            </span>
                                            <span className="font-bold text-slate-400">
                                                Điểm auto thang 10
                                            </span>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void handleViewExamDetail(exam)}
                                                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 whitespace-nowrap"
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
                                                className="flex-1 rounded-xl px-2.5 py-1.5 text-xs font-black !bg-purple-600 hover:!bg-purple-700 shadow-sm whitespace-nowrap"
                                            >
                                                Giao cho lớp
                                            </PrimaryButton>
                                            <button
                                                type="button"
                                                onClick={() => void handleDeleteExam(exam.id, exam.title)}
                                                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
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
                        <div className="grid place-items-center rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center">
                            <BookIcon size={42} className="text-slate-300" />
                            <h3 className="mt-3 text-lg font-black text-slate-950">Chưa có bài tập cố định trong Thư viện</h3>
                            <p className="mt-1 max-w-md text-sm font-semibold text-slate-500">
                                Giáo viên có thể vào phần Ngân hàng câu hỏi → Chọn chức năng "Tạo cụm bài cố định" để đưa các bài tập vào Thư viện.
                            </p>
                        </div>
                    )}
                </section>
            ) : (
                <>
                    <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="relative">
                        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Tìm sách, video, biểu mẫu, lớp học, tác giả..."
                            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                        <Button type="button" variant="secondary" onClick={() => { setQuery(''); setFilter('all'); setCategory('Tất cả'); setSortMode('popular'); }} className="min-h-12">Đặt lại</Button>
                        <PrimaryButton type="button" onClick={() => setShowRequestPopup(true)} className="min-h-12 px-5 text-sm font-black">
                            <UploadIcon size={17} /> Yêu cầu tài liệu
                        </PrimaryButton>
                    </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[1fr_220px]">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                        {filterItems.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setFilter(item.key)}
                                className={`min-h-16 rounded-2xl border px-3 text-left transition ${filter === item.key ? 'border-red-900 bg-red-900 text-white shadow-lg shadow-red-900/15' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-900'}`}
                            >
                                <span className="block text-sm font-black">{item.label}</span>
                                <span className="mt-1 block text-[11px] font-bold opacity-75">{item.helper}</span>
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
                        <select value={category} onChange={(event) => setCategory(event.target.value as LibraryCategory | 'Tất cả')} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-950 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50">
                            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-950 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50">
                            <option value="popular">Xem nhiều nhất</option>
                            <option value="newest">Mới nhất</option>
                            <option value="az">Tên A-Z</option>
                        </select>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Kho tài liệu số ({filteredItems.length})</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Thẻ lớn cho di động, thao tác chính luôn nằm ở vùng dễ bấm.</p>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                        <InfoIcon size={14} /> Menu bar được giữ nguyên
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-64 animate-pulse rounded-[1.5rem] bg-slate-100" />)}
                    </div>
                ) : filteredItems.length ? (
                    <div className="grid gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-3">
                        {filteredItems.map((item, index) => (
                            <motion.article
                                key={item.id}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-xl"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-900">
                                            {item.category === 'Video' ? <PlayIcon size={22} /> : item.category === 'Biểu mẫu' ? <FileIcon size={22} /> : <BookIcon size={22} />}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap gap-2">
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">{item.category}</span>
                                                {item.isRecent && <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-700">Mới</span>}
                                            </div>
                                            <p className="mt-2 text-xs font-bold text-slate-400">{item.fileType} · {item.fileSize}</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => toggleFavorite(item.id)} className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border transition ${item.isFavorite ? 'border-amber-200 bg-amber-100 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-400 hover:text-amber-600'}`} aria-label="Đánh dấu yêu thích">
                                        <StarIcon size={17} />
                                    </button>
                                </div>

                                <h3 className="mt-4 line-clamp-2 min-h-12 text-base font-black tracking-[-0.02em] text-slate-950">{item.title}</h3>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {item.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500">#{tag}</span>)}
                                </div>

                                <div className="mt-4 grid gap-2 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
                                    <div className="flex items-center justify-between gap-2"><span>Tác giả</span><span className="truncate text-slate-950">{item.author}</span></div>
                                    <div className="flex items-center justify-between gap-2"><span>Thời lượng đọc</span><span className="text-slate-950">{item.readingMinutes} phút</span></div>
                                    <div className="flex items-center justify-between gap-2"><span>Cập nhật</span><span className="text-slate-950">{formatDate(item.updatedAt)}</span></div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <Button type="button" variant="secondary" onClick={() => setPreviewItem(item)} className="min-h-11 text-xs font-black">Xem trước</Button>
                                    <PrimaryButton type="button" onClick={() => handleDownload(item)} className="min-h-11 px-3 text-xs font-black">
                                        <DownloadIcon size={14} /> Mở / tải
                                    </PrimaryButton>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                ) : (
                    <div className="grid place-items-center p-8 text-center">
                        <BookIcon size={42} className="text-slate-300" />
                        <h3 className="mt-3 text-lg font-black text-slate-950">Chưa tìm thấy tài liệu phù hợp</h3>
                        <p className="mt-1 max-w-md text-sm font-semibold leading-6 text-slate-500">Thử bỏ bộ lọc, đổi từ khóa hoặc gửi yêu cầu bổ sung tài liệu bằng popup.</p>
                    </div>
                )}
            </section>
                </>
            )}

            {/* Modal Giao bài tập cho lớp */}
            {assignModalExam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <div>
                                <span className="rounded-lg bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase text-purple-700">
                                    Thư viện → Lớp học
                                </span>
                                <h3 className="text-base font-black text-slate-950">
                                    Giao bài tập cho lớp học
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAssignModalExam(null)}
                                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid gap-4 p-6 text-xs font-bold text-slate-600">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                                <p className="text-[11px] text-slate-400">Bài tập nguồn trong Thư viện:</p>
                                <p className="mt-0.5 text-sm font-black text-slate-950">{assignModalExam.title}</p>
                                <p className="mt-1 text-xs text-purple-700 font-semibold">
                                    {assignModalExam.question_count ?? 0} câu hỏi cố định • Môn {assignModalExam.subject || 'Chung'} • Điểm tự động tính thang 10
                                </p>
                            </div>

                            <label className="grid gap-1.5">
                                Lớp học nhận bài *
                                <select
                                    value={assignClassId}
                                    onChange={(e) => setAssignClassId(e.target.value)}
                                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-purple-300"
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
                                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-purple-300"
                                />
                            </label>

                            <div className="grid grid-cols-2 gap-3">
                                <label className="grid gap-1.5">
                                    Thời gian mở bài (tùy chọn)
                                    <input
                                        type="datetime-local"
                                        value={assignStartTime}
                                        onChange={(e) => setAssignStartTime(e.target.value)}
                                        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-950 outline-none focus:border-purple-300"
                                    />
                                </label>
                                <label className="grid gap-1.5">
                                    Hạn chót nộp bài (tùy chọn)
                                    <input
                                        type="datetime-local"
                                        value={assignDueTime}
                                        onChange={(e) => setAssignDueTime(e.target.value)}
                                        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-950 outline-none focus:border-purple-300"
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
                                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-purple-300"
                                />
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setAssignModalExam(null)}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700"
                            >
                                Hủy
                            </button>
                            <PrimaryButton
                                type="button"
                                onClick={handleAssignExam}
                                disabled={assigning}
                                className="rounded-2xl px-5 py-2 text-xs font-black !bg-purple-600 hover:!bg-purple-700"
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
                    <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-lg bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase text-purple-700">
                                        {previewExamDetail.exam.subject || 'Chung'}
                                    </span>
                                    <h3 className="text-base font-black text-slate-950">
                                        {previewExamDetail.exam.title}
                                    </h3>
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {previewExamDetail.questions.length} câu hỏi cố định • ⏱️ {previewExamDetail.exam.duration_minutes} phút • Thang 10 tự động
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewExamDetail(null)}
                                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto p-6">
                            {previewExamDetail.questions.map((q, idx) => (
                                <div key={q.id || idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-black text-slate-900">Câu #{idx + 1}</span>
                                        <span className="font-bold text-purple-700">{(10 / previewExamDetail.questions.length).toFixed(2)} điểm</span>
                                    </div>
                                    <p className="mt-2 text-sm font-bold text-slate-950 whitespace-pre-wrap">{q.question_text}</p>
                                    {q.options?.length ? (
                                        <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                            {q.options.map((opt) => (
                                                <div key={opt.id} className="rounded-xl bg-white px-3 py-1.5 font-semibold text-slate-700 border border-slate-200/60">
                                                    <span className="font-black text-slate-950">{opt.id}.</span> {opt.text}
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                    {q.correct_answers?.length ? (
                                        <p className="mt-2.5 font-black text-emerald-700">
                                            Đáp án đúng: {q.correct_answers.join(', ')}
                                        </p>
                                    ) : null}
                                    {q.grading_guide ? (
                                        <p className="mt-1 font-semibold text-blue-700">
                                            💡 Hướng dẫn/Giải thích: {q.grading_guide}
                                        </p>
                                    ) : null}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setPreviewExamDetail(null)}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700"
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
                                className="rounded-2xl px-5 py-2 text-xs font-black !bg-purple-600 hover:!bg-purple-700"
                            >
                                Giao bài này cho lớp
                            </PrimaryButton>
                        </div>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {previewItem && (
                    <LibraryPopup title="Xem trước tài liệu" onClose={() => setPreviewItem(null)}>
                        <div className="grid gap-4">
                            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-900">
                                        {previewItem.category === 'Video' ? <PlayIcon size={24} /> : <BookIcon size={24} />}
                                    </div>
                                    <div>
                                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">{previewItem.category}</span>
                                        <h3 className="mt-3 text-xl font-black tracking-[-0.03em] text-slate-950">{previewItem.title}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <DetailCard title="Tác giả" value={previewItem.author} />
                                <DetailCard title="Định dạng" value={`${previewItem.fileType} · ${previewItem.fileSize}`} />
                                <DetailCard title="Lượt xem" value={`${previewItem.views} lượt`} />
                                <DetailCard title="Cập nhật" value={`${formatDate(previewItem.updatedAt)} · ${formatTime(previewItem.updatedAt)}`} />
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <Button type="button" variant="secondary" onClick={() => setPreviewItem(null)} className="min-h-12">Đóng</Button>
                                <PrimaryButton type="button" onClick={() => handleDownload(previewItem)} className="min-h-12"><DownloadIcon size={16} /> Mở hoặc tải</PrimaryButton>
                            </div>
                        </div>
                    </LibraryPopup>
                )}

                {showRequestPopup && (
                    <LibraryPopup title="Yêu cầu bổ sung tài liệu" onClose={() => setShowRequestPopup(false)}>
                        <form onSubmit={submitRequest} className="grid gap-4">
                            <p className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm font-bold leading-6 text-blue-800">Form đã có dữ liệu mẫu để học sinh gửi nhanh, có thể chỉnh lại trước khi gửi.</p>
                            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
                                Tên tài liệu cần thêm
                                <input value={requestForm.title} onChange={(event) => setRequestForm((prev) => ({ ...prev, title: event.target.value }))} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black normal-case tracking-normal text-slate-950 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50" />
                            </label>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
                                    Danh mục
                                    <select value={requestForm.category} onChange={(event) => setRequestForm((prev) => ({ ...prev, category: event.target.value as LibraryCategory }))} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black normal-case tracking-normal text-slate-950 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50">
                                        {categories.filter((item): item is LibraryCategory => item !== 'Tất cả').map((item) => <option key={item} value={item}>{item}</option>)}
                                    </select>
                                </label>
                                <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
                                    Email nhận phản hồi
                                    <input value={requestForm.contact} onChange={(event) => setRequestForm((prev) => ({ ...prev, contact: event.target.value }))} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black normal-case tracking-normal text-slate-950 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50" />
                                </label>
                            </div>
                            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
                                Mục đích sử dụng
                                <textarea value={requestForm.purpose} onChange={(event) => setRequestForm((prev) => ({ ...prev, purpose: event.target.value }))} rows={4} className="resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold normal-case tracking-normal text-slate-950 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50" />
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <Button type="button" variant="secondary" onClick={() => setShowRequestPopup(false)} className="min-h-12">Đóng</Button>
                                <PrimaryButton type="submit" className="min-h-12"><UploadIcon size={16} /> Gửi yêu cầu</PrimaryButton>
                            </div>
                        </form>
                    </LibraryPopup>
                )}
            </AnimatePresence>
        </div>
    );
}

function DetailCard({ title, value }: { title: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">{title}</p>
            <p className="mt-1 line-clamp-2 text-sm font-black leading-5 text-slate-950">{value}</p>
        </div>
    );
}

function LibraryPopup({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    return (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div initial={{ y: 28, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 28, opacity: 0, scale: 0.98 }} className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-[2rem] border border-slate-200 bg-white p-4 text-slate-950 shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-900">Popup thao tác nhanh</p>
                        <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">{title}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-950 transition hover:bg-slate-100" aria-label="Đóng popup">
                        <XIcon size={18} />
                    </button>
                </div>
                {children}
            </motion.div>
        </motion.div>
    );
}
