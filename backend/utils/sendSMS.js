import twilio from 'twilio';

/**
 * SMS Service Configuration
 */
const SMS_PROVIDERS = {
  TWILIO: 'twilio',
  DEMO: 'demo'
};

/**
 * Initialize SMS client based on environment
 */
const initializeSMSClient = () => {
  // Check if Twilio credentials are available
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      console.log('✅ Twilio SMS client initialized successfully'.green);
      return {
        provider: SMS_PROVIDERS.TWILIO,
        client,
        fromNumber: process.env.TWILIO_PHONE_NUMBER
      };
    } catch (error) {
      console.error('❌ Failed to initialize Twilio client:', error.message);
    }
  }

  // Fallback to demo mode
  console.warn('⚠️  SMS credentials not configured. Using demo mode.'.yellow);
  return {
    provider: SMS_PROVIDERS.DEMO,
    client: null,
    fromNumber: null
  };
};

// Initialize SMS configuration
const smsConfig = initializeSMSClient();

/**
 * Format phone number for SMS sending
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle Indian phone numbers
  if (cleaned.length === 10 && cleaned.match(/^[6-9]/)) {
    return `+91${cleaned}`;
  }
  
  // If already has country code
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  
  // If already formatted
  if (cleaned.length === 13 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  
  // Default: assume it's already properly formatted
  return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
};

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid
 */
const isValidPhoneNumber = (phoneNumber) => {
  const formatted = formatPhoneNumber(phoneNumber);
  // Check for Indian mobile number format: +91[6-9]XXXXXXXXX
  return /^\+91[6-9]\d{9}$/.test(formatted);
};

/**
 * Send SMS using configured provider
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Send result
 */
export const sendSMS = async (phoneNumber, message, options = {}) => {
  try {
    // Validate inputs
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }
    
    if (!message) {
      throw new Error('SMS message is required');
    }
    
    if (message.length > 1600) {
      throw new Error('SMS message too long (max 1600 characters)');
    }

    // Format and validate phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    if (!isValidPhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    // Send SMS based on provider
    switch (smsConfig.provider) {
      case SMS_PROVIDERS.TWILIO:
        return await sendTwilioSMS(formattedNumber, message, options);
        
      case SMS_PROVIDERS.DEMO:
      default:
        return sendDemoSMS(formattedNumber, message, options);
    }

  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
    
    return {
      success: false,
      message: 'Failed to send SMS',
      error: process.env.NODE_ENV === 'development' ? error.message : 'SMS service error',
      provider: smsConfig.provider
    };
  }
};

/**
 * Send SMS using Twilio
 * @param {string} phoneNumber - Formatted phone number
 * @param {string} message - SMS message
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Send result
 */
