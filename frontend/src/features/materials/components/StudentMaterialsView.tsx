import { memo, useState } from 'react';
import { SearchIcon, FileIcon, DownloadIcon, MoreIcon, FilterIcon, ClockIcon, BookIcon } from '../../../components/shared/icons';
import { Button } from '../../../components/shared/ui';
import type { ClassItem } from '../../../types';

type StudentMaterialsViewProps = {
    classes: ClassItem[];
};

export const StudentMaterialsView = memo(function StudentMaterialsView({ classes }: StudentMaterialsViewProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);

    // Mock folders based on active classes
    const folders = classes.map(c => ({ id: c.id, name: c.name, count: 12, subject: c.subject }));
    
    // Mock recent files
    const recentFiles = [
        { id: 1, name: 'De_Cuong_On_Tap_Giua_Ky.pdf', type: 'PDF', size: '2.4 MB', date: 'Hôm nay', class: 'Đại số tuyến tính' },
        { id: 2, name: 'Slide_Bai_4.pptx', type: 'PPT', size: '5.1 MB', date: 'Hôm qua', class: 'Tiếng Anh Giao Tiếp' },
        { id: 3, name: 'Bai_Tap_Ve_Nha_Tuan_5.docx', type: 'WORD', size: '1.2 MB', date: '3 ngày trước', class: 'Hóa học Hữu cơ' },
    ];

    const getFileBadge = (type: string) => {
        if (type === 'PDF') return 'bg-red-50 text-red-700 border-red-200';
        if (type === 'WORD') return 'bg-blue-50 text-blue-700 border-blue-200';
        if (type === 'PPT') return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-slate-50 text-slate-700 border-slate-200';
    };

    return (
        <div className="grid gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-[var(--color-text)]">Thư viện Tài liệu</h2>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">Tất cả bài giảng, đề cương và tài liệu môn học</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-80">
                        <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm tài liệu trong Drive..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-card)] pl-10 pr-4 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition" 
                        />
                    </div>
                    <Button className="h-11 rounded-full px-4" leftIcon={<FilterIcon size={18} />}>Lọc</Button>
                </div>
            </div>

            {/* Breadcrumb / Navigation */}
            <div className="flex items-center gap-2 text-sm font-semibold">
                <button onClick={() => setCurrentFolder(null)} className={`hover:text-[var(--color-primary)] transition ${!currentFolder ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}>My Drive</button>
                {currentFolder && (
                    <>
                        <span className="text-[var(--color-text-muted)]">/</span>
                        <span className="text-[var(--color-text)]">{currentFolder}</span>
                    </>
                )}
            </div>

            {!currentFolder && (
                <>
                    {/* Recent Files */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-[var(--color-text-secondary)]">
                            <ClockIcon size={18} />
                            <h3 className="text-sm font-bold uppercase tracking-wider">Mở gần đây</h3>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {recentFiles.map(file => (
                                <div key={file.id} className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 cursor-pointer hover:border-blue-400 hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getFileBadge(file.type)}`}>{file.type}</span>
                                        <button className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><MoreIcon size={16} /></button>
                                    </div>
                                    <h4 className="text-sm font-bold text-[var(--color-text)] line-clamp-2 group-hover:text-blue-600 transition mb-1">{file.name}</h4>
                                    <p className="text-[10px] text-[var(--color-text-muted)]">{file.class}</p>
                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-border)] text-[10px] font-semibold text-[var(--color-text-secondary)]">
                                        <span>{file.size}</span>
                                        <span>{file.date}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Folders */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-[var(--color-text-secondary)]">
                            <BookIcon size={18} />
                            <h3 className="text-sm font-bold uppercase tracking-wider">Thư mục môn học</h3>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {folders.map(folder => (
                                <div 
                                    key={folder.id} 
                                    onClick={() => setCurrentFolder(folder.name)}
                                    className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition group"
                                >
                                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-100/50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                                        📁
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-[var(--color-text)] truncate">{folder.name}</h4>
                                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{folder.count} mục</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {currentFolder && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--color-bg-soft)] text-xs uppercase text-[var(--color-text-muted)] font-bold">
                            <tr>
                                <th className="px-6 py-4">Tên file</th>
                                <th className="px-6 py-4 hidden md:table-cell">Mô tả</th>
                                <th className="px-6 py-4">Kích thước</th>
                                <th className="px-6 py-4 hidden sm:table-cell">Ngày đăng</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {recentFiles.map(file => (
                                <tr key={file.id} className="hover:bg-[var(--color-bg-soft)] transition cursor-pointer group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <FileIcon size={20} className="text-blue-500" />
                                            <span className="font-semibold text-[var(--color-text)] group-hover:text-blue-600 transition">{file.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[var(--color-text-secondary)] hidden md:table-cell">
                                        Tài liệu tuần 1
                                    </td>
                                    <td className="px-6 py-4 text-[var(--color-text-secondary)] font-mono text-xs">
                                        {file.size}
                                    </td>
                                    <td className="px-6 py-4 text-[var(--color-text-secondary)] hidden sm:table-cell">
                                        {file.date}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                            <button className="p-2 hover:bg-blue-100 text-blue-600 rounded-full transition"><DownloadIcon size={16} /></button>
                                            <button className="p-2 hover:bg-[var(--color-border)] text-[var(--color-text-muted)] rounded-full transition"><MoreIcon size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
});
