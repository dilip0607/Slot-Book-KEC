const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();

const createOrUpdateAdmin = async () => {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.log('Usage: node admin-manager.js <name> <email> <password>');
        process.exit(1);
    }

    const [name, email, password] = args;

    try {
        await connectDB();

        const userExists = await User.findOne({ email });

        if (userExists) {
            console.log(`User with email ${email} found. Updating password and ensuring Admin role...`);
            userExists.name = name;
            userExists.password = password; // Pre-save hook will hash this
            userExists.role = 'ADMIN';
            await userExists.save();
            console.log('Admin credentials updated successfully.');
        } else {
            console.log('Creating new Admin user...');
            const user = await User.create({
                name,
                email,
                password,
                role: 'ADMIN'
            });
            console.log(`Admin ${user.name} created successfully.`);
        }

        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

createOrUpdateAdmin();
