export function formatDate(value?: string) {
    if (!value) return 'Chưa cập nhật';
    return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: value.includes('T') ? 'short' : undefined,
    }).format(new Date(value));
}

export function formatMoney(value?: string) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));
}

export function getInitials(name?: string) {
    return (name || 'VAT')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

/**
 * Hiển thị tên theo tên riêng, họ và tên đệm đặt ra sau trong ngoặc đơn.
 * Ví dụ: "Nguyễn Văn An" -> "An (Nguyễn Văn)"
 */
export function formatStudentName(fullName?: string | null): string {
    if (!fullName) return '';
    const trimmed = fullName.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length <= 1) return trimmed;
    const firstName = parts[parts.length - 1];
    const prefix = parts.slice(0, parts.length - 1).join(' ');
    return `${firstName} (${prefix})`;
}

/**
 * Sắp xếp học sinh theo tên riêng (A-Z) theo chuẩn tiếng Việt
 */
export function compareStudentNames(aName?: string | null, bName?: string | null): number {
    const getParts = (name?: string | null) => {
        if (!name) return { first: '', full: '' };
        const parts = name.trim().split(/\s+/);
        return {
            first: parts[parts.length - 1].toLowerCase(),
            full: name.trim().toLowerCase(),
        };
    };
    const a = getParts(aName);
    const b = getParts(bName);
    const cmp = a.first.localeCompare(b.first, 'vi');
    return cmp !== 0 ? cmp : a.full.localeCompare(b.full, 'vi');
}

