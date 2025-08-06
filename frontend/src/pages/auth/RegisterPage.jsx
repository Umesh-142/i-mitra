import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    zone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { register, loading } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const zones = [
    'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6'
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
    
    if (!formData.name.trim()) {
      newErrors.name = language === 'hi' ? 'नाम आवश्यक है' : 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = language === 'hi' ? 'नाम कम से कम 2 अक्षर का होना चाहिए' : 'Name must be at least 2 characters';
    }
    
    if (!formData.email) {
      newErrors.email = language === 'hi' ? 'ईमेल आवश्यक है' : 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = language === 'hi' ? 'वैध ईमेल दर्ज करें' : 'Please enter a valid email';
    }
    
    if (!formData.phone) {
      newErrors.phone = language === 'hi' ? 'फोन नंबर आवश्यक है' : 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = language === 'hi' ? 'वैध 10 अंकों का फोन नंबर दर्ज करें' : 'Please enter a valid 10-digit phone number';
    }
    
    if (!formData.password) {
      newErrors.password = language === 'hi' ? 'पासवर्ड आवश्यक है' : 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = language === 'hi' ? 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए' : 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = language === 'hi' ? 'पासवर्ड पुष्टि आवश्यक है' : 'Password confirmation is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = language === 'hi' ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = language === 'hi' ? 'पता आवश्यक है' : 'Address is required';
    }
    
    if (!formData.zone) {
      newErrors.zone = language === 'hi' ? 'जोन चुनना आवश्यक है' : 'Zone selection is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const userData = {
      name: formData.name.trim(),
      email: formData.email.toLowerCase(),
      phone: formData.phone,
      password: formData.password,
      role: 'citizen',
      address: formData.address.trim(),
      zone: formData.zone
    };

    const result = await register(userData);
    
    if (result.success) {
      navigate('/dashboard');
    }
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
            {language === 'hi' ? 'नया खाता बनाएं' : 'Create Account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {language === 'hi' ? 'i-Mitra में शामिल हों' : 'Join i-Mitra'}
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
          {/* Registration Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {language === 'hi' ? 'पूरा नाम' : 'Full Name'}
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={`form-input ${errors.name ? 'form-input-error' : ''}`}
                  placeholder={language === 'hi' ? 'आपका पूरा नाम दर्ज करें' : 'Enter your full name'}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {language === 'hi' ? 'ईमेल पता' : 'Email Address'}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
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

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                {language === 'hi' ? 'फोन नंबर' : 'Phone Number'}
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`form-input ${errors.phone ? 'form-input-error' : ''}`}
                  placeholder={language === 'hi' ? '10 अंकों का फोन नंबर' : '10-digit phone number'}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {language === 'hi' ? 'पासवर्ड' : 'Password'}
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input pr-10 ${errors.password ? 'form-input-error' : ''}`}
                  placeholder={language === 'hi' ? 'कम से कम 6 अक्षर' : 'At least 6 characters'}
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {language === 'hi' ? 'पासवर्ड की पुष्टि करें' : 'Confirm Password'}
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`form-input pr-10 ${errors.confirmPassword ? 'form-input-error' : ''}`}
                  placeholder={language === 'hi' ? 'पासवर्ड दोबारा दर्ज करें' : 'Re-enter password'}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                {language === 'hi' ? 'पूरा पता' : 'Full Address'}
              </label>
              <div className="mt-1">
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  value={formData.address}
                  onChange={handleChange}
                  className={`form-input ${errors.address ? 'form-input-error' : ''}`}
                  placeholder={language === 'hi' ? 'आपका पूरा पता दर्ज करें' : 'Enter your complete address'}
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                )}
              </div>
            </div>

            {/* Zone */}
            <div>
              <label htmlFor="zone" className="block text-sm font-medium text-gray-700">
                {language === 'hi' ? 'जोन' : 'Zone'}
              </label>
              <div className="mt-1">
                <select
                  id="zone"
                  name="zone"
                  value={formData.zone}
                  onChange={handleChange}
                  className={`form-input ${errors.zone ? 'form-input-error' : ''}`}
                >
                  <option value="">
                    {language === 'hi' ? 'जोन चुनें' : 'Select Zone'}
                  </option>
                  {zones.map(zone => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
                {errors.zone && (
                  <p className="mt-1 text-sm text-red-600">{errors.zone}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full flex justify-center py-3"
              >
                {loading ? (
                  <div className="spinner h-5 w-5"></div>
                ) : (
                  language === 'hi' ? 'खाता बनाएं' : 'Create Account'
                )}
              </button>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {language === 'hi' ? 'पहले से खाता है?' : 'Already have an account?'}{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                {language === 'hi' ? 'लॉग इन करें' : 'Sign in'}
              </Link>
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-4 text-center">
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

export default RegisterPage;