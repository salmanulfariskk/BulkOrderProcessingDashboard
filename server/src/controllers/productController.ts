import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../middleware/authMiddleware';
import { Response } from 'express';
import product from '../models/product';


export const getData = asyncHandler (async (req: AuthRequest, res: Response) => {
    
    
})