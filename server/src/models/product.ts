import mongoose, { Schema, Document } from "mongoose";

export interface IProductItem {
    productName: string;
    quantity: number;
    price: number;
}

export interface IProduct extends Document {
    userId: mongoose.Types.ObjectId;
    data: IProductItem[];
}

const productItemSchema = new Schema<IProductItem>(
    {
        productName: {
            type: String,
            required: true,
            trim: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 0
        },
        price: {
            type: Number,
            required: true,
            min: 0
        }
    },
    { _id: false } // prevents extra _id for each item (optional)
);

const productSchema = new Schema<IProduct>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        data: {
            type: [productItemSchema],
            required: true,
            default: []
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model<IProduct>("Product", productSchema);