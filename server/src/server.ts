import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { connectDB } from './config/db';
import { initSocket } from './socket';
import authRoutes from './routes/authRoutes';
import uploadRoutes from './routes/uploadRoutes';
import { startWorker } from './workers/jobProcessor';

dotenv.config();
connectDB();
startWorker();

const app = express();
const httpServer = createServer(app);
initSocket(httpServer);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const allowedOrigin = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'http://localhost:3000';
app.use(cors({
    origin: [allowedOrigin, 'http://localhost:3000']
}));

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Routes will go here
app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
