const axios = require('axios');
const mongoose = require('mongoose');
const Event = require('./models/Event');
const User = require('./models/User');
const Registration = require('./models/Registration');
require('dotenv').config();

// Configuration
const CONCURRENT_USERS = 100;
const SLOTS_CAPACITY = 10;
const API_URL = 'http://localhost:3001/api';

// Database Connection for Setup/Teardown
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fcfs_app');
        console.log('MongoDB Connected for Test Setup');
    } catch (err) {
        console.error('DB Connection Failed', err);
        process.exit(1);
    }
};

// Main Test Function
const runLoadTest = async () => {
    await connectDB();

    try {
        // 1. Cleanup previous test data
        console.log('Cleaning up old test data...');
        // Delete any events from previous runs
        await Event.deleteMany({ title: { $regex: 'LOAD TEST EVENT' } });
        // Delete any dummy users from previous runs
        await User.deleteMany({ email: { $regex: 'testuser_' } });

        // 2. Create Test Event
        console.log('Creating Test Event...');
        const testEventTitle = 'LOAD TEST EVENT ' + Date.now();
        const event = await Event.create({
            title: testEventTitle,
            targetAudience: 'Common',
            slots: [{
                startTime: new Date(Date.now() + 3600000), // 1 hour later
                endTime: new Date(Date.now() + 7200000),
                totalSlots: SLOTS_CAPACITY,
                bookedSlots: 0
            }]
        });
        const eventId = event._id;
        const slotId = event.slots[0]._id;
        console.log(`Event Created: ${eventId}, Slot: ${slotId}, Capacity: ${SLOTS_CAPACITY}`);

        // 3. Create Dummy Users
        console.log(`Creating ${CONCURRENT_USERS} dummy users...`);
        const users = [];
        for (let i = 0; i < CONCURRENT_USERS; i++) {
            users.push({
                name: `Test User ${i}`,
                email: `testuser_${Date.now()}_${i}@test.com`,
                password: 'password123',
                studentType: 'Day Scholar' // Compatible with 'Common'
            });
        }
        const createdUsers = await User.insertMany(users);
        console.log('Users created.');

        // 4. Simulate Concurrent Booking Requests
        console.log('Starting Concurrent Booking Attack...');
        const start = Date.now();

        // We need auth tokens for each user to hit the API
        // For simplicity, we'll bypass full login flow and mock the req object logic OR 
        // actually hit the login endpoint which might be slow.
        // BETTER APPROACH: Generate JWT tokens locally if we have the secret.
        // Assuming we share secret from .env. If not, we'll try to login one by one or batch login?
        // Batch login is slow. Let's try to generate tokens manually if possible.
        // Checking authController... it uses jwt.sign.
        const jwt = require('jsonwebtoken');
        const generateToken = (id) => {
            return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
        };

        const promises = createdUsers.map(user => {
            const token = generateToken(user._id);
            return axios.post(`${API_URL}/register`, {
                eventId: eventId,
                slotId: slotId
            }, {
                headers: { Authorization: `Bearer ${token}` },
                validateStatus: null // Don't throw on error status
            });
        });

        const responses = await Promise.all(promises);
        const duration = Date.now() - start;
        console.log(`Finished ${CONCURRENT_USERS} requests in ${duration}ms`);

        // 5. Analyze Results
        const successCount = responses.filter(r => r.status === 201).length;
        const failCount = responses.filter(r => r.status !== 201).length;
        const slotFullCount = responses.filter(r => r.data.message && r.data.message.includes('Slot full')).length;
        const otherErrorCount = failCount - slotFullCount;

        console.log('------------------------------------------------');
        console.log(`Total Requests: ${CONCURRENT_USERS}`);
        console.log(`Successful Bookings: ${successCount} (Expected: ${SLOTS_CAPACITY})`);
        console.log(`Failed Requests: ${failCount}`);
        console.log(`  - "Slot Full": ${slotFullCount}`);
        console.log(`  - Other Errors: ${otherErrorCount}`);
        console.log('------------------------------------------------');

        // 6. DB Verification
        const refreshedEvent = await Event.findById(eventId);
        const dbRegistrations = await Registration.countDocuments({ event: eventId });

        console.log(`DB Booked Slots: ${refreshedEvent.slots[0].bookedSlots}`);
        console.log(`Actual Registrations: ${dbRegistrations}`);

        if (successCount === SLOTS_CAPACITY &&
            refreshedEvent.slots[0].bookedSlots === SLOTS_CAPACITY &&
            dbRegistrations === SLOTS_CAPACITY) {
            console.log('✅ TEST PASSED: Concurrency handled perfectly.');
        } else {
            console.log('❌ TEST FAILED: Overbooking or inconsistency detected.');
            console.log(`Expected ${SLOTS_CAPACITY}, got Success: ${successCount}, DB: ${dbRegistrations}`);
        }

        // 7. Cleanup Created Data
        console.log('Cleaning up test data...');
        await User.deleteMany({ email: { $regex: 'testuser_' } });
        await Registration.deleteMany({ event: eventId });
        await Event.findByIdAndDelete(eventId);
        console.log('Test data deleted successfully.');

    } catch (err) {
        console.error('Test Scirpt Error:', err);
    } finally {
        await mongoose.connection.close();
    }
};

runLoadTest();
