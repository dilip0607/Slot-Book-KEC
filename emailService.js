const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Create a transporter using SMTP
// Port 587 works locally, but some cloud providers (like Render) may block it
// Port 465 with secure:true is more reliable in production
const emailPort = parseInt(process.env.EMAIL_PORT) || 465;
const isSecure = emailPort === 465;

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: emailPort,
    secure: isSecure, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    pool: true, // Use a pool for multiple messages
    maxConnections: 1, // Minimize concurrent connections on free tier
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000,
    socketTimeout: 30000,
});

/**
 * Send booking confirmation email to user
 */
const sendBookingConfirmation = async (userEmail, userName, eventTitle, eventDate) => {
    try {
        console.log(`Attempting to send confirmation email to: ${userEmail}`);
        console.log(`Using EMAIL_USER: ${process.env.EMAIL_USER}`);

        const mailOptions = {
            from: `"KEC Slot Booking" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'Slot Booking Confirmed!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #4f46e5; text-align: center;">Booking Confirmed</h2>
                    <p>Hello <strong>${userName}</strong>,</p>
                    <p>Your slot for <strong>${eventTitle}</strong> has been successfully booked.</p>
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Event:</strong> ${eventTitle}</p>
                        <p style="margin: 0;"><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString()}</p>
                    </div>
                    <p>Please be on time and bring your identification.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #6b7280; text-align: center;">This is an automated email from KEC Slot Booking System.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Confirmation email sent successfully!');
        return info;
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        // We don't throw here to avoid failing the registration if email fails
    }
};

/**
 * Notify admin when an event is full
 */
const notifyAdminEventFull = async (adminEmail, eventTitle, totalSlots) => {
    try {
        const mailOptions = {
            from: `"KEC Slot Booking" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `Alert: Event Full - ${eventTitle}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                   <h2 style="color: #ef4444; text-align: center;">Event Reached Full Capacity</h2>
                   <p>The event <strong>${eventTitle}</strong> is now full.</p>
                   <p><strong>Total Slots filled:</strong> ${totalSlots}</p>
                   <p>No more registrations will be accepted for this event unless someone cancels.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Admin notification sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending admin notification:', error);
    }
};

/**
 * Send email verification link to user
 */
const sendVerificationEmail = async (userEmail, userName, verificationToken) => {
    try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
        const verificationUrl = `${baseUrl}/api/auth/verify/${verificationToken}`;

        const mailOptions = {
            from: `"KEC Slot Booking" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'Verify Your Email - KEC Slot Booking',
            html: `
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
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Verification email sent successfully!');
        return info;
    } catch (error) {
        console.error('Error sending verification email:', error);
    }
};

module.exports = {
    sendBookingConfirmation,
    notifyAdminEventFull,
    sendVerificationEmail
};
