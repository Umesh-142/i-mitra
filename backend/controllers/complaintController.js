const { validationResult } = require('express-validator');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { ErrorResponse, asyncHandler } = require('../middleware/errorHandler');
const aiClassificationService = require('../services/aiClassificationService');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');

// @desc    Create new complaint with AI classification
// @route   POST /api/complaints
// @access  Private/Citizen
const createComplaint = asyncHandler(async (req, res, next) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { title, description, location, language = 'en' } = req.body;
  
  try {
    // Step 1: AI Classification
    console.log('🤖 Starting AI classification for complaint...');
    const aiClassification = await aiClassificationService.classifyComplaint(title, description);
    
    // Step 2: Generate complaint ID
    const complaintId = await Complaint.generateComplaintId();
    
    // Step 3: Calculate SLA deadline
    const slaDeadline = Complaint.calculateSLADeadline(
      aiClassification.priority, 
      aiClassification.department
    );
    
    // Step 4: Process file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      });
    }
    
    // Step 5: Create complaint
    const complaintData = {
      complaintId,
      title,
      description,
      citizen: req.user.id,
      location: {
        address: location.address,
        zone: location.zone,
        coordinates: location.coordinates || {},
        landmark: location.landmark || ''
      },
      aiClassification,
      sla: {
        deadline: slaDeadline,
        remainingHours: Math.ceil((slaDeadline - new Date()) / (1000 * 60 * 60)),
        status: 'safe'
      },
      attachments,
      language,
      status: 'new'
    };
    
    const complaint = await Complaint.create(complaintData);
    
    // Step 6: Add AI classification timeline entry
    await complaint.addTimelineEntry(
      'ai_classified',
      `Complaint automatically classified as ${aiClassification.category} with ${aiClassification.priority} priority`,
      req.user.id,
      `AI Confidence: ${Math.round(aiClassification.confidence * 100)}%`
    );
    
    // Step 7: Populate response data
    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('citizen', 'name email phone')
      .populate('timeline.performedBy', 'name role');
    
    // Step 8: Real-time notification to department officers
    const io = req.app.get('socketio');
    if (io) {
      io.to(`dept_${aiClassification.department}`).emit('new_complaint', {
        complaint: populatedComplaint,
        message: `New ${aiClassification.priority} priority complaint received`
      });
      
      // Notify admins
      io.to('role_admin').emit('new_complaint', {
        complaint: populatedComplaint,
        message: `New complaint created: ${complaintId}`
      });
    }
    
    // Step 9: Send confirmation email/SMS to citizen
    try {
      const emailMessage = `
        Dear ${req.user.name},
        
        Your complaint has been successfully submitted and assigned ID: ${complaintId}
        
        Title: ${title}
        Category: ${aiClassification.category}
        Department: ${aiClassification.department}
        Priority: ${aiClassification.priority}
        Expected Resolution: ${slaDeadline.toLocaleString()}
        
        You will receive updates as your complaint progresses.
        
        Thank you,
        i-Mitra Team
      `;
      
      await sendEmail({
        email: req.user.email,
        subject: `Complaint Submitted - ${complaintId}`,
        message: emailMessage
      });
      
      await sendSMS(
        req.user.phone, 
        `Your complaint ${complaintId} has been submitted successfully. Category: ${aiClassification.category}, Priority: ${aiClassification.priority}. Track status on i-Mitra portal.`
      );
    } catch (notificationError) {
      console.error('Notification sending failed:', notificationError);
      // Don't fail the request if notifications fail
    }
    
    res.status(201).json({
      success: true,
      message: 'Complaint created successfully',
      data: populatedComplaint
    });
    
  } catch (error) {
    console.error('Complaint creation error:', error);
    next(new ErrorResponse('Failed to create complaint', 500));
  }
});

