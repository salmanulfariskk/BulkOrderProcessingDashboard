import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

let io: SocketIOServer;

export const initSocket = (server: HTTPServer) => {
    io = new SocketIOServer(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ["GET", "POST"]
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }
        jwt.verify(token, process.env.JWT_SECRET || 'supersecret12345', (err: any, decoded: any) => {
            if (err) return next(new Error('Authentication error'));
            socket.data.userId = decoded.id;
            next();
        });
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id} for User: ${socket.data.userId}`);
        // Join a room with the user's ID to emit target notifications
        socket.join(socket.data.userId);

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
