import mongoose from 'mongoose';
import slugify from 'slugify';
import validator from 'validator';

const { Schema } = mongoose;

/**
 * Timeline Entry Schema for tracking complaint progress
 */
const timelineSchema = new Schema({
  action: {
    type: String,
    required: [true, 'Timeline action is required'],
    enum: {
      values: [
        'submitted', 'classified', 'assigned', 'in_progress', 'resolved',
        'rejected', 'escalated', 'reopened', 'feedback_received', 'closed'
      ],
      message: 'Invalid timeline action'
    }
  },
  description: {
    type: String,
    required: [true, 'Timeline description is required'],
    trim: true,
    maxlength: [500, 'Timeline description cannot exceed 500 characters']
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedByRole: {
    type: String,
    required: true,
    enum: ['citizen', 'officer', 'mitra', 'admin', 'system']
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  _id: true
});

/**
 * AI Classification Schema
 */
const aiClassificationSchema = new Schema({
  category: {
    type: String,
    required: [true, 'AI category is required'],
    enum: {
      values: [
        'Road and Infrastructure', 'Water Supply', 'Electricity', 'Sanitation',
        'Traffic and Transportation', 'Health and Safety', 'Education',
        'Fire Safety', 'Revenue and Tax', 'Urban Planning', 'Environment',
        'Street Lighting', 'Other'
      ],
      message: 'Invalid complaint category'
    },
    index: true
  },
  department: {
    type: String,
    required: [true, 'AI department classification is required'],
    enum: {
      values: [
        'PWD', 'Water Works', 'Electricity', 'Sanitation', 'Traffic Police',
        'Health Department', 'Education', 'Fire Department', 'Revenue',
        'Town Planning', 'Horticulture', 'Street Lighting'
      ],
      message: 'Invalid department'
    },
    index: true
  },
  priority: {
    type: String,
    required: [true, 'AI priority is required'],
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: 'Priority must be low, medium, high, or critical'
    },
    default: 'medium',
    index: true
  },
  confidence: {
    type: Number,
    required: [true, 'AI confidence score is required'],
    min: [0, 'Confidence must be between 0 and 1'],
    max: [1, 'Confidence must be between 0 and 1'],
    validate: {
      validator: function(v) {
        return v >= 0 && v <= 1;
      },
      message: 'Confidence must be between 0 and 1'
    }
  },
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  model: {
    type: String,
    default: 'gemini-pro',
    trim: true
  },
  processedAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: false
});

/**
 * SLA (Service Level Agreement) Schema
 */
const slaSchema = new Schema({
  deadline: {
    type: Date,
    required: [true, 'SLA deadline is required'],
    index: true
  },
  hoursAllocated: {
    type: Number,
    required: [true, 'SLA hours allocated is required'],
    min: [1, 'SLA hours must be at least 1']
  },
  status: {
    type: String,
    enum: {
      values: ['safe', 'warning', 'breach'],
      message: 'SLA status must be safe, warning, or breach'
    },
    default: 'safe',
    index: true
  },
  breachNotificationSent: {
    type: Boolean,
    default: false
  },
  warningNotificationSent: {
    type: Boolean,
    default: false
  },
  escalationLevel: {
    type: Number,
    default: 0,
    min: [0, 'Escalation level cannot be negative'],
    max: [3, 'Maximum escalation level is 3']
  }
}, {
  _id: false
});

/**
 * Location Schema with enhanced validation
 */
const locationSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    required: [true, 'Location coordinates are required'],
    validate: {
      validator: function(v) {
        return v.length === 2 && 
               v[0] >= -180 && v[0] <= 180 && // longitude
               v[1] >= -90 && v[1] <= 90;     // latitude
      },
      message: 'Invalid coordinates format [longitude, latitude]'
    }
  },
  address: {
    type: String,
    required: [true, 'Location address is required'],
    trim: true,
    maxlength: [300, 'Address cannot exceed 300 characters']
  },
  landmark: {
    type: String,
    trim: true,
    maxlength: [100, 'Landmark cannot exceed 100 characters']
  },
  zone: {
    type: String,
    required: [true, 'Zone is required'],
    enum: {
      values: [
        'Zone 1 - Central', 'Zone 2 - East', 'Zone 3 - West', 
        'Zone 4 - North', 'Zone 5 - South', 'Zone 6 - South-East',
        'Zone 7 - South-West', 'Zone 8 - North-East', 'Zone 9 - North-West'
      ],
      message: 'Please select a valid zone'
    },
    index: true
  }
}, {
  _id: false
});

