import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Panel, PrimaryButton } from '../../../components/shared/ui';
import { BookIcon, DownloadIcon, FileIcon, InfoIcon, PlayIcon, SearchIcon, StarIcon, UploadIcon, VideoIcon, XIcon } from '../../../components/shared/icons';

type LibraryCategory = 'Sách' | 'Slide' | 'Ghi chú' | 'Nghiên cứu' | 'Video' | 'Biểu mẫu';
type LibraryFilter = 'all' | 'favorite' | 'video' | 'template' | 'recent';

type LibraryItem = {
    id: number;
    title: string;
    category: LibraryCategory;
    author: string;
    fileType: string;
    fileSize: string;
    downloads: number;
    views: number;
    description: string;
    tags: string[];
    updatedAt: string;
    isFavorite?: boolean;
    readingMinutes: number;
};

type RequestForm = {
    title: string;
    purpose: string;
    className: string;
    deadline: string;
};

const SAMPLE_LIBRARY: LibraryItem[] = [
    {
        id: 1,
        title: 'Giáo trình Cơ sở Kỹ thuật Ô tô Doanh nghiệp',
        category: 'Sách',
        author: 'Bộ môn Ô tô',
        fileType: 'PDF',
        fileSize: '15.4 MB',
        downloads: 342,
        views: 1205,
        description: 'Tài liệu chuẩn hóa kiến thức ô tô thương mại, hệ thống truyền lực, quy trình an toàn và checklist giảng dạy theo buổi.',
        tags: ['Ô tô', 'Giáo trình', 'Nền tảng'],
        updatedAt: new Date().toISOString(),
        isFavorite: true,
        readingMinutes: 35,
    },
    {
        id: 2,
        title: 'Slide Điện Ô tô Chuyên sâu - Buổi 1 đến 10',
        category: 'Slide',
        author: 'ThS. Xuân Minh',
        fileType: 'PPTX',
        fileSize: '42.1 MB',
        downloads: 189,
        views: 890,
        description: 'Bộ slide tổng hợp sơ đồ mạch điện ECU, cảm biến, hệ thống khởi động, sạc và chẩn đoán lỗi OBD-II.',
        tags: ['Điện ô tô', 'Slide', 'ECU'],
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        readingMinutes: 28,
    },
    {
        id: 3,
        title: 'Video mô phỏng quy trình đọc mã lỗi OBD-II',
        category: 'Video',
        author: 'Trung tâm VAT',
        fileType: 'MP4',
        fileSize: '186 MB',
        downloads: 255,
        views: 2210,
        description: 'Video 12 phút minh họa thao tác kết nối máy chẩn đoán, đọc lỗi, giải thích mã lỗi và ghi nhận kết quả thực hành.',
        tags: ['Video', 'OBD-II', 'Thực hành'],
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        isFavorite: true,
        readingMinutes: 12,
    },
    {
        id: 4,
        title: 'Biểu mẫu đánh giá thực hành xưởng',
        category: 'Biểu mẫu',
        author: 'Ban Giáo vụ',
        fileType: 'XLSX',
        fileSize: '1.2 MB',
        downloads: 95,
        views: 410,
        description: 'Mẫu rubric chấm điểm thực hành tháo lắp, an toàn lao động, tác phong xưởng và ghi chú phản hồi cho học sinh.',
        tags: ['Biểu mẫu', 'Rubric', 'Xưởng'],
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        readingMinutes: 8,
    },
    {
        id: 5,
        title: 'Tài liệu nghiên cứu: Xu hướng xe điện và hybrid',
        category: 'Nghiên cứu',
        author: 'VAT Research Lab',
        fileType: 'PDF',
        fileSize: '9.8 MB',
        downloads: 121,
        views: 760,
        description: 'Tổng quan xu hướng pin, bộ điều khiển, hệ thống sạc và định hướng bài giảng ứng dụng trong chương trình nghề.',
        tags: ['Xe điện', 'Hybrid', 'Nghiên cứu'],
        updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        readingMinutes: 24,
    },
    {
        id: 6,
        title: 'Ghi chú bài giảng: 20 lỗi thường gặp khi đọc sơ đồ mạch',
        category: 'Ghi chú',
        author: 'Nhóm giảng viên Điện Ô tô',
        fileType: 'DOCX',
        fileSize: '2.8 MB',
        downloads: 174,
        views: 980,
        description: 'Ghi chú ngắn dạng checklist giúp giảng viên nhắc học sinh tránh nhầm chân mass, nguồn, tín hiệu và cầu chì.',
        tags: ['Ghi chú', 'Mạch điện', 'Checklist'],
        updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        readingMinutes: 15,
    },
];

