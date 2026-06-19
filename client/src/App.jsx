import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';

// Components & Shell Layout
import Layout from './components/Layout.jsx';

// General Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import BookDetail from './pages/BookDetail.jsx';

// Student Pages
import StudentHistory from './pages/student/History.jsx';
import StudentWishlist from './pages/student/Wishlist.jsx';
import StudentReservations from './pages/student/Reservations.jsx';

// Librarian Pages
import LibrarianBooks from './pages/librarian/Books.jsx';
import LibrarianIssue from './pages/librarian/Issue.jsx';
import LibrarianReservations from './pages/librarian/Reservations.jsx';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminUsers from './pages/admin/Users.jsx';
import AdminReports from './pages/admin/Reports.jsx';
import AdminLogs from './pages/admin/Logs.jsx';

// Guard for role-based routes
const RoleGuard = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <Router>
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Shell Layout Wrapped Routes */}
                <Route path="/" element={<Layout />}>
                  {/* General Shared Access: Catalog & Details */}
                  <Route index element={<Home />} />
                  <Route path="books/:id" element={<BookDetail />} />

                  {/* Student Routes */}
                  <Route 
                    path="history" 
                    element={
                      <RoleGuard allowedRoles={['student']}><StudentHistory /></RoleGuard>
                    } 
                  />
                  <Route 
                    path="wishlist" 
                    element={
                      <RoleGuard allowedRoles={['student']}><StudentWishlist /></RoleGuard>
                    } 
                  />
                  <Route 
                    path="reservations" 
                    element={
                      <RoleGuard allowedRoles={['student']}><StudentReservations /></RoleGuard>
                    } 
                  />

                  {/* Librarian Routes */}
                  <Route 
                    path="librarian/books" 
                    element={
                      <RoleGuard allowedRoles={['librarian']}><LibrarianBooks /></RoleGuard>
                    } 
                  />
                  <Route 
                    path="librarian/issue" 
                    element={
                      <RoleGuard allowedRoles={['librarian']}><LibrarianIssue /></RoleGuard>
                    } 
                  />
                  <Route 
                    path="librarian/reservations" 
                    element={
                      <RoleGuard allowedRoles={['librarian']}><LibrarianReservations /></RoleGuard>
                    } 
                  />

                  {/* Admin Routes */}
                  <Route 
                    path="admin" 
                    element={
                      <RoleGuard allowedRoles={['admin']}><AdminDashboard /></RoleGuard>
                    } 
                  />
                  <Route 
                    path="admin/users" 
                    element={
                      <RoleGuard allowedRoles={['admin']}><AdminUsers /></RoleGuard>
                    } 
                  />
                  <Route 
                    path="admin/reports" 
                    element={
                      <RoleGuard allowedRoles={['admin']}><AdminReports /></RoleGuard>
                    } 
                  />
                  <Route 
                    path="admin/logs" 
                    element={
                      <RoleGuard allowedRoles={['admin']}><AdminLogs /></RoleGuard>
                    } 
                  />
                </Route>

                {/* Fallback Route */}
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
