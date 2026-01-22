const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Configuration
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS; // App Password for Gmail
const EMAIL_RATE_LIMIT_MS = 2000; // 2 seconds delay between emails
const MAX_RETRIES = 3;

// Check credentials but don't crash
if (!EMAIL_USER || !EMAIL_PASS) {
    console.error('⚠️ EMAIL_USER or EMAIL_PASS missing. Email sending will fail.');
}

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

/**
 * Simple In-Memory Email Queue
 */
class EmailQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    enqueue(mailOptions) {
        this.queue.push({ ...mailOptions, retries: 0 });
        this.processQueue();
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const currentEmail = this.queue.shift();

        try {
            await transporter.sendMail(currentEmail);
            console.log(`✅ Email sent to ${currentEmail.to}`);
        } catch (error) {
            console.error(`❌ Failed to send email to ${currentEmail.to}:`, error.message);

            // Retry logic
            if (currentEmail.retries < MAX_RETRIES) {
                currentEmail.retries++;
                console.log(`...Re-queuing (Attempt ${currentEmail.retries + 1}/${MAX_RETRIES + 1})`);
                this.queue.push(currentEmail);
            } else {
                console.error(`💀 Email discarded after ${MAX_RETRIES} retries.`);
            }
        }

        // Throttle next email
        setTimeout(() => {
            this.isProcessing = false;
            this.processQueue();
        }, EMAIL_RATE_LIMIT_MS);
    }
}

const emailQueue = new EmailQueue();

/**
 * Shared function to queue email
 */
const queueEmail = (to, subject, htmlContent) => {
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.warn('Skipping email (No credentials):', subject);
        return;
    }

    const mailOptions = {
        from: `KEC Slot Booking <${EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: htmlContent
    };

    emailQueue.enqueue(mailOptions);
};

// ==========================
// EMAIL TEMPLATE FUNCTIONS
// ==========================

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

    // Fire and forget (queued)
    queueEmail(userEmail, 'Slot Booking Confirmed!', htmlContent);
};

const notifyAdminEventFull = async (adminEmail, eventTitle, totalSlots) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
           <h2 style="color: #ef4444; text-align: center;">Event Reached Full Capacity</h2>
           <p>The event <strong>${eventTitle}</strong> is now full.</p>
           <p><strong>Total Slots filled:</strong> ${totalSlots}</p>
           <p>No more registrations will be accepted for this event unless someone cancels.</p>
        </div>
    `;
    queueEmail(adminEmail, `Alert: Event Full - ${eventTitle}`, htmlContent);
};

const sendSlotFullEmail = async (adminEmail, eventName, date, time) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
           <h2 style="color: #ef4444; text-align: center;">Slot Reached Full Capacity</h2>
           <p>The slot for event <strong>${eventName}</strong> has reached maximum capacity.</p>
           <p><strong>Date:</strong> ${date}</p>
           <p><strong>Time:</strong> ${time}</p>
        </div>
    `;
    queueEmail(adminEmail, `Alert: Slot Full - ${eventName}`, htmlContent);
};

const sendPasswordResetEmail = async (userEmail, token) => {
    let baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    baseUrl = baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/reset-password/${token}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4f46e5; text-align: center;">Password Reset Request</h2>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${url}" style="background-color: #4f46e5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
            </div>
            <p>If you didn't request this, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #6b7280; text-align: center;">This link expires in 10 minutes.</p>
        </div>
    `;
    queueEmail(userEmail, 'Password Reset Request', htmlContent);
};

const sendVerificationEmail = async (userEmail, userName, verificationToken) => {
    let baseUrl = process.env.BASE_URL || 'http://localhost:3001';
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
    queueEmail(userEmail, 'Verify Your Email - KEC Slot Booking', htmlContent);
};

module.exports = {
    sendBookingConfirmation,
    notifyAdminEventFull,
    sendVerificationEmail,
    sendSlotFullEmail,
    sendPasswordResetEmail
};