export function OnlineLibraryView() {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<LibraryFilter>('all');
    const [category, setCategory] = useState<LibraryCategory | 'Tất cả'>('Tất cả');
    const [favorites, setFavorites] = useState<number[]>(SAMPLE_LIBRARY.filter((item) => item.isFavorite).map((item) => item.id));
    const [previewItem, setPreviewItem] = useState<LibraryItem | null>(null);
    const [showRequestPopup, setShowRequestPopup] = useState(false);
    const [alertMsg, setAlertMsg] = useState('');
    const [requestForm, setRequestForm] = useState<RequestForm>({
        title: 'Bổ sung tài liệu thực hành hệ thống phanh ABS',
        purpose: 'Cần tài liệu có sơ đồ, checklist thao tác, câu hỏi ôn tập và file mẫu để giao cho học sinh trước buổi thực hành.',
        className: 'Kỹ thuật Ô tô A1',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    });

    const enrichedLibrary = useMemo(() => SAMPLE_LIBRARY.map((item) => ({
        ...item,
        isFavorite: favorites.includes(item.id),
        isRecent: new Date(item.updatedAt).getTime() > Date.now() - 4 * 86400000,
    })), [favorites]);

    const filteredItems = useMemo(() => enrichedLibrary.filter((item) => {
        const keyword = query.trim().toLowerCase();
        const matchesKeyword = !keyword || [item.title, item.author, item.description, item.fileType, ...item.tags].some((value) => value.toLowerCase().includes(keyword));
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
        return b.views - a.views;
    }), [category, enrichedLibrary, filter, query]);

    const favoriteCount = enrichedLibrary.filter((item) => item.isFavorite).length;
    const videoCount = enrichedLibrary.filter((item) => item.category === 'Video').length;
    const templateCount = enrichedLibrary.filter((item) => item.category === 'Biểu mẫu').length;

    const toggleFavorite = (id: number) => {
        setFavorites((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
    };

    const handleDownload = (item: LibraryItem) => {
        setAlertMsg(`Đã thêm “${item.title}” vào hàng chờ tải xuống.`);
        setTimeout(() => setAlertMsg(''), 3500);
    };

    const submitRequest = (event: React.FormEvent) => {
        event.preventDefault();
        setShowRequestPopup(false);
        setAlertMsg(`Đã gửi yêu cầu bổ sung: ${requestForm.title}`);
        setTimeout(() => setAlertMsg(''), 3500);
    };

    return (
        <div className="grid gap-4">
            {alertMsg && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-800 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                    <span>{alertMsg}</span>
                    <button type="button" onClick={() => setAlertMsg('')} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-emerald-800 transition hover:bg-white dark:bg-white/10 dark:text-emerald-100">×</button>
                </div>
            )}

            <section className="grid gap-4 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm lg:grid-cols-[1.2fr_0.8fr] lg:p-5">
                <div className="flex flex-col justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600">
                            <BookIcon size={24} />
                        </span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">Thư viện số giảng viên</p>
                            <h2 className="text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">Kho học liệu số tập trung, dễ tìm và dễ dùng</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">Thiết kế theo hành vi mắt nhìn: tìm kiếm ở đầu, bộ lọc rõ, tài liệu nổi bật đặt trước, popup nền trắng giúp đọc nhanh trên điện thoại.</p>
                        </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <div className="relative">
                            <SearchIcon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Tìm sách, video, biểu mẫu, tác giả..."
                                className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-white dark:text-slate-950"
                            />
                        </div>
                        <PrimaryButton type="button" onClick={() => setShowRequestPopup(true)} className="min-h-12 px-5 text-sm font-black">
                            <UploadIcon size={17} /> Yêu cầu tài liệu
                        </PrimaryButton>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <LibraryStat icon={<StarIcon size={18} />} label="Yêu thích" value={favoriteCount} />
                    <LibraryStat icon={<VideoIcon size={18} />} label="Video" value={videoCount} />
                    <LibraryStat icon={<FileIcon size={18} />} label="Biểu mẫu" value={templateCount} />
                </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
                <Panel title="Bộ lọc thư viện" subtitle="Giảm tải nhận thức bằng nhóm tài liệu và hành động nhanh.">
                    <div className="grid gap-3">
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { key: 'all', label: 'Tất cả' },
                                { key: 'favorite', label: 'Yêu thích' },
                                { key: 'video', label: 'Video' },
                                { key: 'template', label: 'Biểu mẫu' },
                                { key: 'recent', label: 'Mới cập nhật' },
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setFilter(item.key as LibraryFilter)}
                                    className={`min-h-11 rounded-2xl border px-3 text-xs font-black transition ${filter === item.key ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary)]' : 'border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-border)] hover:text-[var(--color-primary)]'}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-black text-[var(--color-text-secondary)]">Danh mục</label>
                            <select value={category} onChange={(event) => setCategory(event.target.value as LibraryCategory | 'Tất cả')} className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm font-black text-slate-950 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-white dark:text-slate-950">
                                {(['Tất cả', 'Sách', 'Slide', 'Ghi chú', 'Nghiên cứu', 'Video', 'Biểu mẫu'] as const).map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </div>
                        <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100">
                            <div className="flex items-center gap-2 text-sm font-black"><InfoIcon size={18} /> Gợi ý UX</div>
                            <p className="mt-2 text-xs leading-5 opacity-80">Tài liệu yêu thích luôn nổi lên đầu. Hãy dùng yêu cầu tài liệu để giáo vụ bổ sung học liệu còn thiếu cho lớp.</p>
                        </div>
                    </div>
                </Panel>

                <Panel title={`Kho tài liệu số (${filteredItems.length})`} subtitle="Mỗi tài liệu là một thẻ riêng, dễ quét mắt và thao tác nhanh.">
                    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                        {filteredItems.map((item, index) => (
                            <motion.article
                                key={item.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04 }}
                                className={`rounded-[1.75rem] border p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${item.isFavorite ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border-[var(--color-border)] bg-[var(--color-card)]'}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                                            {item.category === 'Video' ? <PlayIcon size={22} /> : item.category === 'Biểu mẫu' ? <FileIcon size={22} /> : <BookIcon size={22} />}
                                        </span>
                                        <div>
                                            <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-black text-indigo-700">{item.category}</span>
                                            {item.isFavorite && <span className="ml-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-700">Yêu thích</span>}
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => toggleFavorite(item.id)} className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition ${item.isFavorite ? 'border-amber-200 bg-amber-100 text-amber-700' : 'border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] hover:text-amber-600'}`} aria-label="Yêu thích">
                                        <StarIcon size={17} />
                                    </button>
                                </div>

                                <h3 className="mt-4 line-clamp-2 text-base font-black tracking-[-0.02em] text-[var(--color-text)]">{item.title}</h3>
                                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">{item.description}</p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {item.tags.map((tag) => <span key={tag} className="rounded-full bg-[var(--color-bg-soft)] px-3 py-1 text-[11px] font-black text-[var(--color-text-secondary)]">#{tag}</span>)}
                                </div>

                                <div className="mt-4 grid gap-2 rounded-2xl bg-[var(--color-bg-soft)] p-3 text-xs font-bold text-[var(--color-text-secondary)]">
                                    <div className="flex items-center justify-between gap-2"><span>Tác giả</span><span className="truncate text-[var(--color-text)]">{item.author}</span></div>
                                    <div className="flex items-center justify-between gap-2"><span>Định dạng</span><span className="text-[var(--color-text)]">{item.fileType} • {item.fileSize}</span></div>
                                    <div className="flex items-center justify-between gap-2"><span>Lượt xem</span><span className="text-[var(--color-text)]">{item.views.toLocaleString('vi-VN')}</span></div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setPreviewItem(item)} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-xs font-black text-[var(--color-text)] transition hover:border-[var(--color-primary-border)] hover:text-[var(--color-primary)]">Xem trước</button>
                                    <PrimaryButton type="button" onClick={() => handleDownload(item)} className="min-h-11 px-3 text-xs font-black">
                                        <DownloadIcon size={14} /> Tải về
                                    </PrimaryButton>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                    {!filteredItems.length && (
                        <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] p-8 text-center">
                            <BookIcon size={38} className="mx-auto text-[var(--color-text-muted)]" />
                            <h3 className="mt-3 text-lg font-black text-[var(--color-text)]">Không tìm thấy tài liệu</h3>
                            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Thử đổi bộ lọc hoặc gửi yêu cầu bổ sung tài liệu mới.</p>
                        </div>
                    )}
                </Panel>
            </div>

            <AnimatePresence>
                {previewItem && (
                    <LibraryPopup title="Xem trước thư viện số" onClose={() => setPreviewItem(null)}>
                        <div className="grid gap-4">
                            <div className="rounded-3xl bg-indigo-50 p-4 text-indigo-950">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">{previewItem.category} • {previewItem.fileType}</p>
                                <h3 className="mt-1 text-2xl font-black tracking-[-0.03em]">{previewItem.title}</h3>
                                <p className="mt-2 text-sm leading-6 opacity-80">{previewItem.description}</p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <InfoBox label="Tác giả" value={previewItem.author} />
                                <InfoBox label="Thời gian đọc" value={`${previewItem.readingMinutes} phút`} />
                                <InfoBox label="Lượt tải" value={previewItem.downloads.toLocaleString('vi-VN')} />
                            </div>
                            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                                <BookIcon size={48} className="mx-auto text-indigo-600" />
                                <p className="mt-3 text-sm font-black text-slate-950">Trình xem tài liệu trực tuyến</p>
                                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-600">Tài liệu có thể đọc trực tiếp trên trình duyệt, không cần tải xuống thiết bị cá nhân.</p>
                            </div>
                            <PrimaryButton type="button" onClick={() => handleDownload(previewItem)} className="min-h-12 w-full text-sm font-black">
                                <DownloadIcon size={17} /> Tải về máy
                            </PrimaryButton>
                        </div>
                    </LibraryPopup>
                )}

                {showRequestPopup && (
                    <LibraryPopup title="Yêu cầu bổ sung tài liệu" onClose={() => setShowRequestPopup(false)}>
                        <form onSubmit={submitRequest} className="grid gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-black text-slate-600">Tên tài liệu cần bổ sung <span className="text-red-500">*</span></label>
                                <input value={requestForm.title} onChange={(event) => setRequestForm({ ...requestForm, title: event.target.value })} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-black text-slate-600">Lớp / nhóm sử dụng</label>
                                <input value={requestForm.className} onChange={(event) => setRequestForm({ ...requestForm, className: event.target.value })} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-black text-slate-600">Cần trước ngày</label>
                                <input type="date" value={requestForm.deadline} onChange={(event) => setRequestForm({ ...requestForm, deadline: event.target.value })} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-black text-slate-600">Mục đích sử dụng</label>
                                <textarea rows={5} value={requestForm.purpose} onChange={(event) => setRequestForm({ ...requestForm, purpose: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                            </div>
                            <div className="grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2">
                                <button type="button" onClick={() => setShowRequestPopup(false)} className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-800 transition hover:bg-slate-100">Hủy</button>
                                <PrimaryButton type="submit" className="min-h-12 text-sm font-black">Gửi yêu cầu</PrimaryButton>
                            </div>
                        </form>
                    </LibraryPopup>
                )}
            </AnimatePresence>
        </div>
    );
}

function LibraryStat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
    return (
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">{icon}</div>
            <p className="text-2xl font-black text-[var(--color-text)]">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
        </div>
    );
}

function InfoBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 line-clamp-2 text-sm font-black leading-5 text-slate-950">{value}</p>
        </div>
    );
}

function LibraryPopup({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    return (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ y: 28, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 28, opacity: 0, scale: 0.98 }} className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-[2rem] border border-slate-200 bg-white p-4 text-slate-950 shadow-2xl sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Popup thao tác nhanh</p>
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
