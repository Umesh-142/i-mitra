const twilio = require('twilio');

// Initialize Twilio client (fallback to demo mode if no credentials)
let client;
const isEnabled = process.env.TWILIO_ACCOUNT_SID && 
                 process.env.TWILIO_AUTH_TOKEN && 
                 process.env.TWILIO_ACCOUNT_SID !== 'demo_sid';

if (isEnabled) {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const sendSMS = async (to, message) => {
  try {
    if (!isEnabled) {
      console.log('📱 SMS Demo Mode - Would send:', { to, message });
      return { success: true, demo: true };
    }

    // Format phone number (add +91 for India if not present)
    let formattedPhone = to;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+91${formattedPhone}`;
    }

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    console.log('📱 SMS sent successfully:', result.sid);
    return { success: true, sid: result.sid };

  } catch (error) {
    console.error('❌ SMS sending failed:', error);
    throw error;
  }
};

module.exports = sendSMS;