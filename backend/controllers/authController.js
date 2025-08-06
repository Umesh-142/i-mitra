import crypto from 'crypto';
import { asyncHandler, ErrorResponse } from '../middleware/errorHandler.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';
import { sendSMS } from '../utils/sendSMS.js';

/**
 * Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    phoneNumber,
    address,
    zone,
    role = 'citizen',
    department,
    employeeId,
    designation
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [
      { email },
      { phoneNumber }
    ]
  });

  if (existingUser) {
    if (existingUser.email === email) {
      return next(new ErrorResponse('User with this email already exists', 400));
    }
    if (existingUser.phoneNumber === phoneNumber) {
      return next(new ErrorResponse('User with this phone number already exists', 400));
    }
  }

  // Validate role-specific requirements
  if ((role === 'officer' || role === 'mitra') && !department) {
    return next(new ErrorResponse('Department is required for officers and mitra', 400));
  }

  if ((role === 'officer' || role === 'mitra') && !designation) {
    return next(new ErrorResponse('Designation is required for officers and mitra', 400));
  }

  // Check for duplicate employee ID
  if (employeeId) {
    const existingEmployee = await User.findOne({ employeeId });
    if (existingEmployee) {
      return next(new ErrorResponse('Employee ID already exists', 400));
    }
  }

  try {
    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phoneNumber,
      address,
      zone,
      role,
      ...(role !== 'citizen' && { department, employeeId, designation })
    });

    // Generate phone verification code
    const verificationCode = user.generatePhoneVerificationCode();
    await user.save();

    // Send verification SMS
    try {
      await sendSMS(phoneNumber, 
        `Welcome to i-Mitra! Your phone verification code is: ${verificationCode}. Valid for 10 minutes.`
      );
    } catch (smsError) {
      console.warn('Failed to send verification SMS:', smsError.message);
    }

    // Send welcome email
    try {
      const welcomeMessage = `
        Welcome to i-Mitra - Indore Smart City Grievance Management System!
        
        Your account has been created successfully:
        - Email: ${email}
        - Role: ${role}
        ${role !== 'citizen' ? `- Department: ${department}` : ''}
        ${role !== 'citizen' ? `- Employee ID: ${employeeId}` : ''}
        
        Please verify your phone number using the SMS code sent to ${phoneNumber}.
        
        Thank you for joining i-Mitra!
      `;

      await sendEmail({
        email,
        subject: 'Welcome to i-Mitra - Account Created Successfully',
        message: welcomeMessage
      });
    } catch (emailError) {
      console.warn('Failed to send welcome email:', emailError.message);
    }

    // Generate JWT token
    const token = user.getSignedJwtToken();

    // Set cookie options
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.status(201)
      .cookie('token', token, cookieOptions)
      .json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            department: user.department,
            zone: user.zone,
            isPhoneVerified: user.isPhoneVerified,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt
          },
          token,
          expiresIn: '7d'
        }
      });

  } catch (error) {
    console.error('Registration error:', error);
    return next(new ErrorResponse('Error creating user account', 500));
  }
});

/**
 * Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user with password field
  const user = await User.findByEmailWithPassword(email);

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if account is locked
  if (user.isLocked) {
    return next(new ErrorResponse('Account temporarily locked due to too many failed login attempts', 423));
  }

  // Check if account is active
  if (!user.isActive) {
    return next(new ErrorResponse('Account has been deactivated', 401));
  }

  // Check password
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    // Increment login attempts
    await user.incLoginAttempts();
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate token
  const token = user.getSignedJwtToken();

  // Set cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Log successful login
  console.log(`✅ User login successful: ${email} (${user.role})`.green);

  res.status(200)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          department: user.department,
          zone: user.zone,
          isPhoneVerified: user.isPhoneVerified,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin,
          preferences: user.preferences
        },
        token,
        expiresIn: '7d'
      }
    });
});

/**
 * Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res, next) => {
  // Clear cookie
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
});

/**
 * Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .populate('createdBy', 'name email')
    .populate('lastUpdatedBy', 'name email');

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
        designation: user.designation,
        address: user.address,
        zone: user.zone,
        isActive: user.isActive,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        createdBy: user.createdBy,
        lastUpdatedBy: user.lastUpdatedBy
      }
    }
  });
});

/**
 * Update user details
 * @route   PUT /api/auth/update-details
 * @access  Private
 */
export const updateDetails = asyncHandler(async (req, res, next) => {
  const allowedFields = [
    'name', 'phoneNumber', 'address', 'zone', 'preferences', 'designation'
  ];

  // Filter allowed fields
  const fieldsToUpdate = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      fieldsToUpdate[key] = req.body[key];
    }
  });

  // Check if phone number is being changed and if it already exists
  if (fieldsToUpdate.phoneNumber && fieldsToUpdate.phoneNumber !== req.user.phoneNumber) {
    const existingUser = await User.findOne({ 
      phoneNumber: fieldsToUpdate.phoneNumber,
      _id: { $ne: req.user._id }
    });

    if (existingUser) {
      return next(new ErrorResponse('Phone number already exists', 400));
    }

    // Reset phone verification if phone number changed
    fieldsToUpdate.isPhoneVerified = false;
  }

  // Update user
  fieldsToUpdate.lastUpdatedBy = req.user._id;
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: 'User details updated successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        department: user.department,
        address: user.address,
        zone: user.zone,
        isPhoneVerified: user.isPhoneVerified,
        preferences: user.preferences,
        updatedAt: user.updatedAt
      }
    }
  });
});

