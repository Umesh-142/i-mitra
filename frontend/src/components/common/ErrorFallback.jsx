import React from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Error Fallback Component
 * Displays when React Error Boundaries catch errors
 */
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  const navigate = useNavigate();

  const handleRetry = () => {
    // Clear any cached data if needed
    if (window.location.pathname !== '/') {
      window.location.reload();
    } else {
      resetErrorBoundary();
    }
  };

  const handleGoHome = () => {
    navigate('/');
    resetErrorBoundary();
  };

  const handleGoBack = () => {
    navigate(-1);
    resetErrorBoundary();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          {/* Error Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-sm text-gray-600">
              We encountered an unexpected error. Don't worry, it's not your fault.
            </p>
          </div>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-6">
              <details className="bg-gray-50 rounded-md p-3">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                  Error Details (Development)
                </summary>
                <div className="mt-2 text-xs text-gray-600 font-mono bg-white p-2 rounded border overflow-auto max-h-32">
                  <div className="text-red-600 font-semibold mb-1">
                    {error.name}: {error.message}
                  </div>
                  <pre className="whitespace-pre-wrap text-xs">
                    {error.stack}
                  </pre>
                </div>
              </details>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Retry Button */}
            <button
              onClick={handleRetry}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>

            {/* Navigation Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleGoBack}
                className="flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </button>
              
              <button
                onClick={handleGoHome}
                className="flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </button>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              If this problem persists, please contact support at{' '}
              <a 
                href="mailto:support@imitra.gov.in" 
                className="text-primary-600 hover:text-primary-500"
              >
                support@imitra.gov.in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;