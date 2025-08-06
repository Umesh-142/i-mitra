const mongoose = require('mongoose');
const moment = require('moment');

const timelineEntrySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'submitted', 'ai_classified', 'assigned_officer', 'assigned_mitra', 
      'in_progress', 'resolved', 'rejected', 'escalated', 'reopened', 
      'feedback_received', 'closed'
    ]
  },
  description: {
    type: String,
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedAt: {
    type: Date,
    default: Date.now
  },
  remarks: {
    type: String,
    default: ''
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
});

const complaintSchema = new mongoose.Schema({
  // Basic complaint information
  complaintId: {
    type: String,
    unique: true,
    required: true
  },
  title: {
    type: String,
    required: [true, 'Complaint title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Complaint description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  // AI Classification Results
  aiClassification: {
    category: {
      type: String,
      enum: [
        'Road and Infrastructure', 'Water Supply', 'Electricity', 'Sanitation and Waste Management',
        'Traffic and Transportation', 'Public Safety', 'Health Services', 'Education',
        'Parks and Recreation', 'Revenue and Tax', 'Municipal Services', 'Other'
      ],
      required: true
    },
    department: {
      type: String,
      enum: [
        'PWD', 'Water Works', 'Electricity', 'Sanitation', 'Traffic Police',
        'Municipal Corporation', 'Health Department', 'Education', 'Fire Department',
        'Parks and Gardens', 'Revenue Department', 'IT Department', 'Other'
      ],
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    keywords: [{
      type: String
    }],
    processedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Status and Assignment
  status: {
    type: String,
    enum: ['new', 'assigned', 'in_progress', 'resolved', 'rejected', 'escalated', 'closed'],
    default: 'new'
  },
  assignedOfficer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedMitra: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  mitraPhone: {
    type: String,
    default: null
  },
  
  // Citizen Information
  citizen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Location Information
  location: {
    address: {
      type: String,
      required: [true, 'Location address is required']
    },
    coordinates: {
      latitude: {
        type: Number,
        required: false
      },
      longitude: {
        type: Number,
        required: false
      }
    },
    zone: {
      type: String,
      enum: ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6'],
      required: true
    },
    landmark: {
      type: String,
      default: ''
    }
  },
  
  // SLA Management
  sla: {
    deadline: {
      type: Date,
      required: true
    },
    isBreached: {
      type: Boolean,
      default: false
    },
    breachedAt: {
      type: Date,
      default: null
    },
    remainingHours: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['safe', 'warning', 'critical', 'breached'],
      default: 'safe'
    }
  },
  
  // Attachments (Evidence)
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timeline of actions
  timeline: [timelineEntrySchema],
  
  // Remarks and Updates
  remarks: [{
    text: {
      type: String,
      required: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    isPublic: {
      type: Boolean,
      default: true
    }
  }],
  
  // Citizen Feedback
  citizenFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    satisfied: {
      type: Boolean,
      default: null
    },
    comments: {
      type: String,
      maxlength: [500, 'Feedback comments cannot exceed 500 characters'],
      default: ''
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  
  // Resolution Information
  resolution: {
    description: {
      type: String,
      default: ''
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolutionTime: {
      type: Number, // in hours
      default: null
    },
    proofAttachments: [{
      filename: String,
      originalName: String,
      path: String,
      size: Number,
      mimetype: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Escalation Information
  escalation: {
    level: {
      type: Number,
      default: 0
    },
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    escalatedAt: {
      type: Date,
      default: null
    },
    reason: {
      type: String,
      default: ''
    }
  },
  
  // Language
  language: {
    type: String,
    enum: ['en', 'hi'],
    default: 'en'
  },
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
complaintSchema.index({ complaintId: 1 });
complaintSchema.index({ citizen: 1 });
complaintSchema.index({ 'aiClassification.department': 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ assignedOfficer: 1 });
complaintSchema.index({ assignedMitra: 1 });
complaintSchema.index({ 'location.zone': 1 });
complaintSchema.index({ 'sla.deadline': 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ 'aiClassification.priority': 1 });

// Virtual for SLA status calculation
complaintSchema.virtual('slaStatus').get(function() {
  if (this.status === 'resolved' || this.status === 'closed') {
    return 'completed';
  }
  
  const now = new Date();
  const deadline = new Date(this.sla.deadline);
  const hoursRemaining = (deadline - now) / (1000 * 60 * 60);
  
  if (hoursRemaining < 0) {
    return 'breached';
  } else if (hoursRemaining < 6) {
    return 'critical';
  } else if (hoursRemaining < 24) {
    return 'warning';
  } else {
    return 'safe';
  }
});

// Virtual for resolution time calculation
complaintSchema.virtual('actualResolutionTime').get(function() {
  if (this.resolution.resolvedAt) {
    const createdAt = new Date(this.createdAt);
    const resolvedAt = new Date(this.resolution.resolvedAt);
    return Math.round((resolvedAt - createdAt) / (1000 * 60 * 60)); // in hours
  }
  return null;
});

// Static method to generate complaint ID
complaintSchema.statics.generateComplaintId = async function() {
  const count = await this.countDocuments();
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return `C${year}${month}${String(count + 1).padStart(4, '0')}`;
};

// Static method to calculate SLA deadline
complaintSchema.statics.calculateSLADeadline = function(priority, department) {
  const now = new Date();
  let hours = 72; // Default 3 days
  
  // Priority-based SLA
  switch (priority) {
    case 'critical':
      hours = 4; // 4 hours
      break;
    case 'high':
      hours = 24; // 1 day
      break;
    case 'medium':
      hours = 48; // 2 days
      break;
    case 'low':
      hours = 72; // 3 days
      break;
  }
  
  // Department-specific adjustments
  const urgentDepartments = ['Fire Department', 'Health Department', 'Electricity'];
  if (urgentDepartments.includes(department)) {
    hours = Math.max(hours * 0.5, 2); // Reduce by half, minimum 2 hours
  }
  
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
};

// Method to update SLA status
complaintSchema.methods.updateSLAStatus = function() {
  const now = new Date();
  const deadline = new Date(this.sla.deadline);
  const hoursRemaining = (deadline - now) / (1000 * 60 * 60);
  
  this.sla.remainingHours = Math.max(hoursRemaining, 0);
  
  if (hoursRemaining < 0 && !this.sla.isBreached) {
    this.sla.isBreached = true;
    this.sla.breachedAt = now;
    this.sla.status = 'breached';
  } else if (hoursRemaining >= 0) {
    if (hoursRemaining < 6) {
      this.sla.status = 'critical';
    } else if (hoursRemaining < 24) {
      this.sla.status = 'warning';
    } else {
      this.sla.status = 'safe';
    }
  }
  
  return this.save();
};

// Method to add timeline entry
complaintSchema.methods.addTimelineEntry = function(action, description, performedBy, remarks = '', attachments = []) {
  this.timeline.push({
    action,
    description,
    performedBy,
    remarks,
    attachments,
    performedAt: new Date()
  });
  return this.save();
};

// Method to add remark
complaintSchema.methods.addRemark = function(text, addedBy, isPublic = true) {
  this.remarks.push({
    text,
    addedBy,
    isPublic,
    addedAt: new Date()
  });
  return this.save();
};

// Pre-save middleware to update SLA status
complaintSchema.pre('save', function(next) {
  if (this.isNew) {
    // Add initial timeline entry
    this.timeline.push({
      action: 'submitted',
      description: 'Complaint submitted by citizen',
      performedBy: this.citizen,
      performedAt: new Date()
    });
  }
  
  // Update SLA status if not resolved/closed
  if (this.status !== 'resolved' && this.status !== 'closed') {
    const now = new Date();
    const deadline = new Date(this.sla.deadline);
    const hoursRemaining = (deadline - now) / (1000 * 60 * 60);
    
    this.sla.remainingHours = Math.max(hoursRemaining, 0);
    
    if (hoursRemaining < 0 && !this.sla.isBreached) {
      this.sla.isBreached = true;
      this.sla.breachedAt = now;
      this.sla.status = 'breached';
    } else if (hoursRemaining >= 0) {
      if (hoursRemaining < 6) {
        this.sla.status = 'critical';
      } else if (hoursRemaining < 24) {
        this.sla.status = 'warning';
      } else {
        this.sla.status = 'safe';
      }
    }
  }
  
  next();
});

// Static method for analytics
complaintSchema.statics.getAnalytics = async function(filters = {}) {
  const pipeline = [];
  
  // Match stage
  if (Object.keys(filters).length > 0) {
    pipeline.push({ $match: filters });
  }
  
  // Group by various dimensions
  pipeline.push({
    $group: {
      _id: null,
      total: { $sum: 1 },
      resolved: {
        $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
      },
      pending: {
        $sum: { $cond: [{ $ne: ['$status', 'resolved'] }, 1, 0] }
      },
      slaBreached: {
        $sum: { $cond: ['$sla.isBreached', 1, 0] }
      },
      avgResolutionTime: {
        $avg: '$resolution.resolutionTime'
      },
      byPriority: {
        $push: '$aiClassification.priority'
      },
      byDepartment: {
        $push: '$aiClassification.department'
      },
      byZone: {
        $push: '$location.zone'
      }
    }
  });
  
  return this.aggregate(pipeline);
};

module.exports = mongoose.model('Complaint', complaintSchema);