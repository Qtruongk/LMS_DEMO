import { FileIcon } from '../../../components/shared/icons';
import type { NotificationAttachment, NotificationItem } from '../../../types';

export const MAX_NOTIFICATION_ATTACHMENTS = 3;
export const MAX_NOTIFICATION_ATTACHMENT_SIZE = 6 * 1024 * 1024;

const allowedRichTextTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'div', 'span']);

export function stripHtml(value?: string) {
    if (!value) return '';
    return value
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<br\s*\/?\s*>/gi, '\n')
        .replace(/<\/p>|<\/div>|<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&/gi, '&')
        .replace(/</gi, '<')
        .replace(/>/gi, '>')
        .replace(/\s+\n/g, '\n')
        .replace(/\n\s+/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

export function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');
}

export function sanitizeNotificationHtml(value?: string) {
    if (!value) return '';
    return value
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, tagName) => {
            const normalized = String(tagName).toLowerCase();
            if (!allowedRichTextTags.has(normalized)) return '';
            if (normalized === 'br') return '<br>';
            return tag.startsWith('</') ? `</${normalized}>` : `<${normalized}>`;
        })
        .trim();
}

export function formatFileSize(size?: number) {
    if (!size || size <= 0) return 'Không rõ dung lượng';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function getNotificationAttachments(item: NotificationItem): NotificationAttachment[] {
    return Array.isArray(item.attachments)
        ? item.attachments.filter((attachment) => Boolean(attachment?.name && attachment?.data))
        : [];
}

export function readFileAsNotificationAttachment(file: File): Promise<NotificationAttachment> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: file.name,
                type: file.type || 'application/octet-stream',
                size: file.size,
                data: String(reader.result || ''),
                uploaded_at: new Date().toISOString(),
            });
        };
        reader.onerror = () => reject(new Error(`Không thể đọc tệp ${file.name}.`));
        reader.readAsDataURL(file);
    });
}

export function RichNotificationContent({
    html,
    fallback,
    className = '',
}: {
    html?: string;
    fallback?: string;
    className?: string;
}) {
    const safeHtml = sanitizeNotificationHtml(html);
    const baseClass = `text-sm font-medium leading-6 text-[var(--color-text-secondary)] [&_b]:font-black [&_strong]:font-black [&_em]:italic [&_i]:italic [&_u]:underline [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_li]:my-1 [&_p]:my-1 ${className}`;

    if (safeHtml) {
        return <div className={baseClass} dangerouslySetInnerHTML={{ __html: safeHtml }} />;
    }

    return <p className={`whitespace-pre-line ${baseClass}`}>{fallback}</p>;
}

export function NotificationAttachmentList({
    attachments,
    compact = false,
    className = '',
}: {
    attachments: NotificationAttachment[];
    compact?: boolean;
    className?: string;
}) {
    if (!attachments.length) return null;

    return (
        <div className={`${compact ? 'grid gap-2 sm:grid-cols-2' : 'space-y-2'} ${className}`}>
            {attachments.map((attachment, index) => (
                <a
                    key={attachment.id || `${attachment.name}-${index}`}
                    href={attachment.data}
                    download={attachment.name}
                    className="group flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-soft)]"
                >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <FileIcon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-black text-[var(--color-text)]">{attachment.name}</span>
                        <span className="mt-0.5 block text-[11px] font-bold text-[var(--color-text-muted)]">{formatFileSize(attachment.size)}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--color-primary)] opacity-0 transition group-hover:opacity-100 dark:bg-slate-950/60">
                        Tải
                    </span>
                </a>
            ))}
        </div>
    );
}
