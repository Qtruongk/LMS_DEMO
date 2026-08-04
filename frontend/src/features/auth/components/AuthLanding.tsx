import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useState, type FormEvent, type MouseEvent } from 'react';
import vatLogo from '../../../assets/vat_logo.jpg';
import vatClass from '../../../assets/vat_class.jpg';
import { Button, Field, PrimaryButton } from '../../../components/shared/ui';
import {
    BellIcon,
    XIcon,
} from '../../../components/shared/icons';

type Props = {
    showLogin: boolean;
    message: string;
    loginForm: { username: string; password: string };
    setShowLogin: (value: boolean) => void;
    setLoginForm: (value: { username: string; password: string }) => void;
    onLogin: (event: FormEvent) => void;
};

type LandingPopup = 'login' | 'demo' | 'support' | null;

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.07, duration: 0.48, ease: 'easeOut' },
    }),
};

const demoAccounts = [
    { role: 'Chủ trung tâm', username: 'owner', password: 'owner123', note: 'Toàn quyền điều hành trung tâm VAT' },
    { role: 'Học sinh', username: 'xm2_student_01', password: 'student123', note: 'Lớp Điện Ô tô B1 • Xuân Minh' },
    { role: 'Giáo viên', username: 'xuanminh', password: 'xuanminh123', note: 'Quản lý lớp ô tô thực hành' },
    { role: 'Quản trị', username: 'admin', password: 'admin123', note: 'Điều phối hệ thống VAT LMS' },
];

