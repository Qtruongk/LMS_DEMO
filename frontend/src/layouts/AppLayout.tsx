import { AnimatePresence, motion } from 'framer-motion';
import { memo, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import vatLogo from '../assets/vat_logo.jpg';
import { menuLabel, roleLabel } from '../constants/labels';
import type { ClassItem, NotificationItem, Role, User } from '../types';
import { Avatar } from '../components/shared/Avatar';
import { iconMap, MenuIcon, SunIcon, MoonIcon, ChevronRightIcon, LogoutIcon, ChevronLeftIcon, BellIcon } from '../components/shared/icons';

const menuBadges: Record<string, { text: string | number; color: string }> = {
    grading: { text: '12+', color: 'bg-amber-500 text-white' },
};

function getMenuLabel(item: string, role?: Role) {
    if (role === 'admin' && item === 'classes') return 'Tạo lớp học';
    return menuLabel[item] ?? item;
}

type AppLayoutProps = {
    user: User;
    menu: string[];
    activeModule: string;
    sidebarCollapsed: boolean;
    onToggleSidebar: () => void;
    onModuleChange: (module: string) => void;
    onLogout: () => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    notifications?: NotificationItem[];
    onMarkNotificationRead?: (id: number) => void | Promise<void>;
    onMarkAllNotificationsRead?: () => void | Promise<void>;
    classes?: ClassItem[];
    selectedClassId?: number | null;
    studentClassesView?: 'todo' | 'class';
    teacherClassesView?: 'review' | 'class';
    onOpenStudentTodo?: () => void;
    onOpenStudentClass?: (classId: number) => void;
    onOpenTeacherReview?: () => void;
    onOpenTeacherClass?: (classId: number) => void;
    children: ReactNode;
};

export const AppLayout = memo(function AppLayout(props: AppLayoutProps) {
    const hasFixedClassMenu = (props.activeModule === 'classes'
        && ((props.user.role === 'student' && props.studentClassesView === 'class') || (props.user.role === 'teacher' && props.teacherClassesView === 'class')))
        || (props.user.role === 'admin' && props.activeModule === 'assignments');

    return (
        <main
            data-role={props.user.role}
            className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]"
            style={{ '--sidebar-offset': props.sidebarCollapsed ? '80px' : '260px' } as CSSProperties}
        >
            <Sidebar {...props} />
            <motion.section
                animate={{ marginLeft: props.sidebarCollapsed ? 80 : 260 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={`hidden min-w-0 px-6 pb-10 sm:px-8 lg:block ${hasFixedClassMenu ? 'pt-20' : 'pt-6'}`}
            >
                {!hasFixedClassMenu && <Header {...props} />}
                <AnimatePresence mode="wait">
                    <motion.div key={props.activeModule} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: 'easeInOut' }}>
                        {props.children}
                    </motion.div>
                </AnimatePresence>
            </motion.section>
            {/* Mobile: no sidebar margin */}
            <section className={`min-w-0 px-4 pb-20 sm:px-6 lg:hidden ${hasFixedClassMenu ? 'pt-20' : 'pt-4'}`}>
                {!hasFixedClassMenu && <Header {...props} />}
                <AnimatePresence mode="wait">
                    <motion.div key={props.activeModule} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: 'easeInOut' }}>
                        {props.children}
                    </motion.div>
                </AnimatePresence>
            </section>
            <MobileNav menu={props.menu} activeModule={props.activeModule} userRole={props.user.role} onModuleChange={props.onModuleChange} />
        </main>
    );
});

