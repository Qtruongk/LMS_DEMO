import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { API_URL } from '../services/api';
import type { ClassDetail, ClassItem, NotificationItem, ScheduleAdjustment, Tuition, User, WorkspaceSummary } from '../types';

type AccountForm = { full_name?: string; username: string; password: string };

export function useLmsWorkspace() {
    const [user, setUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('vat_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
    const [summary, setSummary] = useState<WorkspaceSummary>({});
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [tuitions, setTuitions] = useState<Tuition[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [message, setMessage] = useState('');
    const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'admin123' });
    const [studentForm, setStudentForm] = useState<AccountForm>({ full_name: '', username: '', password: '' });
    const [teacherForm, setTeacherForm] = useState<AccountForm>({ full_name: '', username: '', password: '' });

    const headers = useMemo(() => ({ 'Content-Type': 'application/json', ...(user ? { 'x-user-id': String(user.id) } : {}) }), [user]);

    const api = useCallback(async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...(options.headers ?? {}) } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? 'Không thể tải dữ liệu');
        return data;
    }, [headers]);

    const [adjustments, setAdjustments] = useState<ScheduleAdjustment[]>([]);

    const reloadNotifications = useCallback(async function reloadNotifications(currentUser = user) {
        if (!currentUser) return [];
        const authHeaders = { 'Content-Type': 'application/json', 'x-user-id': String(currentUser.id) };
        const notificationRes = await fetch(`${API_URL}/api/notifications`, { headers: authHeaders }).then((r) => r.json());
        const nextNotifications = notificationRes.notifications ?? [];
        setNotifications(nextNotifications);
        return nextNotifications;
    }, [user]);

    const loadWorkspace = useCallback(async function loadWorkspace(currentUser = user) {
        if (!currentUser) return;
        const authHeaders = { 'Content-Type': 'application/json', 'x-user-id': String(currentUser.id) };
        const [summaryRes, classRes, adjRes] = await Promise.all([
            fetch(`${API_URL}/api/summary`, { headers: authHeaders }).then((r) => r.json()),
            fetch(`${API_URL}/api/classes`, { headers: authHeaders }).then((r) => r.json()),
            fetch(`${API_URL}/api/schedule/adjustments`, { headers: authHeaders }).then((r) => r.json()).catch(() => ({ adjustments: [] })),
        ]);
        setSummary(summaryRes.roleMetrics ?? {});
        setClasses(classRes.classes ?? []);
        setAdjustments(adjRes.adjustments ?? []);
        await reloadNotifications(currentUser);
        const firstId = classRes.classes?.[0]?.id ?? null;
        setSelectedClassId((old) => old ?? firstId);
        if (currentUser.role === 'admin' || currentUser.role === 'owner') {
            const tuitionRes = await fetch(`${API_URL}/api/tuitions`, { headers: authHeaders }).then((r) => r.json());
            const userRes = await fetch(`${API_URL}/api/users`, { headers: authHeaders }).then((r) => r.json());
            setTuitions(tuitionRes.tuitions ?? []);
            setUsers(userRes.users ?? []);
        } else if (currentUser.role === 'teacher') {
            const userRes = await fetch(`${API_URL}/api/users?role=student`, { headers: authHeaders }).then((r) => r.json());
            setUsers(userRes.users ?? []);
        }
    }, [reloadNotifications, user]);

    useEffect(() => {
        loadWorkspace().catch(console.error);
    }, [loadWorkspace]);

    useEffect(() => {
        if (!selectedClassId || !user?.id) return;
        api<ClassDetail>(`/api/classes/${selectedClassId}`).then(setClassDetail).catch(console.error);
    }, [api, selectedClassId, user?.id]);

    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => setMessage(''), 4000);
        return () => clearTimeout(timer);
    }, [message]);

    async function handleLogin(event: FormEvent) {
        event.preventDefault();
        setMessage('');
        try {
            const data = await api<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(loginForm) });
            setUser(data.user);
            localStorage.setItem('vat_user', JSON.stringify(data.user));
            await loadWorkspace(data.user);
            return true;
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Đăng nhập thất bại');
            return false;
        }
    }

    async function createStudent(event: FormEvent) {
        event.preventDefault();
        await api('/api/users/student', { method: 'POST', body: JSON.stringify(studentForm) });
        setMessage('Đã tạo tài khoản học sinh thành công.');
        setStudentForm({ full_name: '', username: '', password: '' });
        await loadWorkspace();
    }

    async function createTeacher(event: FormEvent) {
        event.preventDefault();
        await api('/api/users/teacher', { method: 'POST', body: JSON.stringify(teacherForm) });
        setMessage('Đã tạo tài khoản giáo viên thành công.');
        setTeacherForm({ full_name: '', username: '', password: '' });
        await loadWorkspace();
    }

    async function deleteUser(id: number) {
        const res = await api<{ message: string }>(`/api/users/${id}`, { method: 'DELETE' });
        setMessage(res.message);
        await loadWorkspace();
    }

    async function deleteUsersBulk(ids: number[]) {
        const res = await api<{ message: string }>('/api/users', {
            method: 'DELETE',
            body: JSON.stringify({ ids })
        });
        setMessage(res.message);
        await loadWorkspace();
    }

    async function updateUser(id: number, payload: Partial<User>) {
        const res = await api<{ message: string }>(`/api/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        setMessage(res.message);
        await loadWorkspace();
    }

    async function changeUserClass(id: number, classId: number | null) {
        const res = await api<{ message: string }>(`/api/users/${id}/class`, {
            method: 'PUT',
            body: JSON.stringify({ class_id: classId }),
        });
        setMessage(res.message);
        await loadWorkspace();
    }

    async function importUsersCsv(csvContent: string, defaultRole = 'student') {
        const res = await api<{ message: string; count: number }>('/api/users/import', {
            method: 'POST',
            body: JSON.stringify({ csv: csvContent, default_role: defaultRole }),
        });
        setMessage(res.message);
        await loadWorkspace();
        return res;
    }

    async function createClass(payload: Record<string, unknown>) {
        const res = await api<{ class: ClassItem; student_count: number }>('/api/classes', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        setMessage(`Đã tạo lớp thành công ${res.class.name}${res.student_count ? ` với ${res.student_count} học sinh từ CSV.` : '.'}`);
        await loadWorkspace();
        return res;
    }

    async function deleteClass(id: number) {
        const res = await api<{ message: string }>(`/api/classes/${id}`, { method: 'DELETE' });
        setMessage(res.message);
        if (selectedClassId === id) setSelectedClassId(null);
        await loadWorkspace();
        return res;
    }

    async function updateClass(id: number, payload: Record<string, unknown>) {
        const res = await api<{ class: ClassItem; message: string }>(`/api/classes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        setMessage(res.message);
        await loadWorkspace();
        return res;
    }

    async function createScheduleAdjustment(payload: Record<string, unknown>) {
        const res = await api<{ adjustment: ScheduleAdjustment; message: string }>('/api/schedule/adjustments', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        setMessage(res.message);
        await loadWorkspace();
        return res;
    }

    async function deleteScheduleAdjustment(id: number) {
        const res = await api<{ message: string }>(`/api/schedule/adjustments/${id}`, { method: 'DELETE' });
        setMessage(res.message);
        await loadWorkspace();
        return res;
    }

    async function markNotificationRead(id: number) {
        await api(`/api/notifications/${id}/read`, { method: 'POST' });
        setNotifications((items) => items.map((item) => item.id === id ? { ...item, is_read: true } : item));
    }

    async function markAllNotificationsRead() {
        await api('/api/notifications/read-all', { method: 'POST' });
        setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
    }

    function logout() {
        localStorage.removeItem('vat_user');
        setUser(null);
    }

    return {
        user,
        classes,
        selectedClassId,
        setSelectedClassId,
        classDetail,
        summary,
        notifications,
        reloadNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        tuitions,
        users,
        adjustments,
        createScheduleAdjustment,
        deleteScheduleAdjustment,
        message,
        setMessage,
        loginForm,
        setLoginForm,
        studentForm,
        setStudentForm,
        teacherForm,
        setTeacherForm,
        handleLogin,
        createStudent,
        createTeacher,
        deleteUser,
        deleteUsersBulk,
        updateUser,
        changeUserClass,
        importUsersCsv,
        createClass,
        deleteClass,
        updateClass,
        logout,
    };
}
