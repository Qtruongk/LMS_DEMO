import { memo, type ReactNode, forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

// --- Buttons ---
interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    children?: ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'secondary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
        const baseStyles = 'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold tracking-[-0.01em] transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:pointer-events-none disabled:opacity-55';

        const variants = {
            primary: 'border border-transparent bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]',
            secondary: 'border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] shadow-xs hover:-translate-y-0.5 hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-soft)] active:translate-y-0 active:bg-[var(--color-bg-muted)]',
            ghost: 'border border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]',
            danger: 'border border-transparent bg-[var(--color-danger)] text-white shadow-xs hover:bg-red-700 active:bg-red-800',
        };

        const sizes = {
            sm: 'h-9 px-3 text-xs',
            md: 'h-10 px-4 text-sm',
            lg: 'h-12 px-6 text-sm',
        };

        return (
            <motion.button
                ref={ref}
                disabled={disabled || isLoading}
                whileHover={disabled || isLoading ? undefined : { y: -1 }}
                whileTap={disabled || isLoading ? undefined : { scale: 0.985 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                {...props}
            >
                {isLoading && (
                    <svg className="animate-spin -ml-1 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {!isLoading && leftIcon}
                {children}
                {!isLoading && rightIcon}
            </motion.button>
        );
    }
);
Button.displayName = 'Button';

export const PrimaryButton = (props: ButtonProps) => <Button variant="primary" {...props} />;
export const GhostButton = (props: ButtonProps) => <Button variant="ghost" {...props} />;

// --- Cards & Panels ---
export const Panel = memo(function Panel({ title, subtitle, action, children, className = '', noPadding = false }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string; noPadding?: boolean }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className={`overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary-border)] hover:shadow-md ${className}`}
        >
            {(title || subtitle || action) && (
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 min-h-[60px] sm:px-6">
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                        {title && <h2 className="truncate text-base font-bold tracking-[-0.01em] text-[var(--color-text)] leading-none my-auto">{title}</h2>}
                        {subtitle && <p className="mt-1.5 max-w-3xl text-sm leading-5 text-[var(--color-text-secondary)]">{subtitle}</p>}
                    </div>
                    {action && <div className="shrink-0 flex items-center">{action}</div>}
                </div>
            )}
            <div className={noPadding ? '' : 'p-5 sm:p-6'}>
                {children}
            </div>
        </motion.section>
    );
});

// --- Feedback & Status ---
export function Badge({ children, tone = 'neutral', size = 'md' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'info'; size?: 'sm' | 'md' }) {
    const tones = {
        neutral: 'border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400',
        warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400',
        danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400',
        info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400',
        primary: 'border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)]',
    };
    const sizes = {
        sm: 'px-1.5 py-0.5 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
    };
    return <span className={`inline-flex items-center rounded-full border font-semibold tracking-[-0.005em] ${tones[tone]} ${sizes[size]}`}>{children}</span>;
}

export function Alert({ children, title, tone = 'info', icon }: { children: ReactNode; title?: string; tone?: 'success' | 'danger' | 'warning' | 'info'; icon?: ReactNode }) {
    const tones = {
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/10 dark:text-emerald-200',
        danger: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-200',
        warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-200',
        info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/10 dark:text-blue-200',
    };
    return (
        <div className={`flex gap-3 rounded-lg border p-4 text-sm shadow-sm ${tones[tone]}`} role="alert">
            {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
            <div className="flex-1">
                {title && <h4 className="font-semibold mb-1">{title}</h4>}
                <div className="text-opacity-90">{children}</div>
            </div>
        </div>
    );
}

// --- Loading & Empty States ---
export function Progress({ value, label }: { value: number; label?: string }) {
    return (
        <div className="w-full">
            {label && (
                <div className="mb-1.5 flex justify-between text-xs font-medium text-[var(--color-text-secondary)]">
                    <span>{label}</span>
                    <span>{Math.round(value)}%</span>
                </div>
            )}
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-muted)] shadow-inner" aria-label={`Tiến độ ${value}%`}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]"
                />
            </div>
        </div>
    );
}

export function Skeleton({ className = '', variant = 'text' }: { className?: string; variant?: 'text' | 'circular' | 'rectangular' }) {
    const variants = {
        text: 'rounded-md h-4 w-full',
        circular: 'rounded-full h-10 w-10',
        rectangular: 'rounded-lg h-24 w-full',
    };
    return <div className={`animate-pulse bg-[var(--color-bg-muted)] ${variants[variant]} ${className}`} />;
}

export function EmptyState({ title = 'Không có dữ liệu', description, action, icon }: { title?: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-soft)]/50 px-6 py-16 text-center">
            {icon && <div className="mb-4 text-[var(--color-text-muted)] opacity-60">{icon}</div>}
            <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
            {description && <p className="mt-2 text-sm max-w-sm text-[var(--color-text-secondary)]">{description}</p>}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}

// --- Forms ---
interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    helperText?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
    ({ label, type = 'text', error, helperText, className = '', required, id, ...props }, ref) => {
        const inputId = id || label.replace(/\s+/g, '-').toLowerCase();

        return (
            <div className="flex flex-col gap-1.5 w-full">
                <label htmlFor={inputId} className="text-sm font-semibold text-[var(--color-text)]">
                    {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
                </label>
                <div className="relative">
                    <input
                        ref={ref}
                        id={inputId}
                        type={type}
                        required={required}
                        aria-invalid={!!error}
                        className={`h-10 w-full rounded-md border bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] shadow-sm outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-[var(--color-border)]'
                            } ${className}`}
                        {...props}
                    />
                </div>
                {(error || helperText) && (
                    <p className={`text-xs ${error ? 'text-red-500' : 'text-[var(--color-text-secondary)]'}`}>
                        {error || helperText}
                    </p>
                )}
            </div>
        );
    }
);
Field.displayName = 'Field';
