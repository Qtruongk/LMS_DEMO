import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PrimaryButton } from '../../../components/shared/ui';
import { XIcon, SearchIcon } from '../../../components/shared/icons';
import type { User, FeedbackItem } from '../../../types';
import { API_URL } from '../../../services/api';

type FeedbackViewProps = {
    user: User;
};

type FeedbackStatus = 'all' | 'pending' | 'resolved';
type FeedbackCategory = 'support' | 'learning' | 'schedule' | 'facility' | 'suggestion';
type FeedbackTone = 'rose' | 'emerald' | 'sky' | 'amber';

const categories: Record<FeedbackCategory, { label: string; icon: string; helper: string; tone: string; sampleSubject: string; sampleContent: string }> = {
    support: {
        label: 'Cần hỗ trợ',
        icon: '🛟',
        helper: 'Vấn đề cần trung tâm/giảng viên xử lý sớm',
        tone: 'border-rose-100 bg-rose-50 text-rose-700',
        sampleSubject: 'Cần hỗ trợ về bài tập và tài liệu học',
        sampleContent: 'Em cần được hướng dẫn thêm về phần bài tập đã giao. Em đã xem tài liệu nhưng vẫn chưa rõ cách triển khai, mong giảng viên hỗ trợ thêm ví dụ cụ thể.',
    },
    learning: {
        label: 'Nội dung học',
        icon: '📘',
        helper: 'Góp ý về bài giảng, tốc độ học, tài liệu',
        tone: 'border-sky-100 bg-sky-50 text-sky-700',
        sampleSubject: 'Đề xuất bổ sung ví dụ thực hành trong buổi học',
        sampleContent: 'Em mong mỗi phần lý thuyết có thêm ví dụ thực hành ngắn để dễ hiểu hơn. Phần kiến thức hiện tại hữu ích nhưng nếu có bài mẫu thì sẽ dễ ôn lại sau buổi học.',
    },
    schedule: {
        label: 'Lịch học',
        icon: '🗓️',
        helper: 'Lịch học, học bù, đổi giờ hoặc trùng lịch',
        tone: 'border-amber-100 bg-amber-50 text-amber-700',
        sampleSubject: 'Đề xuất cập nhật lịch học bù rõ ràng hơn',
        sampleContent: 'Em mong lịch học bù được thông báo sớm hơn để học viên chủ động sắp xếp thời gian. Nếu có thể, trung tâm vui lòng gửi nhắc lại trước buổi học 24 giờ.',
    },
    facility: {
        label: 'Cơ sở vật chất',
        icon: '🏫',
        helper: 'Phòng học, thiết bị, âm thanh, đường truyền',
        tone: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        sampleSubject: 'Góp ý cải thiện thiết bị trình chiếu trong lớp',
        sampleContent: 'Một số buổi học phần trình chiếu hơi khó nhìn ở cuối lớp. Em mong trung tâm kiểm tra lại thiết bị để học viên theo dõi bài tốt hơn.',
    },
    suggestion: {
        label: 'Đề xuất cải thiện',
        icon: '💡',
        helper: 'Ý tưởng giúp trải nghiệm học tốt hơn',
        tone: 'border-violet-100 bg-violet-50 text-violet-700',
        sampleSubject: 'Đề xuất mở thêm khung giờ thực hành buổi tối',
        sampleContent: 'Em đề xuất trung tâm mở thêm một khung giờ thực hành buổi tối trong tuần để học viên có thêm thời gian luyện tập và hỏi đáp trực tiếp với giảng viên.',
    },
};

const responseTemplates = [
    'Cảm ơn em đã gửi phản hồi. Giảng viên đã ghi nhận nội dung này và sẽ điều chỉnh trong buổi học tiếp theo để hỗ trợ lớp tốt hơn.',
    'Giảng viên đã tiếp nhận phản hồi. Trung tâm sẽ kiểm tra thêm thông tin liên quan và cập nhật lại cho em trong thời gian sớm nhất.',
    'Cảm ơn góp ý rất cụ thể của em. Nội dung này phù hợp để cải thiện trải nghiệm học, giảng viên sẽ trao đổi thêm với bộ phận đào tạo.',
];

