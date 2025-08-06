import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  ShieldCheckIcon, 
  ClockIcon, 
  MapPinIcon, 
  ChartBarIcon,
  UserGroupIcon,
  CogIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const LandingPage = () => {
  const { language, toggleLanguage, t } = useLanguage();

  const features = [
    {
      icon: ShieldCheckIcon,
      title: language === 'hi' ? 'AI-संचालित वर्गीकरण' : 'AI-Powered Classification',
      description: language === 'hi' 
        ? 'शिकायतों को स्वचालित रूप से सही विभाग में भेजा जाता है'
        : 'Complaints are automatically routed to the correct department'
    },
    {
      icon: ClockIcon,
      title: language === 'hi' ? 'SLA प्रबंधन' : 'SLA Management',
      description: language === 'hi'
        ? 'रियल-टाइम ट्रैकिंग और समय सीमा निगरानी'
        : 'Real-time tracking and deadline monitoring'
    },
    {
      icon: MapPinIcon,
      title: language === 'hi' ? 'स्थान-आधारित सेवा' : 'Location-Based Service',
      description: language === 'hi'
        ? 'GPS के साथ सटीक स्थान और क्षेत्र-वार विश्लेषण'
        : 'Precise location with GPS and zone-wise analytics'
    },
    {
      icon: ChartBarIcon,
      title: language === 'hi' ? 'विश्लेषण और रिपोर्ट' : 'Analytics & Reports',
      description: language === 'hi'
        ? 'व्यापक डैशबोर्ड और प्रदर्शन मेट्रिक्स'
        : 'Comprehensive dashboards and performance metrics'
    },
    {
      icon: UserGroupIcon,
      title: language === 'hi' ? 'बहु-भूमिका प्रणाली' : 'Multi-Role System',
      description: language === 'hi'
        ? 'नागरिक, अधिकारी, मित्र और प्रशासक के लिए अलग डैशबोर्ड'
        : 'Separate dashboards for Citizens, Officers, Mitra, and Admins'
    },
    {
      icon: GlobeAltIcon,
      title: language === 'hi' ? 'द्विभाषी समर्थन' : 'Bilingual Support',
      description: language === 'hi'
        ? 'हिंदी और अंग्रेजी दोनों भाषाओं में उपलब्ध'
        : 'Available in both Hindi and English languages'
    }
  ];

  const loginOptions = [
    {
      role: 'citizen',
      title: language === 'hi' ? 'नागरिक लॉगिन' : 'Citizen Login',
      description: language === 'hi' ? 'शिकायत दर्ज करें और ट्रैक करें' : 'File and track complaints',
      color: 'blue',
      credentials: 'rajesh.kumar@gmail.com / citizen123'
    },
    {
      role: 'officer',
      title: language === 'hi' ? 'अधिकारी लॉगिन' : 'Officer Login',
      description: language === 'hi' ? 'शिकायतों का प्रबंधन करें' : 'Manage complaints',
      color: 'green',
      credentials: 'suresh.gupta@pwd.gov.in / officer123'
    },
    {
      role: 'mitra',
      title: language === 'hi' ? 'मित्र लॉगिन' : 'Mitra Login',
      description: language === 'hi' ? 'फील्ड वर्क और समाधान' : 'Field work and resolution',
      color: 'orange',
      credentials: 'ramesh.yadav@pwd.gov.in / mitra123'
    },
    {
      role: 'admin',
      title: language === 'hi' ? 'प्रशासक लॉगिन' : 'Admin Login',
      description: language === 'hi' ? 'सिस्टम प्रबंधन और विश्लेषण' : 'System management and analytics',
      color: 'purple',
      credentials: 'admin@imitra.gov.in / admin123'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">i</span>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  i-Mitra
                </h1>
                <p className="text-sm text-gray-500">
                  {language === 'hi' ? 'इंदौर स्मार्ट सिटी' : 'Indore Smart City'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleLanguage}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                {language === 'hi' ? 'English' : 'हिंदी'}
              </button>
              <Link
                to="/login"
                className="btn btn-primary"
              >
                {language === 'hi' ? 'लॉग इन' : 'Login'}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-display">
              {language === 'hi' 
                ? 'स्वागत है i-Mitra में' 
                : 'Welcome to i-Mitra'
              }
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
              {language === 'hi'
                ? 'इंदौर स्मार्ट सिटी के लिए AI-संचालित बुद्धिमान बहु-भूमिका शिकायत प्रबंधन प्रणाली'
                : 'AI-Driven Intelligent Multi-Role Grievance Management System for Indore Smart City'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="btn bg-white text-primary-600 hover:bg-gray-50 px-8 py-3 text-lg"
              >
                {language === 'hi' ? 'शिकायत दर्ज करें' : 'File a Complaint'}
              </Link>
              <Link
                to="/login"
                className="btn bg-primary-700 text-white hover:bg-primary-800 px-8 py-3 text-lg"
              >
                {language === 'hi' ? 'लॉग इन करें' : 'Login'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-display">
              {language === 'hi' ? 'मुख्य विशेषताएं' : 'Key Features'}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {language === 'hi'
                ? 'आधुनिक तकनीक के साथ नागरिक सेवाओं को बेहतर बनाना'
                : 'Enhancing citizen services with modern technology'
              }
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card p-6 text-center hover:shadow-lg transition-shadow">
                <div className="mx-auto w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Login Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-display">
              {language === 'hi' ? 'डेमो लॉगिन' : 'Demo Login'}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {language === 'hi'
                ? 'विभिन्न भूमिकाओं के साथ सिस्टम का परीक्षण करें'
                : 'Test the system with different user roles'
              }
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loginOptions.map((option, index) => (
              <div key={index} className="card p-6 text-center hover:shadow-lg transition-shadow">
                <div className={`mx-auto w-12 h-12 bg-${option.color}-100 rounded-lg flex items-center justify-center mb-4`}>
                  <UserGroupIcon className={`h-6 w-6 text-${option.color}-600`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {option.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {option.description}
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-xs text-gray-500 mb-1">Demo Credentials:</p>
                  <p className="text-sm font-mono text-gray-700">
                    {option.credentials}
                  </p>
                </div>
                <Link
                  to="/login"
                  className={`btn bg-${option.color}-600 text-white hover:bg-${option.color}-700 w-full`}
                >
                  {language === 'hi' ? 'लॉग इन' : 'Login'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold">i</span>
              </div>
              <h3 className="text-xl font-bold">i-Mitra</h3>
            </div>
            <p className="text-gray-400 mb-4">
              {language === 'hi'
                ? 'इंदौर स्मार्ट सिटी - बुद्धिमान शिकायत प्रबंधन प्रणाली'
                : 'Indore Smart City - Intelligent Grievance Management System'
              }
            </p>
            <p className="text-sm text-gray-500">
              © 2024 i-Mitra Development Team. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;