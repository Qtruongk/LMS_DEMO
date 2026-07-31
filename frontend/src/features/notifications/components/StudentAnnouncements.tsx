import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BellIcon, SearchIcon, MessageIcon } from '../../../components/shared/icons';
import { Button } from '../../../components/shared/ui';
import type { ClassItem, NotificationItem } from '../../../types';
import { API_URL } from '../../../services/api';

type StudentAnnouncementsProps = {
    classes: ClassItem[];
    userId: number;
};

export const StudentAnnouncements = memo(function StudentAnnouncements({ userId }: StudentAnnouncementsProps) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        const fetchAnnouncements = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/notifications`, {
                    headers: { 'x-user-id': String(userId) }
                });
                const data = await res.json();
                setNotifications(data.notifications ?? []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnnouncements();
    }, [userId]);

    const filtered = notifications.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch; // In real app we would check if it's unread
    });

    const getPriorityColor = (priority: string) => {
        if (priority === 'urgent') return 'bg-red-50 text-red-600 border-red-200';
        if (priority === 'important') return 'bg-amber-50 text-amber-600 border-amber-200';
        return 'bg-blue-50 text-blue-600 border-blue-200';
    };

    return (
        <div className="grid gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-[var(--color-text)]">Bảng tin & Thông báo</h2>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">Cập nhật tin tức mới nhất từ trường và các lớp học</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-80">
                        <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm thông báo..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-card)] pl-10 pr-4 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition" 
                        />
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <Button 
                    variant={filter === 'all' ? 'primary' : 'ghost'} 
                    onClick={() => setFilter('all')}
                    className="rounded-full px-4"
                >
                    Tất cả
                </Button>
                <Button 
                    variant={filter === 'unread' ? 'primary' : 'ghost'} 
                    onClick={() => setFilter('unread')}
                    className="rounded-full px-4"
                >
                    Chưa đọc
                </Button>
            </div>

            {loading ? (
                <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">Đang tải thông báo...</div>
            ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">Bạn không có thông báo nào.</div>
            ) : (
                <div className="grid gap-4 max-w-3xl">
                    {filtered.map(item => (
                        <motion.div 
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 hover:border-[var(--color-primary-border)] hover:shadow-md transition cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`grid h-10 w-10 place-items-center rounded-xl font-bold ${getPriorityColor(item.priority || 'normal')}`}>
                                        <BellIcon size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[var(--color-text)] group-hover:text-blue-600 transition">{item.title}</h4>
                                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">
                                            <span>{item.class_name || 'Hệ thống'}</span>
                                            <span>•</span>
                                            <span>{new Date(item.created_at).toLocaleString('vi-VN')}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
                            </div>
                            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap pl-[52px]">
                                {item.content}
                            </p>
                            <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex gap-4 pl-[52px]">
                                <button className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-muted)] hover:text-blue-600 transition">
                                    <span className="text-lg">👍</span>
                                    <span>Thích</span>
                                </button>
                                <button className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-muted)] hover:text-blue-600 transition">
                                    <MessageIcon size={16} />
                                    <span>Bình luận</span>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
});
