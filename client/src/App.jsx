import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import RolePickerModal from './components/RolePickerModal.jsx';

// Shell
import Layout from './components/Layout.jsx';

// Pages
import Login       from './pages/Login.jsx';
import Register    from './pages/Register.jsx';
import Home        from './pages/Home.jsx';
import BookDetail  from './pages/BookDetail.jsx';
import Profile     from './pages/Profile.jsx';

import StudentHistory      from './pages/student/History.jsx';
import StudentWishlist     from './pages/student/Wishlist.jsx';
import StudentReservations from './pages/student/Reservations.jsx';
import StudentLibraryCard  from './pages/student/LibraryCard.jsx';
import StudentExamPapers   from './pages/student/ExamPapers.jsx';

import LibrarianBooks        from './pages/librarian/Books.jsx';
import LibrarianIssue        from './pages/librarian/Issue.jsx';
import LibrarianReservations from './pages/librarian/Reservations.jsx';
import LibrarianExamPapers   from './pages/librarian/ExamPaperUpload.jsx';

import AdminDashboard     from './pages/admin/Dashboard.jsx';
import AdminUsers         from './pages/admin/Users.jsx';
import AdminReports       from './pages/admin/Reports.jsx';
import AdminLogs          from './pages/admin/Logs.jsx';
import AdminAnnouncements from './pages/admin/Announcements.jsx';

// ─── Guards ────────────────────────────────────────────────────────────────
const RoleGuard = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

/**
 * After Clerk completes sign-in, the user lands on "/" but we want to
 * redirect them based on their role. This component watches the auth
 * state and does the redirect once the user is loaded.
 */
const ClerkPostLoginRedirect = () => {
  const { user, loading, isClerk } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isClerk || loading || !user) return;
    const role = user.role;
    if (role === 'admin')          navigate('/admin/dashboard',     { replace: true });
    else if (role === 'librarian') navigate('/librarian/dashboard', { replace: true });
    else if (role === 'teacher')   navigate('/teacher/dashboard',   { replace: true });
    else if (role === 'student')   navigate('/student/dashboard',   { replace: true });
  }, [user, loading, isClerk]);

  return null;
};
// ──────────────────────────────────────────────────────────────────────────

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            {/* Role picker overlay — shown to srujanhariwal464@gmail.com */}
            <RolePickerModal />

            <Router>
              {/* Handles post-Clerk-login role-based redirect */}
              <ClerkPostLoginRedirect />

              <Routes>
                {/* Public */}
                <Route path="/login"    element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected shell routes */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="student/dashboard" element={
                    <RoleGuard allowedRoles={['student']}><Home /></RoleGuard>
                  } />
                  <Route path="teacher/dashboard" element={
                    <RoleGuard allowedRoles={['teacher']}><Home /></RoleGuard>
                  } />
                  <Route path="books/:id" element={<BookDetail />} />

                  <Route path="profile" element={
                    <RoleGuard allowedRoles={['student','teacher','librarian','admin']}>
                      <Profile />
                    </RoleGuard>
                  } />

                  {/* Student / Teacher */}
                  <Route path="history" element={
                    <RoleGuard allowedRoles={['student','teacher']}><StudentHistory /></RoleGuard>
                  } />
                  <Route path="wishlist" element={
                    <RoleGuard allowedRoles={['student','teacher']}><StudentWishlist /></RoleGuard>
                  } />
                  <Route path="reservations" element={
                    <RoleGuard allowedRoles={['student','teacher']}><StudentReservations /></RoleGuard>
                  } />
                  <Route path="student/library-card" element={
                    <RoleGuard allowedRoles={['student','teacher']}><StudentLibraryCard /></RoleGuard>
                  } />
                  <Route path="student/papers" element={
                    <RoleGuard allowedRoles={['student','teacher']}><StudentExamPapers /></RoleGuard>
                  } />

                  {/* Librarian */}
                  <Route path="librarian/books" element={
                    <RoleGuard allowedRoles={['librarian']}><LibrarianBooks /></RoleGuard>
                  } />
                  <Route path="librarian/dashboard" element={
                    <RoleGuard allowedRoles={['librarian']}><LibrarianBooks /></RoleGuard>
                  } />
                  <Route path="librarian/issue" element={
                    <RoleGuard allowedRoles={['librarian']}><LibrarianIssue /></RoleGuard>
                  } />
                  <Route path="librarian/reservations" element={
                    <RoleGuard allowedRoles={['librarian']}><LibrarianReservations /></RoleGuard>
                  } />
                  <Route path="librarian/exam-papers" element={
                    <RoleGuard allowedRoles={['librarian']}><LibrarianExamPapers /></RoleGuard>
                  } />

                  {/* Admin */}
                  <Route path="admin" element={
                    <RoleGuard allowedRoles={['admin']}><AdminDashboard /></RoleGuard>
                  } />
                  <Route path="admin/dashboard" element={
                    <RoleGuard allowedRoles={['admin']}><AdminDashboard /></RoleGuard>
                  } />
                  <Route path="admin/users" element={
                    <RoleGuard allowedRoles={['admin']}><AdminUsers /></RoleGuard>
                  } />
                  <Route path="admin/reports" element={
                    <RoleGuard allowedRoles={['admin']}><AdminReports /></RoleGuard>
                  } />
                  <Route path="admin/logs" element={
                    <RoleGuard allowedRoles={['admin']}><AdminLogs /></RoleGuard>
                  } />
                  <Route path="admin/announcements" element={
                    <RoleGuard allowedRoles={['admin']}><AdminAnnouncements /></RoleGuard>
                  } />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
