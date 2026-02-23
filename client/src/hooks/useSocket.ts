import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const { token, isAuthenticated } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        if (isAuthenticated && token) {
            const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
            const socketInstance = io(backendUrl, {
                auth: {
                    token
                }
            });

            setSocket(socketInstance);

            return () => {
                socketInstance.disconnect();
            };
        } else if (socket) {
            socket.disconnect();
            setSocket(null);
        }
    }, [isAuthenticated, token]);

    return socket;
};
