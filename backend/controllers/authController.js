const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { ErrorResponse, asyncHandler } = require('../middleware/errorHandler');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res, next) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const {
    name,
    email,
    phone,
    password,
    role,
    department,
    employeeId,
    address,
    zone,
    assignedOfficer
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { phone }]
  });

  if (existingUser) {
    return next(new ErrorResponse('User with this email or phone already exists', 400));
  }

  // Check if employee ID already exists for officers/mitra
  if ((role === 'officer' || role === 'mitra') && employeeId) {
    const existingEmployee = await User.findOne({ employeeId });
    if (existingEmployee) {
      return next(new ErrorResponse('Employee ID already exists', 400));
    }
  }

  // Create user object
  const userData = {
    name,
    email,
    phone,
    password,
    role
  };

  // Add role-specific fields
  if (role === 'citizen') {
    userData.address = address;
    userData.zone = zone;
  } else if (role === 'officer' || role === 'mitra') {
    userData.department = department;
    userData.employeeId = employeeId;
    
    if (role === 'mitra' && assignedOfficer) {
      userData.assignedOfficer = assignedOfficer;
    }
  }

  // Create user
  const user = await User.create(userData);

  // Generate token and send response
  sendTokenResponse(user, 201, res, 'User registered successfully');
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email, password } = req.body;

  // Check for user (include password for comparison)
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  if (!user.isActive) {
    return next(new ErrorResponse('Account is deactivated', 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  sendTokenResponse(user, 200, res, 'Login successful');
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate('assignedOfficer', 'name email');

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user details
// @route   PUT /api/auth/update-details
// @access  Private
const updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    phone: req.body.phone,
    preferredLanguage: req.body.preferredLanguage
  };

  // Role-specific updates
  if (req.user.role === 'citizen') {
    fieldsToUpdate.address = req.body.address;
    fieldsToUpdate.zone = req.body.zone;
  }

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user,
    message: 'Profile updated successfully'
  });
});

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
const updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password updated successfully');
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }

  // Get reset token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  // Create reset url
  const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset token',
      message
    });

    res.status(200).json({
      success: true,
      message: 'Email sent'
    });
  } catch (err) {
    console.log(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid token', 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password reset successful');
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Send phone verification code
// @route   POST /api/auth/send-phone-verification
// @access  Private
const sendPhoneVerification = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (user.isPhoneVerified) {
    return next(new ErrorResponse('Phone number already verified', 400));
  }

  // Generate verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash and save
  user.phoneVerificationToken = crypto
    .createHash('sha256')
    .update(verificationCode)
    .digest('hex');

  user.phoneVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  // Send SMS
  try {
    await sendSMS(user.phone, `Your i-Mitra verification code is: ${verificationCode}`);

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your phone'
    });
  } catch (err) {
    console.log(err);
    user.phoneVerificationToken = undefined;
    user.phoneVerificationExpire = undefined;
    await user.save();

    return next(new ErrorResponse('SMS could not be sent', 500));
  }
});

// @desc    Verify phone number
// @route   POST /api/auth/verify-phone
// @access  Private
const verifyPhone = asyncHandler(async (req, res, next) => {
  const { verificationCode } = req.body;

  if (!verificationCode) {
    return next(new ErrorResponse('Verification code is required', 400));
  }

  // Hash the verification code
  const hashedCode = crypto
    .createHash('sha256')
    .update(verificationCode)
    .digest('hex');

  const user = await User.findOne({
    _id: req.user.id,
    phoneVerificationToken: hashedCode,
    phoneVerificationExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired verification code', 400));
  }

  // Mark phone as verified
  user.isPhoneVerified = true;
  user.phoneVerificationToken = undefined;
  user.phoneVerificationExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Phone number verified successfully'
  });
});

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = {};
  if (req.query.role) {
    query.role = req.query.role;
  }
  if (req.query.department) {
    query.department = req.query.department;
  }
  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === 'true';
  }

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .populate('assignedOfficer', 'name email');

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    pagination: {
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    data: users
  });
});

// @desc    Get single user (Admin only)
// @route   GET /api/auth/users/:id
// @access  Private/Admin
const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('assignedOfficer', 'name email');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user (Admin only)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).select('-password');

  res.status(200).json({
    success: true,
    data: user,
    message: 'User updated successfully'
  });
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  await user.remove();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Get department mitra
// @route   GET /api/auth/department/:dept/mitra
// @access  Private/Officer,Admin
const getDepartmentMitra = asyncHandler(async (req, res, next) => {
  const department = req.params.dept;

  const mitra = await User.find({
    role: 'mitra',
    department,
    isActive: true
  }).select('name email phone employeeId');

  res.status(200).json({
    success: true,
    count: mitra.length,
    data: mitra
  });
});

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res, message) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      message,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        zone: user.zone,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified,
        preferredLanguage: user.preferredLanguage
      }
    });
};

module.exports = {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  logout,
  sendPhoneVerification,
  verifyPhone,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getDepartmentMitra
};