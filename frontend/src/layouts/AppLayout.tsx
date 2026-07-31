import { AnimatePresence, motion } from 'framer-motion';
import { memo, type ReactNode } from 'react';
import vatLogo from '../assets/vat_logo.jpg';
import { menuLabel, roleLabel } from '../constants/labels';
import type { Role, User } from '../types';
import { Avatar } from '../components/shared/Avatar';
import { iconMap, MenuIcon, SunIcon, MoonIcon, ChevronRightIcon, LogoutIcon, ChevronLeftIcon } from '../components/shared/icons';

const menuBadges: Record<string, { text: string | number; color: string }> = {
    grading: { text: '12+', color: 'bg-amber-500 text-white' },
};

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
    children: ReactNode;
};

export const AppLayout = memo(function AppLayout(props: AppLayoutProps) {
    return (
        <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
            <Sidebar {...props} />
            <motion.section
                animate={{ marginLeft: props.sidebarCollapsed ? 72 : 256 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="hidden min-w-0 px-6 py-6 pb-10 sm:px-8 lg:block"
            >
                <Header {...props} />
                <AnimatePresence mode="wait">
                    <motion.div key={props.activeModule} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: 'easeInOut' }}>
                        {props.children}
                    </motion.div>
                </AnimatePresence>
            </motion.section>
            {/* Mobile: no sidebar margin */}
            <section className="min-w-0 px-4 py-4 pb-20 sm:px-6 lg:hidden">
                <Header {...props} />
                <AnimatePresence mode="wait">
                    <motion.div key={props.activeModule} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: 'easeInOut' }}>
                        {props.children}
                    </motion.div>
                </AnimatePresence>
            </section>
            <MobileNav menu={props.menu} activeModule={props.activeModule} onModuleChange={props.onModuleChange} />
        </main>
    );
});

function Sidebar({ user, menu, activeModule, sidebarCollapsed, onToggleSidebar, onModuleChange, onLogout }: AppLayoutProps) {
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
                    {menu.map((item) => (
                        <NavButton key={item} item={item} active={activeModule === item} collapsed={sidebarCollapsed} onClick={() => onModuleChange(item)} />
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

function Header({ activeModule, theme, onToggleTheme, onToggleSidebar }: AppLayoutProps) {
    return (
        <header className="mb-6 flex h-14 items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/95 px-4 shadow-sm backdrop-blur sm:px-5">
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
                    <span className="text-[var(--color-text)]">{menuLabel[activeModule]}</span>
                </div>
            </div>

            {/* Single action: Dark Mode Toggle */}
            <button
                aria-label="Đổi giao diện Sáng / Tối"
                title="Chuyển đổi giao diện Sáng / Tối"
                onClick={onToggleTheme}
                className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text)]"
            >
                {theme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
            </button>
        </header>
    );
}

function NavButton({ item, active, collapsed, onClick }: { item: string; active: boolean; collapsed: boolean; onClick: () => void }) {
    const IconComponent = iconMap[item];
    const badge = menuBadges[item];

    return (
        <button
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? menuLabel[item] : undefined}
            className={`relative group flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${active
                ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'
                } ${collapsed ? 'justify-center px-0' : ''}`}
        >
            {/* Active Indicator Line */}
            {active && !collapsed && (
                <span className="absolute -left-4 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-[var(--color-primary)] shadow-[var(--shadow-primary)]" />
            )}

            <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-all duration-300 ${active
                    ? 'bg-white text-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary-border)] dark:bg-[var(--color-primary)] dark:text-white dark:ring-0'
                    : 'text-[var(--color-text-muted)] group-hover:bg-white group-hover:text-[var(--color-text)] group-hover:shadow-xs group-hover:ring-1 group-hover:ring-[var(--color-border)]'
                    }`}
            >
                {IconComponent ? <IconComponent size={18} strokeWidth={2.8} /> : <span className="text-xs font-bold">{item.charAt(0).toUpperCase()}</span>}
            </span>

            {!collapsed && (
                <span className="flex-1 truncate">{menuLabel[item]}</span>
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

function MobileNav({ menu, activeModule, onModuleChange }: { menu: string[]; activeModule: string; onModuleChange: (module: string) => void }) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 grid h-[68px] grid-cols-5 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]/95 px-1 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden pb-2 sm:pb-0">
            {menu.slice(0, 5).map((item) => {
                const IconComponent = iconMap[item];
                const isActive = activeModule === item;
                const badge = menuBadges[item];

                return (
                    <button
                        key={item}
                        onClick={() => onModuleChange(item)}
                        className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl transition-all ${isActive
                            ? 'text-[var(--color-primary)]'
                            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text)]'
                            }`}
                    >
                        {isActive && (
                            <motion.span layoutId="mobileNavActive" className="absolute top-0 h-0.5 w-8 rounded-b-full bg-[var(--color-primary)] shadow-[var(--shadow-primary)]" />
                        )}
                        <span className="relative mt-1">
                            <span className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${isActive ? 'bg-[var(--color-primary-soft)]' : ''}`}>
                                {IconComponent ? <IconComponent size={20} className={isActive ? 'animate-pulse' : ''} /> : <span className="text-xs font-bold">{item.charAt(0).toUpperCase()}</span>}
                            </span>
                            {/* Mobile Badge */}
                            {badge && (
                                <span className={`absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black ${badge.color} border-2 border-[var(--color-bg-elevated)] shadow-sm`}>
                                    {badge.text}
                                </span>
                            )}
                        </span>
                        <span className={`block truncate w-full px-1 text-[10px] ${isActive ? 'font-extrabold' : 'font-medium'}`}>{menuLabel[item]}</span>
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
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)] sm:text-3xl">{menuLabel[activeModule]}</h1>
        </div>
    );
}
