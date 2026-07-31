import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { SearchIcon, FileIcon, DownloadIcon, MoreIcon, FilterIcon, BookIcon } from '../../../components/shared/icons';
import { Button } from '../../../components/shared/ui';
import type { ClassItem, Material } from '../../../types';
import { API_URL } from '../../../services/api';

type StudentMaterialsViewProps = {
    classes: ClassItem[];
};

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
    return date.toLocaleDateString('vi-VN');
}

export const StudentMaterialsView = memo(function StudentMaterialsView({ classes }: StudentMaterialsViewProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [alertMsg, setAlertMsg] = useState('');

    const folders = useMemo(() => classes.map((item) => ({
        id: item.id,
        name: item.name,
        subject: item.subject,
        count: materials.filter((material) => material.class_id === item.id).length,
    })), [classes, materials]);

    const filteredFiles = useMemo(() => materials.filter((item) => {
        const matchesFolder = !currentFolder || item.class_id === Number(currentFolder);
        const keyword = searchQuery.trim().toLowerCase();
        const matchesSearch = !keyword || [item.title, item.description, item.note, item.file_name, item.external_link, item.class_name]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword));
        return matchesFolder && matchesSearch;
    }), [materials, currentFolder, searchQuery]);

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
        const fileName = material.file_name || material.external_link || '';
        if (fileName.toLowerCase().endsWith('.pdf')) return 'bg-red-50 text-red-700 border-red-200';
        if (fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx')) return 'bg-blue-50 text-blue-700 border-blue-200';
        if (fileName.toLowerCase().endsWith('.ppt') || fileName.toLowerCase().endsWith('.pptx')) return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-slate-50 text-slate-700 border-slate-200';
    };

    const getFileType = (material: Material) => {
        if (material.external_link && !material.file_name) return 'LINK';
        const ext = material.file_name?.split('.').pop()?.toUpperCase();
        return ext || 'FILE';
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
        setTimeout(() => setAlertMsg(''), 3000);
    };

    return (
        <div className="grid gap-6">
            {alertMsg && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{alertMsg}</div>
            )}

            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h2 className="text-2xl font-black text-[var(--color-text)]">Thư viện Tài liệu</h2>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Tài liệu được tải trực tiếp từ cơ sở dữ liệu theo lớp học của bạn</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-80">
                        <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tài liệu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] pl-10 pr-4 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-border)]"
                        />
                    </div>
                    <Button variant="secondary" leftIcon={<FilterIcon size={16} />}>Lọc</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {folders.map((folder) => (
                    <button
                        key={folder.id}
                        onClick={() => setCurrentFolder(currentFolder === String(folder.id) ? null : String(folder.id))}
                        className={`group rounded-[1.5rem] border p-5 text-left transition hover:-translate-y-1 hover:shadow-lg ${currentFolder === String(folder.id) ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-[var(--color-border)] bg-[var(--color-card)]'}`}
                    >
                        <div className="mb-4 flex items-start justify-between">
                            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                                <BookIcon size={24} />
                            </div>
                            <span className="rounded-full bg-[var(--color-bg-soft)] px-2 py-1 text-[10px] font-bold text-[var(--color-text-muted)]">{folder.count} tài liệu</span>
                        </div>
                        <h3 className="font-bold text-[var(--color-text)]">{folder.name}</h3>
                        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{folder.subject}</p>
                    </button>
                ))}
            </div>

            {currentFolder && (
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-primary)]">
                    <span>Đang xem: {folders.find((item) => String(item.id) === currentFolder)?.name}</span>
                    <button onClick={() => setCurrentFolder(null)} className="underline">Xem tất cả</button>
                </div>
            )}

            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
                <div className="border-b border-[var(--color-border)] p-4">
                    <h3 className="font-bold text-[var(--color-text)]">Tài liệu gần đây ({filteredFiles.length})</h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">Đang tải tài liệu từ cơ sở dữ liệu...</div>
                ) : filteredFiles.length ? (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--color-bg-soft)] text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                            <tr>
                                <th className="px-6 py-3 font-bold">Tên tài liệu</th>
                                <th className="hidden px-6 py-3 font-bold md:table-cell">Lớp</th>
                                <th className="px-6 py-3 font-bold">Dung lượng</th>
                                <th className="hidden px-6 py-3 font-bold sm:table-cell">Ngày tải</th>
                                <th className="px-6 py-3 text-right font-bold">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {filteredFiles.map((file) => (
                                <tr key={file.id} className="group transition hover:bg-[var(--color-bg-soft)]">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border font-bold ${getFileBadge(file)}`}>
                                                <FileIcon size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[var(--color-text)]">{file.title}</p>
                                                <p className="text-xs text-[var(--color-text-secondary)]">{getFileType(file)} · {file.note || file.description || 'Tài liệu từ cơ sở dữ liệu'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="hidden px-6 py-4 text-[var(--color-text-secondary)] md:table-cell">{file.class_name || classes.find((item) => item.id === file.class_id)?.name || 'Lớp học'}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-[var(--color-text-secondary)]">{file.file_size || '—'}</td>
                                    <td className="hidden px-6 py-4 text-[var(--color-text-secondary)] sm:table-cell">{formatMaterialDate(file.created_at)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                                            <button onClick={() => openMaterial(file)} className="rounded-full p-2 text-blue-600 transition hover:bg-blue-100"><DownloadIcon size={16} /></button>
                                            <button className="rounded-full p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)]"><MoreIcon size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">Chưa có tài liệu trong cơ sở dữ liệu cho lớp hiện tại.</div>
                )}
            </div>
        </div>
    );
});
