require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createSuperAdmin = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swa-db';
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const name = process.argv[2] || 'Super Admin';
        const email = process.argv[3];
        const password = process.argv[4];

        if (!email || !password) {
            console.error('Usage: node src/scripts/createSuperAdmin.js <name> <email> <password>');
            process.exit(1);
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            console.log('User already exists. Updating to Super Admin and validating...');
            userExists.role = 'super_admin';
            userExists.isValidated = true;
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
