import express from 'express';
import { getData } from '../controllers/productController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/').get(protect,getData)

export default router