const sendTwilioSMS = async (phoneNumber, message, options = {}) => {
  try {
    const messageOptions = {
      body: message,
      from: smsConfig.fromNumber,
      to: phoneNumber,
      ...options
    };

    // Add status callback URL if configured
    if (process.env.TWILIO_STATUS_CALLBACK_URL) {
      messageOptions.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
    }

    const result = await smsConfig.client.messages.create(messageOptions);
    
    console.log(`📱 SMS sent via Twilio to ${phoneNumber}`.green);
    console.log(`Message SID: ${result.sid}`);
    
    return {
      success: true,
      message: 'SMS sent successfully',
      provider: SMS_PROVIDERS.TWILIO,
      messageId: result.sid,
      status: result.status,
      to: result.to,
      from: result.from,
      cost: result.price ? `${result.priceUnit} ${result.price}` : null
    };

  } catch (error) {
    console.error('❌ Twilio SMS error:', error.message);
    
    // Handle Twilio-specific errors
    let errorMessage = 'SMS service error';
    
    if (error.code === 21211) {
      errorMessage = 'Invalid phone number';
    } else if (error.code === 21608) {
      errorMessage = 'Phone number is not verified for trial account';
    } else if (error.code === 21614) {
      errorMessage = 'Phone number is not a valid mobile number';
    } else if (error.code === 20003) {
      errorMessage = 'Authentication failed - check Twilio credentials';
    } else if (error.code === 20404) {
      errorMessage = 'Twilio phone number not found';
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Send demo SMS (for development/testing)
 * @param {string} phoneNumber - Phone number
 * @param {string} message - SMS message
 * @param {Object} options - Additional options
 * @returns {Object} - Demo result
 */
const sendDemoSMS = (phoneNumber, message, options = {}) => {
  console.log('📱 Demo SMS:'.blue);
  console.log(`To: ${phoneNumber}`);
  console.log(`Message: ${message}`);
  console.log('---');
  
  return {
    success: true,
    message: 'SMS logged in demo mode',
    provider: SMS_PROVIDERS.DEMO,
    messageId: 'demo-' + Date.now(),
    status: 'sent',
    to: phoneNumber,
    from: 'i-Mitra Demo',
    cost: null
  };
};

/**
 * Send bulk SMS messages
 * @param {Array} recipients - Array of {phoneNumber, message} objects
 * @param {Object} commonOptions - Common options for all messages
 * @returns {Promise<Array>} - Array of send results
 */
export const sendBulkSMS = async (recipients, commonOptions = {}) => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('Recipients array is required and must not be empty');
  }

  console.log(`📱 Sending bulk SMS to ${recipients.length} recipients...`.blue);

  const results = [];
  const batchSize = 10; // Send in smaller batches for SMS

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (recipient) => {
      try {
        const result = await sendSMS(
          recipient.phoneNumber, 
          recipient.message || commonOptions.message, 
          { ...commonOptions, ...recipient.options }
        );
        
        return {
          phoneNumber: recipient.phoneNumber,
          ...result
        };
      } catch (error) {
        return {
          phoneNumber: recipient.phoneNumber,
          success: false,
          error: error.message
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add delay between batches to avoid rate limiting
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  console.log(`📱 Bulk SMS complete: ${successCount} sent, ${failureCount} failed`.cyan);

  return results;
};

/**
 * Send templated SMS
 * @param {string} template - Template name
 * @param {Object} data - Template data
 * @param {string} phoneNumber - Recipient phone number
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Send result
 */
export const sendTemplatedSMS = async (template, data, phoneNumber, options = {}) => {
  const templates = {
    welcome: `Welcome to i-Mitra! Your account has been created. Phone verification code: ${data.code}. Valid for 10 minutes.`,
    
    phoneVerification: `Your i-Mitra phone verification code is: ${data.code}. Valid for 10 minutes. Do not share this code.`,
    
    passwordReset: `Your i-Mitra password reset code is: ${data.code}. Valid for 10 minutes. If you didn't request this, ignore this message.`,
    
    complaintCreated: `Your complaint has been registered. ID: ${data.complaintId}. Track status at ${process.env.FRONTEND_URL}/complaints/${data.complaintId}`,
    
    complaintAssigned: `Update: Your complaint ${data.complaintId} has been assigned to ${data.department}. You'll receive updates soon.`,
    
    complaintResolved: `Good news! Your complaint ${data.complaintId} has been resolved. Please provide feedback at ${process.env.FRONTEND_URL}/complaints/${data.complaintId}`,
    
    slaWarning: `Reminder: Your complaint ${data.complaintId} is approaching SLA deadline. Expected resolution: ${data.deadline}`,
    
    slaBreach: `Alert: Your complaint ${data.complaintId} has exceeded SLA deadline. It has been escalated for priority resolution.`,
    
    mitraAssigned: `New assignment: Complaint ${data.complaintId} in ${data.location}. Priority: ${data.priority}. View details in your dashboard.`,
    
    mitraReminder: `Reminder: Complaint ${data.complaintId} requires attention. SLA deadline: ${data.deadline}. Please update status.`
  };

  const messageTemplate = templates[template];
  if (!messageTemplate) {
    throw new Error(`SMS template '${template}' not found`);
  }

  return await sendSMS(phoneNumber, messageTemplate, options);
};

/**
 * Get SMS service status and configuration
 * @returns {Object} - Service status
 */
export const getSMSServiceStatus = () => {
  return {
    provider: smsConfig.provider,
    isConfigured: smsConfig.provider === SMS_PROVIDERS.TWILIO,
    fromNumber: smsConfig.fromNumber,
    environment: process.env.NODE_ENV || 'development',
    features: {
      bulkSMS: true,
      templatedSMS: true,
      statusCallbacks: !!process.env.TWILIO_STATUS_CALLBACK_URL,
      internationalSMS: smsConfig.provider === SMS_PROVIDERS.TWILIO
    }
  };
};

/**
 * Validate SMS configuration
 * @returns {Object} - Validation result
 */
export const validateSMSConfig = async () => {
  try {
    if (smsConfig.provider === SMS_PROVIDERS.DEMO) {
      return {
        isValid: true,
        provider: SMS_PROVIDERS.DEMO,
        message: 'Demo mode - no real SMS will be sent'
      };
    }

    // Test Twilio configuration
    if (smsConfig.provider === SMS_PROVIDERS.TWILIO) {
      // Try to fetch account info to validate credentials
      const account = await smsConfig.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      return {
        isValid: true,
        provider: SMS_PROVIDERS.TWILIO,
        message: 'Twilio configuration is valid',
        accountSid: account.sid,
        accountStatus: account.status,
        fromNumber: smsConfig.fromNumber
      };
    }

    return {
      isValid: false,
      provider: 'unknown',
      message: 'No SMS provider configured'
    };

  } catch (error) {
    return {
      isValid: false,
      provider: smsConfig.provider,
      message: `SMS configuration error: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Configuration error'
    };
  }
};

export default sendSMS;