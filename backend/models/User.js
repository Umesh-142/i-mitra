import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import validator from 'validator';

const { Schema } = mongoose;

/**
 * User Schema with enhanced validation and security features
 */
const userSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
    minlength: [2, 'Name must be at least 2 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email address'],
    index: true
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  
  role: {
    type: String,
    enum: {
      values: ['citizen', 'officer', 'mitra', 'admin'],
      message: 'Role must be either citizen, officer, mitra, or admin'
    },
    default: 'citizen',
    required: true,
    index: true
  },
  
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^[6-9]\d{9}$/.test(v); // Indian mobile number format
      },
      message: 'Please provide a valid Indian mobile number'
    },
    index: true
  },
  
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  
  phoneVerificationCode: {
    type: String,
    select: false
  },
  
  phoneVerificationExpires: {
    type: Date,
    select: false
  },
  
  // Address information
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    area: {
      type: String,
      required: [true, 'Area is required'],
      trim: true,
      maxlength: [100, 'Area cannot exceed 100 characters']
    },
    city: {
      type: String,
      default: 'Indore',
      trim: true
    },
    state: {
      type: String,
      default: 'Madhya Pradesh',
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      validate: {
        validator: function(v) {
          return /^[1-9][0-9]{5}$/.test(v);
        },
        message: 'Please provide a valid pincode'
      }
    }
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
  },
  
  // Department (for officers and mitra only)
  department: {
    type: String,
    enum: {
      values: [
        'PWD', 'Water Works', 'Electricity', 'Sanitation', 'Traffic Police',
        'Health Department', 'Education', 'Fire Department', 'Revenue',
        'Town Planning', 'Horticulture', 'Street Lighting'
      ],
      message: 'Please select a valid department'
    },
    required: function() {
      return this.role === 'officer' || this.role === 'mitra';
    },
    index: true
  },
  
  // Employee ID (for officers and mitra)
  employeeId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // Allow null values but ensure uniqueness when present
    required: function() {
      return this.role === 'officer' || this.role === 'mitra';
    },
    validate: {
      validator: function(v) {
        if (this.role === 'citizen' || this.role === 'admin') return true;
        return v && v.length >= 3;
      },
      message: 'Employee ID must be at least 3 characters'
    }
  },
  
  // Designation (for officers and mitra)
  designation: {
    type: String,
    trim: true,
    maxlength: [100, 'Designation cannot exceed 100 characters'],
    required: function() {
      return this.role === 'officer' || this.role === 'mitra';
    }
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Password reset functionality
  resetPasswordToken: {
    type: String,
    select: false
  },
  
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  
  passwordChangedAt: {
    type: Date,
    select: false
  },
  
  // Login tracking
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  
  lockUntil: {
    type: Date,
    select: false
  },
  
  // Preferences
  preferences: {
    language: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    }
  },
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  lastUpdatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1, role: 1 });
userSchema.index({ department: 1, role: 1 });
userSchema.index({ zone: 1, role: 1 });
userSchema.index({ phoneNumber: 1, isPhoneVerified: 1 });
userSchema.index({ employeeId: 1 }, { sparse: true });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  const { street, area, city, state, pincode } = this.address;
  return `${street}, ${area}, ${city}, ${state} - ${pincode}`;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for complaints count (to be populated when needed)
userSchema.virtual('complaintsCount', {
  ref: 'Complaint',
  localField: '_id',
  foreignField: 'citizen',
  count: true
});

/**
 * Pre-save middleware to hash password
 */
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Set password changed timestamp
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000; // Subtract 1s to ensure token is created after password change
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-save middleware for validation and data processing
 */
userSchema.pre('save', function(next) {
  // Ensure department is only set for officers and mitra
  if (this.role === 'citizen' || this.role === 'admin') {
    this.department = undefined;
    this.employeeId = undefined;
    this.designation = undefined;
  }
  
  // Auto-generate employee ID if not provided
  if ((this.role === 'officer' || this.role === 'mitra') && !this.employeeId) {
    const prefix = this.role === 'officer' ? 'OFF' : 'MIT';
    const timestamp = Date.now().toString().slice(-6);
    this.employeeId = `${prefix}${timestamp}`;
  }
  
  next();
});

/**
 * Pre-remove middleware to handle cascading deletes
 */
userSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    // Import Complaint model dynamically to avoid circular dependency
    const { default: Complaint } = await import('./Complaint.js');
    
    // Handle complaints based on user role
    if (this.role === 'citizen') {
      // Delete all complaints by this citizen
      await Complaint.deleteMany({ 'citizen.email': this.email });
    } else if (this.role === 'officer' || this.role === 'mitra') {
      // Unassign from complaints
      await Complaint.updateMany(
        { 
          $or: [
            { assignedOfficer: this._id },
            { assignedMitra: this._id }
          ]
        },
        { 
          $unset: { 
            assignedOfficer: 1,
            assignedMitra: 1
          }
        }
      );
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance method to check password
 */
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Instance method to generate JWT token
 */
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      role: this.role,
      department: this.department
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  );
};

/**
 * Instance method to generate and hash password reset token
 */
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expire time (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

/**
 * Instance method to generate phone verification code
 */
userSchema.methods.generatePhoneVerificationCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  
  this.phoneVerificationCode = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');
  
  this.phoneVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return code;
};

/**
 * Instance method to verify phone code
 */
userSchema.methods.verifyPhoneCode = function(code) {
  const hashedCode = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');
  
  return this.phoneVerificationCode === hashedCode && 
         this.phoneVerificationExpires > Date.now();
};

/**
 * Instance method to handle failed login attempts
 */
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // 30 minutes
  }
  
  return this.updateOne(updates);
};

/**
 * Instance method to reset login attempts
 */
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

/**
 * Static method to find user by email with password
 */
userSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email }).select('+password +loginAttempts +lockUntil');
};

/**
 * Static method to get active users by role
 */
userSchema.statics.getActiveUsersByRole = function(role, department = null) {
  const query = { role, isActive: true };
  if (department && (role === 'officer' || role === 'mitra')) {
    query.department = department;
  }
  return this.find(query).sort({ name: 1 });
};

/**
 * Static method to get user statistics
 */
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        verified: { $sum: { $cond: ['$isPhoneVerified', 1, 0] } }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  
  return stats;
};

const User = mongoose.model('User', userSchema);

export default User;