// Create geospatial index for location
locationSchema.index({ coordinates: '2dsphere' });

/**
 * Citizen Information Schema
 */
const citizenSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Citizen name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Citizen email is required'],
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email address'],
    index: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^[6-9]\d{9}$/.test(v);
      },
      message: 'Please provide a valid Indian mobile number'
    }
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
}, {
  _id: false
});

/**
 * Feedback Schema
 */
const feedbackSchema = new Schema({
  rating: {
    type: Number,
    min: [1, 'Rating must be between 1 and 5'],
    max: [5, 'Rating must be between 1 and 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer'
    }
  },
  satisfied: {
    type: Boolean,
    required: [true, 'Satisfaction status is required']
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [1000, 'Feedback comments cannot exceed 1000 characters']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  wouldRecommend: {
    type: Boolean,
    default: null
  }
}, {
  _id: false
});

/**
 * Attachment Schema
 */
const attachmentSchema = new Schema({
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  mimetype: {
    type: String,
    required: [true, 'File mimetype is required'],
    validate: {
      validator: function(v) {
        const allowedTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
          'video/mp4', 'video/webm', 'video/quicktime'
        ];
        return allowedTypes.includes(v);
      },
      message: 'File type not supported. Only images and videos are allowed.'
    }
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    max: [10 * 1024 * 1024, 'File size cannot exceed 10MB'] // 10MB limit
  },
  path: {
    type: String,
    required: [true, 'File path is required'],
    trim: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['evidence', 'proof_of_work', 'additional'],
    default: 'evidence'
  }
}, {
  _id: true
});

/**
 * Main Complaint Schema
 */
const complaintSchema = new Schema({
  complaintId: {
    type: String,
    unique: true,
    required: [true, 'Complaint ID is required'],
    uppercase: true,
    trim: true,
    index: true
  },
  
  title: {
    type: String,
    required: [true, 'Complaint title is required'],
    trim: true,
    minlength: [10, 'Title must be at least 10 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: 'text' // Text index for search
  },
  
  description: {
    type: String,
    required: [true, 'Complaint description is required'],
    trim: true,
    minlength: [20, 'Description must be at least 20 characters'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    index: 'text' // Text index for search
  },
  
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['new', 'assigned', 'in_progress', 'resolved', 'rejected', 'escalated', 'closed'],
      message: 'Invalid status value'
    },
    default: 'new',
    index: true
  },
  
  citizen: {
    type: citizenSchema,
    required: [true, 'Citizen information is required']
  },
  
  location: {
    type: locationSchema,
    required: [true, 'Location is required']
  },
  
  aiClassification: {
    type: aiClassificationSchema,
    required: [true, 'AI classification is required']
  },
  
  sla: {
    type: slaSchema,
    required: [true, 'SLA information is required']
  },
  
  // Assignment information
  assignedOfficer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  assignedMitra: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  assignedAt: {
    type: Date,
    index: true
  },
  
  // Progress tracking
  timeline: [timelineSchema],
  
  remarks: [{
    content: {
      type: String,
      required: [true, 'Remark content is required'],
      trim: true,
      maxlength: [1000, 'Remark cannot exceed 1000 characters']
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedByRole: {
      type: String,
      required: true,
      enum: ['officer', 'mitra', 'admin']
    },
    isInternal: {
      type: Boolean,
      default: false
    },
    attachments: [attachmentSchema],
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  attachments: [attachmentSchema],
  
  // Feedback and closure
  citizenFeedback: {
    type: feedbackSchema,
    default: null
  },
  
  resolvedAt: {
    type: Date,
    index: true
  },
  
  closedAt: {
    type: Date,
    index: true
  },
  
  // Escalation tracking
  escalationHistory: [{
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 3
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Escalation reason cannot exceed 500 characters']
    },
    escalatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    escalatedAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: Date
  }],
  
  // Metadata
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  isPublic: {
    type: Boolean,
    default: true
  },
  
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative']
  },
  
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  deletedAt: Date,
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
complaintSchema.index({ status: 1, 'aiClassification.department': 1 });
complaintSchema.index({ 'citizen.email': 1, status: 1 });
complaintSchema.index({ assignedOfficer: 1, status: 1 });
complaintSchema.index({ assignedMitra: 1, status: 1 });
complaintSchema.index({ 'sla.deadline': 1, status: 1 });
complaintSchema.index({ 'aiClassification.priority': 1, status: 1 });
complaintSchema.index({ 'location.zone': 1, status: 1 });
complaintSchema.index({ createdAt: -1, status: 1 });
complaintSchema.index({ lastActivity: -1 });

// Text index for full-text search
complaintSchema.index({
  title: 'text',
  description: 'text',
  'location.address': 'text',
  'aiClassification.keywords': 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    'location.address': 3,
    'aiClassification.keywords': 2
  },
  name: 'complaint_text_index'
});

// Virtuals
complaintSchema.virtual('department').get(function() {
  return this.aiClassification?.department;
});

complaintSchema.virtual('category').get(function() {
  return this.aiClassification?.category;
});

complaintSchema.virtual('isOverdue').get(function() {
  return this.sla?.deadline && new Date() > this.sla.deadline && 
         !['resolved', 'closed', 'rejected'].includes(this.status);
});

complaintSchema.virtual('daysOpen').get(function() {
  const endDate = this.resolvedAt || this.closedAt || new Date();
  return Math.ceil((endDate - this.createdAt) / (1000 * 60 * 60 * 24));
});

complaintSchema.virtual('timeToResolve').get(function() {
  if (!this.resolvedAt) return null;
  return Math.ceil((this.resolvedAt - this.createdAt) / (1000 * 60 * 60)); // in hours
});

complaintSchema.virtual('slaProgress').get(function() {
  if (!this.sla?.deadline) return 0;
  const now = new Date();
  const start = this.createdAt;
  const end = this.sla.deadline;
  const elapsed = now - start;
  const total = end - start;
  return Math.min(Math.max((elapsed / total) * 100, 0), 100);
});

// Pre-save middleware
complaintSchema.pre('save', function(next) {
  // Generate complaint ID if not exists
  if (!this.complaintId) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    this.complaintId = `IMC${year}${month}${timestamp}`;
  }
  
  // Generate slug from title
  if (!this.slug || this.isModified('title')) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  
  // Update last activity
  this.lastActivity = new Date();
  
  // Set priority from AI classification if not set
  if (!this.priority && this.aiClassification?.priority) {
    this.priority = this.aiClassification.priority;
  }
  
  // Update SLA status
  this.updateSLAStatus();
  
  next();
});

// Pre-save middleware for timeline updates
complaintSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    // Auto-add timeline entry for status changes
    const statusTimeline = {
      action: this.status,
      description: `Status changed to ${this.status}`,
      performedBy: this.lastUpdatedBy || this.citizen.userId,
      performedByRole: 'system'
    };
    
    this.timeline.push(statusTimeline);
  }
  
  next();
});

