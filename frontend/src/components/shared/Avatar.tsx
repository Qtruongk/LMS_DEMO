import { memo } from 'react';
import { getInitials } from '../../utils/format';
import type { User } from '../../types';

const avatarVariants = [
    ['#F6D7C3', '#7F1D1D', '#111827', '#F59E0B'],
    ['#C68642', '#991B1B', '#1F2937', '#2563EB'],
    ['#8D5524', '#B91C1C', '#111827', '#16A34A'],
    ['#E0AC69', '#DC2626', '#374151', '#7C3AED'],
    ['#F1C27D', '#7F1D1D', '#92400E', '#0891B2'],
    ['#FFDBAC', '#991B1B', '#111827', '#DB2777'],
    ['#D2A679', '#B91C1C', '#1F2937', '#4B5563'],
    ['#A47148', '#DC2626', '#111827', '#0F766E'],
    ['#F6D7C3', '#7F1D1D', '#78350F', '#EA580C'],
    ['#C68642', '#991B1B', '#111827', '#0284C7'],
    ['#8D5524', '#B91C1C', '#27272A', '#65A30D'],
    ['#E0AC69', '#DC2626', '#111827', '#BE123C'],
    ['#F1C27D', '#7F1D1D', '#422006', '#4338CA'],
    ['#FFDBAC', '#991B1B', '#111827', '#0D9488'],
    ['#D2A679', '#B91C1C', '#3F3F46', '#CA8A04'],
    ['#A47148', '#DC2626', '#18181B', '#64748B'],
];

function hashUser(user?: Pick<User, 'id' | 'username' | 'full_name'> | null, name?: string) {
    const value = String(user?.id ?? user?.username ?? user?.full_name ?? name ?? 'vat');
    return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

type AvatarProps = {
    user?: Pick<User, 'id' | 'username' | 'full_name'> | null;
    name?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
};

export const Avatar = memo(function Avatar({ user, name, size = 'md', className = '' }: AvatarProps) {
    const displayName = name ?? user?.full_name ?? user?.username;
    const hash = hashUser(user, displayName);
    const [skin, hair, stroke, clothes] = avatarVariants[hash % avatarVariants.length];
    const hasGlasses = hash % 3 === 0;
    const isLongHair = hash % 2 === 0;
    const sizeClass = size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';

    return (
        <span className={`inline-grid ${sizeClass} shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-100 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700 ${className}`} aria-label={displayName ? `Avatar ${displayName}` : 'Avatar'}>
            <svg viewBox="0 0 64 64" className="h-full w-full" role="img" aria-hidden="true">
                <circle cx="32" cy="32" r="32" fill="#F5F5F4" />
                <path d="M16 58c2-13 10-20 16-20s14 7 16 20" fill={clothes} />
                <circle cx="32" cy="28" r="14" fill={skin} />
                {isLongHair ? <path d="M17 31c0-12 6-20 16-20 9 0 15 7 15 20-6-8-21-7-31 0Z" fill={hair} /> : <path d="M18 25c2-10 9-15 18-13 6 1 10 6 11 13-9-4-19-5-29 0Z" fill={hair} />}
                <path d="M24 31h1M39 31h1" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
                {hasGlasses && <path d="M21 30h9m4 0h9M30 30c0 3-2 5-5 5s-5-2-5-5m24 0c0 3-2 5-5 5s-5-2-5-5" stroke={stroke} strokeWidth="1.8" fill="none" strokeLinecap="round" />}
                <path d="M27 37c3 2 7 2 10 0" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            <span className="sr-only">{getInitials(displayName)}</span>
        </span>
    );
});
