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
