import { motion } from 'framer-motion';
import type { FormEvent } from 'react';
import vatLogo from '../../../assets/vat_logo.jpg';
import vatClass from '../../../assets/vat_class.jpg';
import { Field, PrimaryButton } from '../../../components/shared/ui';
import { XIcon } from '../../../components/shared/icons';

type Props = {
    showLogin: boolean;
    message: string;
    loginForm: { username: string; password: string };
    setShowLogin: (value: boolean) => void;
    setLoginForm: (value: { username: string; password: string }) => void;
    onLogin: (event: FormEvent) => void;
};



import type { Variants } from 'framer-motion';

const fadeUp: Variants = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
        opacity: 1,
        transition: { duration: 0.4, delay: i * 0.1 },
    }),
};

export function AuthLanding({ showLogin, message, loginForm, setShowLogin, setLoginForm, onLogin }: Props) {
    return (
        <main className="relative min-h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">

            {/* ─── Background decorative elements ─── */}
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(127,29,29,0.18),transparent_30rem),radial-gradient(circle_at_88%_12%,rgba(153,27,27,0.10),transparent_26rem),var(--color-bg)]" />

            {/* ─── Nav ─── */}
            <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/85 px-3 py-2 shadow-sm backdrop-blur">
                    <img className="h-9 w-9 rounded-xl object-cover shadow-sm ring-1 ring-[var(--color-primary-border)]" src={vatLogo} alt="VAT" />
                    <span className="text-sm font-bold tracking-tight">Hệ thống Đào tạo nội bộ VAT</span>
                </div>
                <PrimaryButton onClick={() => setShowLogin(true)} className="h-10 px-5 text-xs font-semibold">Đăng nhập</PrimaryButton>
            </nav>

            {/* ─── Hero ─── */}
            <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:pt-20">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">

                    {/* Left — text */}
                    <div>
                        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
                            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary-text)] shadow-sm">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                </span>
                                Hệ thống hoạt động bình thường
                            </span>
                        </motion.div>

                        <motion.h1
                            custom={1}
                            initial="hidden"
                            animate="visible"
                            variants={fadeUp}
                            className="mt-6 text-[2.35rem] font-black leading-[1.05] tracking-[-0.045em] sm:text-5xl lg:text-[4rem]"
                        >
                            Quản lý vận hành <br />
                            <span className="text-[var(--color-primary)]">
                                & đào tạo tập trung
                            </span>
                        </motion.h1>

                        <motion.p
                            custom={2}
                            initial="hidden"
                            animate="visible"
                            variants={fadeUp}
                            className="mt-6 max-w-xl text-base leading-7 text-[var(--color-text-secondary)]"
                        >
                            Dành riêng cho quản trị viên, giáo viên và học sinh thuộc hệ thống trung tâm VAT.
                        </motion.p>

                        <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-4">
                            <PrimaryButton onClick={() => setShowLogin(true)} className="h-12 px-7 text-sm font-semibold">
                                Truy cập hệ thống
                            </PrimaryButton>
                            <span className="text-xs font-medium text-[var(--color-text-muted)]">WCAG AA • Responsive • Real-time LMS</span>
                        </motion.div>
                    </div>

                    {/* Right — image composition */}
                    <div className="relative hidden lg:block">
                        {/* Image card */}
                        <motion.div whileHover={{ y: -6, rotate: -0.4 }} transition={{ duration: 0.24, ease: 'easeOut' }} className="relative overflow-hidden rounded-3xl border border-[var(--color-primary-border)] bg-[var(--color-card)] shadow-xl">
                            <div className="bg-[var(--color-primary-soft)] p-3 pb-0">
                                <img
                                    src={vatClass}
                                    alt="Lớp học tại VAT"
                                    className="w-full rounded-2xl rounded-b-none object-cover border border-b-0 border-[var(--color-primary-border)]"
                                    style={{ aspectRatio: '16 / 9' }}
                                />
                            </div>

                            {/* Caption bar */}
                            <div className="flex items-center gap-3 border-t border-[var(--color-primary-border)] bg-[var(--color-card)] px-5 py-4">
                                <img className="h-6 w-6 rounded-md object-cover ring-1 ring-[var(--color-border)]" src={vatLogo} alt="" />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-[var(--color-text)]">Lớp Hình Học 9 — Cơ sở 1</p>
                                </div>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="relative z-10 mx-auto mt-auto max-w-6xl border-t border-[var(--color-border)] px-5 py-6 sm:px-8">
                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <p className="text-xs text-[var(--color-text-muted)]">© 2026 VAT LMS</p>
                </div>
            </footer>

            {/* ─── Login modal ─── */}
            {showLogin && (
                <div
                    className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false); }}
                >
                    <div className="relative w-full max-w-sm overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl">
                        <div className="p-6">
                            <button
                                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
                                aria-label="Đóng"
                                onClick={() => setShowLogin(false)}
                            >
                                <XIcon size={16} />
                            </button>

                            {/* Header */}
                            <div className="mb-6 flex items-center gap-3">
                                <img className="h-8 w-8 rounded-md object-cover ring-1 ring-[var(--color-border)]" src={vatLogo} alt="VAT" />
                                <div>
                                    <b className="block text-sm font-bold text-[var(--color-text)]">VAT LMS</b>
                                    <span className="text-[11px] font-medium text-[var(--color-text-muted)]">Đăng nhập tài khoản nội bộ</span>
                                </div>
                            </div>

                            <form className="grid gap-4" onSubmit={onLogin}>
                                <Field label="Tên đăng nhập" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} required />
                                <Field label="Mật khẩu" type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
                                {message && (
                                    <p className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200" role="alert">
                                        {message}
                                    </p>
                                )}
                                <PrimaryButton type="submit" className="h-10 text-sm mt-2">Đăng nhập</PrimaryButton>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
