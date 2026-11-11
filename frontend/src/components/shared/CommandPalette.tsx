import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, XIcon, BookIcon, CalendarIcon, CheckIcon, FileIcon, BellIcon, MailIcon, UsersIcon, WalletIcon, ChartIcon } from './icons';
import type { ClassItem, User } from '../../types';

type CommandPaletteProps = {
    isOpen: boolean;
    onClose: () => void;
    onSelectModule: (module: string) => void;
    classes: ClassItem[];
    onSelectClass?: (classId: number) => void;
    user?: User;
};

type SearchItem = {
    id: string;
    title: string;
    category: 'Điều hướng' | 'Lớp học' | 'Tác vụ nhanh';
    icon: JSX.Element;
    action: () => void;
};

export function CommandPalette({ isOpen, onClose, onSelectModule, classes, onSelectClass, user }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                isOpen ? onClose() : null;
            }
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isStudent = user?.role === 'student';
    const isOwner = user?.role === 'owner';
    const isAdmin = user?.role === 'admin';

    const baseItems: SearchItem[] = [
        { id: 'nav-dashboard', title: 'Trang tổng quan', category: 'Điều hướng', icon: <BookIcon size={16} />, action: () => { onSelectModule('dashboard'); onClose(); } },
    ];

    if (isStudent) {
        baseItems.push({ id: 'nav-schedule', title: 'Lịch học của tôi', category: 'Điều hướng', icon: <CalendarIcon size={16} />, action: () => { onSelectModule('schedule'); onClose(); } });
        baseItems.push({ id: 'nav-classes', title: 'Lớp học của tôi', category: 'Điều hướng', icon: <BookIcon size={16} />, action: () => { onSelectModule('classes'); onClose(); } });
        baseItems.push({ id: 'nav-attendance', title: 'Lịch sử điểm danh', category: 'Tác vụ nhanh', icon: <CheckIcon size={16} />, action: () => { onSelectModule('attendance'); onClose(); } });
        baseItems.push({ id: 'nav-tuition', title: 'Học phí & Thanh toán', category: 'Tác vụ nhanh', icon: <WalletIcon size={16} />, action: () => { onSelectModule('tuition'); onClose(); } });
        baseItems.push({ id: 'nav-feedbacks', title: 'Gửi phản hồi / Hỗ trợ trung tâm', category: 'Tác vụ nhanh', icon: <MailIcon size={16} />, action: () => { onSelectModule('feedbacks'); onClose(); } });
    } else if (isOwner) {
        baseItems.push({ id: 'nav-classes', title: 'Danh sách lớp học', category: 'Điều hướng', icon: <BookIcon size={16} />, action: () => { onSelectModule('classes'); onClose(); } });
        baseItems.push({ id: 'nav-schedule', title: 'Lịch vận hành', category: 'Điều hướng', icon: <CalendarIcon size={16} />, action: () => { onSelectModule('schedule'); onClose(); } });
        baseItems.push({ id: 'nav-finance', title: 'Báo cáo Tài chính', category: 'Điều hướng', icon: <WalletIcon size={16} />, action: () => { onSelectModule('finance'); onClose(); } });
        baseItems.push({ id: 'nav-service-quality', title: 'Báo cáo Chất lượng dịch vụ', category: 'Điều hướng', icon: <ChartIcon size={16} />, action: () => { onSelectModule('service-quality'); onClose(); } });
        baseItems.push({ id: 'nav-data-analytics', title: 'Báo cáo Phân tích dữ liệu', category: 'Điều hướng', icon: <ChartIcon size={16} />, action: () => { onSelectModule('data-analytics'); onClose(); } });
        baseItems.push({ id: 'nav-teaching-report', title: 'Báo cáo giảng dạy giáo viên', category: 'Điều hướng', icon: <ChartIcon size={16} />, action: () => { onSelectModule('teaching-report'); onClose(); } });
        baseItems.push({ id: 'nav-class-report', title: 'Báo cáo từng lớp học', category: 'Điều hướng', icon: <ChartIcon size={16} />, action: () => { onSelectModule('class-report'); onClose(); } });
        baseItems.push({ id: 'nav-feedbacks', title: 'Phản hồi', category: 'Tác vụ nhanh', icon: <MailIcon size={16} />, action: () => { onSelectModule('feedbacks'); onClose(); } });
    } else if (isAdmin) {
        baseItems.push({ id: 'nav-accounts', title: 'Quản lý tài khoản và lớp học', category: 'Điều hướng', icon: <UsersIcon size={16} />, action: () => { onSelectModule('accounts'); onClose(); } });
        baseItems.push({ id: 'nav-class-operations', title: 'Vận hành lớp học', category: 'Tác vụ nhanh', icon: <BookIcon size={16} />, action: () => { onSelectModule('class-operations'); onClose(); } });
        baseItems.push({ id: 'nav-notifications', title: 'Bảng tin lớp học', category: 'Điều hướng', icon: <BellIcon size={16} />, action: () => { onSelectModule('notifications'); onClose(); } });
        baseItems.push({ id: 'nav-requests', title: 'Yêu cầu đổi mật khẩu', category: 'Điều hướng', icon: <MailIcon size={16} />, action: () => { onSelectModule('requests'); onClose(); } });
    } else {
        baseItems.push({ id: 'nav-schedule', title: 'Thời khóa biểu giảng dạy', category: 'Điều hướng', icon: <CalendarIcon size={16} />, action: () => { onSelectModule('schedule'); onClose(); } });
        baseItems.push({ id: 'nav-classes', title: 'Lớp học đang dạy', category: 'Điều hướng', icon: <BookIcon size={16} />, action: () => { onSelectModule('classes'); onClose(); } });
        baseItems.push({ id: 'nav-materials', title: 'Kho tài liệu bài giảng', category: 'Điều hướng', icon: <FileIcon size={16} />, action: () => { onSelectModule('materials'); onClose(); } });
        baseItems.push({ id: 'nav-notifications', title: 'Bảng tin & Thông báo', category: 'Điều hướng', icon: <BellIcon size={16} />, action: () => { onSelectModule('notifications'); onClose(); } });
        baseItems.push({ id: 'nav-attendance', title: 'Điểm danh học sinh', category: 'Tác vụ nhanh', icon: <CheckIcon size={16} />, action: () => { onSelectModule('attendance'); onClose(); } });
        baseItems.push({ id: 'nav-students', title: 'Danh sách Học sinh', category: 'Điều hướng', icon: <UsersIcon size={16} />, action: () => { onSelectModule('students'); onClose(); } });
        baseItems.push({ id: 'nav-library', title: 'Thư viện số', category: 'Tác vụ nhanh', icon: <BookIcon size={16} />, action: () => { onSelectModule('library'); onClose(); } });
        baseItems.push({ id: 'nav-feedbacks', title: 'Gửi phản hồi / Hỗ trợ trung tâm', category: 'Tác vụ nhanh', icon: <MailIcon size={16} />, action: () => { onSelectModule('feedbacks'); onClose(); } });
    }

    const classItems: SearchItem[] = classes.map((c) => ({
        id: `class-${c.id}`,
        title: `Lớp: ${c.name} (${c.code}) - Môn: ${c.subject}`,
        category: 'Lớp học',
        icon: <BookIcon size={16} />,
        action: () => {
            if (onSelectClass) onSelectClass(c.id);
            onSelectModule(isAdmin ? 'accounts' : 'classes');
            onClose();
        }
    }));

    const allItems = [...baseItems, ...classItems];
    const filtered = allItems.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
    );

    const handleKeyDownModal = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[selectedIndex]) {
                filtered[selectedIndex].action();
            }
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.16 }}
                    className="w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={handleKeyDownModal}
                >
                    {/* Search Bar */}
                    <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 bg-[var(--color-bg-soft)]">
                        <SearchIcon size={20} className="text-[var(--color-text-secondary)]" />
                        <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelectedIndex(0);
                            }}
                            placeholder="Gõ từ khóa hoặc tìm kiếm Lớp học, Tài liệu, Tác vụ... (Ctrl+K)"
                            className="flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
                        />
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]"
                        >
                            <XIcon size={18} />
                        </button>
                    </div>

                    {/* Results List */}
                    <div className="max-h-96 overflow-y-auto p-2 divide-y divide-[var(--color-border)]">
                        {filtered.length === 0 ? (
                            <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                                Không tìm thấy kết quả phù hợp với "{query}"
                            </div>
                        ) : (
                            filtered.map((item, idx) => {
                                const isSelected = idx === selectedIndex;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={item.action}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 cursor-pointer transition ${isSelected
                                            ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-semibold'
                                            : 'text-[var(--color-text)] hover:bg-[var(--color-bg-soft)]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`grid h-8 w-8 place-items-center rounded-lg ${isSelected ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]'}`}>
                                                {item.icon}
                                            </span>
                                            <span className="text-xs">{item.title}</span>
                                        </div>
                                        <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)]">
                                            {item.category}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer hints */}
                    <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2 text-[11px] text-[var(--color-text-muted)]">
                        <div className="flex items-center gap-2">
                            <span className="rounded bg-[var(--color-card)] border border-[var(--color-border)] px-1.5 py-0.5 font-mono">↑↓</span> Chuyển mục
                            <span className="rounded bg-[var(--color-card)] border border-[var(--color-border)] px-1.5 py-0.5 font-mono">↵</span> Chọn
                        </div>
                        <div><span className="rounded bg-[var(--color-card)] border border-[var(--color-border)] px-1.5 py-0.5 font-mono">Esc</span> Đóng</div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
