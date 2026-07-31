import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Panel, PrimaryButton } from '../../../components/shared/ui';
import { BookIcon, CheckCircleIcon, ClockIcon, DownloadIcon, FileIcon, SearchIcon, UploadIcon, XIcon } from '../../../components/shared/icons';
import type { ClassItem, Material, User } from '../../../types';
import { API_URL } from '../../../services/api';
import { StudentMaterialsView } from './StudentMaterialsView';

type MaterialsViewProps = {
    user: User;
    classes: ClassItem[];
    selectedClassId: number | null;
    setSelectedClassId: (id: number) => void;
};

type MaterialFilter = 'all' | 'file' | 'link' | 'pinned';

type UploadForm = {
    classId: number;
    title: string;
    note: string;
    externalLink: string;
};

export function MaterialsView({ user, classes, selectedClassId, setSelectedClassId }: MaterialsViewProps) {
    if (user.role === 'student') {
        return <StudentMaterialsView classes={classes} />;
    }

    const canManage = user.role === 'admin' || user.role === 'teacher';
    const effectiveClassId = selectedClassId ?? (classes[0]?.id || null);

    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
    const [alertMsg, setAlertMsg] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<MaterialFilter>('all');
    const [pinnedIds, setPinnedIds] = useState<number[]>([]);

    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        'x-user-id': String(user.id),
    }), [user.id]);

    const loadMaterials = useCallback(async () => {
        setLoading(true);
        try {
            const endpoint = effectiveClassId ? `/api/materials/class/${effectiveClassId}` : '/api/materials/all';
            const response = await fetch(`${API_URL}${endpoint}`, { headers });
            const data = await response.json();
            setMaterials(data.materials || []);
        } catch (error) {
            console.error('Lỗi tải danh sách tài liệu:', error);
            setMaterials([]);
        } finally {
            setLoading(false);
        }
    }, [effectiveClassId, headers]);

    useEffect(() => {
        if (!selectedClassId && classes[0]?.id) {
            setSelectedClassId(classes[0].id);
        }
        loadMaterials();
    }, [classes, selectedClassId, setSelectedClassId, loadMaterials]);

    const enrichedMaterials = useMemo(() => materials.map((item, index) => ({
        ...item,
        isPinned: pinnedIds.includes(item.id),
        isLink: Boolean(item.external_link && !item.file_name),
        freshness: index === 0 ? 'Mới cập nhật' : index === 1 ? 'Đã xem nhiều' : 'Tài liệu nền tảng',
        downloads: 24 + index * 9,
    })), [materials, pinnedIds]);

    const filteredMaterials = useMemo(() => enrichedMaterials.filter((item) => {
        const keyword = searchQuery.trim().toLowerCase();
        const matchesKeyword = !keyword || [item.title, item.description, item.note, item.file_name, item.external_link, item.class_name].some((value) => value?.toLowerCase().includes(keyword));
        const matchesType = typeFilter === 'all'
            || (typeFilter === 'file' && !item.isLink)
            || (typeFilter === 'link' && item.isLink)
            || (typeFilter === 'pinned' && item.isPinned);
        return matchesKeyword && matchesType;
    }).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }), [enrichedMaterials, searchQuery, typeFilter]);

    const fileCount = enrichedMaterials.filter((item) => !item.isLink).length;
    const linkCount = enrichedMaterials.filter((item) => item.isLink).length;
    const pinnedCount = enrichedMaterials.filter((item) => item.isPinned).length;

    const togglePin = (id: number) => {
        setPinnedIds((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
    };

    const handleDownload = (material: Material) => {
        if (material.file_data && material.file_name) {
            const link = document.createElement('a');
            link.href = material.file_data;
            link.download = material.file_name;
            link.click();
            return;
        }

        if (material.external_link) {
            window.open(material.external_link, '_blank', 'noopener,noreferrer');
            return;
        }

        setAlertMsg('Tài liệu này chưa có file hoặc link trong cơ sở dữ liệu.');
        setTimeout(() => setAlertMsg(''), 3000);
    };

    const handleDelete = async (id: number) => {
        try {
            await fetch(`${API_URL}/api/materials/${id}`, { method: 'DELETE', headers });
            setAlertMsg('Đã xóa tài liệu thành công.');
            setMaterials((previous) => previous.filter((item) => item.id !== id));
            setTimeout(() => setAlertMsg(''), 3000);
        } catch (error) {
            console.error('Lỗi xóa tài liệu:', error);
            setAlertMsg('Không thể xóa tài liệu. Vui lòng thử lại.');
        }
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
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">Tài liệu giảng viên</p>
                            <h2 className="text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">Kho học liệu dễ tìm, dễ gửi, dễ cập nhật</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">Tối ưu mắt nhìn: chọn lớp, tìm kiếm và upload đặt ngay đầu trang. Tài liệu hiển thị dạng thẻ lớn, nút rõ, popup nền trắng dễ đọc trên di động.</p>
                        </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <select
                            value={effectiveClassId ?? ''}
                            onChange={(event) => setSelectedClassId(Number(event.target.value))}
                            className="min-h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm font-black text-slate-950 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-white dark:text-slate-950"
                        >
                            {classes.length ? classes.map((item) => (
                                <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                            )) : <option value="">Chưa có lớp trong cơ sở dữ liệu</option>}
                        </select>
                        {canManage && (
                            <PrimaryButton type="button" onClick={() => setShowUploadModal(true)} className="min-h-12 px-5 text-sm font-black">
                                <UploadIcon size={17} /> Tải tài liệu
                            </PrimaryButton>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <MaterialStat icon={<FileIcon size={18} />} label="Tệp" value={fileCount} />
                    <MaterialStat icon={<BookIcon size={18} />} label="Link" value={linkCount} />
                    <MaterialStat icon={<CheckCircleIcon size={18} />} label="Đã ghim" value={pinnedCount} />
                </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
                <Panel title="Điều khiển tài liệu" subtitle="Tìm kiếm nhanh và lọc theo loại tài liệu để giảm tải nhận thức.">
                    <div className="grid gap-3">
                        <div className="relative">
                            <SearchIcon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                            <input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Tìm tên tài liệu, ghi chú, lớp..."
                                className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-white dark:text-slate-950"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { key: 'all', label: 'Tất cả' },
                                { key: 'file', label: 'File' },
                                { key: 'link', label: 'Link' },
                                { key: 'pinned', label: 'Đã ghim' },
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setTypeFilter(item.key as MaterialFilter)}
                                    className={`min-h-11 rounded-2xl border px-3 text-xs font-black transition ${typeFilter === item.key ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary)]' : 'border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-border)] hover:text-[var(--color-primary)]'}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100">
                            <div className="flex items-center gap-2 text-sm font-black"><ClockIcon size={18} /> Gợi ý thao tác</div>
                            <p className="mt-2 text-xs leading-5 opacity-80">Ghim tài liệu quan trọng để luôn nổi lên đầu danh sách. Khi upload, form đã có dữ liệu mẫu để chỉnh nhanh.</p>
                        </div>
                    </div>
                </Panel>

                <Panel title={`Danh sách tài liệu (${filteredMaterials.length})`} subtitle="Thẻ tài liệu lớn, thông tin vừa đủ và nút thao tác rõ ràng.">
                    {loading ? (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {[1, 2, 3].map((item) => <div key={item} className="h-56 animate-pulse rounded-3xl bg-[var(--color-bg-soft)]" />)}
                        </div>
                    ) : filteredMaterials.length ? (
                        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                            {filteredMaterials.map((item, index) => (
                                <motion.article
                                    key={item.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    className={`group rounded-[1.75rem] border p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${item.isPinned ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border-[var(--color-border)] bg-[var(--color-card)]'}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                                                {item.isLink ? <BookIcon size={22} /> : <FileIcon size={22} />}
                                            </span>
                                            <div>
                                                <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-black text-indigo-700">{item.isLink ? 'Link học liệu' : 'File tài liệu'}</span>
                                                {item.isPinned && <span className="ml-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-700">Đã ghim</span>}
                                            </div>
                                        </div>
                                        {canManage && (
                                            <button type="button" onClick={() => handleDelete(item.id)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 opacity-80 transition hover:opacity-100" aria-label="Xóa tài liệu">
                                                <XIcon size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <h3 className="mt-4 line-clamp-2 text-base font-black tracking-[-0.02em] text-[var(--color-text)]">{item.title}</h3>
                                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">{item.description || item.note || 'Tài liệu đã sẵn sàng cho lớp học.'}</p>

                                    <div className="mt-4 grid gap-2 rounded-2xl bg-[var(--color-bg-soft)] p-3 text-xs font-bold text-[var(--color-text-secondary)]">
                                        <div className="flex items-center justify-between gap-2"><span>Lớp</span><span className="truncate text-[var(--color-text)]">{item.class_name || classes.find((klass) => klass.id === item.class_id)?.name || 'Lớp đang chọn'}</span></div>
                                        <div className="flex items-center justify-between gap-2"><span>Đính kèm</span><span className="truncate text-[var(--color-text)]">{item.file_name || item.external_link || 'Chưa có đính kèm'}</span></div>
                                        <div className="flex items-center justify-between gap-2"><span>Lượt tải</span><span className="text-[var(--color-text)]">{item.downloads}</span></div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        <button type="button" onClick={() => setPreviewMaterial(item)} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-xs font-black text-[var(--color-text)] transition hover:border-[var(--color-primary-border)] hover:text-[var(--color-primary)]">Xem</button>
                                        <button type="button" onClick={() => togglePin(item.id)} className="min-h-11 rounded-2xl border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-700 transition hover:bg-amber-100">{item.isPinned ? 'Bỏ ghim' : 'Ghim'}</button>
                                        <PrimaryButton type="button" onClick={() => handleDownload(item)} className="min-h-11 px-3 text-xs font-black">
                                            <DownloadIcon size={14} /> Tải
                                        </PrimaryButton>
                                    </div>
                                </motion.article>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] p-8 text-center">
                            <FileIcon size={38} className="mx-auto text-[var(--color-text-muted)]" />
                            <h3 className="mt-3 text-lg font-black text-[var(--color-text)]">Chưa có tài liệu phù hợp</h3>
                            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Thử xoá bộ lọc hoặc tải tài liệu mới bằng form có sẵn dữ liệu.</p>
                        </div>
                    )}
                </Panel>
            </div>

            <AnimatePresence>
                {showUploadModal && (
                    <UploadMaterialModal
                        classes={classes}
                        selectedClassId={effectiveClassId}
                        headers={headers}
                        onClose={() => setShowUploadModal(false)}
                        onSuccess={() => {
                            setShowUploadModal(false);
                            setAlertMsg('Đã tải tài liệu lên thành công.');
                            setTimeout(() => setAlertMsg(''), 3000);
                            loadMaterials();
                        }}
                    />
                )}

                {previewMaterial && (
                    <MaterialPopup title="Xem trước tài liệu" onClose={() => setPreviewMaterial(null)}>
                        <div className="grid gap-4">
                            <div className="rounded-3xl bg-indigo-50 p-4 text-indigo-950">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">{previewMaterial.class_name || 'Lớp đang chọn'}</p>
                                <h3 className="mt-1 text-2xl font-black tracking-[-0.03em]">{previewMaterial.title}</h3>
                                <p className="mt-2 text-sm leading-6 opacity-80">{previewMaterial.description || previewMaterial.note || 'Nội dung tài liệu đã sẵn sàng để chia sẻ cho học sinh.'}</p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <PreviewInfo label="Loại" value={previewMaterial.external_link ? 'Link học liệu' : 'File tài liệu'} />
                                <PreviewInfo label="Tệp" value={previewMaterial.file_name || previewMaterial.external_link || 'Chưa có đính kèm'} />
                                <PreviewInfo label="Ngày tải" value={new Date(previewMaterial.created_at).toLocaleDateString('vi-VN')} />
                            </div>
                            <div className="rounded-3xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Ghi chú giảng viên</p>
                                <p className="mt-2 text-sm leading-6 text-slate-700">{previewMaterial.note || 'Dùng tài liệu này trước giờ học và nhắc học sinh xem lại sau buổi học.'}</p>
                            </div>
                            <PrimaryButton type="button" onClick={() => handleDownload(previewMaterial)} className="min-h-12 w-full text-sm font-black">
                                <DownloadIcon size={17} /> Mở / tải tài liệu
                            </PrimaryButton>
                        </div>
                    </MaterialPopup>
                )}
            </AnimatePresence>
        </div>
    );
}

function MaterialStat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
    return (
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">{icon}</div>
            <p className="text-2xl font-black text-[var(--color-text)]">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
        </div>
    );
}

function PreviewInfo({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 line-clamp-2 text-sm font-black leading-5 text-slate-950">{value}</p>
        </div>
    );
}

function MaterialPopup({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
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

function UploadMaterialModal({ classes, selectedClassId, headers, onClose, onSuccess }: { classes: ClassItem[]; selectedClassId: number | null; headers: Record<string, string>; onClose: () => void; onSuccess: () => void }) {
    const [form, setForm] = useState<UploadForm>({
        classId: selectedClassId || classes[0]?.id || 0,
        title: 'Bài giảng mới: Checklist chuẩn bị trước buổi học',
        note: 'Mục tiêu: học sinh đọc trước 10 phút, ghi lại 2 câu hỏi và hoàn thành bài tập ngắn sau buổi học.',
        externalLink: 'https://vat-learning.example/tai-lieu-mau',
    });
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.classId || !form.title.trim()) return;
        setLoading(true);

        try {
            let fileData = '';
            let fileName = '';
            let fileSize = '';
            let fileType = '';

            if (file) {
                fileName = file.name;
                fileSize = `${(file.size / 1024).toFixed(1)} KB`;
                fileType = file.type || 'application/octet-stream';
                fileData = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result || ''));
                    reader.readAsDataURL(file);
                });
            }

            await fetch(`${API_URL}/api/materials`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    class_id: form.classId,
                    title: form.title,
                    note: form.note,
                    description: form.note,
                    external_link: form.externalLink,
                    file_name: fileName,
                    file_data: fileData,
                    file_size: fileSize,
                    file_type: fileType,
                }),
            });
            onSuccess();
        } catch (error) {
            console.error('Lỗi upload tài liệu:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <MaterialPopup title="Tải tài liệu / bài giảng mới" onClose={onClose}>
            <form onSubmit={handleSubmit} className="grid gap-4">
                <div>
                    <label className="mb-1 block text-xs font-black text-slate-600">Lớp nhận tài liệu <span className="text-red-500">*</span></label>
                    <select value={form.classId} onChange={(event) => setForm({ ...form, classId: Number(event.target.value) })} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                        {classes.length ? classes.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>) : <option value={0}>Chưa có lớp trong cơ sở dữ liệu</option>}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-black text-slate-600">Tiêu đề tài liệu <span className="text-red-500">*</span></label>
                    <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-black text-slate-600">Ghi chú / hướng dẫn học sinh</label>
                    <textarea rows={5} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-black text-slate-600">Link học liệu</label>
                    <input value={form.externalLink} onChange={(event) => setForm({ ...form, externalLink: event.target.value })} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <label className="cursor-pointer rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-5 text-center text-indigo-950 transition hover:bg-indigo-100">
                    <input type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                    <FileIcon size={34} className="mx-auto text-indigo-600" />
                    <span className="mt-2 block text-sm font-black">{file ? `${file.name} • ${(file.size / 1024).toFixed(1)} KB` : 'Bấm để chọn file đính kèm'}</span>
                    <span className="mt-1 block text-xs font-semibold opacity-70">Có thể dùng link, file hoặc cả hai. Form đã có dữ liệu mẫu.</span>
                </label>
                <div className="grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2">
                    <button type="button" onClick={onClose} className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-800 transition hover:bg-slate-100">Hủy</button>
                    <PrimaryButton type="submit" disabled={loading || !form.title.trim() || !form.classId} className="min-h-12 text-sm font-black">
                        {loading ? 'Đang tải...' : 'Xác nhận tải lên'}
                    </PrimaryButton>
                </div>
            </form>
        </MaterialPopup>
    );
}
