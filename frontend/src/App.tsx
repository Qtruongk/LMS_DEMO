import { useEffect, useState } from 'react';
import { AuthLanding } from './features/auth/components/AuthLanding';
import { SelfServiceView } from './features/auth/components/SelfServiceView';
import { PasswordResetRequestsView } from './features/auth/components/PasswordResetRequestsView';
import { AdminClassOperations } from './features/classes/components/AdminClassOperations';
import { AttendancePanel } from './features/classes/components/AttendancePanel';
import { ClassTimelineView } from './features/classes/components/ClassTimelineView';
import { Classes } from './features/classes/components/Classes';
import { TeacherClasses } from './features/classes/components/TeacherClasses';
import { OnlineExamsMain } from './features/exams/components/OnlineExamsMain';
import { MaterialsView } from './features/materials/components/MaterialsView';
import { ScheduleView } from './features/classes/components/ScheduleView';
import { Dashboard } from './features/dashboard/components/Dashboard';
import { Accounts, Students, Teachers } from './features/people/components/People';
import { FeedbackView } from './features/feedbacks/components/FeedbackView';
import { OnlineLibraryView } from './features/materials/components/OnlineLibraryView';
import { NotificationsView } from './features/notifications/components/NotificationsView';
import { TuitionList } from './features/tuitions/components/TuitionList';
import { Reports } from './features/reports/components/Reports';
import { DataAnalytics } from './features/reports/components/DataAnalytics';
import { TeachingReport } from './features/reports/components/TeachingReport';
import { ClassReport } from './features/reports/components/ClassReport';
import { OwnerOverview } from './features/reports/components/OwnerOverview';
import { useLmsWorkspace } from './hooks/useLmsWorkspace';
import { useTheme } from './hooks/useTheme';
import { AppLayout, PageTitle } from './layouts/AppLayout';
import { CommandPalette } from './components/shared/CommandPalette';