// Instance Methods
complaintSchema.methods.updateSLAStatus = function() {
  if (!this.sla?.deadline) return;
  
  const now = new Date();
  const deadline = this.sla.deadline;
  const hoursRemaining = (deadline - now) / (1000 * 60 * 60);
  
  if (now > deadline) {
    this.sla.status = 'breach';
  } else if (hoursRemaining <= this.sla.hoursAllocated * 0.2) { // 20% time remaining
    this.sla.status = 'warning';
  } else {
    this.sla.status = 'safe';
  }
};

complaintSchema.methods.addTimelineEntry = function(action, description, performedBy, performedByRole, metadata = {}) {
  this.timeline.push({
    action,
    description,
    performedBy,
    performedByRole,
    metadata
  });
  
  this.lastActivity = new Date();
  return this.save();
};

complaintSchema.methods.addRemark = function(content, addedBy, addedByRole, isInternal = false, attachments = []) {
  this.remarks.push({
    content,
    addedBy,
    addedByRole,
    isInternal,
    attachments
  });
  
  this.lastActivity = new Date();
  return this.save();
};

complaintSchema.methods.assignToMitra = async function(mitraId, assignedBy) {
  this.assignedMitra = mitraId;
  this.assignedAt = new Date();
  this.status = 'assigned';
  
  await this.addTimelineEntry(
    'assigned',
    `Complaint assigned to Mitra`,
    assignedBy,
    'officer',
    { mitraId }
  );
  
  return this.save();
};

complaintSchema.methods.updateStatus = async function(newStatus, updatedBy, updatedByRole, remarks = '') {
  const oldStatus = this.status;
  this.status = newStatus;
  
  if (newStatus === 'resolved') {
    this.resolvedAt = new Date();
  } else if (newStatus === 'closed') {
    this.closedAt = new Date();
  }
  
  await this.addTimelineEntry(
    newStatus,
    remarks || `Status updated from ${oldStatus} to ${newStatus}`,
    updatedBy,
    updatedByRole
  );
  
  if (remarks) {
    await this.addRemark(remarks, updatedBy, updatedByRole);
  }
  
  return this.save();
};