// @desc    Get complaints with role-based filtering
// @route   GET /api/complaints
// @access  Private
const getComplaints = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Build query based on user role
  let query = { isActive: true };
  
  switch (req.user.role) {
    case 'citizen':
      query.citizen = req.user.id;
      break;
      
    case 'officer':
      query['aiClassification.department'] = req.user.department;
      break;
      
    case 'mitra':
      query.assignedMitra = req.user.id;
      break;
      
    case 'admin':
      // Admin can see all complaints
      break;
      
    default:
      return next(new ErrorResponse('Invalid user role', 403));
  }

  // Apply filters from query parameters
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  if (req.query.priority) {
    query['aiClassification.priority'] = req.query.priority;
  }
  
  if (req.query.department) {
    query['aiClassification.department'] = req.query.department;
  }
  
  if (req.query.zone) {
    query['location.zone'] = req.query.zone;
  }
  
  if (req.query.slaStatus) {
    query['sla.status'] = req.query.slaStatus;
  }
  
  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate) {
      query.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      query.createdAt.$lte = new Date(req.query.endDate);
    }
  }

  // Search functionality
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { complaintId: searchRegex },
      { 'location.address': searchRegex }
    ];
  }

  try {
    const total = await Complaint.countDocuments(query);
    
    let sortOption = { createdAt: -1 }; // Default sort
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      sortOption = { [sortField]: sortOrder };
    }
    
    const complaints = await Complaint.find(query)
      .sort(sortOption)
      .skip(startIndex)
      .limit(limit)
      .populate('citizen', 'name email phone zone')
      .populate('assignedOfficer', 'name email department')
      .populate('assignedMitra', 'name email phone employeeId')
      .populate('timeline.performedBy', 'name role');

    // Update SLA status for all complaints
    await Promise.all(complaints.map(complaint => complaint.updateSLAStatus()));

    res.status(200).json({
      success: true,
      count: complaints.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: complaints
    });
    
  } catch (error) {
    console.error('Get complaints error:', error);
    next(new ErrorResponse('Failed to fetch complaints', 500));
  }
});

// @desc    Get single complaint
// @route   GET /api/complaints/:id
// @access  Private (with access control)
const getComplaint = asyncHandler(async (req, res, next) => {
  const complaint = req.complaint; // Set by authorizeComplaintAccess middleware
  
  // Update SLA status
  await complaint.updateSLAStatus();
  
  // Populate all related data
  await complaint.populate([
    { path: 'citizen', select: 'name email phone zone address' },
    { path: 'assignedOfficer', select: 'name email department employeeId' },
    { path: 'assignedMitra', select: 'name email phone employeeId' },
    { path: 'timeline.performedBy', select: 'name role department' },
    { path: 'remarks.addedBy', select: 'name role' },
    { path: 'resolution.resolvedBy', select: 'name role' }
  ]);

  res.status(200).json({
    success: true,
    data: complaint
  });
});

// @desc    Update complaint status
// @route   PUT /api/complaints/:id/status
// @access  Private/Officer,Mitra,Admin
const updateComplaintStatus = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { status, remarks } = req.body;
  const complaint = req.complaint;
  
  // Validate status transition
  const validTransitions = {
    'new': ['assigned', 'rejected'],
    'assigned': ['in_progress', 'rejected'],
    'in_progress': ['resolved', 'escalated'],
    'resolved': ['closed'],
    'rejected': ['new', 'escalated'],
    'escalated': ['assigned', 'in_progress', 'resolved']
  };
  
  if (!validTransitions[complaint.status]?.includes(status)) {
    return next(new ErrorResponse(`Cannot change status from ${complaint.status} to ${status}`, 400));
  }

  const oldStatus = complaint.status;
  complaint.status = status;
  
  // Handle proof attachments for resolution
  const proofAttachments = [];
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      proofAttachments.push({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      });
    });
  }
  
  // Update resolution info if resolved
  if (status === 'resolved') {
    const createdAt = new Date(complaint.createdAt);
    const now = new Date();
    const resolutionTime = Math.round((now - createdAt) / (1000 * 60 * 60));
    
    complaint.resolution = {
      description: remarks,
      resolvedBy: req.user.id,
      resolvedAt: now,
      resolutionTime,
      proofAttachments
    };
  }
  
  // Add timeline entry
  await complaint.addTimelineEntry(
    status,
    `Status changed from ${oldStatus} to ${status}`,
    req.user.id,
    remarks,
    proofAttachments
  );
  
  // Add remark
  await complaint.addRemark(remarks, req.user.id);
  
  await complaint.save();
  
  // Real-time notification
  const io = req.app.get('socketio');
  if (io) {
    const updateData = {
      complaintId: complaint.complaintId,
      status,
      updatedBy: req.user.name,
      remarks
    };
    
    // Notify citizen
    io.to(`user_${complaint.citizen}`).emit('complaint_status_updated', updateData);
    
    // Notify department
    io.to(`dept_${complaint.aiClassification.department}`).emit('complaint_status_updated', updateData);
    
    // Notify admins
    io.to('role_admin').emit('complaint_status_updated', updateData);
  }
  
  // Send notification to citizen
  try {
    const citizen = await User.findById(complaint.citizen);
    if (citizen) {
      const statusMessages = {
        'assigned': 'Your complaint has been assigned to an officer.',
        'in_progress': 'Work has started on your complaint.',
        'resolved': 'Your complaint has been resolved. Please provide feedback.',
        'rejected': 'Your complaint has been rejected.',
        'escalated': 'Your complaint has been escalated for priority handling.'
      };
      
      await sendSMS(
        citizen.phone,
        `Complaint ${complaint.complaintId} update: ${statusMessages[status]} ${remarks ? 'Remarks: ' + remarks : ''}`
      );
    }
  } catch (notificationError) {
    console.error('Status update notification failed:', notificationError);
  }

  const populatedComplaint = await Complaint.findById(complaint._id)
    .populate('citizen', 'name email phone')
    .populate('assignedOfficer', 'name email department')
    .populate('assignedMitra', 'name email phone')
    .populate('timeline.performedBy', 'name role');

  res.status(200).json({
    success: true,
    message: 'Complaint status updated successfully',
    data: populatedComplaint
  });
});