const studentJourney = [
    { label: 'Chọn nhóm', helper: 'Chạm một thẻ phù hợp để hệ thống tự điền mẫu.', icon: '1' },
    { label: 'Viết rõ ý', helper: 'Nêu vấn đề, thời điểm xảy ra và mong muốn hỗ trợ.', icon: '2' },
    { label: 'Theo dõi', helper: 'Xem trạng thái chờ xử lý hoặc phản hồi chính thức.', icon: '3' },
];

function formatDateTime(value?: string) {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
    return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function getRelativeTime(value?: string) {
    if (!value) return 'Vừa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Vừa cập nhật';
    const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    const hours = Math.round(diffMinutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    return formatDateTime(value);
}

function inferCategory(item: FeedbackItem): FeedbackCategory {
    const text = `${item.subject} ${item.content}`.toLowerCase();
    if (text.includes('lịch') || text.includes('giờ') || text.includes('học bù')) return 'schedule';
    if (text.includes('thiết bị') || text.includes('phòng') || text.includes('âm thanh') || text.includes('cơ sở')) return 'facility';
    if (text.includes('bài') || text.includes('tài liệu') || text.includes('giảng') || text.includes('nội dung')) return 'learning';
    if (text.includes('hỗ trợ') || text.includes('không vào') || text.includes('lỗi')) return 'support';
    return 'suggestion';
}

export function FeedbackView({ user }: FeedbackViewProps) {
    const canRespond = user.role === 'admin' || user.role === 'owner' || user.role === 'teacher';
    const isStudent = user.role === 'student';
    const displayName = user.full_name || user.username || 'Học viên';

    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [alertMsg, setAlertMsg] = useState('');
    const [category, setCategory] = useState<FeedbackCategory>('learning');
    const [statusFilter, setStatusFilter] = useState<FeedbackStatus>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
    const [adminResponse, setAdminResponse] = useState(responseTemplates[0]);
    const [replyLoading, setReplyLoading] = useState(false);
    const [form, setForm] = useState({
        subject: categories.learning.sampleSubject,
        content: categories.learning.sampleContent,
    });

    const headers = {
        'Content-Type': 'application/json',
        'x-user-id': String(user.id),
        'x-user-role': user.role,
    };

    const loadFeedbacks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/feedbacks`, { headers });
            const data = await res.json();
            setFeedbacks(Array.isArray(data.feedbacks) ? data.feedbacks : []);
        } catch (err) {
            console.error('Error loading feedbacks:', err);
        } finally {
            setLoading(false);
        }
    }, [user.id, user.role]);

    useEffect(() => {
        loadFeedbacks();
    }, [loadFeedbacks]);

    const handleCategoryChange = (value: FeedbackCategory) => {
        setCategory(value);
        setForm({ subject: categories[value].sampleSubject, content: categories[value].sampleContent });
    };

    const handleSubmitFeedback = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.subject.trim() || !form.content.trim()) return;

        try {
            const payload = {
                subject: `[${categories[category].label}] ${form.subject.trim()}`,
                content: form.content.trim(),
            };
            const res = await fetch(`${API_URL}/api/feedbacks`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'Không thể gửi phản hồi');
            }
            setShowModal(false);
            setAlertMsg('Đã gửi phản hồi. Giảng viên/trung tâm sẽ tiếp nhận và trả lời sớm.');
            setTimeout(() => setAlertMsg(''), 3000);
            loadFeedbacks();
        } catch (err) {
            console.error('Lỗi gửi phản hồi:', err);
            alert(err instanceof Error ? err.message : 'Có lỗi khi gửi phản hồi.');
        }
    };

    const openResponseModal = (item: FeedbackItem) => {
        setSelectedFeedback(item);
        setAdminResponse(item.admin_response || responseTemplates[0]);
    };

    const handleReplyFeedback = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedFeedback || !adminResponse.trim()) return;
        setReplyLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/feedbacks/${selectedFeedback.id}/respond`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ admin_response: adminResponse.trim() }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'Không thể gửi trả lời');
            }
            setSelectedFeedback(null);
            setAlertMsg('Đã gửi phản hồi chính thức cho học viên.');
            setTimeout(() => setAlertMsg(''), 3000);
            loadFeedbacks();
        } catch (err) {
            console.error('Lỗi trả lời phản hồi:', err);
            alert(err instanceof Error ? err.message : 'Có lỗi khi gửi trả lời.');
        } finally {
            setReplyLoading(false);
        }
    };

    const filtered = feedbacks.filter((item) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch = !query || [item.subject, item.content, item.student_name, item.student_code, item.admin_response]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const pendingCount = feedbacks.filter((item) => item.status === 'pending').length;
    const resolvedCount = feedbacks.filter((item) => item.status === 'resolved').length;
    const responseRate = feedbacks.length ? Math.round((resolvedCount / feedbacks.length) * 100) : 0;
    const latestFeedback = feedbacks[0];
    const heroTitle = isStudent ? 'Phản hồi của học sinh' : 'Trung tâm xử lý phản hồi';
    const heroDescription = isStudent
        ? 'Không gian phản hồi được tối ưu cho mắt nhìn trên điện thoại: thông tin quan trọng ở trên cùng, nút gửi dễ chạm, biểu mẫu có dữ liệu mẫu và trạng thái phản hồi được tách rõ để học sinh theo dõi thuận tiện.'
        : 'Thiết kế ưu tiên luồng đọc - hiểu - xử lý: phản hồi chờ được đặt nổi bật, nội dung chia thành thẻ dễ quét mắt, thao tác trả lời nằm đúng ngữ cảnh và popup có dữ liệu mẫu để phản hồi nhanh.';

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 pb-24 md:pb-8">
            <section className="overflow-hidden rounded-[2rem] border border-red-100 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_50%,#f8fafc_100%)] shadow-[0_18px_45px_rgba(127,29,29,0.08)]">
                <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:p-7">
                    <div className="flex min-w-0 flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary-border)] bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--color-primary)] shadow-sm">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Trung tâm phản hồi
                            </span>
                            <span className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                                {canRespond ? 'Không gian xử lý của giảng viên' : 'Kênh góp ý học viên'}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">{heroTitle}</h1>
                            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                                {heroDescription}
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <MetricCard label={isStudent ? 'Đang chờ' : 'Chờ xử lý'} value={pendingCount} hint={isStudent ? 'Đã gửi, đang được xem' : 'Cần phản hồi trước'} tone="rose" />
                            <MetricCard label={isStudent ? 'Đã trả lời' : 'Đã giải quyết'} value={resolvedCount} hint={isStudent ? 'Có phản hồi chính thức' : 'Đã trả lời học viên'} tone="emerald" />
                            <MetricCard label="Tỷ lệ xử lý" value={`${responseRate}%`} hint={isStudent ? 'Mức độ cập nhật' : 'Hiệu suất phản hồi'} tone="sky" />
                        </div>
                    </div>

                    <div className="flex w-full flex-col justify-between gap-4 rounded-[1.5rem] border border-red-100 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] md:w-80">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">{isStudent ? `Xin chào ${displayName}` : 'Gợi ý hành vi'}</p>
                            <p className="mt-2 text-sm font-bold leading-6 text-slate-900">
                                {isStudent
                                    ? 'Hãy gửi phản hồi ngắn gọn, cụ thể. Trung tâm sẽ phân loại và cập nhật trạng thái để em không phải tìm kiếm nhiều.'
                                    : 'Trả lời theo công thức: ghi nhận vấn đề, nêu hướng xử lý, chốt thời điểm cập nhật để học viên cảm thấy được lắng nghe.'}
                            </p>
                        </div>
                        {latestFeedback ? (
                            <div className="rounded-2xl bg-slate-50 p-3">
                                <p className="text-[11px] font-bold text-slate-500">Mới nhất · {getRelativeTime(latestFeedback.created_at)}</p>
                                <p className="mt-1 line-clamp-2 text-sm font-extrabold text-slate-900">{latestFeedback.subject}</p>
                            </div>
                        ) : null}
                        {canRespond ? (
                            <PrimaryButton onClick={() => setStatusFilter('pending')} className="h-12 w-full rounded-2xl bg-[var(--color-primary)] text-sm font-black shadow-lg shadow-red-900/15 hover:bg-[var(--color-primary-hover)]">
                                Xem phản hồi chờ xử lý
                            </PrimaryButton>
                        ) : (
                            <PrimaryButton onClick={() => setShowModal(true)} className="h-12 w-full rounded-2xl bg-[var(--color-primary)] text-sm font-black shadow-lg shadow-red-900/15 hover:bg-[var(--color-primary-hover)]">
                                + Gửi phản hồi mới
                            </PrimaryButton>
                        )}
                    </div>
                </div>
                {isStudent && (
                    <div className="grid gap-3 border-t border-red-100 bg-white/70 p-4 sm:grid-cols-3 md:px-7">
                        {studentJourney.map((step) => (
                            <div key={step.label} className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-black text-white">{step.icon}</span>
                                <div>
                                    <p className="text-sm font-black text-slate-950">{step.label}</p>
                                    <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-600">{step.helper}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {alertMsg && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm"
                >
                    {alertMsg}
                </motion.div>
            )}

            <Panel className="sticky top-3 z-10 rounded-[1.5rem] border border-slate-200 bg-white/95 p-3 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur md:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0" role="tablist" aria-label="Lọc trạng thái phản hồi">
                        {[
                            { id: 'all', label: 'Tất cả', count: feedbacks.length },
                            { id: 'pending', label: 'Chờ xử lý', count: pendingCount },
                            { id: 'resolved', label: 'Đã giải quyết', count: resolvedCount },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setStatusFilter(tab.id as FeedbackStatus)}
                                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-extrabold transition ${statusFilter === tab.id
                                    ? 'bg-[var(--color-primary)] text-white shadow-md shadow-red-900/15'
                                    : 'bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-[var(--color-primary)]'
                                    }`}
                            >
                                {tab.label}
                                <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative lg:w-[420px]">
                        <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isStudent ? 'Tìm tiêu đề, nội dung hoặc phản hồi...' : 'Tìm học viên, tiêu đề, nội dung...'}
                            className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-border)]"
                        />
                    </div>
                </div>
            </Panel>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex flex-col gap-3">
                    {loading ? (
                        <LoadingSkeleton />
                    ) : filtered.length === 0 ? (
                        <EmptyState canCreate={!canRespond} onCreate={() => setShowModal(true)} />
                    ) : (
                        filtered.map((item, index) => (
                            <FeedbackCard
                                key={item.id}
                                item={item}
                                index={index}
                                canRespond={canRespond}
                                onRespond={() => openResponseModal(item)}
                            />
                        ))
                    )}
                </div>

                <aside className="hidden xl:flex xl:flex-col xl:gap-4">
                    <Panel className="rounded-[1.5rem] p-5">
                        <h2 className="text-base font-black text-slate-950">Nhóm phản hồi thường gặp</h2>
                        <div className="mt-4 space-y-3">
                            {(Object.keys(categories) as FeedbackCategory[]).map((key) => {
                                const item = categories[key];
                                return (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            setSearchQuery('');
                                            if (!canRespond) {
                                                handleCategoryChange(key);
                                                setShowModal(true);
                                            }
                                        }}
                                        className={`w-full rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${item.tone}`}
                                    >
                                        <div className="flex items-center gap-2 text-sm font-black"><span>{item.icon}</span>{item.label}</div>
                                        <p className="mt-1 text-xs font-semibold opacity-80">{item.helper}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </Panel>

                    <Panel className="rounded-[1.5rem] p-5">
                        <h2 className="text-base font-black text-slate-950">{canRespond ? 'Mẫu trả lời nhanh' : 'Mẹo viết phản hồi dễ được xử lý'}</h2>
                        {canRespond ? (
                            <div className="mt-3 flex flex-col gap-2">
                                {responseTemplates.map((template) => (
                                    <button
                                        key={template}
                                        onClick={() => setAdminResponse(template)}
                                        className="rounded-2xl bg-slate-50 p-3 text-left text-xs font-bold leading-5 text-slate-600 transition hover:bg-red-50 hover:text-[var(--color-primary)]"
                                    >
                                        {template}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-3 space-y-3 text-sm font-semibold leading-6 text-slate-600">
                                <p className="rounded-2xl bg-slate-50 p-3">Viết theo cấu trúc: vấn đề → thời điểm → mong muốn hỗ trợ.</p>
                                <p className="rounded-2xl bg-red-50 p-3 text-[var(--color-primary)]">Không cần viết dài; phản hồi rõ ý sẽ giúp giảng viên xử lý nhanh hơn.</p>
                            </div>
                        )}
                    </Panel>
                </aside>
            </div>

            <AnimatePresence>
                {showModal && !canRespond && (
                    <CreateFeedbackModal
                        category={category}
                        form={form}
                        onCategoryChange={handleCategoryChange}
                        onFormChange={setForm}
                        onClose={() => setShowModal(false)}
                        onSubmit={handleSubmitFeedback}
                    />
                )}

                {selectedFeedback && canRespond && (
                    <ResponseModal
                        item={selectedFeedback}
                        value={adminResponse}
                        loading={replyLoading}
                        onChange={setAdminResponse}
                        onClose={() => setSelectedFeedback(null)}
                        onSubmit={handleReplyFeedback}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function MetricCard({ label, value, hint, tone }: { label: string; value: number | string; hint: string; tone: FeedbackTone }) {
    const toneClass = {
        rose: 'border-rose-100 bg-rose-50/80 text-rose-700 shadow-rose-950/5',
        emerald: 'border-emerald-100 bg-emerald-50/80 text-emerald-700 shadow-emerald-950/5',
        sky: 'border-sky-100 bg-sky-50/80 text-sky-700 shadow-sky-950/5',
        amber: 'border-amber-100 bg-amber-50/80 text-amber-700 shadow-amber-950/5',
    }[tone];

    return (
        <div className={`rounded-2xl border ${toneClass} p-4 shadow-sm`}>
            <div className="text-2xl font-black tracking-[-0.04em]">{value}</div>
            <div className="mt-1 text-sm font-extrabold text-slate-900">{label}</div>
            <div className="text-xs font-semibold text-slate-600">{hint}</div>
        </div>
    );
}

function FeedbackCard({ item, index, canRespond, onRespond }: { item: FeedbackItem; index: number; canRespond: boolean; onRespond: () => void }) {
    const category = categories[inferCategory(item)];
    const isPending = item.status === 'pending';

    return (
        <motion.article
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.035, 0.25) }}
            className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-[0_16px_36px_rgba(127,29,29,0.08)]"
        >
            <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr_auto] md:p-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl ${category.tone}`} aria-hidden="true">
                    {category.icon}
                </div>

                <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${category.tone}`}>
                            {category.label}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${isPending ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {isPending ? '⏳ Chờ xử lý' : '✓ Đã giải quyết'}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">{getRelativeTime(item.created_at)}</span>
                    </div>

                    <h3 className="text-lg font-black leading-snug tracking-[-0.02em] text-slate-950 md:text-xl">{item.subject}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-slate-600">{item.content}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                        <span>👤 {item.student_name || 'Học viên'} {item.student_code ? `· ${item.student_code}` : `· ID ${item.student_id}`}</span>
                        <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />
                        <span>{formatDateTime(item.created_at)}</span>
                    </div>

                    {item.admin_response ? (
                        <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
                            <div className="text-xs font-black uppercase tracking-[0.12em] text-sky-700">Phản hồi chính thức</div>
                            <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-sky-900">{item.admin_response}</p>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-xs font-bold leading-5 text-amber-800">
                            Phản hồi này đang chờ giảng viên/trung tâm tiếp nhận. Ưu tiên trả lời ngắn gọn, rõ hướng xử lý.
                        </div>
                    )}
                </div>

                {canRespond && (
                    <div className="flex items-start justify-end">
                        <button
                            onClick={onRespond}
                            className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-red-50 px-4 text-xs font-black text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
                        >
                            {item.admin_response ? 'Sửa trả lời' : 'Trả lời'}
                        </button>
                    </div>
                )}
            </div>
        </motion.article>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-3">
            {[0, 1, 2].map((item) => (
                <div key={item} className="animate-pulse rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <div className="h-4 w-28 rounded-full bg-slate-100" />
                    <div className="mt-4 h-6 w-2/3 rounded-full bg-slate-100" />
                    <div className="mt-3 h-4 w-full rounded-full bg-slate-100" />
                    <div className="mt-2 h-4 w-4/5 rounded-full bg-slate-100" />
                </div>
            ))}
        </div>
    );
}

function EmptyState({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
    return (
        <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50 text-2xl">💬</div>
            <h3 className="mt-4 text-lg font-black text-slate-950">Không tìm thấy phản hồi phù hợp</h3>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-600">
                Thử đổi bộ lọc hoặc tìm bằng từ khóa ngắn hơn. Không gian hiển thị được giữ thoáng để dễ đọc và giảm tải thị giác.
            </p>
            {canCreate && (
                <PrimaryButton onClick={onCreate} className="mt-5 rounded-2xl bg-[var(--color-primary)] px-5 py-3 text-sm font-black hover:bg-[var(--color-primary-hover)]">
                    Gửi phản hồi mới
                </PrimaryButton>
            )}
        </div>
    );
}

function CreateFeedbackModal({
    category,
    form,
    onCategoryChange,
    onFormChange,
    onClose,
    onSubmit,
}: {
    category: FeedbackCategory;
    form: { subject: string; content: string };
    onCategoryChange: (value: FeedbackCategory) => void;
    onFormChange: (value: { subject: string; content: string }) => void;
    onClose: () => void;
    onSubmit: (e: FormEvent) => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                className="max-h-[94vh] w-full max-w-2xl overflow-hidden rounded-t-[2rem] border border-slate-200 bg-white shadow-2xl sm:rounded-[2rem]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-feedback-title"
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--color-primary)]">Biểu mẫu phản hồi</p>
                        <h2 id="create-feedback-title" className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950 sm:text-2xl">Gửi phản hồi mới</h2>
                        <p className="mt-1 text-sm font-medium text-slate-600">Form đã có dữ liệu mẫu, chỉ cần chỉnh nội dung đúng tình huống rồi gửi.</p>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 transition hover:bg-rose-50 hover:text-rose-600" aria-label="Đóng form phản hồi">
                        <XIcon size={20} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="max-h-[calc(94vh-112px)] overflow-y-auto p-5 sm:p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {(Object.keys(categories) as FeedbackCategory[]).map((key) => {
                            const item = categories[key];
                            return (
                                <button
                                    type="button"
                                    key={key}
                                    onClick={() => onCategoryChange(key)}
                                    className={`rounded-2xl border p-3 text-left transition ${category === key ? `${item.tone} ring-2 ring-[var(--color-primary-border)]` : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-[var(--color-primary)]'}`}
                                >
                                    <div className="flex items-center gap-2 text-sm font-black"><span>{item.icon}</span>{item.label}</div>
                                    <p className="mt-1 text-xs font-semibold opacity-80">{item.helper}</p>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-5 space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-black text-slate-900">Tiêu đề phản hồi <span className="text-rose-500">*</span></label>
                            <input
                                required
                                minLength={8}
                                type="text"
                                value={form.subject}
                                onChange={(e) => onFormChange({ ...form, subject: e.target.value })}
                                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-border)]"
                                placeholder="VD: Đề xuất mở thêm lớp thực hành buổi tối"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-black text-slate-900">Nội dung chi tiết <span className="text-rose-500">*</span></label>
                            <textarea
                                required
                                minLength={20}
                                rows={7}
                                value={form.content}
                                onChange={(e) => onFormChange({ ...form, content: e.target.value })}
                                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-border)]"
                                placeholder="Mô tả rõ: vấn đề là gì, xảy ra khi nào, mong muốn được hỗ trợ ra sao..."
                            />
                        </div>
                    </div>

                    <div className="sticky bottom-0 -mx-5 mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
                        <button type="button" onClick={onClose} className="min-h-12 rounded-2xl px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50">Hủy</button>
                        <PrimaryButton type="submit" className="min-h-12 rounded-2xl bg-[var(--color-primary)] px-6 text-sm font-black hover:bg-[var(--color-primary-hover)]">
                            Gửi phản hồi
                        </PrimaryButton>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

function ResponseModal({
    item,
    value,
    loading,
    onChange,
    onClose,
    onSubmit,
}: {
    item: FeedbackItem;
    value: string;
    loading: boolean;
    onChange: (value: string) => void;
    onClose: () => void;
    onSubmit: (e: FormEvent) => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                className="max-h-[94vh] w-full max-w-3xl overflow-hidden rounded-t-[2rem] border border-slate-200 bg-white shadow-2xl sm:rounded-[2rem]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="response-feedback-title"
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--color-primary)]">Trả lời học viên</p>
                        <h2 id="response-feedback-title" className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950 sm:text-2xl">Phản hồi chính thức</h2>
                        <p className="mt-1 text-sm font-medium text-slate-600">Popup tối ưu cho hành vi trả lời nhanh: đọc vấn đề bên trên, chọn mẫu, chỉnh nội dung và gửi.</p>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 transition hover:bg-rose-50 hover:text-rose-600" aria-label="Đóng popup trả lời">
                        <XIcon size={20} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="max-h-[calc(94vh-112px)] overflow-y-auto p-5 sm:p-6">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Nội dung học viên gửi</div>
                        <h3 className="mt-2 text-base font-black text-slate-950">{item.subject}</h3>
                        <p className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-slate-600">{item.content}</p>
                    </div>

                    <div className="mt-4 rounded-2xl bg-red-50 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-primary)]">Mẫu trả lời nhanh</p>
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                            {responseTemplates.map((template) => (
                                <button
                                    type="button"
                                    key={template}
                                    onClick={() => onChange(template)}
                                    className="min-h-10 shrink-0 rounded-xl bg-white px-3 text-left text-xs font-bold text-slate-600 shadow-sm transition hover:text-[var(--color-primary)]"
                                >
                                    {template.slice(0, 58)}...
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="mb-2 block text-sm font-black text-slate-900">Nội dung trả lời <span className="text-rose-500">*</span></label>
                        <textarea
                            required
                            minLength={20}
                            rows={7}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-border)]"
                            placeholder="Ghi nhận vấn đề, nêu hướng xử lý, thời điểm cập nhật..."
                        />
                    </div>

                    <div className="sticky bottom-0 -mx-5 mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
                        <button type="button" onClick={onClose} className="min-h-12 rounded-2xl px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50">Hủy</button>
                        <PrimaryButton disabled={loading || value.trim().length < 20} type="submit" className="min-h-12 rounded-2xl bg-[var(--color-primary)] px-6 text-sm font-black hover:bg-[var(--color-primary-hover)]">
                            {loading ? 'Đang gửi...' : 'Gửi trả lời & hoàn tất'}
                        </PrimaryButton>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
