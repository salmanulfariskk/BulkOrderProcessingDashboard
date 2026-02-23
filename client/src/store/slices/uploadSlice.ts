import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../utils/api';
import { RootState } from '../store';

export interface UploadRecord {
    _id: string;
    fileName: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    uploadedAt: string;
    processedAt?: string;
    totalRevenue?: number;
    totalItems?: number;
    averageOrderValue?: number;
    errorMessage?: string;
    emailSent?: boolean;
    targetEmail?: string;
}

interface UploadState {
    uploads: UploadRecord[];
    loading: boolean;
    error: string | null;
    pagination: {
        total: number;
        page: number;
        pages: number;
        limit: number;
    } | null;
}

const initialState: UploadState = {
    uploads: [],
    loading: false,
    error: null,
    pagination: null,
};

export interface FetchUploadsParams {
    search?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
}

export const fetchUploads = createAsyncThunk(
    'uploads/fetchUploads',
    async (params: FetchUploadsParams | void, { getState, rejectWithValue }) => {
        try {
            const state = getState() as RootState;
            const token = state.auth.token;
            // Build query params
            const queryParams = new URLSearchParams();
            if (params) {
                if (params.search) queryParams.append('search', params.search);
                if (params.startDate) queryParams.append('startDate', params.startDate);
                if (params.endDate) queryParams.append('endDate', params.endDate);
                if (params.status) queryParams.append('status', params.status);
                if (params.page) queryParams.append('page', params.page.toString());
                if (params.limit) queryParams.append('limit', params.limit.toString());
            }

            const queryString = queryParams.toString();
            const url = `/uploads${queryString ? `?${queryString}` : ''}`;
            const res = await api.get(url);
            return res.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message || 'Failed to fetch uploads');
        }
    }
);

const uploadSlice = createSlice({
    name: 'uploads',
    initialState,
    reducers: {
        addUpload: (state, action: PayloadAction<UploadRecord>) => {
            state.uploads.unshift(action.payload);
        },
        updateUploadStatus: (state, action: PayloadAction<Partial<UploadRecord> & { uploadId: string, error?: string, targetEmail?: string }>) => {
            const index = state.uploads.findIndex(u => u._id === action.payload.uploadId);
            if (index !== -1) {
                state.uploads[index] = { ...state.uploads[index], ...action.payload };
                // Map the socket 'error' field back to 'errorMessage' in our state if it exists
                if (action.payload.error) {
                    state.uploads[index].errorMessage = action.payload.error;
                }
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUploads.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUploads.fulfilled, (state, action) => {
                state.loading = false;
                // If the backend returns { uploads, pagination }, handle accordingly
                // (Depends on if the backend structure changed, which we just did!)
                if (action.payload.uploads) {
                    state.uploads = action.payload.uploads;
                    state.pagination = action.payload.pagination;
                } else {
                    state.uploads = action.payload; // fallback
                }
            })
            .addCase(fetchUploads.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    }
});

export const { addUpload, updateUploadStatus } = uploadSlice.actions;
export default uploadSlice.reducer;
