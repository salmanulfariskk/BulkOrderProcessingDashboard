import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
    token: string | null;
    user: { _id: string, email: string } | null;
    isAuthenticated: boolean;
}

// Helper to safely access localStorage (Next.js SSR compat)
const getInitialToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token') || null;
    }
    return null;
};

const initialState: AuthState = {
    token: getInitialToken(),
    user: null, // we'll populate this later or just rely on decode
    isAuthenticated: !!getInitialToken(),
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (
            state,
            action: PayloadAction<{ token: string; user: { _id: string, email: string } }>
        ) => {
            state.token = action.payload.token;
            state.user = action.payload.user;
            state.isAuthenticated = true;
            if (typeof window !== 'undefined') {
                localStorage.setItem('token', action.payload.token);
            }
        },
        logout: (state) => {
            state.token = null;
            state.user = null;
            state.isAuthenticated = false;
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
            }
        },
    },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
