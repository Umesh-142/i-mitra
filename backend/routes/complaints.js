const express = require('express');
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const complaintController = require('../controllers/complaintController');
const { protect, authorize, authorizeDepartment, authorizeComplaintAccess } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/complaints/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: 5 // Maximum 5 files
  },
  fileFilter
});

// Validation middleware
const createComplaintValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('location.address')
    .trim()
    .notEmpty()
    .withMessage('Location address is required'),
  body('location.zone')
    .isIn(['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6'])
    .withMessage('Valid zone is required'),
  body('location.coordinates.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('location.coordinates.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude')
];

const updateStatusValidation = [
  body('status')
    .isIn(['assigned', 'in_progress', 'resolved', 'rejected', 'escalated'])
    .withMessage('Invalid status'),
  body('remarks')
    .trim()
    .notEmpty()
    .withMessage('Remarks are required when updating status')
];

const assignMitraValidation = [
  body('mitraId')
    .isMongoId()
    .withMessage('Valid Mitra ID is required'),
  body('remarks')
    .optional()
    .trim()
];

const feedbackValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('satisfied')
    .isBoolean()
    .withMessage('Satisfied field must be true or false'),
  body('comments')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comments cannot exceed 500 characters')
];

// Public routes (with optional auth for analytics)
router.get('/public/stats', complaintController.getPublicStats);

// Protected routes - All users
router.use(protect);

// Create complaint (Citizens only)
router.post('/', 
  authorize('citizen'), 
  upload.array('attachments', 5), 
  createComplaintValidation, 
  complaintController.createComplaint
);

// Get complaints (role-based filtering)
router.get('/', complaintController.getComplaints);

// Get single complaint (with access control)
router.get('/:id', authorizeComplaintAccess, complaintController.getComplaint);

// Update complaint status (Officers and Mitra only)
router.put('/:id/status', 
  authorize('officer', 'mitra', 'admin'), 
  authorizeComplaintAccess,
  updateStatusValidation,
  upload.array('proofAttachments', 3),
  complaintController.updateComplaintStatus
);

// Assign complaint to Mitra (Officers and Admin only)
router.put('/:id/assign', 
  authorize('officer', 'admin'), 
  authorizeComplaintAccess,
  assignMitraValidation,
  complaintController.assignComplaintToMitra
);

// Add remark to complaint
router.post('/:id/remarks', 
  authorizeComplaintAccess,
  body('text').trim().notEmpty().withMessage('Remark text is required'),
  complaintController.addRemark
);

// Citizen feedback (Citizens only)
router.post('/:id/feedback', 
  authorize('citizen'), 
  authorizeComplaintAccess,
  feedbackValidation,
  complaintController.submitFeedback
);

// Escalate complaint (Officers and Admin only)
router.put('/:id/escalate', 
  authorize('officer', 'admin'), 
  authorizeComplaintAccess,
  body('reason').trim().notEmpty().withMessage('Escalation reason is required'),
  complaintController.escalateComplaint
);

// Reopen complaint (Citizens and Admin only)
router.put('/:id/reopen', 
  authorize('citizen', 'admin'), 
  authorizeComplaintAccess,
  body('reason').trim().notEmpty().withMessage('Reason for reopening is required'),
  complaintController.reopenComplaint
);

// Department-specific routes
router.get('/department/:dept', 
  authorizeDepartment, 
  complaintController.getDepartmentComplaints
);

// Admin only routes
router.delete('/:id', 
  authorize('admin'), 
  authorizeComplaintAccess,
  complaintController.deleteComplaint
);

// Bulk operations (Admin only)
router.post('/bulk/assign', 
  authorize('admin'),
  complaintController.bulkAssign
);

router.post('/bulk/status', 
  authorize('admin'),
  complaintController.bulkStatusUpdate
);

// Export complaints (Officers and Admin)
router.get('/export/:format', 
  authorize('officer', 'admin'),
  complaintController.exportComplaints
);

module.exports = router;