function Sidebar({ user, menu, activeModule, sidebarCollapsed, onToggleSidebar, onModuleChange, onLogout, classes = [], selectedClassId, studentClassesView, teacherClassesView, onOpenStudentTodo, onOpenStudentClass, onOpenTeacherReview, onOpenTeacherClass }: AppLayoutProps) {
    return (
        <motion.aside
            animate={{ width: sidebarCollapsed ? 80 : 260 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-2xl lg:flex"
        >
            {/* Logo */}
            <div className="flex h-[72px] items-center justify-between gap-3 px-5">
                <div className="flex min-w-0 items-center gap-3">
                    <img className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-[var(--color-border)]" src={vatLogo} alt="VAT" />
                    {!sidebarCollapsed && <b className="truncate text-base font-extrabold tracking-tight text-[var(--color-text)]">VAT LMS</b>}
                </div>
                <button
                    aria-label="Thu gọn menu"
                    onClick={onToggleSidebar}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
                >
                    {sidebarCollapsed ? <ChevronRightIcon size={18} /> : <ChevronLeftIcon size={18} />}
                </button>
            </div>

            {/* Divider */}
            <div className="mx-5 border-t border-[var(--color-border-strong)] opacity-50" />

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-6" aria-label="Điều hướng chính">
                <div className="grid gap-1.5">
                    {menu.map((item) => item === 'classes' && (user.role === 'student' || user.role === 'teacher') ? (
                        <ClassDropdown
                            key={item}
                            active={activeModule === item}
                            collapsed={sidebarCollapsed}
                            classes={classes}
                            selectedClassId={selectedClassId}
                            view={user.role === 'student' ? studentClassesView : teacherClassesView}
                            actionLabel={user.role === 'student' ? 'Việc cần làm' : 'Cần đánh giá'}
                            role={user.role}
                            onOpenAction={user.role === 'student' ? (onOpenStudentTodo ?? (() => onModuleChange('classes'))) : (onOpenTeacherReview ?? (() => onModuleChange('classes')))}
                            onOpenClass={user.role === 'student' ? onOpenStudentClass : onOpenTeacherClass}
                            onOpenModule={() => onModuleChange('classes')}
                        />
                    ) : (
                        <NavButton key={item} item={item} active={activeModule === item || (activeModule === 'attendance' && item === 'class-operations')} collapsed={sidebarCollapsed} role={user.role} onClick={() => onModuleChange(item)} />
                    ))}
                </div>
            </nav>

            {/* User profile at bottom */}
            <div className="p-4">
                <div className={`group flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-2.5 transition-all hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-soft)] hover:shadow-md ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <Avatar user={user} size={sidebarCollapsed ? 'sm' : 'md'} />
                    {!sidebarCollapsed && (
                        <div className="min-w-0 flex-1">
                            <b className="block truncate text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">{user.full_name || user.username}</b>
                            <span className="text-[11px] font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]/70">{roleLabel[user.role]}</span>
                        </div>
                    )}
                </div>
                {!sidebarCollapsed && (
                    <button
                        onClick={onLogout}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-bg-muted)] px-3 py-2.5 text-xs font-bold text-[var(--color-text-secondary)] transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    >
                        <LogoutIcon size={16} />
                        Đăng xuất
                    </button>
                )}
            </div>
        </motion.aside>
    );
}

function Header({ user, activeModule, theme, onToggleTheme, onToggleSidebar, onModuleChange, notifications = [], onMarkNotificationRead, onMarkAllNotificationsRead }: AppLayoutProps) {
    const [open, setOpen] = useState(false);
    const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);
    const latestNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

    return (
        <header className={`relative mb-6 flex h-14 items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/95 px-4 shadow-sm backdrop-blur sm:px-5 ${open ? 'z-[120]' : 'z-20'}`}>
            <div className="flex items-center gap-3">
                {/* Mobile menu button */}
                <button
                    aria-label="Mở menu"
                    onClick={onToggleSidebar}
                    className="grid h-8 w-8 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] lg:hidden"
                >
                    <MenuIcon size={16} />
                </button>

                {/* Breadcrumb */}
                <div className="hidden items-center gap-1.5 text-xs font-medium sm:flex">
                    <span className="text-[var(--color-text-muted)]">VAT LMS</span>
                    <ChevronRightIcon size={12} className="text-[var(--color-text-muted)]" />
                    <span className="text-[var(--color-text)]">{getMenuLabel(activeModule, user.role)}</span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    aria-label="Mở thông báo"
                    title="Thông báo"
                    onClick={() => setOpen((value) => !value)}
                    className="relative grid h-9 w-9 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary-border)] hover:text-[var(--color-primary)]"
                >
                    <BellIcon size={17} />
                    {unreadCount > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-lg ring-2 ring-[var(--color-card)]">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                <button
                    aria-label="Đổi giao diện Sáng / Tối"
                    title="Chuyển đổi giao diện Sáng / Tối"
                    onClick={onToggleTheme}
                    className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text)]"
                >
                    {theme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
                </button>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        className="fixed right-4 top-20 z-[130] w-[min(92vw,390px)] overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl ring-1 ring-black/5 lg:right-8"
                    >
                        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                            <div>
                                <h3 className="text-sm font-black text-[var(--color-text)]">Thông báo</h3>
                                <p className="text-xs font-semibold text-[var(--color-text-muted)]">{unreadCount > 0 ? `${unreadCount} thông báo mới` : 'Không có thông báo mới'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onMarkAllNotificationsRead?.()}
                                className="rounded-full bg-[var(--color-card)] px-3 py-1.5 text-[11px] font-black text-[var(--color-primary)] shadow-sm transition hover:bg-[var(--color-primary-soft)]"
                            >
                                Đọc tất cả
                            </button>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto p-2">
                            {latestNotifications.length ? latestNotifications.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onMarkNotificationRead?.(item.id)}
                                    className={`mb-1 flex w-full items-start gap-3 rounded-2xl p-3 text-left transition hover:bg-[var(--color-bg-soft)] ${item.is_read ? 'opacity-70' : 'bg-[var(--color-primary-soft)]/60'}`}
                                >
                                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.is_read ? 'bg-[var(--color-border-strong)]' : 'bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]'}`} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-black text-[var(--color-text)]">{item.title}</span>
                                        <span className="mt-1 line-clamp-2 block text-xs font-medium leading-5 text-[var(--color-text-secondary)]">{item.content}</span>
                                        <span className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                                            {item.priority === 'urgent' ? 'Khẩn cấp' : item.priority === 'important' ? 'Quan trọng' : 'Thông báo'}
                                            {item.class_name ? `• ${item.class_name}` : ''}
                                        </span>
                                    </span>
                                </button>
                            )) : (
                                <div className="px-4 py-10 text-center text-sm font-semibold text-[var(--color-text-muted)]">Chưa có thông báo.</div>
                            )}
                        </div>

                        <div className="border-t border-[var(--color-border)] p-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    onModuleChange('notifications');
                                }}
                                className="w-full rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-white shadow-[var(--shadow-primary)] transition hover:bg-[var(--color-primary-hover)]"
                            >
                                Xem và quản lý bảng tin
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}

