const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

const formatPhoneNumber = (phone) => {
  if (!phone) return phone;
  let cleaned = phone.replace(/\D/g, ''); // Remove non-digits
  
  // Sri Lanka specific logic
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+94' + cleaned.substring(1);
  }
  if (cleaned.startsWith('94') && cleaned.length === 11) {
    return '+' + cleaned;
  }
  if (cleaned.length === 9) {
    return '+94' + cleaned;
  }
  
  return phone.startsWith('+') ? phone : '+' + cleaned;
};

/**
 * Send SMS Utility
 * @param {string} to - Recipient phone number
 * @param {string} message - Message content
 */
const sendSMS = async (to, message) => {
  const formattedTo = formatPhoneNumber(to);
  if (client && fromNumber) {
    try {
      const response = await client.messages.create({
        body: message,
        from: fromNumber,
        to: formattedTo
      });
      console.log(`[SMS SENT] SID: ${response.sid}`);
      return response;
    } catch (err) {
      console.error('[SMS FAILED]', err.message);
      // Fallback to mock log in development
      console.log(`[SMS MOCK FALLBACK] To: ${to} | Message: ${message}`);
    }
  } else {
    // Development Mock
    console.log(`[SMS MOCK] To: ${to} | Message: ${message}`);
  }
};

/**
 * Send WhatsApp Utility
 * @param {string} to - Recipient phone number
 * @param {string} message - Message content
 */
const sendWhatsApp = async (to, message) => {
  const formattedTo = formatPhoneNumber(to);
  if (client && fromNumber) {
    try {
      const response = await client.messages.create({
        body: message,
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${formattedTo}`
      });
      console.log(`[WHATSAPP SENT] SID: ${response.sid}`);
      return response;
    } catch (err) {
      console.error('[WHATSAPP FAILED]', err.message);
      // Fallback to mock log in development
      console.log(`[WHATSAPP MOCK FALLBACK] To: ${to} | Message: ${message}`);
    }
  } else {
    // Development Mock
    console.log(`[WHATSAPP MOCK] To: ${to} | Message: ${message}`);
  }
};

module.exports = { sendSMS, sendWhatsApp };