complaintSchema.methods.escalate = function(reason, escalatedBy, level = null) {
  const currentLevel = this.sla.escalationLevel + 1;
  const escalationLevel = level || currentLevel;
  
  this.sla.escalationLevel = Math.min(escalationLevel, 3);
  this.status = 'escalated';
  
  this.escalationHistory.push({
    level: escalationLevel,
    reason,
    escalatedBy
  });
  
  this.addTimelineEntry(
    'escalated',
    `Complaint escalated to level ${escalationLevel}: ${reason}`,
    escalatedBy,
    'system',
    { level: escalationLevel, reason }
  );
  
  return this.save();
};

// Static Methods
complaintSchema.statics.generateComplaintId = function() {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `IMC${year}${month}${timestamp}`;
};

complaintSchema.statics.calculateSLA = function(department, category, priority) {
  const slaMatrix = {
    'PWD': { 'critical': 4, 'high': 24, 'medium': 72, 'low': 168 },
    'Water Works': { 'critical': 2, 'high': 8, 'medium': 48, 'low': 120 },
    'Electricity': { 'critical': 1, 'high': 4, 'medium': 24, 'low': 72 },
    'Sanitation': { 'critical': 6, 'high': 24, 'medium': 72, 'low': 168 },
    'Traffic Police': { 'critical': 2, 'high': 8, 'medium': 48, 'low': 120 },
    'Health Department': { 'critical': 2, 'high': 12, 'medium': 48, 'low': 120 },
    'Education': { 'critical': 24, 'high': 72, 'medium': 168, 'low': 336 },
    'Fire Department': { 'critical': 1, 'high': 2, 'medium': 12, 'low': 48 },
    'Revenue': { 'critical': 24, 'high': 72, 'medium': 168, 'low': 336 },
    'Town Planning': { 'critical': 48, 'high': 168, 'medium': 336, 'low': 720 },
    'Horticulture': { 'critical': 12, 'high': 48, 'medium': 168, 'low': 336 },
    'Street Lighting': { 'critical': 4, 'high': 24, 'medium': 72, 'low': 168 }
  };
  
  const departmentSLA = slaMatrix[department] || slaMatrix['PWD'];
  const hours = departmentSLA[priority] || departmentSLA['medium'];
  
  return {
    hoursAllocated: hours,
    deadline: new Date(Date.now() + hours * 60 * 60 * 1000),
    status: 'safe'
  };
};

complaintSchema.statics.getComplaintStats = async function(filter = {}) {
  const pipeline = [
    { $match: { isDeleted: false, ...filter } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
        assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        escalated: { $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        overdue: { $sum: { $cond: [{ $and: [
          { $gt: [new Date(), '$sla.deadline'] },
          { $not: { $in: ['$status', ['resolved', 'closed', 'rejected']] } }
        ] }, 1, 0] } },
        avgRating: { $avg: '$citizenFeedback.rating' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    total: 0, new: 0, assigned: 0, inProgress: 0, resolved: 0,
    closed: 0, escalated: 0, rejected: 0, overdue: 0, avgRating: 0
  };
};

complaintSchema.statics.getDepartmentStats = async function(department) {
  return this.getComplaintStats({ 'aiClassification.department': department });
};

complaintSchema.statics.getZoneStats = async function(zone) {
  return this.getComplaintStats({ 'location.zone': zone });
};

complaintSchema.statics.searchComplaints = function(query, options = {}) {
  const {
    department,
    status,
    priority,
    zone,
    dateFrom,
    dateTo,
    limit = 20,
    skip = 0,
    sort = { createdAt: -1 }
  } = options;
  
  const filter = { isDeleted: false };
  
  if (query) {
    filter.$text = { $search: query };
  }
  
  if (department) filter['aiClassification.department'] = department;
  if (status) filter.status = status;
  if (priority) filter['aiClassification.priority'] = priority;
  if (zone) filter['location.zone'] = zone;
  
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }
  
  return this.find(filter)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .populate('assignedOfficer', 'name email employeeId')
    .populate('assignedMitra', 'name email employeeId')
    .populate('timeline.performedBy', 'name role')
    .populate('remarks.addedBy', 'name role');
};

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;