// @desc    Assign complaint to Mitra
// @route   PUT /api/complaints/:id/assign
// @access  Private/Officer,Admin
const assignComplaintToMitra = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { mitraId, remarks = '' } = req.body;
  const complaint = req.complaint;
  
  // Verify mitra exists and is in the same department
  const mitra = await User.findById(mitraId);
  if (!mitra || mitra.role !== 'mitra' || !mitra.isActive) {
    return next(new ErrorResponse('Invalid Mitra selected', 400));
  }
  
  if (mitra.department !== complaint.aiClassification.department) {
    return next(new ErrorResponse('Mitra must be from the same department', 400));
  }
  
  // Assign mitra
  complaint.assignedMitra = mitraId;
  complaint.mitraPhone = mitra.phone;
  complaint.assignedOfficer = req.user.id;
  
  if (complaint.status === 'new') {
    complaint.status = 'assigned';
  }
  
  // Add timeline entry
  await complaint.addTimelineEntry(
    'assigned_mitra',
    `Complaint assigned to Mitra ${mitra.name}`,
    req.user.id,
    remarks
  );
  
  if (remarks) {
    await complaint.addRemark(remarks, req.user.id);
  }
  
  await complaint.save();
  
  // Real-time notifications
  const io = req.app.get('socketio');
  if (io) {
    const assignmentData = {
      complaintId: complaint.complaintId,
      assignedTo: mitra.name,
      assignedBy: req.user.name
    };
    
    // Notify assigned mitra
    io.to(`user_${mitraId}`).emit('complaint_assigned', assignmentData);
    
    // Notify citizen
    io.to(`user_${complaint.citizen}`).emit('complaint_assigned', assignmentData);
    
    // Notify department
    io.to(`dept_${complaint.aiClassification.department}`).emit('complaint_assigned', assignmentData);
  }
  
  // Send SMS to mitra
  try {
    await sendSMS(
      mitra.phone,
      `New complaint ${complaint.complaintId} assigned to you. Priority: ${complaint.aiClassification.priority}. Location: ${complaint.location.address}. Check i-Mitra portal for details.`
    );
  } catch (notificationError) {
    console.error('Mitra assignment notification failed:', notificationError);
  }

  const populatedComplaint = await Complaint.findById(complaint._id)
    .populate('citizen', 'name email phone')
    .populate('assignedOfficer', 'name email department')
    .populate('assignedMitra', 'name email phone employeeId')
    .populate('timeline.performedBy', 'name role');

  res.status(200).json({
    success: true,
    message: 'Complaint assigned to Mitra successfully',
    data: populatedComplaint
  });
});

