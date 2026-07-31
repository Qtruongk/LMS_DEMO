import type { Role } from '../types';

export const roleLabel: Record<Role, string> = {
    admin: 'Quản trị viên',
    teacher: 'Giáo viên',
    student: 'Học sinh',
};

export const statusLabel: Record<string, string> = {
    upcoming: 'Sắp bắt đầu',
    active: 'Đang học',
    completed: 'Đã hoàn thành',
    not_started: 'Chưa học',
    in_progress: 'Đang học',
    published: 'Đã giao',
    draft: 'Nháp',
    closed: 'Đã đóng',
    unpaid: 'Chưa thu',
    partial: 'Thu một phần',
    paid: 'Đã thu đủ',
    waived: 'Miễn/giảm',
};

export const menuLabel: Record<string, string> = {
    dashboard: 'Tổng quan',
    classes: 'Lớp học',
    timeline: 'Timeline',
    attendance: 'Điểm danh',
    materials: 'Tài liệu',
    tests: 'Bài kiểm tra',
    results: 'Kết quả',
    notifications: 'Thông báo',
    schedule: 'Thời khoá biểu',
    students: 'Học sinh',
    teachers: 'Giáo viên',
    progress: 'Tiến độ',
    tuition: 'Học phí',
    reports: 'Báo cáo',
    feedbacks: 'Phản hồi',
    library: 'Thư viện số',
};

export const menuIcon: Record<string, string> = {
    dashboard: 'grid',
    classes: 'book',
    timeline: 'trend',
    attendance: 'clock',
    materials: 'file',
    tests: 'check',
    results: 'chart',
    notifications: 'bell',
    schedule: 'calendar',
    students: 'users',
    teachers: 'user',
    progress: 'trend',
    tuition: 'wallet',
    reports: 'report',
    feedbacks: 'message',
    library: 'book',
};
