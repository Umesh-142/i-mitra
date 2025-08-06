const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['citizen', 'officer', 'mitra', 'admin'],
    default: 'citizen',
    required: true
  },
  // Additional fields for officers and mitra
  department: {
    type: String,
    enum: [
      'PWD', 'Water Works', 'Electricity', 'Sanitation', 'Traffic Police',
      'Municipal Corporation', 'Health Department', 'Education', 'Fire Department',
      'Parks and Gardens', 'Revenue Department', 'IT Department', 'Other'
    ],
    required: function() {
      return this.role === 'officer' || this.role === 'mitra';
    }
  },
  employeeId: {
    type: String,
    required: function() {
      return this.role === 'officer' || this.role === 'mitra';
    },
    unique: true,
    sparse: true // Allow null values but ensure uniqueness when present
  },
  // Citizen-specific fields
  address: {
    type: String,
    required: function() {
      return this.role === 'citizen';
    }
  },
  zone: {
    type: String,
    enum: ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6'],
    required: function() {
      return this.role === 'citizen';
    }
  },
  // Verification status
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  // Mitra-specific fields
  assignedOfficer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.role === 'mitra';
    }
  },
  // Language preference
  preferredLanguage: {
    type: String,
    enum: ['en', 'hi'],
    default: 'en'
  },
  // Profile picture
  profilePicture: {
    type: String,
    default: null
  },
  // Last login
  lastLogin: {
    type: Date,
    default: null
  },
  // Reset password fields
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  // Phone verification
  phoneVerificationToken: String,
  phoneVerificationExpire: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1, department: 1 });
userSchema.index({ employeeId: 1 }, { sparse: true });

// Virtual for full name display
userSchema.virtual('displayName').get(function() {
  return this.name;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate auth token (will be used in auth controller)
userSchema.methods.getSignedJwtToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      id: this._id, 
      role: this.role, 
      department: this.department,
      email: this.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Static method to get users by department
userSchema.statics.getUsersByDepartment = function(department) {
  return this.find({ department, isActive: true }).select('-password');
};

// Static method to get available mitra for assignment
userSchema.statics.getAvailableMitra = function(department) {
  return this.find({ 
    role: 'mitra', 
    department, 
    isActive: true 
  }).select('name email phone employeeId');
};

// Pre-remove middleware to handle cascading deletes
userSchema.pre('remove', async function(next) {
  try {
    // Remove user's complaints if citizen
    if (this.role === 'citizen') {
      await this.model('Complaint').deleteMany({ citizen: this._id });
    }
    
    // Reassign complaints if officer/mitra being deleted
    if (this.role === 'officer') {
      await this.model('Complaint').updateMany(
        { assignedOfficer: this._id },
        { $unset: { assignedOfficer: 1 } }
      );
    }
    
    if (this.role === 'mitra') {
      await this.model('Complaint').updateMany(
        { assignedMitra: this._id },
        { $unset: { assignedMitra: 1, mitraPhone: 1 } }
      );
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);