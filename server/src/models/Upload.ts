import mongoose, { Document, Schema } from 'mongoose';

export interface IUpload extends Document {
    userId: mongoose.Types.ObjectId;
    fileName: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    uploadedAt: Date;
    processedAt?: Date;
    totalRevenue?: number;
    totalItems?: number;
    averageOrderValue?: number;
    errorMessage?: string;
}

const uploadSchema = new Schema<IUpload>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    uploadedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    totalRevenue: { type: Number },
    totalItems: { type: Number },
    averageOrderValue: { type: Number },
    errorMessage: { type: String }
});

export default mongoose.model<IUpload>('Upload', uploadSchema);