// @desc    Add remark to complaint
// @route   POST /api/complaints/:id/remarks
// @access  Private (with access control)
const addRemark = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { text, isPublic = true } = req.body;
  const complaint = req.complaint;
  
  await complaint.addRemark(text, req.user.id, isPublic);
  
  // Real-time notification
  const io = req.app.get('socketio');
  if (io && isPublic) {
    const remarkData = {
      complaintId: complaint.complaintId,
      remark: text,
      addedBy: req.user.name,
      addedAt: new Date()
    };
    
    // Notify relevant users based on role
    if (req.user.role === 'citizen') {
      io.to(`dept_${complaint.aiClassification.department}`).emit('new_remark', remarkData);
    } else {
      io.to(`user_${complaint.citizen}`).emit('new_remark', remarkData);
    }
    
    io.to('role_admin').emit('new_remark', remarkData);
  }

  res.status(200).json({
    success: true,
    message: 'Remark added successfully'
  });
});

// @desc    Submit citizen feedback
// @route   POST /api/complaints/:id/feedback
// @access  Private/Citizen
const submitFeedback = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { rating, satisfied, comments = '' } = req.body;
  const complaint = req.complaint;
  
  if (complaint.status !== 'resolved') {
    return next(new ErrorResponse('Feedback can only be submitted for resolved complaints', 400));
  }
  
  if (complaint.citizenFeedback.rating) {
    return next(new ErrorResponse('Feedback has already been submitted for this complaint', 400));
  }
  
  // Update feedback
  complaint.citizenFeedback = {
    rating,
    satisfied,
    comments,
    submittedAt: new Date()
  };
  
  // If satisfied, close the complaint
  if (satisfied) {
    complaint.status = 'closed';
    await complaint.addTimelineEntry(
      'closed',
      'Complaint closed after positive citizen feedback',
      req.user.id,
      `Rating: ${rating}/5, Comments: ${comments}`
    );
  } else {
    // If not satisfied, reopen for escalation
    complaint.status = 'escalated';
    complaint.escalation.level += 1;
    complaint.escalation.escalatedBy = req.user.id;
    complaint.escalation.escalatedAt = new Date();
    complaint.escalation.reason = 'Citizen not satisfied with resolution';
    
    await complaint.addTimelineEntry(
      'escalated',
      'Complaint escalated due to citizen dissatisfaction',
      req.user.id,
      `Rating: ${rating}/5, Comments: ${comments}`
    );
  }
  
  await complaint.save();
  
  // Real-time notification
  const io = req.app.get('socketio');
  if (io) {
    const feedbackData = {
      complaintId: complaint.complaintId,
      rating,
      satisfied,
      comments,
      status: complaint.status
    };
    
    // Notify department
    io.to(`dept_${complaint.aiClassification.department}`).emit('feedback_received', feedbackData);
    
    // Notify admins
    io.to('role_admin').emit('feedback_received', feedbackData);
  }

  res.status(200).json({
    success: true,
    message: 'Feedback submitted successfully',
    data: { status: complaint.status, satisfied }
  });
});

// @desc    Get public statistics
// @route   GET /api/complaints/public/stats
// @access  Public
const getPublicStats = asyncHandler(async (req, res, next) => {
  try {
    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: null,
          totalComplaints: { $sum: 1 },
          resolvedComplaints: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          pendingComplaints: {
            $sum: { $cond: [{ $ne: ['$status', 'resolved'] }, 1, 0] }
          },
          avgRating: { $avg: '$citizenFeedback.rating' },
          byDepartment: {
            $push: '$aiClassification.department'
          },
          byZone: {
            $push: '$location.zone'
          },
          byPriority: {
            $push: '$aiClassification.priority'
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalComplaints: 0,
      resolvedComplaints: 0,
      pendingComplaints: 0,
      avgRating: 0,
      byDepartment: [],
      byZone: [],
      byPriority: []
    };

    // Calculate resolution rate
    result.resolutionRate = result.totalComplaints > 0 
      ? Math.round((result.resolvedComplaints / result.totalComplaints) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Public stats error:', error);
    next(new ErrorResponse('Failed to fetch public statistics', 500));
  }
});

// Additional controller methods would be implemented here for:
// - escalateComplaint
// - reopenComplaint
// - getDepartmentComplaints
// - deleteComplaint
// - bulkAssign
// - bulkStatusUpdate
// - exportComplaints

// Export all functions
module.exports = {
  createComplaint,
  getComplaints,
  getComplaint,
  updateComplaintStatus,
  assignComplaintToMitra,
  addRemark,
  submitFeedback,
  getPublicStats
  // Additional methods would be added here
};