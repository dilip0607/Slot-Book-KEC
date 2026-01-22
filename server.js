const express = require('express');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { protect, admin } = require('./middleware');
const controllers = require('./controllers');
const authController = require('./authController');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(compression());
app.use(bodyParser.json());

// Health Check Endpoint (Critical for Render)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// API Routes
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/forgot-password', authController.forgotPassword);
app.put('/api/auth/reset-password/:token', authController.resetPassword);
app.get('/api/auth/verify/:token', authController.verifyEmail);

// Public/User Routes
// Rate limiting
const rateLimit = require('express-rate-limit');
const registrationLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // limit each IP to 10 requests per windowMs
    message: { message: 'Too many registration attempts, please try again later.' }
});

app.get('/api/events', protect, controllers.getAllEvents);
app.get('/api/events/archived', protect, admin, controllers.getArchivedEvents);
app.post('/api/events/:id/restore', protect, admin, controllers.restoreEvent); // Restore Route
app.get('/api/events/:id', protect, controllers.getEventStatus);
app.post('/api/register', protect, registrationLimiter, controllers.register);

app.get('/api/my-registrations', protect, controllers.getMyRegistrations);
app.delete('/api/registrations/:id', protect, controllers.cancelRegistration);

// Admin Routes
app.post('/api/events', protect, admin, controllers.createEvent);
app.put('/api/events/:id', protect, admin, controllers.updateEvent);
app.delete('/api/events/:id', protect, admin, controllers.deleteEvent);
app.delete('/api/events/archived/:id', protect, admin, controllers.permanentDeleteEvent); // Perm Delete
app.get('/api/events/:id/registrations', protect, admin, controllers.getEventRegistrations);
app.get('/api/events/:id/export', protect, admin, controllers.exportEventRegistrations);

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'client/dist');
    app.use(express.static(distPath));

    app.get('{*path}', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('API is running...');
    });
}

// Global Error Handling
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    // server.close(() => {
    //     process.exit(1);
    // });
    // For reliability, we might want to log and keep running if possible, 
    // but standard practice is restart. Render will auto-restart if we exit.
    process.exit(1);
});

const server = app.listen(PORT, () => {
    console.log(`v1.0.4: Server running on port ${PORT}`);
});