/**
 * Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
export const updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorResponse('Current password is incorrect', 401));
  }

  // Check if new password is different from current
  const isSamePassword = await user.matchPassword(newPassword);
  if (isSamePassword) {
    return next(new ErrorResponse('New password must be different from current password', 400));
  }

  // Update password
  user.password = newPassword;
  user.lastUpdatedBy = req.user._id;
  await user.save();

  // Generate new token
  const token = user.getSignedJwtToken();

  // Set cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.status(200)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message: 'Password updated successfully',
      data: {
        token,
        expiresIn: '7d'
      }
    });
});

/**
 * Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorResponse('No user found with that email', 404));
  }

  if (!user.isActive) {
    return next(new ErrorResponse('Account has been deactivated', 401));
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const message = `
    You are receiving this email because you (or someone else) has requested the reset of a password.
    
    Please click on the following link or paste it into your browser to complete the process:
    
    ${resetUrl}
    
    This link will expire in 10 minutes.
    
    If you did not request this, please ignore this email and your password will remain unchanged.
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'i-Mitra Password Reset Request',
      message
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

/**
 * Reset password
 * @route   PUT /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { token, password } = req.body;

  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired reset token', 400));
  }

  // Set new password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  // Generate token
  const jwtToken = user.getSignedJwtToken();

  // Set cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.status(200)
    .cookie('token', jwtToken, cookieOptions)
    .json({
      success: true,
      message: 'Password reset successful',
      data: {
        token: jwtToken,
        expiresIn: '7d'
      }
    });
});

/**
 * Send phone verification code
 * @route   POST /api/auth/send-phone-verification
 * @access  Public/Private
 */
export const sendPhoneVerification = asyncHandler(async (req, res, next) => {
  const { phoneNumber } = req.body;

  // Find user by phone number
  const user = await User.findOne({ phoneNumber });

  if (!user) {
    return next(new ErrorResponse('No user found with that phone number', 404));
  }

  if (user.isPhoneVerified) {
    return next(new ErrorResponse('Phone number is already verified', 400));
  }

  // Generate verification code
  const verificationCode = user.generatePhoneVerificationCode();
  await user.save({ validateBeforeSave: false });

  try {
    await sendSMS(phoneNumber, 
      `Your i-Mitra phone verification code is: ${verificationCode}. Valid for 10 minutes.`
    );

    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully'
    });
  } catch (error) {
    console.error('Failed to send verification SMS:', error);
    user.phoneVerificationCode = undefined;
    user.phoneVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('SMS could not be sent', 500));
  }
});

/**
 * Verify phone number
 * @route   POST /api/auth/verify-phone
 * @access  Public/Private
 */
export const verifyPhone = asyncHandler(async (req, res, next) => {
  const { phoneNumber, code } = req.body;

  const user = await User.findOne({ phoneNumber });

  if (!user) {
    return next(new ErrorResponse('No user found with that phone number', 404));
  }

  if (user.isPhoneVerified) {
    return next(new ErrorResponse('Phone number is already verified', 400));
  }

  // Verify code
  const isValidCode = user.verifyPhoneCode(code);

  if (!isValidCode) {
    return next(new ErrorResponse('Invalid or expired verification code', 400));
  }

  // Mark phone as verified
  user.isPhoneVerified = true;
  user.phoneVerificationCode = undefined;
  user.phoneVerificationExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Phone number verified successfully',
    data: {
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified
      }
    }
  });
});

/**
 * Refresh JWT token
 * @route   POST /api/auth/refresh-token
 * @access  Private
 */
export const refreshToken = asyncHandler(async (req, res, next) => {
  const user = req.user;

  // Generate new token
  const token = user.getSignedJwtToken();

  // Set cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.status(200)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token,
        expiresIn: '7d'
      }
    });
});

// Admin-only functions

/**
 * Get all users
 * @route   GET /api/auth/users
 * @access  Private/Admin
 */
export const getUsers = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    role,
    department,
    isActive,
    search,
    sort = '-createdAt'
  } = req.query;

  // Build filter
  const filter = {};
  
  if (role) filter.role = role;
  if (department) filter.department = department;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } }
    ];
  }

  // Execute query
  const users = await User.find(filter)
    .select('-password')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('createdBy', 'name email')
    .populate('lastUpdatedBy', 'name email');

  const total = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get single user
 * @route   GET /api/auth/users/:id
 * @access  Private/Admin
 */
export const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('createdBy', 'name email')
    .populate('lastUpdatedBy', 'name email');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { user }
  });
});

/**
 * Update user
 * @route   PUT /api/auth/users/:id
 * @access  Private/Admin
 */
export const updateUser = asyncHandler(async (req, res, next) => {
  const allowedFields = [
    'name', 'email', 'phoneNumber', 'role', 'department', 'employeeId',
    'designation', 'address', 'zone', 'isActive', 'isPhoneVerified',
    'isEmailVerified', 'preferences'
  ];

  // Filter allowed fields
  const fieldsToUpdate = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      fieldsToUpdate[key] = req.body[key];
    }
  });

  fieldsToUpdate.lastUpdatedBy = req.user._id;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: { user }
  });
});

/**
 * Delete user
 * @route   DELETE /api/auth/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Prevent admin from deleting themselves
  if (user._id.toString() === req.user._id.toString()) {
    return next(new ErrorResponse('You cannot delete your own account', 400));
  }

  // Soft delete - deactivate instead of removing
  user.isActive = false;
  user.deletedAt = new Date();
  user.deletedBy = req.user._id;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User deactivated successfully'
  });
});

/**
 * Get department mitra
 * @route   GET /api/auth/department/:department/mitra
 * @access  Private/Officer/Admin
 */
export const getDepartmentMitra = asyncHandler(async (req, res, next) => {
  const { department } = req.params;

  const mitra = await User.getActiveUsersByRole('mitra', department);

  res.status(200).json({
    success: true,
    data: {
      mitra,
      count: mitra.length
    }
  });
});