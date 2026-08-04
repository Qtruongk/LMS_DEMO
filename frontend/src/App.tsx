import { useEffect, useState } from 'react';
import { AuthLanding } from './features/auth/components/AuthLanding';
import { AttendancePanel } from './features/classes/components/AttendancePanel';
import { ClassTimelineView } from './features/classes/components/ClassTimelineView';
import { Classes } from './features/classes/components/Classes';
import { OnlineExamsMain } from './features/exams/components/OnlineExamsMain';
import { MaterialsView } from './features/materials/components/MaterialsView';
import { ScheduleView } from './features/classes/components/ScheduleView';
import { Dashboard } from './features/dashboard/components/Dashboard';
import { Students, Teachers } from './features/people/components/People';
import { FeedbackView } from './features/feedbacks/components/FeedbackView';
import { OnlineLibraryView } from './features/materials/components/OnlineLibraryView';
import { NotificationsView } from './features/notifications/components/NotificationsView';
import { TuitionList } from './features/tuitions/components/TuitionList';
import { Reports } from './features/reports/components/Reports';
import { useLmsWorkspace } from './hooks/useLmsWorkspace';
import { useTheme } from './hooks/useTheme';
import { AppLayout, PageTitle } from './layouts/AppLayout';
import { CommandPalette } from './components/shared/CommandPalette';

function App() {
  const workspace = useLmsWorkspace();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [showLogin, setShowLogin] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('vat_sidebar') === 'collapsed');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    localStorage.setItem('vat_sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
  }, [sidebarCollapsed]);

  if (!workspace.user) {
    return (
      <AuthLanding
        showLogin={showLogin}
        message={workspace.message}
        loginForm={workspace.loginForm}
        setShowLogin={setShowLogin}
        setLoginForm={workspace.setLoginForm}
        onLogin={async (event) => {
          const loggedIn = await workspace.handleLogin(event);
          setShowLogin(!loggedIn);
        }}
      />
    );
  }

  const menu = workspace.user.role === 'student'
    ? ['dashboard', 'classes', 'timeline', 'attendance', 'materials', 'library', 'tests', 'results', 'notifications', 'schedule', 'tuition', 'feedbacks']
    : workspace.user.role === 'teacher'
      ? ['dashboard', 'classes', 'students', 'timeline', 'attendance', 'materials', 'library', 'tests', 'notifications', 'schedule', 'feedbacks']
      : ['dashboard', 'classes', 'teachers', 'students', 'timeline', 'schedule', 'tuition', 'reports', 'feedbacks', 'library'];

  return (
    <AppLayout
      user={workspace.user}
      menu={menu}
      activeModule={activeModule}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
      onModuleChange={setActiveModule}
      onLogout={workspace.logout}
      theme={theme}
      onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <PageTitle role={workspace.user.role} activeModule={activeModule} />
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
      {activeModule === 'dashboard' && <Dashboard user={workspace.user} summary={workspace.summary} classes={workspace.classes} onNavigate={setActiveModule} />}
      {activeModule === 'classes' && (
        <Classes
          classes={workspace.classes}
          selectedClassId={workspace.selectedClassId}
          setSelectedClassId={workspace.setSelectedClassId}
          detail={workspace.classDetail}
          users={workspace.users}
          userRole={workspace.user.role}
          createClass={workspace.createClass}
          deleteClass={workspace.deleteClass}
          updateClass={workspace.updateClass}
        />
      )}
      {activeModule === 'students' && <Students userRole={workspace.user.role} users={workspace.users} studentForm={workspace.studentForm} setStudentForm={workspace.setStudentForm} createStudent={workspace.createStudent} importUsersCsv={workspace.importUsersCsv} />}
      {activeModule === 'teachers' && <Teachers users={workspace.users} teacherForm={workspace.teacherForm} setTeacherForm={workspace.setTeacherForm} createTeacher={workspace.createTeacher} importUsersCsv={workspace.importUsersCsv} />}
      {activeModule === 'timeline' && (
        <ClassTimelineView
          user={workspace.user}
          classes={workspace.classes}
          selectedClassId={workspace.selectedClassId}
          setSelectedClassId={workspace.setSelectedClassId}
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
      {activeModule === 'tests' && <OnlineExamsMain user={workspace.user} classes={workspace.classes} />}
      {activeModule === 'results' && <OnlineExamsMain user={workspace.user} classes={workspace.classes} initialTab="results" hideStudentHeader />}
      {activeModule === 'notifications' && <NotificationsView user={workspace.user} classes={workspace.classes} />}
      {activeModule === 'schedule' && (
        <ScheduleView
          classes={workspace.classes}
          adjustments={workspace.adjustments}
          userRole={workspace.user.role}
          createAdjustment={workspace.createScheduleAdjustment}
          deleteAdjustment={workspace.deleteScheduleAdjustment}
        />
      )}
      {activeModule === 'tuition' && <TuitionList tuitions={workspace.tuitions} user={workspace.user} />}
      {activeModule === 'reports' && <Reports classes={workspace.classes} tuitions={workspace.tuitions} />}
      {activeModule === 'feedbacks' && <FeedbackView user={workspace.user} />}
      {activeModule === 'library' && <OnlineLibraryView />}

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectModule={setActiveModule}
        classes={workspace.classes}
        onSelectClass={workspace.setSelectedClassId}
      />
    </AppLayout>
  );
}

export default App;
