import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'react-hot-toast';

// Contexts
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';

// Components
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorFallback from './components/common/ErrorFallback';

// Lazy loaded pages for better performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Dashboard pages
const CitizenDashboard = lazy(() => import('./pages/dashboard/CitizenDashboard'));
const OfficerDashboard = lazy(() => import('./pages/dashboard/OfficerDashboard'));
const MitraDashboard = lazy(() => import('./pages/dashboard/MitraDashboard'));
const AdminDashboard = lazy(() => import('./pages/dashboard/AdminDashboard'));

// Feature pages
const ComplaintForm = lazy(() => import('./pages/complaints/ComplaintForm'));
const ComplaintDetails = lazy(() => import('./pages/complaints/ComplaintDetails'));
const ComplaintsList = lazy(() => import('./pages/complaints/ComplaintsList'));
const ManageComplaints = lazy(() => import('./pages/complaints/ManageComplaints'));
const FieldWork = lazy(() => import('./pages/field/FieldWork'));
const Analytics = lazy(() => import('./pages/analytics/Analytics'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const Settings = lazy(() => import('./pages/settings/Settings'));

// Error pages
const NotFoundPage = lazy(() => import('./pages/error/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('./pages/error/UnauthorizedPage'));

/**
 * Protected Route Component
 */
const ProtectedRoute = ({ children, allowedRoles = [], requireAuth = true }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

/**
 * Public Route Component (redirect if already authenticated)
 */
const PublicRoute = ({ children, redirectTo = null }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (user && redirectTo) {
    // Redirect based on user role
    const roleRedirects = {
      citizen: '/dashboard',
      officer: '/manage-complaints',
      mitra: '/field-work',
      admin: '/admin'
    };
    
    const defaultRedirect = roleRedirects[user.role] || '/dashboard';
    return <Navigate to={redirectTo === 'auto' ? defaultRedirect : redirectTo} replace />;
  }

  return children;
};

/**
 * Route Error Boundary
 */
const RouteErrorBoundary = ({ children }) => (
  <ErrorBoundary
    FallbackComponent={ErrorFallback}
    onError={(error, errorInfo) => {
      console.error('Route Error:', error, errorInfo);
      // You can send error to logging service here
    }}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Suspense Wrapper with Loading
 */
const SuspenseWrapper = ({ children, fallback = null }) => (
  <Suspense
    fallback={
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading page..." />
        </div>
      )
    }
  >
    {children}
  </Suspense>
);

/**
 * Main App Component
 */
function App() {
  const { language } = useLanguage();

  return (
    <div className={`app ${language === 'hi' ? 'font-hindi' : 'font-english'}`}>
      <RouteErrorBoundary>
        <SuspenseWrapper>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/"
              element={
                <PublicRoute redirectTo="auto">
                  <LandingPage />
                </PublicRoute>
              }
            />
            
            <Route
              path="/login"
              element={
                <PublicRoute redirectTo="auto">
                  <LoginPage />
                </PublicRoute>
              }
            />
            
            <Route
              path="/register"
              element={
                <PublicRoute redirectTo="auto">
                  <RegisterPage />
                </PublicRoute>
              }
            />
            
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPasswordPage />
                </PublicRoute>
              }
            />
            
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ResetPasswordPage />
                </PublicRoute>
              }
            />

            {/* Protected Routes - All Users */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Citizen Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <CitizenDashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/complaints/new"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <ComplaintForm />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/complaints"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <ComplaintsList />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/complaints/:id"
              element={
                <ProtectedRoute allowedRoles={['citizen', 'officer', 'mitra', 'admin']}>
                  <ComplaintDetails />
                </ProtectedRoute>
              }
            />

            {/* Officer Routes */}
            <Route
              path="/manage-complaints"
              element={
                <ProtectedRoute allowedRoles={['officer']}>
                  <OfficerDashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/manage-complaints/:id"
              element={
                <ProtectedRoute allowedRoles={['officer']}>
                  <ManageComplaints />
                </ProtectedRoute>
              }
            />

            {/* Mitra Routes */}
            <Route
              path="/field-work"
              element={
                <ProtectedRoute allowedRoles={['mitra']}>
                  <MitraDashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/field-work/:id"
              element={
                <ProtectedRoute allowedRoles={['mitra']}>
                  <FieldWork />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ManageComplaints />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Analytics />
                </ProtectedRoute>
              }
            />

            {/* Analytics Routes (Officer & Admin) */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={['officer', 'admin']}>
                  <Analytics />
                </ProtectedRoute>
              }
            />

            {/* Error Routes */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </SuspenseWrapper>
      </RouteErrorBoundary>

      {/* Global Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
          loading: {
            duration: Infinity,
          },
        }}
      />
    </div>
  );
}

export default App;