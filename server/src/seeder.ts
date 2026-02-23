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

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password123', salt);

        await User.create({
            email: 'lusaibnetstager@gmail.com',
            passwordHash: passwordHash
        });

        console.log('Seeded User: lusaibnetstager@gmail.com / password123');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();
