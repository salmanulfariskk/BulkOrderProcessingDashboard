import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User';
import Upload from './models/Upload';
import { connectDB } from './config/db';

dotenv.config();
connectDB();

const seedData = async () => {
    try {
        await User.deleteMany();
        await Upload.deleteMany();

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be defined in .env');
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminPassword, salt);

        await User.create({
            email: adminEmail,
            passwordHash: passwordHash
        });

        console.log(`Seeded User: ${adminEmail} / ${adminPassword}`);
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();
