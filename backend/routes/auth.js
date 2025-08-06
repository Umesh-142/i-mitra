import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect, authorize, sensitiveOpLimit } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/errorHandler.js';
import {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  sendPhoneVerification,
  verifyPhone,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getDepartmentMitra,
  refreshToken
} from '../controllers/authController.js';

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('phoneNumber')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid Indian mobile number'),
    
  body('address.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
    
  body('address.area')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Area must be between 2 and 100 characters'),
    
  body('address.pincode')
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('Please provide a valid pincode'),
    
  body('zone')
    .isIn([
      'Zone 1 - Central', 'Zone 2 - East', 'Zone 3 - West', 
      'Zone 4 - North', 'Zone 5 - South', 'Zone 6 - South-East',
      'Zone 7 - South-West', 'Zone 8 - North-East', 'Zone 9 - North-West'
    ])
    .withMessage('Please select a valid zone'),
    
  body('role')
    .optional()
    .isIn(['citizen', 'officer', 'mitra'])
    .withMessage('Invalid role specified'),
    
  body('department')
    .optional()
    .isIn([
      'PWD', 'Water Works', 'Electricity', 'Sanitation', 'Traffic Police',
      'Health Department', 'Education', 'Fire Department', 'Revenue',
      'Town Planning', 'Horticulture', 'Street Lighting'
    ])
    .withMessage('Please select a valid department'),
    
  body('employeeId')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Employee ID must be between 3 and 20 characters'),
    
  body('designation')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Designation must be between 2 and 100 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateDetailsValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
    
  body('phoneNumber')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid Indian mobile number'),
    
  body('address.street')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
    
  body('preferences.language')
    .optional()
    .isIn(['en', 'hi'])
    .withMessage('Language must be either en or hi'),
    
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto')
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
    
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('New password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
    
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

const phoneVerificationValidation = [
  body('phoneNumber')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid Indian mobile number')
];

const verifyPhoneValidation = [
  body('phoneNumber')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid Indian mobile number'),
    
  body('code')
    .matches(/^\d{6}$/)
    .withMessage('Verification code must be 6 digits')
];

// Public routes (no authentication required)
router.post('/register', registerValidation, handleValidationErrors, register);
router.post('/login', loginValidation, handleValidationErrors, login);
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, forgotPassword);
router.put('/reset-password', resetPasswordValidation, handleValidationErrors, resetPassword);

// Phone verification routes (public)
router.post('/send-phone-verification', phoneVerificationValidation, handleValidationErrors, sendPhoneVerification);
router.post('/verify-phone', verifyPhoneValidation, handleValidationErrors, verifyPhone);

// Protected routes (authentication required)
router.use(protect); // All routes below require authentication

// User profile routes
router.get('/me', getMe);
router.put('/update-details', updateDetailsValidation, handleValidationErrors, updateDetails);
router.put('/update-password', sensitiveOpLimit(3), updatePasswordValidation, handleValidationErrors, updatePassword);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);

// Admin routes for user management
router.get('/users', authorize('admin'), getUsers);
router.get('/users/:id', authorize('admin'), getUser);
router.put('/users/:id', authorize('admin'), updateUser);
router.delete('/users/:id', authorize('admin'), deleteUser);

// Department-specific routes
router.get('/department/:department/mitra', 
  authorize('officer', 'admin'), 
  getDepartmentMitra
);

// Health check for auth service
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication service is healthy',
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      isPhoneVerified: req.user.isPhoneVerified
    },
    timestamp: new Date().toISOString()
  });
});

export default router;