function App() {
  const workspace = useLmsWorkspace();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [studentClassesView, setStudentClassesView] = useState<'todo' | 'class'>('class');
  const [teacherClassesView, setTeacherClassesView] = useState<'review' | 'class'>('review');
  const [showLogin, setShowLogin] = useState(false);
  const [showSelfService, setShowSelfService] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('vat_sidebar') === 'collapsed');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    localStorage.setItem('vat_sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
  }, [sidebarCollapsed]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const examParam = params.get('exam') || params.get('assignment');
    if (examParam) {
      if (workspace.user) {
        if (workspace.user.role === 'student') {
          setActiveModule('classes');
          setStudentClassesView('todo');
        } else if (workspace.user.role === 'admin' || workspace.user.role === 'teacher') {
          setActiveModule('class-operations');
        }
      } else {
        setShowLogin(true);
      }
    }
  }, [workspace.user]);

  if (!workspace.user) {
    if (showSelfService) {
      return <SelfServiceView onBackToLogin={() => { setShowSelfService(false); setShowLogin(true); }} />;
    }

    return (
      <AuthLanding
        showLogin={showLogin}
        message={workspace.message}
        loginForm={workspace.loginForm}
        setShowLogin={setShowLogin}
        setLoginForm={workspace.setLoginForm}
        onOpenSelfService={() => setShowSelfService(true)}
        onLogin={async (event) => {
          const loggedIn = await workspace.handleLogin(event);
          setShowLogin(!loggedIn);
        }}
      />
    );
  }

  const menu = workspace.user.role === 'student'
    ? ['dashboard', 'schedule', 'classes']
    : workspace.user.role === 'teacher'
      ? ['dashboard', 'schedule', 'classes']
      : workspace.user.role === 'owner'
        ? ['dashboard', 'classes', 'schedule', 'finance', 'service-quality', 'data-analytics', 'teaching-report', 'class-report', 'feedbacks']
        : ['dashboard', 'accounts', 'class-operations', 'notifications', 'requests'];

  const handleModuleChange = (module: string, classId?: number) => {
    if (module === 'tests' && workspace.user?.role === 'teacher') {
      setTeacherClassesView('class');
      setActiveModule('classes');
      return;
    }
    if (module === 'classes' && workspace.user?.role === 'student') {
      if (classId) {
        workspace.setSelectedClassId(classId);
      } else if (!workspace.selectedClassId && workspace.classes[0]) {
        workspace.setSelectedClassId(workspace.classes[0].id);
      }
      setStudentClassesView('class');
    }
    if (module === 'classes' && workspace.user?.role === 'teacher') {
      if (classId) {
        workspace.setSelectedClassId(classId);
        setTeacherClassesView('class');
      } else {
        setTeacherClassesView('review');
      }
    }
    if ((module === 'assignments' || module === 'class-operations') && workspace.user?.role === 'admin') {
      if (classId) {
        workspace.setSelectedClassId(classId);
      } else if (!workspace.selectedClassId && workspace.classes[0]) {
        workspace.setSelectedClassId(workspace.classes[0].id);
      }
      setTeacherClassesView('class');
    }
    if (module === 'attendance') {
      if (classId) {
        workspace.setSelectedClassId(classId);
      } else if (!workspace.selectedClassId && workspace.classes[0]) {
        workspace.setSelectedClassId(workspace.classes[0].id);
      }
    }
    setActiveModule(module);
  };

  const openStudentTodo = () => {
    setStudentClassesView('class');
    setActiveModule('dashboard');
  };

  const openStudentClass = (classId: number) => {
    workspace.setSelectedClassId(classId);
    setStudentClassesView('class');
    setActiveModule('classes');
  };

  const openTeacherReview = () => {
    setTeacherClassesView('review');
    setActiveModule('classes');
  };

  const openTeacherClass = (classId: number) => {
    workspace.setSelectedClassId(classId);
    setTeacherClassesView('class');
    setActiveModule('classes');
  };

  const hidePageTitle = activeModule === 'dashboard'
    || (workspace.user.role === 'teacher' && activeModule === 'classes')
    || (workspace.user.role === 'admin' && activeModule === 'assignments')
    || (workspace.user.role === 'admin' && activeModule === 'class-operations');

  return (
    <AppLayout
      user={workspace.user}
      menu={menu}
      activeModule={activeModule}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
      onModuleChange={handleModuleChange}
      onLogout={workspace.logout}
      theme={theme}
      onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      notifications={workspace.notifications}
      onMarkNotificationRead={workspace.markNotificationRead}
      onMarkAllNotificationsRead={workspace.markAllNotificationsRead}
      classes={workspace.classes}
      selectedClassId={workspace.selectedClassId}
      studentClassesView={studentClassesView}
      teacherClassesView={teacherClassesView}
      onOpenStudentTodo={openStudentTodo}
      onOpenStudentClass={openStudentClass}
      onOpenTeacherReview={openTeacherReview}
      onOpenTeacherClass={openTeacherClass}
    >
      {!hidePageTitle && <PageTitle role={workspace.user.role} activeModule={activeModule} />}
      {workspace.message && (
        <div className={`mb-4 flex items-center justify-between rounded-xl border p-3 text-sm transition ${workspace.message.toLowerCase().includes('lỗi')
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
          : 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200'
          }`} role="status">
          <span>{workspace.message}</span>
          <button
            type="button"
            onClick={() => workspace.setMessage('')}
            className="ml-3 font-bold text-xs hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}
      {activeModule === 'dashboard' && (workspace.user.role === 'owner'
        ? <OwnerOverview user={workspace.user} />
        : <Dashboard user={workspace.user} summary={workspace.summary} classes={workspace.classes} onNavigate={handleModuleChange} />
      )}
      {activeModule === 'classes' && (
        <Classes
          classes={workspace.classes}
          selectedClassId={workspace.selectedClassId}
          setSelectedClassId={workspace.setSelectedClassId}
          detail={workspace.classDetail}
          users={workspace.users}
          user={workspace.user}
          userRole={workspace.user.role}
          onOpenModule={handleModuleChange}
          studentView={studentClassesView}
          teacherView={teacherClassesView}
          createClass={workspace.createClass}
          deleteClass={workspace.deleteClass}
          updateClass={workspace.updateClass}
        />
      )}
      {activeModule === 'accounts' && workspace.user.role === 'admin' && (
        <Accounts
          user={workspace.user}
          userRole={workspace.user.role}
          users={workspace.users}
          classes={workspace.classes}
          selectedClassId={workspace.selectedClassId}
          setSelectedClassId={workspace.setSelectedClassId}
          classDetail={workspace.classDetail}
          createClass={workspace.createClass}
          deleteClass={workspace.deleteClass}
          updateClass={workspace.updateClass}
          studentForm={workspace.studentForm}
          setStudentForm={workspace.setStudentForm}
          createStudent={workspace.createStudent}
          teacherForm={workspace.teacherForm}
          setTeacherForm={workspace.setTeacherForm}
          createTeacher={workspace.createTeacher}
          importUsersCsv={workspace.importUsersCsv}
          deleteUser={workspace.deleteUser}
          deleteUsersBulk={workspace.deleteUsersBulk}
          updateUser={workspace.updateUser}
          changeUserClass={workspace.changeUserClass}
        />
      )}
      {activeModule === 'students' && workspace.user.role !== 'owner' && <Students userRole={workspace.user.role} users={workspace.users} classes={workspace.classes} studentForm={workspace.studentForm} setStudentForm={workspace.setStudentForm} createStudent={workspace.createStudent} importUsersCsv={workspace.importUsersCsv} deleteUser={workspace.deleteUser} deleteUsersBulk={workspace.deleteUsersBulk} updateUser={workspace.updateUser} changeUserClass={workspace.user.role === 'admin' ? workspace.changeUserClass : undefined} />}
      {activeModule === 'teachers' && workspace.user.role !== 'owner' && <Teachers userRole={workspace.user.role} users={workspace.users} classes={workspace.classes} updateClass={workspace.updateClass} teacherForm={workspace.teacherForm} setTeacherForm={workspace.setTeacherForm} createTeacher={workspace.createTeacher} importUsersCsv={workspace.importUsersCsv} deleteUser={workspace.deleteUser} deleteUsersBulk={workspace.deleteUsersBulk} updateUser={workspace.updateUser} changeUserClass={workspace.user.role === 'admin' ? workspace.changeUserClass : undefined} />}
      {activeModule === 'assignments' && workspace.user.role === 'admin' && (
        <TeacherClasses
          classes={workspace.classes}
          selectedClassId={workspace.selectedClassId}
          setSelectedClassId={workspace.setSelectedClassId}
          detail={workspace.classDetail}
          teacherView="class"
          initialTab="assignments"
          user={workspace.user}
          onNavigate={handleModuleChange}
        />
      )}
      {activeModule === 'timeline' && workspace.user.role !== 'admin' && workspace.user.role !== 'owner' && (
        <ClassTimelineView
          user={workspace.user}
          classes={workspace.classes}
          selectedClassId={workspace.selectedClassId}
          setSelectedClassId={workspace.setSelectedClassId}
        />
      )}
      {activeModule === 'class-operations' && workspace.user.role === 'admin' && (
        <AdminClassOperations
          user={workspace.user}
          classes={workspace.classes}
          selectedClassId={workspace.selectedClassId}
          setSelectedClassId={workspace.setSelectedClassId}
          detail={workspace.classDetail}
        />
      )}
      {activeModule === 'attendance' && (
        <AttendancePanel
          user={workspace.user}
          classes={workspace.classes}
          selectedClassId={workspace.selectedClassId}
          setSelectedClassId={workspace.setSelectedClassId}
        />
      )}
      {activeModule === 'materials' && (
        <MaterialsView
          user={workspace.user}
          classes={workspace.classes}
          selectedClassId={workspace.selectedClassId}
          setSelectedClassId={workspace.setSelectedClassId}
        />
      )}
      {activeModule === 'tests' && workspace.user.role === 'student' && (
        <OnlineExamsMain
          user={workspace.user}
          classes={workspace.classes}
          selectedClassId={workspace.selectedClassId}
        />
      )}
      {activeModule === 'notifications' && (
        <NotificationsView
          user={workspace.user}
          classes={workspace.classes}
          selectedClassId={workspace.selectedClassId}
        />
      )}
      {activeModule === 'schedule' && (
        <ScheduleView
          classes={workspace.classes}
          adjustments={workspace.adjustments}
          userRole={workspace.user.role}
          createAdjustment={workspace.createScheduleAdjustment}
          deleteAdjustment={workspace.deleteScheduleAdjustment}
          onOpenModule={handleModuleChange}
        />
      )}
      {activeModule === 'tuition' && workspace.user.role === 'student' && <TuitionList tuitions={workspace.tuitions} user={workspace.user} />}
      {activeModule === 'finance' && workspace.user.role === 'owner' && <Reports section="finance" user={workspace.user} classes={workspace.classes} tuitions={workspace.tuitions} />}
      {activeModule === 'service-quality' && workspace.user.role === 'owner' && <Reports section="service" user={workspace.user} classes={workspace.classes} tuitions={workspace.tuitions} />}
      {activeModule === 'data-analytics' && workspace.user.role === 'owner' && <DataAnalytics user={workspace.user} />}
      {activeModule === 'teaching-report' && workspace.user.role === 'owner' && <TeachingReport user={workspace.user} />}
      {activeModule === 'class-report' && workspace.user.role === 'owner' && <ClassReport user={workspace.user} />}
      {activeModule === 'feedbacks' && <FeedbackView user={workspace.user} />}
      {activeModule === 'library' && workspace.user.role !== 'owner' && <OnlineLibraryView classes={workspace.classes} user={workspace.user} />}
      {activeModule === 'requests' && workspace.user.role === 'admin' && <PasswordResetRequestsView user={workspace.user} />}

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectModule={handleModuleChange}
        classes={workspace.classes}
        onSelectClass={workspace.setSelectedClassId}
        user={workspace.user}
      />
    </AppLayout>
  );
}

export default App;
