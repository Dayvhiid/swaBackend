require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const isValidEmail = (value) => {
    // Keep validation simple and aligned with login expectations.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const createSuperAdmin = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swa-db';
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const name = process.argv[2] || 'Super Admin';
        const email = process.argv[3] ? process.argv[3].trim().toLowerCase() : '';
        const password = process.argv[4];

        if (!email || !password) {
            console.error('Usage: node src/scripts/createSuperAdmin.js <name> <email> <password>');
            process.exit(1);
        }

        if (!isValidEmail(email)) {
            console.error('Please provide a valid email address (example: admin@example.com).');
            process.exit(1);
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            console.log('User already exists. Updating super admin credentials and validation...');
            userExists.name = name;
            userExists.role = 'super_admin';
            userExists.isValidated = true;
            userExists.passwordHash = password;
            await userExists.save();
            console.log('User updated successfully.');
        } else {
            await User.create({
                name,
                email,
                passwordHash: password,
                role: 'super_admin',
                isValidated: true
            });
            console.log('Super Admin created successfully.');
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

createSuperAdmin();
