import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useState, type FormEvent } from 'react';
import vatLogo from '../../../assets/vat_logo.jpg';
import vatClass from '../../../assets/vat_class.jpg';
import { Button, Field, PrimaryButton } from '../../../components/shared/ui';
import {
    BellIcon,
    ChevronRightIcon,
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
    { role: 'Học sinh', username: 'xm2_student_01', password: 'student123', note: 'Lớp Điện Ô tô B1 • Xuân Minh' },
    { role: 'Giáo viên', username: 'xuanminh', password: 'xuanminh123', note: 'Quản lý lớp ô tô thực hành' },
    { role: 'Quản trị', username: 'admin', password: 'admin123', note: 'Điều phối hệ thống VAT LMS' },
];

const trustItems = [
    { label: 'Responsive', value: 'Mobile-first' },
    { label: 'Dữ liệu', value: 'Realtime LMS' },
    { label: 'Truy cập', value: 'Nội bộ VAT' },
];

export function AuthLanding({ showLogin, message, loginForm, setShowLogin, setLoginForm, onLogin }: Props) {
    const [popup, setPopup] = useState<LandingPopup>(showLogin ? 'login' : null);
    const [supportName, setSupportName] = useState('Học viên lớp Điện Ô tô B1');
    const [supportPhone, setSupportPhone] = useState('0961001001');
    const [supportContent, setSupportContent] = useState('Tôi cần hỗ trợ đăng nhập tài khoản học sinh trong hệ thống VAT LMS.');
    const [supportSent, setSupportSent] = useState(false);

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

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#f8f8fa] text-slate-950 dark:bg-slate-950 dark:text-white">
            <div className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-red-900/10 blur-3xl" />
            <div className="pointer-events-none absolute right-[-8rem] top-8 h-80 w-80 rounded-full bg-rose-900/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-12rem] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />

            <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
                <motion.header
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="sticky top-3 z-30 flex items-center justify-between gap-3 rounded-[24px] border border-white/80 bg-white/80 px-3 py-3 shadow-lg shadow-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/8 dark:shadow-none sm:top-5 sm:px-5"
                >
                    <a href="#home" className="flex min-w-0 items-center gap-3 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-900">
                        <img src={vatLogo} alt="VAT logo" className="h-11 w-11 shrink-0 rounded-2xl object-cover ring-1 ring-red-100" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black tracking-[-0.02em] text-slate-950 dark:text-white sm:text-base">Hệ thống Đào tạo nội bộ VAT</p>
                            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">VAT LMS • Quản lý học tập tập trung</p>
                        </div>
                    </a>

                    <Button variant="primary" size="sm" onClick={openLogin} className="min-h-11 px-4 sm:px-5">Đăng nhập</Button>
                </motion.header>

                <section id="home" className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.02fr_0.98fr] lg:py-16 xl:gap-14">
                    <div className="max-w-2xl">
                        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-red-900 shadow-sm dark:border-red-900/60 dark:bg-white/10 dark:text-red-200">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Hệ thống hoạt động bình thường
                        </motion.div>

                        <motion.h1 custom={1} initial="hidden" animate="visible" variants={fadeUp} className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.06em] text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
                            Quản lý vận hành <span className="text-red-900 dark:text-red-300">& đào tạo tập trung</span>
                        </motion.h1>

                        <motion.p custom={2} initial="hidden" animate="visible" variants={fadeUp} className="mt-5 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                            Giao diện landing được tối ưu theo hành vi mắt nhìn: thông tin chính nằm bên trái, minh hoạ tin cậy bên phải, nút hành động lớn và form đăng nhập có dữ liệu mẫu để thao tác nhanh trên mọi thiết bị.
                        </motion.p>

                        <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp} className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Button variant="primary" size="lg" onClick={openLogin} rightIcon={<ChevronRightIcon size={18} />} className="min-h-13 w-full px-6 text-base sm:w-auto">
                                Truy cập hệ thống
                            </Button>
                            <Button variant="secondary" size="lg" onClick={() => setPopup('demo')} className="min-h-13 w-full px-6 text-base sm:w-auto">
                                Xem tài khoản mẫu
                            </Button>
                        </motion.div>

                        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp} className="mt-8 grid grid-cols-3 gap-3">
                            {trustItems.map((item) => (
                                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                                    <p className="mt-1 text-sm font-black text-slate-800 dark:text-white sm:text-base">{item.value}</p>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp} className="relative">
                        <div className="absolute -inset-4 rounded-[34px] bg-gradient-to-br from-red-900/10 via-transparent to-amber-500/10 blur-xl" />
                        <div className="relative overflow-hidden rounded-[30px] border border-red-200 bg-white p-3 shadow-2xl shadow-slate-300/70 dark:border-red-900/40 dark:bg-white/10 dark:shadow-none">
                            <img src={vatClass} alt="Lớp học VAT" className="h-[250px] w-full rounded-[22px] object-cover sm:h-[360px] lg:h-[420px]" />
                            <div className="grid gap-3 border-t border-red-100 p-4 sm:grid-cols-[1fr_auto] sm:items-center dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <img src={vatLogo} alt="VAT" className="h-10 w-10 rounded-xl object-cover ring-1 ring-red-100" />
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white">Lớp Hình Học 9 — Cơ sở 1</p>
                                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Dữ liệu đào tạo được đồng bộ trong VAT LMS</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="secondary" onClick={openLogin} className="min-h-10">Vào LMS</Button>
                            </div>
                        </div>
                    </motion.div>
                </section>

                <footer className="mt-auto flex flex-col gap-3 border-t border-slate-200 py-6 text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
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
                                    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Điền nhanh</p>
                                        <div className="grid gap-2 sm:grid-cols-3">
                                            {demoAccounts.map((account) => (
                                                <button key={account.username} type="button" onClick={() => fillAccount(account.username, account.password)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-black text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
                                                    {account.role}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
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
