import nodemailer from 'nodemailer';

/**
 * Send email using Nodemailer
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Email message (plain text)
 * @param {string} [options.html] - Email message (HTML)
 * @param {string} [options.from] - Sender email (optional)
 * @returns {Promise<Object>} - Send result
 */
export const sendEmail = async (options) => {
  try {
    // Validate required options
    if (!options.email) {
      throw new Error('Recipient email is required');
    }
    
    if (!options.subject) {
      throw new Error('Email subject is required');
    }
    
    if (!options.message && !options.html) {
      throw new Error('Email message or HTML content is required');
    }

    // Create transporter based on environment
    let transporter;
    
    if (process.env.NODE_ENV === 'production') {
      // Production email configuration
      if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️  SMTP configuration incomplete. Email will not be sent.'.yellow);
        return {
          success: false,
          message: 'SMTP configuration incomplete'
        };
      }

      transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    } else {
      // Development - use Ethereal Email for testing
      try {
        const testAccount = await nodemailer.createTestAccount();
        
        transporter = nodemailer.createTransporter({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        
        console.log('📧 Using Ethereal Email for development'.cyan);
      } catch (error) {
        console.warn('⚠️  Failed to create test account, using demo mode'.yellow);
        
        // Demo mode - just log the email
        console.log('📧 Demo Email:'.blue);
        console.log(`To: ${options.email}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Message: ${options.message || 'HTML content provided'}`);
        console.log('---');
        
        return {
          success: true,
          message: 'Email logged in demo mode',
          messageId: 'demo-' + Date.now()
        };
      }
    }

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('✅ Email transporter verified successfully'.green);
    } catch (error) {
      console.error('❌ Email transporter verification failed:', error.message);
      throw new Error('Email service configuration error');
    }

    // Email options
    const mailOptions = {
      from: options.from || process.env.FROM_EMAIL || 'i-Mitra <noreply@imitra.gov.in>',
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">i-Mitra</h1>
            <p style="color: #f0f0f0; margin: 5px 0 0 0;">Indore Smart City</p>
          </div>
          <div style="padding: 30px 20px; background: #f9f9f9;">
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              ${options.message.split('\n').map(line => `<p style="margin: 15px 0; line-height: 1.6;">${line}</p>`).join('')}
            </div>
          </div>
          <div style="padding: 20px; text-align: center; background: #333; color: #888;">
            <p style="margin: 0; font-size: 12px;">
              This email was sent from i-Mitra Grievance Management System<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    // Log success
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email sent successfully:'.green);
      console.log(`Message ID: ${info.messageId}`);
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      console.log(`📧 Email sent to ${options.email} successfully`.green);
    }

    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      previewUrl: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : null
    };

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    
    // Return error details for debugging
    return {
      success: false,
      message: 'Failed to send email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Email service error'
    };
  }
};

/**
 * Send bulk emails
 * @param {Array} recipients - Array of email options objects
 * @param {Object} commonOptions - Common options for all emails
 * @returns {Promise<Array>} - Array of send results
 */
export const sendBulkEmails = async (recipients, commonOptions = {}) => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('Recipients array is required and must not be empty');
  }

  console.log(`📧 Sending bulk emails to ${recipients.length} recipients...`.blue);

  const results = [];
  const batchSize = 5; // Send in batches to avoid overwhelming the SMTP server

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (recipient) => {
      const emailOptions = {
        ...commonOptions,
        ...recipient
      };
      
      try {
        const result = await sendEmail(emailOptions);
        return {
          email: recipient.email,
          ...result
        };
      } catch (error) {
        return {
          email: recipient.email,
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

  console.log(`📧 Bulk email complete: ${successCount} sent, ${failureCount} failed`.cyan);

  return results;
};

/**
 * Send templated email
 * @param {string} template - Template name
 * @param {Object} data - Template data
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Send result
 */
export const sendTemplatedEmail = async (template, data, options) => {
  const templates = {
    welcome: {
      subject: 'Welcome to i-Mitra - Account Created Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to i-Mitra!</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Indore Smart City Grievance Management</p>
          </div>
          <div style="padding: 40px 30px; background: #f8f9fa;">
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Hello ${data.name}!</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #555;">
                Your account has been created successfully. Here are your account details:
              </p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Email:</strong> ${data.email}</p>
                <p style="margin: 5px 0;"><strong>Role:</strong> ${data.role}</p>
                ${data.department ? `<p style="margin: 5px 0;"><strong>Department:</strong> ${data.department}</p>` : ''}
                ${data.employeeId ? `<p style="margin: 5px 0;"><strong>Employee ID:</strong> ${data.employeeId}</p>` : ''}
              </div>
              <p style="font-size: 16px; line-height: 1.6; color: #555;">
                Please verify your phone number using the SMS code sent to your registered number.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/login" 
                   style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Login to Your Account
                </a>
              </div>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; background: #333; color: #888;">
            <p style="margin: 0; font-size: 12px;">
              This email was sent from i-Mitra Grievance Management System<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    },
    
    passwordReset: {
      subject: 'i-Mitra - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">i-Mitra Account Security</p>
          </div>
          <div style="padding: 40px 30px; background: #f8f9fa;">
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #555;">
                You requested a password reset for your i-Mitra account. Click the button below to reset your password:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetUrl}" 
                   style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              <p style="font-size: 14px; color: #666; border-left: 4px solid #ffc107; padding-left: 15px; margin: 20px 0;">
                <strong>Security Notice:</strong> This link will expire in 10 minutes for your security.
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #555;">
                If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
              </p>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; background: #333; color: #888;">
            <p style="margin: 0; font-size: 12px;">
              This email was sent from i-Mitra Grievance Management System<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    },
    
    complaintUpdate: {
      subject: `Complaint Update - ${data.complaintId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Complaint Update</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">i-Mitra Grievance Management</p>
          </div>
          <div style="padding: 40px 30px; background: #f8f9fa;">
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Hello ${data.citizenName}!</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #555;">
                There's an update on your complaint:
              </p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Complaint ID:</strong> ${data.complaintId}</p>
                <p style="margin: 5px 0;"><strong>Title:</strong> ${data.title}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> 
                  <span style="background: ${data.statusColor || '#007bff'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    ${data.status}
                  </span>
                </p>
                <p style="margin: 5px 0;"><strong>Department:</strong> ${data.department}</p>
              </div>
              ${data.remarks ? `
                <div style="border-left: 4px solid #007bff; padding-left: 15px; margin: 20px 0;">
                  <p style="margin: 0; font-weight: bold; color: #007bff;">Latest Update:</p>
                  <p style="margin: 5px 0 0 0; color: #555;">${data.remarks}</p>
                </div>
              ` : ''}
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/complaints/${data.complaintId}" 
                   style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  View Complaint Details
                </a>
              </div>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; background: #333; color: #888;">
            <p style="margin: 0; font-size: 12px;">
              This email was sent from i-Mitra Grievance Management System<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    }
  };

  const templateConfig = templates[template];
  if (!templateConfig) {
    throw new Error(`Email template '${template}' not found`);
  }

  const emailOptions = {
    ...options,
    subject: templateConfig.subject,
    html: templateConfig.html
  };

  return await sendEmail(emailOptions);
};

export default sendEmail;