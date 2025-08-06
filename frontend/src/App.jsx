import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';

// Components
import LoadingSpinner from './components/common/LoadingSpinner';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Protected route component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

// Public route component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  const { language } = useLanguage();

  return (
    <div className={`min-h-screen bg-gray-50 ${language === 'hi' ? 'font-hindi' : ''}`}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <div className="p-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to i-Mitra Dashboard
                </h1>
                <p className="text-gray-600">
                  This is a placeholder for the dashboard. The full dashboard implementation 
                  would include role-based views for Citizens, Officers, Mitra, and Admins.
                </p>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Citizen Routes */}
        <Route 
          path="/complaints" 
          element={
            <ProtectedRoute allowedRoles={['citizen']}>
              <div className="p-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  My Complaints
                </h1>
                <p className="text-gray-600">
                  Citizen complaints view would be implemented here.
                </p>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Officer Routes */}
        <Route 
          path="/manage-complaints" 
          element={
            <ProtectedRoute allowedRoles={['officer', 'admin']}>
              <div className="p-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Manage Complaints
                </h1>
                <p className="text-gray-600">
                  Officer complaint management view would be implemented here.
                </p>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Mitra Routes */}
        <Route 
          path="/field-work" 
          element={
            <ProtectedRoute allowedRoles={['mitra']}>
              <div className="p-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Field Work
                </h1>
                <p className="text-gray-600">
                  Mitra field work view would be implemented here.
                </p>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <div className="p-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Admin Panel
                </h1>
                <p className="text-gray-600">
                  Admin panel would be implemented here.
                </p>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Analytics Routes */}
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute allowedRoles={['officer', 'admin']}>
              <div className="p-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Analytics
                </h1>
                <p className="text-gray-600">
                  Analytics dashboard would be implemented here.
                </p>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Error Routes */}
        <Route 
          path="/unauthorized" 
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Unauthorized Access</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don't have permission to access this page.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => window.history.back()}
                      className="btn btn-primary"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              </div>
            </div>
          } 
        />
        
        {/* 404 Route */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                    <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Page Not Found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    The page you're looking for doesn't exist.
                  </p>
                  <div className="mt-6">
                    <a href="/" className="btn btn-primary">
                      Go Home
                    </a>
                  </div>
                </div>
              </div>
            </div>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;