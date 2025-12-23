const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Send booking confirmation email to user
 */
const sendBookingConfirmation = async (userEmail, userName, eventTitle, eventDate) => {
    try {
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
        console.log('Confirmation email sent: %s', info.messageId);
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

module.exports = {
    sendBookingConfirmation,
    notifyAdminEventFull
};
