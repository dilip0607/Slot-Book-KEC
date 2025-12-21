const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Default to local mongodb if not specified in env
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fcfs_app', {
            // These options are no longer necessary in Mongoose 6+, but keeping for safety if older version
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