function NavButton({ item, active, collapsed, role, onClick }: { item: string; active: boolean; collapsed: boolean; role: Role; onClick: () => void }) {
    const IconComponent = iconMap[item];
    const badge = menuBadges[item];
    const label = getMenuLabel(item, role);
    const allowWrappedLabel = role === 'admin' && item === 'accounts';
    const isStudent = role === 'student';

    return (
        <button
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? label : undefined}
            className={`relative group flex ${allowWrappedLabel ? 'min-h-[58px]' : isStudent ? 'min-h-[48px]' : 'min-h-[44px]'} w-full items-center ${isStudent ? 'gap-2.5 px-3.5' : 'gap-3 px-3'} rounded-2xl py-2 text-left text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${active
                ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'
                } ${collapsed ? 'justify-center px-0' : ''}`}
        >
            {/* Active Indicator Line */}
            {active && !collapsed && (
                <span className="absolute -left-4 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-[var(--color-primary)] shadow-[var(--shadow-primary)]" />
            )}

            <span
                className={`grid ${isStudent ? 'h-9 w-9' : 'h-8 w-8'} shrink-0 place-items-center rounded-xl transition-all duration-300 ${active
                    ? 'bg-white text-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary-border)] dark:bg-[var(--color-primary)] dark:text-white dark:ring-0'
                    : 'text-[var(--color-text-muted)] group-hover:bg-white group-hover:text-[var(--color-text)] group-hover:shadow-xs group-hover:ring-1 group-hover:ring-[var(--color-border)]'
                    }`}
            >
                {IconComponent ? <IconComponent size={18} strokeWidth={2.8} /> : <span className="text-xs font-bold">{item.charAt(0).toUpperCase()}</span>}
            </span>

            {!collapsed && (
                <span className={`min-w-0 flex-1 ${allowWrappedLabel ? 'whitespace-normal text-[13px] leading-tight' : 'truncate'}`}>{label}</span>
            )}

            {/* Badges */}
            {badge && !collapsed && (
                <span className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black ${badge.color} shadow-sm ring-2 ring-[var(--color-bg-elevated)] group-hover:ring-[var(--color-bg-muted)] ${active ? 'group-hover:ring-[var(--color-primary-soft)]' : ''}`}>
                    {badge.text}
                </span>
            )}

            {/* Collapsed Badge Dot */}
            {badge && collapsed && (
                <span className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-bg-elevated)] ${badge.color.split(' ')[0]} shadow-sm group-hover:border-[var(--color-bg-muted)] ${active ? 'group-hover:border-[var(--color-primary-soft)]' : ''}`} />
            )}
        </button>
    );
}

