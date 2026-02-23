import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import Upload from '../models/Upload';
import { AuthRequest } from '../middleware/authMiddleware';
import fs from 'fs';

// @desc    Upload an Excel file
// @route   POST /api/uploads
// @access  Private
export const uploadFile = asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            res.status(400);
            throw new Error('Please upload an Excel file');
        }

        // Quick validation
        if (!req.file.originalname.match(/\.(xlsx|xls)$/)) {
            // delete the invalid file
            fs.unlinkSync(req.file.path);
            res.status(400);
            throw new Error('Only Excel files are allowed');
        }

        // Save upload record
        const upload = await Upload.create({
            userId: req.user._id,
            fileName: req.file.filename,
            status: 'pending',
            uploadedAt: new Date()
        });

        res.status(201).json({
            uploadId: upload._id,
            status: upload.status
        });
    } catch (error: any) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500);
        throw new Error(error.message);
    }
});

// @desc    Get user uploads history
// @route   GET /api/uploads
// @access  Private
export const getUploads = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { search, startDate, endDate, status, page = '1', limit = '10' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const query: any = { userId: req.user._id };

    if (search) {
        query.fileName = { $regex: search as string, $options: 'i' };
    }

    if (status) {
        query.status = status;
    }

    if (startDate || endDate) {
        query.uploadedAt = {};
        if (startDate) {
            query.uploadedAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999); // Set to end of the day
            query.uploadedAt.$lte = end;
        }
    }

    const total = await Upload.countDocuments(query);
    const uploads = await Upload.find(query)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limitNumber);

    res.json({
        uploads,
        pagination: {
            total,
            page: pageNumber,
            pages: Math.ceil(total / limitNumber),
            limit: limitNumber
        }
    });
});
