import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { login, loading } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const demoCredentials = [
    {
      role: language === 'hi' ? 'नागरिक' : 'Citizen',
      email: 'rajesh.kumar@gmail.com',
      password: 'citizen123',
      color: 'blue'
    },
    {
      role: language === 'hi' ? 'अधिकारी' : 'Officer',
      email: 'suresh.gupta@pwd.gov.in',
      password: 'officer123',
      color: 'green'
    },
    {
      role: language === 'hi' ? 'मित्र' : 'Mitra',
      email: 'ramesh.yadav@pwd.gov.in',
      password: 'mitra123',
      color: 'orange'
    },
    {
      role: language === 'hi' ? 'प्रशासक' : 'Admin',
      email: 'admin@imitra.gov.in',
      password: 'admin123',
      color: 'purple'
    }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = language === 'hi' ? 'ईमेल आवश्यक है' : 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = language === 'hi' ? 'वैध ईमेल दर्ज करें' : 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = language === 'hi' ? 'पासवर्ड आवश्यक है' : 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = language === 'hi' ? 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए' : 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleDemoLogin = (credentials) => {
    setFormData({
      email: credentials.email,
      password: credentials.password
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">i</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 font-display">
            i-Mitra
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {language === 'hi' ? 'इंदौर स्मार्ट सिटी' : 'Indore Smart City'}
          </p>
        </div>

        {/* Language Toggle */}
        <div className="flex justify-center mt-4">
          <button
            onClick={toggleLanguage}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            {language === 'hi' ? 'English' : 'हिंदी'}
          </button>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {language === 'hi' ? 'ईमेल पता' : 'Email address'}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                  placeholder={language === 'hi' ? 'आपका ईमेल दर्ज करें' : 'Enter your email'}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {language === 'hi' ? 'पासवर्ड' : 'Password'}
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input pr-10 ${errors.password ? 'form-input-error' : ''}`}
                  placeholder={language === 'hi' ? 'आपका पासवर्ड दर्ज करें' : 'Enter your password'}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  to="/register"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  {language === 'hi' ? 'नया खाता बनाएं' : 'Create new account'}
                </Link>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                  {language === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot password?'}
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full flex justify-center py-3"
              >
                {loading ? (
                  <div className="spinner h-5 w-5"></div>
                ) : (
                  language === 'hi' ? 'लॉग इन करें' : 'Sign in'
                )}
              </button>
            </div>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {language === 'hi' ? 'डेमो खाते' : 'Demo Accounts'}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {demoCredentials.map((cred, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDemoLogin(cred)}
                  className={`w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors`}
                >
                  <div className="text-center">
                    <div className={`w-3 h-3 bg-${cred.color}-500 rounded-full mx-auto mb-1`}></div>
                    <span className="text-xs">{cred.role}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 text-center mb-2">
                {language === 'hi' ? 'त्वरित परीक्षण के लिए डेमो बटन पर क्लिक करें' : 'Click demo buttons for quick testing'}
              </p>
              <div className="text-xs text-gray-600 space-y-1">
                {demoCredentials.slice(0, 2).map((cred, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{cred.role}:</span>
                    <span className="font-mono">{cred.email}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← {language === 'hi' ? 'होम पेज पर वापस जाएं' : 'Back to homepage'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;