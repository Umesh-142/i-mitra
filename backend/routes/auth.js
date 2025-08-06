const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(['citizen', 'officer', 'mitra', 'admin'])
    .withMessage('Invalid role specified'),
  body('address')
    .if(body('role').equals('citizen'))
    .notEmpty()
    .withMessage('Address is required for citizens'),
  body('zone')
    .if(body('role').equals('citizen'))
    .isIn(['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6'])
    .withMessage('Valid zone is required for citizens'),
  body('department')
    .if(body('role').isIn(['officer', 'mitra']))
    .isIn([
      'PWD', 'Water Works', 'Electricity', 'Sanitation', 'Traffic Police',
      'Municipal Corporation', 'Health Department', 'Education', 'Fire Department',
      'Parks and Gardens', 'Revenue Department', 'IT Department', 'Other'
    ])
    .withMessage('Valid department is required for officers and mitra'),
  body('employeeId')
    .if(body('role').isIn(['officer', 'mitra']))
    .notEmpty()
    .withMessage('Employee ID is required for officers and mitra')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:resettoken', authController.resetPassword);

// Protected routes
router.get('/me', protect, authController.getMe);
router.put('/update-details', protect, authController.updateDetails);
router.put('/update-password', protect, authController.updatePassword);
router.post('/logout', protect, authController.logout);

// Phone verification
router.post('/verify-phone', protect, authController.verifyPhone);
router.post('/send-phone-verification', protect, authController.sendPhoneVerification);

// Admin only routes
router.get('/users', protect, authorize('admin'), authController.getUsers);
router.get('/users/:id', protect, authorize('admin'), authController.getUser);
router.put('/users/:id', protect, authorize('admin'), authController.updateUser);
router.delete('/users/:id', protect, authorize('admin'), authController.deleteUser);

// Get users by department (for officers to see available mitra)
router.get('/department/:dept/mitra', protect, authorize('officer', 'admin'), authController.getDepartmentMitra);

module.exports = router;