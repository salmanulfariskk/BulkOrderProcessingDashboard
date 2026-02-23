import axios, { InternalAxiosRequestConfig } from 'axios';

// Create an Axios instance
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api', // Use environment variable or default to local backend
});

// Request interceptor to add the auth token to headers
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Only run on the client side
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor (optional) for global error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // You can handle global errors here, like specific HTTP status codes
        // e.g., if (error.response?.status === 401) { ... handle Unauthorized ... }
        return Promise.reject(error);
    }
);

export default api;
