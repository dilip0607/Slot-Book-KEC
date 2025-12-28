const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Default to local mongodb if not specified in env
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fcfs_app', {
            maxPoolSize: 100, // Maintain up to 100 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