function ClassDropdown({ active, collapsed, classes, selectedClassId, view, actionLabel, role, onOpenAction, onOpenClass, onOpenModule }: { active: boolean; collapsed: boolean; classes: ClassItem[]; selectedClassId?: number | null; view?: 'todo' | 'review' | 'class'; actionLabel: string; role: Role; onOpenAction: () => void; onOpenClass?: (classId: number) => void; onOpenModule: () => void }) {
    const activeClasses = useMemo(() => classes.filter((item) => item.status !== 'completed' && item.status !== 'canceled' && item.status !== 'archived'), [classes]);
    const IconComponent = iconMap.classes;
    const isStudent = role === 'student';

    if (collapsed) {
        return <NavButton item="classes" active={active} collapsed={collapsed} role={role} onClick={isStudent ? onOpenModule : onOpenAction} />;
    }

    return (
        <div className="grid gap-1">
            <button
                type="button"
                onClick={onOpenModule}
                aria-current={active ? 'page' : undefined}
                className={`relative group flex ${isStudent ? 'min-h-[48px] gap-2.5 px-3.5' : 'min-h-[44px] gap-3 px-3'} w-full items-center rounded-2xl py-2 text-left text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${active
                    ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'
                    }`}
            >
                {active && <span className="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[var(--color-primary)] shadow-[var(--shadow-primary)]" />}
                <span className={`grid ${isStudent ? 'h-9 w-9' : 'h-8 w-8'} shrink-0 place-items-center rounded-xl transition-all duration-300 ${active ? 'bg-white text-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary-border)] dark:bg-[var(--color-primary)] dark:text-white dark:ring-0' : 'text-[var(--color-text-muted)] group-hover:bg-white group-hover:text-[var(--color-text)] group-hover:shadow-xs group-hover:ring-1 group-hover:ring-[var(--color-border)]'}`}>
                    {IconComponent ? <IconComponent size={isStudent ? 19 : 18} strokeWidth={2.8} /> : <span className="text-xs font-bold">L</span>}
                </span>
                <span className={`flex-1 truncate ${isStudent ? 'leading-5' : ''}`}>{getMenuLabel('classes', role)}</span>
                <ChevronRightIcon size={16} className={`transition-transform ${active ? 'rotate-90' : ''}`} />
            </button>

            <div className={`ml-5 grid gap-1 border-l border-[var(--color-border)] pl-3 ${active ? 'block' : 'hidden'}`}>
                {!isStudent && (
                    <button type="button" onClick={onOpenAction} className={`rounded-xl px-3 py-2 text-left text-xs font-black transition ${active && view !== 'class' ? 'bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'}`}>
                        {actionLabel}
                    </button>
                )}
                {activeClasses.map((item) => {
                    const itemActive = active && view === 'class' && selectedClassId === item.id;
                    return (
                        <button key={item.id} type="button" onClick={() => onOpenClass ? onOpenClass(item.id) : onOpenModule()} className={`rounded-xl px-3 py-2 text-left text-xs font-black transition ${itemActive ? 'bg-blue-100 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'}`}>
                            <span className="block truncate">{item.name}</span>
                            <span className="block truncate text-[10px] font-semibold opacity-70">{item.subject || item.code || 'Lớp học'}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function MobileNav({ menu, activeModule, userRole, onModuleChange }: { menu: string[]; activeModule: string; userRole: Role; onModuleChange: (module: string) => void }) {
    const isStudent = userRole === 'student';

    return (
        <nav className={`fixed bottom-0 left-0 right-0 z-40 grid ${isStudent ? 'h-[74px]' : 'h-[68px]'} grid-cols-5 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]/95 px-1 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden pb-2 sm:pb-0`}>
            {menu.slice(0, 5).map((item) => {
                const IconComponent = iconMap[item];
                const isActive = activeModule === item || (activeModule === 'attendance' && item === 'class-operations');
                const badge = menuBadges[item];

                return (
                    <button
                        key={item}
                        onClick={() => onModuleChange(item)}
                        className={`relative flex flex-col items-center justify-center ${isStudent ? 'gap-1 px-0.5 pt-1' : 'gap-1.5'} rounded-xl transition-all ${isActive
                            ? 'text-[var(--color-primary)]'
                            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text)]'
                            }`}
                    >
                        {isActive && (
                            <motion.span layoutId="mobileNavActive" className="absolute top-0 h-0.5 w-8 rounded-b-full bg-[var(--color-primary)] shadow-[var(--shadow-primary)]" />
                        )}
                        <span className={isStudent ? 'relative' : 'relative mt-1'}>
                            <span className={`grid ${isStudent ? 'h-9 w-9' : 'h-8 w-8'} place-items-center rounded-xl transition-colors ${isActive ? 'bg-[var(--color-primary-soft)]' : ''}`}>
                                {IconComponent ? <IconComponent size={isStudent ? 19 : 20} className={isActive ? 'animate-pulse' : ''} /> : <span className="text-xs font-bold">{item.charAt(0).toUpperCase()}</span>}
                            </span>
                            {/* Mobile Badge */}
                            {badge && (
                                <span className={`absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black ${badge.color} border-2 border-[var(--color-bg-elevated)] shadow-sm`}>
                                    {badge.text}
                                </span>
                            )}
                        </span>
                        <span className={`block w-full truncate px-0.5 text-center ${isStudent ? 'text-[11px] leading-3' : 'px-1 text-[10px]'} ${isActive ? 'font-extrabold' : 'font-medium'}`}>{getMenuLabel(item, userRole)}</span>
                    </button>
                );
            })}
        </nav>
    );
}

export function PageTitle({ role, activeModule }: { role: Role; activeModule: string }) {
    return (
        <div className="mb-5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                {roleLabel[role]}
            </span>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)] sm:text-3xl">{getMenuLabel(activeModule, role)}</h1>
        </div>
    );
}
