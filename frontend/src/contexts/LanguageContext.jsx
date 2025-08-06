import React, { createContext, useContext, useState, useEffect } from 'react';

// Create context
const LanguageContext = createContext();

// Language translations
const translations = {
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.submit': 'Submit',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.view': 'View',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.clear': 'Clear',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.complaints': 'Complaints',
    'nav.analytics': 'Analytics',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    
    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Name',
    'auth.phone': 'Phone Number',
    'auth.role': 'Role',
    'auth.department': 'Department',
    
    // Complaints
    'complaint.title': 'Title',
    'complaint.description': 'Description',
    'complaint.location': 'Location',
    'complaint.status': 'Status',
    'complaint.priority': 'Priority',
    'complaint.category': 'Category',
    'complaint.submit': 'Submit Complaint',
    
    // Status
    'status.new': 'New',
    'status.assigned': 'Assigned',
    'status.in_progress': 'In Progress',
    'status.resolved': 'Resolved',
    'status.escalated': 'Escalated',
    'status.rejected': 'Rejected',
    'status.closed': 'Closed',
    
    // Roles
    'role.citizen': 'Citizen',
    'role.officer': 'Officer',
    'role.mitra': 'Mitra',
    'role.admin': 'Admin'
  },
  hi: {
    // Common
    'common.loading': 'लोड हो रहा है...',
    'common.error': 'त्रुटि',
    'common.success': 'सफलता',
    'common.submit': 'जमा करें',
    'common.cancel': 'रद्द करें',
    'common.save': 'सहेजें',
    'common.edit': 'संपादित करें',
    'common.delete': 'हटाएं',
    'common.view': 'देखें',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.clear': 'साफ़ करें',
    'common.back': 'वापस',
    'common.next': 'अगला',
    'common.previous': 'पिछला',
    
    // Navigation
    'nav.dashboard': 'डैशबोर्ड',
    'nav.complaints': 'शिकायतें',
    'nav.analytics': 'विश्लेषण',
    'nav.profile': 'प्रोफाइल',
    'nav.logout': 'लॉग आउट',
    
    // Auth
    'auth.login': 'लॉग इन',
    'auth.register': 'पंजीकरण',
    'auth.email': 'ईमेल',
    'auth.password': 'पासवर्ड',
    'auth.name': 'नाम',
    'auth.phone': 'फोन नंबर',
    'auth.role': 'भूमिका',
    'auth.department': 'विभाग',
    
    // Complaints
    'complaint.title': 'शीर्षक',
    'complaint.description': 'विवरण',
    'complaint.location': 'स्थान',
    'complaint.status': 'स्थिति',
    'complaint.priority': 'प्राथमिकता',
    'complaint.category': 'श्रेणी',
    'complaint.submit': 'शिकायत दर्ज करें',
    
    // Status
    'status.new': 'नया',
    'status.assigned': 'सौंपा गया',
    'status.in_progress': 'प्रगति में',
    'status.resolved': 'हल किया गया',
    'status.escalated': 'बढ़ाया गया',
    'status.rejected': 'अस्वीकृत',
    'status.closed': 'बंद',
    
    // Roles
    'role.citizen': 'नागरिक',
    'role.officer': 'अधिकारी',
    'role.mitra': 'मित्र',
    'role.admin': 'व्यवस्थापक'
  }
};

// Provider component
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  // Toggle language
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'hi' : 'en');
  };

  // Get translation
  const t = (key) => {
    return translations[language][key] || key;
  };

  // Check if current language is RTL
  const isRTL = () => {
    return language === 'hi'; // Hindi can be RTL in some contexts
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    isRTL
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;