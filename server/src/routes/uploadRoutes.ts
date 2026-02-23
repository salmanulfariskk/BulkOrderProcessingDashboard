import express from 'express';
import multer from 'multer';
import { uploadFile, getUploads } from '../controllers/uploadController';
import { protect } from '../middleware/authMiddleware';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const storage = multer.diskStorage({
    destination(req, file, cb) {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename(req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.route('/')
    .post(protect, upload.single('file'), uploadFile)
    .get(protect, getUploads);

export default router;
