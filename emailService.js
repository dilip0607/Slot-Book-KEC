const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Configuration
const EMAIL_CONFIG = {
    primary: {
        user: process.env.EMAIL_USER_1 || process.env.EMAIL_USER, // Backwards compatibility
        pass: process.env.EMAIL_PASS_1 || process.env.EMAIL_PASS,
        limit: 500, // Daily limit (approx for free Gmail)
        count: 0,
        lastReset: Date.now()
    },
    secondary: {
        user: process.env.EMAIL_USER_2,
        pass: process.env.EMAIL_PASS_2,
        limit: 500,
        count: 0,
        lastReset: Date.now()
    }
};

const RATE_LIMIT_MS = 2000; // 2 seconds delay between emails
const MAX_RETRIES = 3;

// Reset counters every 24 hours
const resetCountersIfNeeded = (senderConfig) => {
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - senderConfig.lastReset > oneDay) {
        senderConfig.count = 0;
        senderConfig.lastReset = Date.now();
        console.log(`🔄 Reset daily email limit for ${senderConfig.user}`);
    }
};

// Create Transporters
const createTransporter = (user, pass) => {
    if (!user || !pass) return null;
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });
};

const transporters = {
    primary: createTransporter(EMAIL_CONFIG.primary.user, EMAIL_CONFIG.primary.pass),
    secondary: createTransporter(EMAIL_CONFIG.secondary.user, EMAIL_CONFIG.secondary.pass)
};

if (!transporters.primary) console.warn('⚠️ Primary Email Sender not configured.');
if (!transporters.secondary) console.warn('⚠️ Secondary Email Sender not configured.');

/**
 * Dual Email Queue with Failover
 */
class DualEmailQueue {
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
        const task = this.queue.shift(); // Get first task

        let sender = 'primary';

        resetCountersIfNeeded(EMAIL_CONFIG.primary);
        resetCountersIfNeeded(EMAIL_CONFIG.secondary);

        // Logic to choose sender
        // 1. If Primary is not configured or over limit -> Switch to Secondary
        if (!transporters.primary || EMAIL_CONFIG.primary.count >= EMAIL_CONFIG.primary.limit) {
            sender = 'secondary';
        }

        // 2. If Secondary is CHOSEN but not configured or over limit
        if (sender === 'secondary' && (!transporters.secondary || EMAIL_CONFIG.secondary.count >= EMAIL_CONFIG.secondary.limit)) {
            console.error('⛔ CRITICAL: Both email senders reached daily limit or are unconfigured.');
            // Drop the email or maybe requeue with very long delay? 
            // For now, logged and dropped to avoid infinite loops/spam.
            this.handleCompletion();
            return;
        }

        try {
            await this.attemptSend(task, sender);
        } catch (error) {
            console.warn(`⚠️ Failed sending via ${sender}: ${error.message}`);

            // Failover Logic: If we tried primary and it failed, try secondary.
            if (sender === 'primary' && transporters.secondary && EMAIL_CONFIG.secondary.count < EMAIL_CONFIG.secondary.limit) {
                console.log(`🔀 Switching to secondary sender...`);
                try {
                    await this.attemptSend(task, 'secondary');
                } catch (failoverError) {
                    console.error(`❌ Failover also failed: ${failoverError.message}`);
                    this.handleRetry(task);
                }
            } else {
                // If we were already on secondary, or secondary is not available -> Retry later
                console.error(`❌ No failover available.`);
                this.handleRetry(task);
            }
        }

        this.handleCompletion();
    }

    async attemptSend(task, senderKey) {
        const transporter = transporters[senderKey];
        const config = EMAIL_CONFIG[senderKey];

        if (!transporter) throw new Error(`${senderKey} transporter not initialized`);

        // Override 'from' to match the actual sender to avoid spam flags
        const mailOptions = {
            ...task,
            from: `KEC Slot Booking <${config.user}>`
        };

        const info = await transporter.sendMail(mailOptions);
        config.count++;
        console.log(`✅ Email sent via ${senderKey} (${config.count}/${config.limit}) to ${task.to}`);
        return info;
    }

    handleRetry(task) {
        if (task.retries < MAX_RETRIES) {
            task.retries++;
            console.log(`...Re-queuing (Attempt ${task.retries + 1}/${MAX_RETRIES + 1})`);
            this.queue.push(task);
        } else {
            console.error(`💀 Email discarded after ${MAX_RETRIES} retries.`);
        }
    }

    handleCompletion() {
        setTimeout(() => {
            this.isProcessing = false;
            this.processQueue();
        }, RATE_LIMIT_MS);
    }
}

const emailQueue = new DualEmailQueue();

/**
 * Shared function to queue email
 */
const queueEmail = (to, subject, htmlContent) => {
    // Basic validation
    if (!EMAIL_CONFIG.primary.user && !EMAIL_CONFIG.secondary.user) {
        console.warn('Skipping email (No credentials):', subject);
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
