const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

// Helper to get environment variables handling extra spaces
const getCleanEnvVar = (baseKey) => {
    const keysToCheck = [
        `${baseKey} `,
        ` ${baseKey}`,
        baseKey
    ];
    for (const k of keysToCheck) {
        if (process.env[k] !== undefined) {
            const val = process.env[k].trim();
            if (val) return val;
        }
    }
    return null;
};

// Cleaned Configuration
const EMAIL_USER = getCleanEnvVar('EMAIL_USER');
const EMAIL_PASS = getCleanEnvVar('EMAIL_PASS');
const GMAIL_CLIENT_ID = getCleanEnvVar('GMAIL_CLIENT_ID');
const GMAIL_CLIENT_SECRET = getCleanEnvVar('GMAIL_CLIENT_SECRET');
const GMAIL_REFRESH_TOKEN = getCleanEnvVar('GMAIL_REFRESH_TOKEN');

const RATE_LIMIT_MS = 2000; // 2 seconds delay between emails
const MAX_RETRIES = 3;

// Initialize SMTP Transporter as fallback/primary SMTP
let smtpTransporter = null;
if (EMAIL_USER && EMAIL_PASS) {
    smtpTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });
}

const isApiConfigured = !!(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN);

console.log('✉️ Email Service Initialized:');
console.log(`   - Sender: ${EMAIL_USER || 'Not Configured'}`);
console.log(`   - Gmail API support: ${isApiConfigured ? 'Available' : 'Not Configured'}`);
console.log(`   - Gmail SMTP support: ${smtpTransporter ? 'Available' : 'Not Configured'}`);

/**
 * Robust Email Queue
 */
class EmailQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    enqueue(mailOptions) {
        this.queue.push({ ...mailOptions, retries: 0 });
        this.processQueue().catch(err => {
            console.error('💥 Unhandled error in processQueue:', err);
        });
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const task = this.queue.shift();

        try {
            await this.attemptSendWithFallback(task);
        } catch (error) {
            console.error(`❌ Failed to send email to ${task.to} after all attempts/fallbacks:`, error.message);
            this.handleRetry(task);
        } finally {
            this.handleCompletion();
        }
    }

    async attemptSendWithFallback(task) {
        // Mode 1: Try Gmail REST API if configured
        if (isApiConfigured) {
            try {
                console.log(`✉️ Attempting to send email via Gmail REST API to ${task.to}...`);
                await this.sendViaGmailApi(task);
                return; // Success!
            } catch (apiError) {
                console.warn(`⚠️ Gmail REST API failed: ${apiError.message}`);
                if (apiError.response && apiError.response.data) {
                    console.warn('API Error details:', JSON.stringify(apiError.response.data));
                }
                // Fall through to SMTP fallback
            }
        }

        // Mode 2: Fall back to SMTP with App Password
        if (smtpTransporter) {
            console.log(`✉️ Attempting to send email via Gmail SMTP to ${task.to}...`);
            await this.sendViaSmtp(task);
            return; // Success!
        }

        throw new Error('No working email transporter configured (Gmail API and SMTP both unavailable or failed)');
    }

    async sendViaGmailApi(task) {
        // 1. Exchange refresh token for an access token
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: GMAIL_CLIENT_ID,
            client_secret: GMAIL_CLIENT_SECRET,
            refresh_token: GMAIL_REFRESH_TOKEN,
            grant_type: 'refresh_token'
        });

        const accessToken = tokenResponse.data.access_token;

        // 2. Build MIME email
        const emailLines = [
            `To: ${task.to}`,
            `Subject: =?utf-8?B?${Buffer.from(task.subject).toString('base64')}?=`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            'Content-Transfer-Encoding: 7bit',
            '',
            task.html
        ];
        const email = emailLines.join('\r\n');
        const base64SafeUrlRaw = Buffer.from(email)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // 3. Send via Gmail REST API
        await axios.post(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
            { raw: base64SafeUrlRaw },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(`✅ Email sent successfully via Gmail API to ${task.to}`);
    }

    async sendViaSmtp(task) {
        const mailOptions = {
            ...task,
            from: `KEC Slot Booking <${EMAIL_USER}>`
        };
        await smtpTransporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully via Gmail SMTP to ${task.to}`);
    }

    handleRetry(task) {
        if (task.retries < MAX_RETRIES) {
            task.retries++;
            console.log(`🔄 Re-queuing email to ${task.to} (Attempt ${task.retries + 1}/${MAX_RETRIES + 1})...`);
            this.queue.push(task);
        } else {
            console.error(`💀 Email to ${task.to} discarded after ${MAX_RETRIES} retries.`);
        }
    }

    handleCompletion() {
        setTimeout(() => {
            this.isProcessing = false;
            this.processQueue().catch(err => {
                console.error('💥 Unhandled error in processQueue completion:', err);
            });
        }, RATE_LIMIT_MS);
    }
}

const emailQueue = new EmailQueue();

const queueEmail = (to, subject, htmlContent) => {
    if (!EMAIL_USER) {
        console.warn('⚠️ Skipping email (No EMAIL_USER credentials configured):', subject);
        return;
    }

    const mailOptions = {
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
