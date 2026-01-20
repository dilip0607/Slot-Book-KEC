const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Shared function to send email via Brevo API
 */
const sendEmailViaBrevo = async (toEmail, subject, htmlContent) => {
    try {
        const apiKey = process.env.EMAIL_API_KEY;
        const senderEmail = process.env.EMAIL_USER;

        if (!apiKey) {
            console.error('❌ EMAIL_API_KEY is missing in environment variables');
            return;
        }

        const data = {
            sender: { email: senderEmail, name: "KEC Slot Booking" },
            to: [{ email: toEmail }],
            subject: subject,
            htmlContent: htmlContent
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', data, {
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            }
        });

        console.log(`✅ Email sent via Brevo API to ${toEmail}. Message ID: ${response.data.messageId}`);
        return response.data;
    } catch (error) {
        console.error('❌ Error sending email via Brevo:', error.response?.data || error.message);
    }
};

/**
 * Send booking confirmation email to user
 */
const sendBookingConfirmation = async (userEmail, userName, eventTitle, eventDate, startTime, endTime) => {
    const formattedDate = new Date(eventDate).toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    });

    const formatTime = (date) => new Date(date).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
    });

    const timeRange = `${formatTime(startTime)} to ${formatTime(endTime)}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4f46e5; text-align: center;">Booking Confirmed</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your slot for <strong>${eventTitle}</strong> has been successfully booked.</p>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Event:</strong> ${eventTitle}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> ${timeRange}</p>
            </div>
            <p>Please be on time and bring your identification.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #6b7280; text-align: center;">This is an automated email from KEC Slot Booking System.</p>
        </div>
    `;
    return await sendEmailViaBrevo(userEmail, 'Slot Booking Confirmed!', htmlContent);
};

/**
 * Notify admin when an event is full
 */
const notifyAdminEventFull = async (adminEmail, eventTitle, totalSlots) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
           <h2 style="color: #ef4444; text-align: center;">Event Reached Full Capacity</h2>
           <p>The event <strong>${eventTitle}</strong> is now full.</p>
           <p><strong>Total Slots filled:</strong> ${totalSlots}</p>
           <p>No more registrations will be accepted for this event unless someone cancels.</p>
        </div>
    `;
    return await sendEmailViaBrevo(adminEmail, `Alert: Event Full - ${eventTitle}`, htmlContent);
};

/**
 * Send email verification link to user
 */
const sendVerificationEmail = async (userEmail, userName, verificationToken) => {
    let baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    // Remove trailing slash if present to avoid double slashes
    baseUrl = baseUrl.replace(/\/$/, '');

    const verificationUrl = `${baseUrl}/api/auth/verify/${verificationToken}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4f46e5; text-align: center;">Welcome to KEC Slot Booking</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Thank you for registering. Please verify your email by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${verificationUrl}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #6b7280; text-align: center;">This link will expire in 24 hours.</p>
        </div>
    `;
    return await sendEmailViaBrevo(userEmail, 'Verify Your Email - KEC Slot Booking', htmlContent);
};

module.exports = {
    sendBookingConfirmation,
    notifyAdminEventFull,
    sendVerificationEmail
};
