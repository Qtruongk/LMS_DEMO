import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookIcon, CalendarIcon, ClockIcon, DownloadIcon, FileIcon, FilterIcon, SearchIcon, XIcon } from '../../../components/shared/icons';
import { Button } from '../../../components/shared/ui';
import type { ClassItem, Material } from '../../../types';
import { API_URL } from '../../../services/api';

type StudentMaterialsViewProps = {
    classes: ClassItem[];
};

type FileFilter = 'all' | 'pdf' | 'doc' | 'ppt' | 'link';
type SortMode = 'newest' | 'oldest' | 'title';

function getCurrentUserId() {
    try {
        const saved = localStorage.getItem('vat_user');
        return saved ? JSON.parse(saved).id : null;
    } catch {
        return null;
    }
}

function formatMaterialDate(value?: string) {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getMaterialTime(value?: string) {
    if (!value) return 'Không rõ thời gian';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Không rõ thời gian';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function getFileExtension(material: Material) {
    if (material.external_link && !material.file_name) return 'link';
    return material.file_name?.split('.').pop()?.toLowerCase() || material.file_type?.toLowerCase() || 'file';
}

function getFileTypeLabel(material: Material) {
    const ext = getFileExtension(material);
    if (ext === 'link') return 'Liên kết';
    if (ext.includes('pdf')) return 'PDF';
    if (ext.includes('doc')) return 'Word';
    if (ext.includes('ppt')) return 'Slide';
    return ext.toUpperCase();
}

export const StudentMaterialsView = memo(function StudentMaterialsView({ classes }: StudentMaterialsViewProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [alertMsg, setAlertMsg] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [fileFilter, setFileFilter] = useState<FileFilter>('all');
    const [sortMode, setSortMode] = useState<SortMode>('newest');
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const getClassName = useCallback((material: Material) => material.class_name || classes.find((item) => item.id === material.class_id)?.name || 'Lớp học', [classes]);

    const folders = useMemo(() => classes.map((item) => ({
        id: item.id,
        name: item.name,
        subject: item.subject,
        count: materials.filter((material) => material.class_id === item.id).length,
    })), [classes, materials]);

    const filteredFiles = useMemo(() => {
        const keyword = searchQuery.trim().toLowerCase();
        const result = materials.filter((item) => {
            const extension = getFileExtension(item);
            const matchesFolder = !currentFolder || item.class_id === Number(currentFolder);
            const matchesFilter = fileFilter === 'all'
                || (fileFilter === 'pdf' && extension.includes('pdf'))
                || (fileFilter === 'doc' && extension.includes('doc'))
                || (fileFilter === 'ppt' && extension.includes('ppt'))
                || (fileFilter === 'link' && extension === 'link');
            const matchesSearch = !keyword || [item.title, item.description, item.note, item.file_name, item.external_link, item.class_name, getClassName(item)]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(keyword));
            return matchesFolder && matchesFilter && matchesSearch;
        });

        return result.sort((a, b) => {
            if (sortMode === 'title') return a.title.localeCompare(b.title, 'vi');
            const aTime = new Date(a.created_at).getTime() || 0;
            const bTime = new Date(b.created_at).getTime() || 0;
            return sortMode === 'oldest' ? aTime - bTime : bTime - aTime;
        });
    }, [currentFolder, fileFilter, getClassName, materials, searchQuery, sortMode]);

    const loadMaterials = useCallback(async () => {
        const userId = getCurrentUserId();
        if (!userId) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/materials/all`, {
                headers: { 'Content-Type': 'application/json', 'x-user-id': String(userId) },
            });
            const data = await response.json();
            setMaterials(Array.isArray(data.materials) ? data.materials : []);
        } catch (error) {
            console.error('Lỗi tải tài liệu học viên:', error);
            setMaterials([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMaterials();
    }, [loadMaterials]);

    const getFileBadge = (material: Material) => {
        const extension = getFileExtension(material);
        if (extension === 'link') return 'border-violet-200 bg-violet-50 text-violet-700';
        if (extension.includes('pdf')) return 'border-red-200 bg-red-50 text-red-700';
        if (extension.includes('doc')) return 'border-blue-200 bg-blue-50 text-blue-700';
        if (extension.includes('ppt')) return 'border-amber-200 bg-amber-50 text-amber-700';
        return 'border-slate-200 bg-slate-50 text-slate-700';
    };

    const openMaterial = (material: Material) => {
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
        setTimeout(() => setAlertMsg(''), 3600);
    };

    const activeFolderName = currentFolder ? folders.find((item) => String(item.id) === currentFolder)?.name : 'Tất cả lớp';

    return (
        <div className="grid gap-6 pb-6">
            <AnimatePresence>
                {alertMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 shadow-sm"
                    >
                        {alertMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            <section className="grid gap-4 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm sm:p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="relative">
                        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên tài liệu, lớp, ghi chú, link..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] pl-11 pr-4 text-sm font-semibold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-card)] focus:ring-2 focus:ring-[var(--color-primary-border)]"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                        <Button type="button" variant="secondary" leftIcon={<FilterIcon size={16} />} onClick={() => setShowFilters((value) => !value)} className="min-h-12">
                            Bộ lọc
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => { setCurrentFolder(null); setFileFilter('all'); setSortMode('newest'); setSearchQuery(''); }} className="min-h-12">
                            Đặt lại
                        </Button>
                    </div>
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid gap-3 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 md:grid-cols-3">
                                <label className="grid gap-1 text-xs font-black text-[var(--color-text-secondary)]">
                                    Định dạng
                                    <select value={fileFilter} onChange={(event) => setFileFilter(event.target.value as FileFilter)} className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]">
                                        <option value="all">Tất cả định dạng</option>
                                        <option value="pdf">PDF</option>
                                        <option value="doc">Word / DOC</option>
                                        <option value="ppt">Slide / PPT</option>
                                        <option value="link">Liên kết</option>
                                    </select>
                                </label>
                                <label className="grid gap-1 text-xs font-black text-[var(--color-text-secondary)]">
                                    Sắp xếp
                                    <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]">
                                        <option value="newest">Mới nhất trước</option>
                                        <option value="oldest">Cũ nhất trước</option>
                                        <option value="title">Theo tên A-Z</option>
                                    </select>
                                </label>
                                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-3 text-xs font-bold text-[var(--color-text-secondary)]">
                                    <p className="text-[var(--color-text)]">Không gian đang xem</p>
                                    <p className="mt-1">{activeFolderName} · {filteredFiles.length} tài liệu phù hợp</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button onClick={() => setCurrentFolder(null)} className={`rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${!currentFolder ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-[var(--color-border)] bg-[var(--color-card)]'}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-red-50 text-red-700"><BookIcon size={22} /></div>
                        <span className="rounded-full bg-[var(--color-bg-soft)] px-2.5 py-1 text-[11px] font-black text-[var(--color-text-muted)]">{materials.length} tài liệu</span>
                    </div>
                    <h3 className="mt-3 font-black text-[var(--color-text)]">Tất cả tài liệu</h3>
                </button>
                {folders.map((folder) => (
                    <button
                        key={folder.id}
                        onClick={() => setCurrentFolder(currentFolder === String(folder.id) ? null : String(folder.id))}
                        className={`group rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${currentFolder === String(folder.id) ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-[var(--color-border)] bg-[var(--color-card)]'}`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                                <BookIcon size={22} />
                            </div>
                            <span className="rounded-full bg-[var(--color-bg-soft)] px-2.5 py-1 text-[11px] font-black text-[var(--color-text-muted)]">{folder.count} tài liệu</span>
                        </div>
                        <h3 className="mt-3 line-clamp-1 font-black text-[var(--color-text)]">{folder.name}</h3>
                    </button>
                ))}
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
                <div className="flex flex-col gap-2 border-b border-[var(--color-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">Danh sách tài liệu ({filteredFiles.length})</h3>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-bg-soft)] px-3 py-1.5 text-xs font-black text-[var(--color-text-secondary)]">
                        <ClockIcon size={14} /> Cập nhật từ cơ sở dữ liệu
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-44 animate-pulse rounded-[1.5rem] bg-[var(--color-bg-soft)]" />)}
                    </div>
                ) : filteredFiles.length ? (
                    <>
                        <div className="grid gap-3 p-4 md:hidden">
                            {filteredFiles.map((file) => (
                                <article key={file.id} className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border font-black ${getFileBadge(file)}`}>
                                            <FileIcon size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-[var(--color-text-secondary)]">{getFileTypeLabel(file)}</span>
                                                <span className={`rounded-full px-2 py-1 text-[10px] font-black ${file.material_kind === 'solution' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{file.material_kind === 'solution' ? 'Tài liệu sửa bài' : 'Tài liệu trắng'}</span>
                                                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-[var(--color-text-secondary)]">{file.file_size || 'Không rõ size'}</span>
                                            </div>
                                            <h4 className="mt-2 line-clamp-2 font-black leading-5 text-[var(--color-text)]">{file.title}</h4>
                                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-secondary)]">{file.note || file.description || 'Tài liệu từ cơ sở dữ liệu'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid gap-2 rounded-2xl bg-[var(--color-card)] p-3 text-xs font-bold text-[var(--color-text-secondary)]">
                                        <div className="flex justify-between gap-3"><span>Lớp</span><span className="text-right text-[var(--color-text)]">{getClassName(file)}</span></div>
                                        <div className="flex justify-between gap-3"><span>Ngày</span><span className="text-right text-[var(--color-text)]">{formatMaterialDate(file.created_at)} · {getMaterialTime(file.created_at)}</span></div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <Button type="button" variant="secondary" onClick={() => setSelectedMaterial(file)} className="min-h-11">Xem</Button>
                                        <Button type="button" variant="primary" leftIcon={<DownloadIcon size={15} />} onClick={() => openMaterial(file)} className="min-h-11">Mở</Button>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="bg-[var(--color-bg-soft)] text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                                    <tr>
                                        <th className="px-6 py-3 font-black">Tên tài liệu</th>
                                        <th className="px-6 py-3 font-black">Lớp</th>
                                        <th className="px-6 py-3 font-black">Loại</th>
                                        <th className="px-6 py-3 font-black">Ngày tải</th>
                                        <th className="px-6 py-3 text-right font-black">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {filteredFiles.map((file) => (
                                        <tr key={file.id} className="group transition hover:bg-[var(--color-bg-soft)]">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border font-black ${getFileBadge(file)}`}>
                                                        <FileIcon size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="line-clamp-1 font-black text-[var(--color-text)]">{file.title}</p>
                                                        <p className="line-clamp-1 text-xs text-[var(--color-text-secondary)]">{file.note || file.description || file.file_name || file.external_link || 'Tài liệu từ cơ sở dữ liệu'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[var(--color-text-secondary)]">{getClassName(file)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${getFileBadge(file)}`}>{getFileTypeLabel(file)} · {file.file_size || '—'}</span>
                                                    <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${file.material_kind === 'solution' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{file.material_kind === 'solution' ? 'Tài liệu sửa bài' : 'Tài liệu trắng'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                                                <div className="flex items-center gap-2"><CalendarIcon size={15} /> {formatMaterialDate(file.created_at)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button type="button" variant="secondary" onClick={() => setSelectedMaterial(file)} className="min-h-10 px-3 text-xs">Xem</Button>
                                                    <Button type="button" variant="primary" leftIcon={<DownloadIcon size={15} />} onClick={() => openMaterial(file)} className="min-h-10 px-3 text-xs">Mở</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="grid place-items-center p-8 text-center">
                        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]"><FileIcon size={28} /></div>
                        <h4 className="mt-4 font-black text-[var(--color-text)]">Chưa tìm thấy tài liệu phù hợp</h4>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--color-text-secondary)]">Thử đổi từ khóa, bỏ bộ lọc hoặc chọn lại lớp để xem toàn bộ tài liệu có trong cơ sở dữ liệu.</p>
                    </div>
                )}
            </section>

            <AnimatePresence>
                {selectedMaterial && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 backdrop-blur-sm sm:place-items-center"
                        onClick={() => setSelectedMaterial(null)}
                    >
                        <motion.div
                            initial={{ y: 28, opacity: 0, scale: 0.98 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 28, opacity: 0, scale: 0.98 }}
                            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border ${getFileBadge(selectedMaterial)}`}><FileIcon size={24} /></div>
                                    <div>
                                        <span className="rounded-full bg-[var(--color-bg-soft)] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[var(--color-text-secondary)]">{getFileTypeLabel(selectedMaterial)}</span>
                                        <h3 className="mt-3 text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">{selectedMaterial.title}</h3>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setSelectedMaterial(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] transition hover:text-[var(--color-text)]" aria-label="Đóng popup tài liệu">
                                    <XIcon size={18} />
                                </button>
                            </div>

                            <div className="mt-5 grid gap-3 rounded-[1.5rem] bg-[var(--color-bg-soft)] p-4 text-sm font-bold text-[var(--color-text-secondary)] sm:grid-cols-2">
                                <div><p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Lớp</p><p className="mt-1 text-[var(--color-text)]">{getClassName(selectedMaterial)}</p></div>
                                <div><p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Ngày cập nhật</p><p className="mt-1 text-[var(--color-text)]">{formatMaterialDate(selectedMaterial.created_at)} · {getMaterialTime(selectedMaterial.created_at)}</p></div>
                                <div><p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Tệp / Link</p><p className="mt-1 break-all text-[var(--color-text)]">{selectedMaterial.file_name || selectedMaterial.external_link || 'Chưa có dữ liệu đính kèm'}</p></div>
                                <div><p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Dung lượng</p><p className="mt-1 text-[var(--color-text)]">{selectedMaterial.file_size || 'Chưa cập nhật'}</p></div>
                            </div>

                            <div className="mt-5 grid gap-2 sm:grid-cols-2">
                                <Button type="button" variant="secondary" onClick={() => setSelectedMaterial(null)} className="min-h-12">Đóng</Button>
                                <Button type="button" variant="primary" leftIcon={<DownloadIcon size={16} />} onClick={() => openMaterial(selectedMaterial)} className="min-h-12">Mở hoặc tải tài liệu</Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