export function AuthLanding({ showLogin, message, loginForm, setShowLogin, setLoginForm, onLogin }: Props) {
    const [popup, setPopup] = useState<LandingPopup>(showLogin ? 'login' : null);
    const [supportName, setSupportName] = useState('Học viên lớp Điện Ô tô B1');
    const [supportPhone, setSupportPhone] = useState('0961001001');
    const [supportContent, setSupportContent] = useState('Tôi cần hỗ trợ đăng nhập tài khoản học sinh trong hệ thống VAT LMS.');
    const [supportSent, setSupportSent] = useState(false);
    const [mouseSpot, setMouseSpot] = useState({ x: 0, y: 0, active: false });

    const openLogin = () => {
        setShowLogin(true);
        setPopup('login');
    };

    const closePopup = () => {
        setPopup(null);
        setShowLogin(false);
    };

    const fillAccount = (username: string, password: string) => {
        setLoginForm({ username, password });
        setShowLogin(true);
        setPopup('login');
    };

    const submitSupport = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSupportSent(true);
    };

    const handleMouseMove = (event: MouseEvent<HTMLElement>) => {
        setMouseSpot({ x: event.clientX, y: event.clientY, active: true });
    };

    return (
        <main onMouseMove={handleMouseMove} onMouseLeave={() => setMouseSpot((current) => ({ ...current, active: false }))} className="relative min-h-screen overflow-hidden bg-[#fbfafb] text-slate-950 dark:bg-slate-950 dark:text-white">
            <motion.div className="pointer-events-none fixed left-[6%] top-[18%] z-0 hidden h-[28rem] w-[28rem] rounded-full bg-red-600/[0.055] blur-3xl lg:block dark:bg-red-400/10" animate={{ x: mouseSpot.active ? (mouseSpot.x - window.innerWidth / 2) * 0.045 : 0, y: mouseSpot.active ? (mouseSpot.y - window.innerHeight / 2) * 0.045 : 0, scale: mouseSpot.active ? 1.08 : 1 }} transition={{ type: 'spring', stiffness: 70, damping: 24, mass: 0.8 }} />
            <motion.div className="pointer-events-none fixed right-[8%] top-[26%] z-0 hidden h-[24rem] w-[24rem] rounded-full bg-amber-400/[0.075] blur-3xl lg:block dark:bg-amber-300/10" animate={{ x: mouseSpot.active ? (window.innerWidth / 2 - mouseSpot.x) * 0.035 : 0, y: mouseSpot.active ? (window.innerHeight / 2 - mouseSpot.y) * 0.035 : 0, scale: mouseSpot.active ? 1.06 : 1 }} transition={{ type: 'spring', stiffness: 70, damping: 24, mass: 0.8 }} />
            <motion.div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-red-950/[0.035] blur-3xl dark:bg-red-500/10" animate={{ x: [0, 18, 0], y: [0, 12, 0], scale: [1, 1.06, 1] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="pointer-events-none absolute right-[-8rem] top-24 h-[34rem] w-[34rem] rounded-full bg-red-900/[0.035] blur-3xl dark:bg-red-500/10" animate={{ x: [0, -18, 0], y: [0, -14, 0], scale: [1, 1.04, 1] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="pointer-events-none absolute left-[48%] top-28 hidden h-3 w-3 rounded-full bg-red-700/20 lg:block" animate={{ y: [0, -18, 0], opacity: [0.25, 0.65, 0.25] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="pointer-events-none absolute left-[56%] top-[72%] hidden h-2 w-2 rounded-full bg-amber-500/30 lg:block" animate={{ y: [0, 16, 0], opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }} />

            <div className="relative mx-auto flex min-h-screen w-full max-w-[1132px] flex-col px-6 py-5 sm:px-8 lg:px-2">
                <motion.header
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-3 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-slate-900"
                >
                    <a href="#home" className="flex items-center gap-3 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-800">
                        <img src={vatLogo} alt="VAT logo" className="h-10 w-10 shrink-0 rounded-full object-cover transition duration-500 hover:rotate-6 hover:scale-105" />
                        <span className="text-lg font-black tracking-[-0.03em] text-slate-950 dark:text-white">VAT LMS</span>
                    </a>

                    <button
                        type="button"
                        onClick={openLogin}
                        className="rounded-xl bg-gradient-to-b from-red-600 to-red-900 px-7 py-3 text-base font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(127,29,29,0.8)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-14px_rgba(127,29,29,0.9)] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-800 focus-visible:ring-offset-2"
                    >
                        Đăng nhập
                    </button>
                </motion.header>

                <section id="home" className="grid flex-1 items-center gap-12 pb-14 pt-14 lg:grid-cols-[0.96fr_1.04fr] lg:pb-20 lg:pt-20">
                    <div className="max-w-[560px]">
                        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp} whileHover={{ scale: 1.03 }} className="inline-flex items-center gap-3 rounded-full border border-red-200 bg-red-50/60 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-900 opacity-40 dark:bg-red-300" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-900 dark:bg-red-300" />
                            </span>
                            Hệ thống quản lý học tập
                        </motion.div>

                        <motion.h1 custom={1} initial="hidden" animate="visible" variants={fadeUp} className="mt-3 text-[52px] font-black leading-[1.08] tracking-[-0.065em] text-[#111827] dark:text-white sm:text-[64px] lg:text-[70px]">
                            Nâng tầm <span className="text-red-900 dark:text-red-300">chất</span><br />
                            <span className="text-red-600 dark:text-red-300">lượng</span><br />
                            giáo dục nội bộ
                        </motion.h1>

                        <motion.p custom={2} initial="hidden" animate="visible" variants={fadeUp} className="mt-2 max-w-[560px] text-[17px] font-medium leading-[1.7] tracking-[-0.01em] text-slate-500 dark:text-slate-300">
                            Nền tảng quản lý học tập toàn diện dành cho trung tâm VAT — quản lý lớp học, tài liệu, kiểm tra và theo dõi tiến độ học sinh trong một giao diện hiện đại.
                        </motion.p>

                        <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp} className="mt-9">
                            <button
                                type="button"
                                onClick={openLogin}
                                className="group relative overflow-hidden rounded-xl bg-gradient-to-b from-red-500 to-red-900 px-8 py-4 text-base font-extrabold text-white shadow-[0_18px_34px_-16px_rgba(127,29,29,0.85)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-16px_rgba(127,29,29,0.95)] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-800 focus-visible:ring-offset-2"
                            >
                                <span className="absolute inset-y-0 -left-10 w-8 rotate-12 bg-white/30 blur-sm transition duration-700 group-hover:left-[115%]" />
                                Đăng nhập ngay →
                            </button>
                        </motion.div>
                    </div>

                    <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp} whileHover={{ y: -6, rotate: -0.35 }} transition={{ type: 'spring', stiffness: 180, damping: 18 }} className="relative mx-auto w-full max-w-[468px] lg:mr-7">
                        <motion.div className="absolute -inset-8 rounded-[36px] bg-red-900/[0.035] blur-3xl dark:bg-red-500/10" animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }} />

                        <motion.div className="absolute -left-9 top-8 z-20 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] sm:block dark:border-white/10 dark:bg-slate-900" animate={{ y: [0, -7, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}>
                            <p className="text-xs font-bold text-slate-400">Tài liệu</p>
                            <p className="mt-1 text-sm font-black text-slate-600 dark:text-slate-200">Biên soạn độc quyền</p>
                        </motion.div>

                        <div className="relative overflow-visible rounded-[16px] border border-slate-200 bg-white pt-3 shadow-[0_28px_65px_-38px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-white/10">
                            <div className="absolute inset-x-0 top-0 h-1 rounded-t-[16px] bg-red-900" />
                            <div className="px-3">
                                <img src={vatClass} alt="Lớp học VAT" className="h-[334px] w-full rounded-t-[13px] object-cover transition duration-700 hover:scale-[1.025] sm:h-[366px]" />
                            </div>

                            <div className="flex items-center gap-3 px-5 py-4">
                                <img src={vatLogo} alt="VAT" className="h-9 w-9 rounded-full object-cover ring-1 ring-red-100" />
                                <div>
                                    <p className="text-base font-extrabold tracking-[-0.02em] text-slate-500 dark:text-slate-100">Lớp Hình Học 9 — Học kỳ 1</p>
                                    <p className="mt-0.5 text-sm font-semibold text-slate-400 dark:text-slate-300">Trung tâm VAT</p>
                                </div>
                            </div>
                        </div>

                        <motion.div className="absolute -bottom-3 -right-6 z-20 hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.5)] sm:flex dark:border-white/10 dark:bg-slate-900" animate={{ y: [0, 7, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}>
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-lg font-black text-emerald-500">✓</span>
                            <div>
                                <p className="text-sm font-black text-slate-500 dark:text-slate-100">Đang hoạt động</p>
                                <p className="mt-0.5 text-xs font-semibold text-slate-400 dark:text-slate-300">Hệ thống sẵn sàng</p>
                            </div>
                        </motion.div>
                    </motion.div>
                </section>

                <footer className="mt-auto flex flex-col gap-3 border-t border-slate-200 py-5 text-sm font-semibold text-slate-400 dark:border-white/10 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>© 2026 VAT LMS</span>
                    <span className="flex items-center gap-2"><BellIcon size={16} /> WCAG AA • Responsive • Real-time LMS</span>
                </footer>
            </div>

            <AnimatePresence>
                {popup && (
                    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div role="dialog" aria-modal="true" className="max-h-[92vh] w-full overflow-y-auto rounded-t-[30px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:max-w-lg sm:rounded-[30px] sm:p-6" initial={{ y: 42, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0, scale: 0.98 }}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <img src={vatLogo} alt="VAT" className="h-12 w-12 rounded-2xl object-cover ring-1 ring-red-100" />
                                    <div>
                                        <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">
                                            {popup === 'login' && 'Đăng nhập VAT LMS'}
                                            {popup === 'demo' && 'Chọn tài khoản mẫu'}
                                            {popup === 'support' && 'Form hỗ trợ đăng nhập'}
                                        </h2>
                                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Dữ liệu đã được chuẩn bị sẵn</p>
                                    </div>
                                </div>
                                <button type="button" onClick={closePopup} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-900 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15" aria-label="Đóng popup">
                                    <XIcon size={20} />
                                </button>
                            </div>

                            {popup === 'login' && (
                                <form className="mt-6 grid gap-4" onSubmit={onLogin}>
                                    <Field label="Tên đăng nhập" value={loginForm.username} onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })} required placeholder="Ví dụ: xm2_student_01" />
                                    <Field label="Mật khẩu" type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} required placeholder="Ví dụ: student123" />
                                    {message && (
                                        <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200" role="alert">
                                            {message}
                                        </p>
                                    )}
                                    <PrimaryButton type="submit" size="lg" className="min-h-12 text-base">Đăng nhập</PrimaryButton>
                                </form>
                            )}

                            {popup === 'demo' && (
                                <div className="mt-6 grid gap-3">
                                    {demoAccounts.map((account) => (
                                        <button key={account.username} type="button" onClick={() => fillAccount(account.username, account.password)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-red-200 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-900 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="font-black text-slate-950 dark:text-white">{account.role}</p>
                                                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-red-900 shadow-sm dark:bg-white/10 dark:text-red-200">Dùng ngay</span>
                                            </div>
                                            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Username: {account.username}</p>
                                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Password: {account.password}</p>
                                            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{account.note}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {popup === 'support' && (
                                <form onSubmit={submitSupport} className="mt-6 grid gap-4">
                                    <label className="grid gap-2 text-sm font-bold text-slate-900 dark:text-white">
                                        Họ tên / vai trò
                                        <input value={supportName} onChange={(event) => setSupportName(event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-red-900 focus:ring-2 focus:ring-red-900/15 dark:border-white/10 dark:bg-white/5" />
                                    </label>
                                    <label className="grid gap-2 text-sm font-bold text-slate-900 dark:text-white">
                                        Số điện thoại
                                        <input value={supportPhone} onChange={(event) => setSupportPhone(event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-red-900 focus:ring-2 focus:ring-red-900/15 dark:border-white/10 dark:bg-white/5" />
                                    </label>
                                    <label className="grid gap-2 text-sm font-bold text-slate-900 dark:text-white">
                                        Nội dung cần hỗ trợ
                                        <textarea value={supportContent} onChange={(event) => setSupportContent(event.target.value)} rows={4} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-red-900 focus:ring-2 focus:ring-red-900/15 dark:border-white/10 dark:bg-white/5" />
                                    </label>
                                    {supportSent && (
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                                            Đã ghi nhận yêu cầu mẫu. Bộ phận hỗ trợ VAT sẽ liên hệ theo thông tin đã nhập.
                                        </div>
                                    )}
                                    <Button type="submit" variant="primary" size="lg" className="min-h-12">Gửi yêu cầu hỗ trợ</Button>
                                </form>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
