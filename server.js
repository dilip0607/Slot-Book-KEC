const express = require('express');
const cors = require('cors');
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
app.use(bodyParser.json());

// API Routes
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);

// Public/User Routes
app.get('/api/events', protect, controllers.getAllEvents);
app.get('/api/events/:id', protect, controllers.getEventStatus);
app.post('/api/register', protect, controllers.register);

// Admin Routes
app.post('/api/events', protect, admin, controllers.createEvent);
app.delete('/api/events/:id', protect, admin, controllers.deleteEvent);
app.get('/api/events/:id/registrations', protect, admin, controllers.getEventRegistrations);
app.get('/api/events/:id/export', protect, admin, controllers.exportEventRegistrations);

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'client/dist');
    app.use(express.static(distPath));

    app.get('*path', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('API is running...');
    });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
