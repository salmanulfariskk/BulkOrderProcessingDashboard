import mongoose from 'mongoose';
import xlsx from 'xlsx';
import path from 'path';
import Upload from '../models/Upload';
import User from '../models/User';
import { sendEmail } from '../config/nodemailer';
import { getIO } from '../socket';

export const processPendingJobs = async () => {
    let upload: any = null;
    try {
        // Find one pending job and mark it as processing atomically to avoid race conditions
        try {
            upload = await Upload.findOneAndUpdate(
                { status: 'pending' },
                { $set: { status: 'processing' } },
                { returnDocument: 'after', sort: { uploadedAt: 1 } }
            ).populate('userId');
        } catch (e) {
            return; // DB might not be ready
        }

        if (!upload) return; // No pending jobs

        console.log(`Processing job for file: ${upload.fileName} (Upload ID: ${upload._id})`);

        const filePath = path.join(__dirname, '../../uploads', upload.fileName); // we need to ensure the upload model saves the real local filename

        // Actually from multer we should save the physically stored file name, so let's adjust the logic slightly.
        // In our upload controller, we currently save req.file.originalname, but it needs req.file.filename!
        // Assuming upload.fileName is the physics-saved file name.

        if (!require('fs').existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const data: any[] = await new Promise((resolve, reject) => {
            const { Worker } = require('worker_threads');
            // We use an inline worker string to pass to eval
            const workerCode = `
                const { parentPort } = require('worker_threads');
                const xlsx = require('xlsx');
                parentPort.on('message', (file) => {
                    try {
                        const workbook = xlsx.readFile(file);
                        const sheetName = workbook.SheetNames[0];
                        const sheetsJson = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
                        
                        if (sheetsJson.length === 0) {
                             throw new Error("Excel file is empty.");
                        }
                        
                        // Validate required columns in the first row
                        const firstRow = sheetsJson[0];
                        const keys = Object.keys(firstRow).map(k => k.toLowerCase().trim());
                        
                        const hasProduct = keys.some(k => k.includes('product') || k.includes('item') || k.includes('name'));
                        const hasQuantity = keys.some(k => k === 'quantity' || k === 'qty');
                        const hasPrice = keys.some(k => k === 'price' || k === 'amount');
                        
                        if (!hasProduct || !hasQuantity || !hasPrice) {
                            throw new Error("Invalid format: Excel file must contain Product Name, Quantity, and Price columns.");
                        }

                        parentPort.postMessage({ success: true, data: sheetsJson });
                    } catch(err) {
                        parentPort.postMessage({ success: false, error: err.message });
                    }
                });
            `;
            const worker = new Worker(workerCode, { eval: true });
            worker.on('message', (msg: any) => {
                if (msg.success) resolve(msg.data);
                else reject(new Error(msg.error));
                worker.terminate();
            });
            worker.on('error', reject);
            worker.on('exit', (code: number) => {
                if (code !== 0) reject(new Error('Worker stopped with exit code ' + code));
            });
            worker.postMessage(filePath);
        });


        let totalRevenue = 0;
        let totalItems = 0;

        data.forEach((row) => {
            // Handle variations in column names (e.g., 'Quantity', 'quantity', 'Price', 'price', etc.)
            const qtyKey = Object.keys(row).find(k => k.toLowerCase() === 'quantity' || k.toLowerCase() === 'qty');
            const priceKey = Object.keys(row).find(k => k.toLowerCase() === 'price' || k.toLowerCase() === 'amount');

            const qty = qtyKey ? Number(row[qtyKey]) || 0 : 0;
            const price = priceKey ? Number(row[priceKey]) || 0 : 0;

            totalItems += qty;
            totalRevenue += (qty * price);
        });

        const averageOrderValue = totalItems > 0 ? (totalRevenue / data.length) : 0;

        upload.status = 'completed';
        upload.processedAt = new Date();
        upload.totalRevenue = totalRevenue;
        upload.totalItems = totalItems;
        upload.averageOrderValue = averageOrderValue;
        await upload.save();



        // 2. Email Notification
        const user = await User.findById(upload.userId);
        let emailSent = false;
        if (user) {
            const formattedDate = new Date(upload.processedAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });
            const formattedRevenue = totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formattedAOV = averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formattedItems = totalItems.toLocaleString('en-US');

            const successHtml = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="background-color: #10b981; color: white; width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto;">✓</div>
                    </div>
                    <h2 style="color: #0f172a; text-align: center; margin-bottom: 8px; font-weight: 600; font-size: 24px;">Processing Completed</h2>
                    <p style="color: #64748b; text-align: center; margin-top: 0; margin-bottom: 32px; font-size: 16px;">Your bulk order file has been processed successfully.</p>
                    
                    <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #475569; font-size: 15px; border-bottom: 1px solid #e2e8f0;"><strong>File Name</strong></td>
                                <td style="padding: 8px 0; color: #0f172a; font-size: 15px; text-align: right; border-bottom: 1px solid #e2e8f0;">${upload.fileName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #475569; font-size: 15px; border-bottom: 1px solid #e2e8f0;"><strong>Status</strong></td>
                                <td style="padding: 8px 0; color: #10b981; font-size: 15px; font-weight: 600; text-align: right; border-bottom: 1px solid #e2e8f0;">Completed</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #475569; font-size: 15px;"><strong>Processed At</strong></td>
                                <td style="padding: 8px 0; color: #0f172a; font-size: 15px; text-align: right;">${formattedDate}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                        <div style="padding: 20px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Total Revenue</p>
                            <p style="margin: 8px 0 0 0; color: #0f172a; font-size: 24px; font-weight: 700; word-break: break-all;">$${formattedRevenue}</p>
                        </div>
                        <div style="padding: 20px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Total Items</p>
                            <p style="margin: 8px 0 0 0; color: #0f172a; font-size: 24px; font-weight: 700; word-break: break-all;">${formattedItems}</p>
                        </div>
                        <div style="padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Avg Order Val</p>
                            <p style="margin: 8px 0 0 0; color: #4f46e5; font-size: 24px; font-weight: 700; word-break: break-all;">$${formattedAOV}</p>
                        </div>
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 24px;">
                        Log in to your dashboard to view complete details of this upload.
                    </p>
                </div>
            </div>`;

            await sendEmail({
                email: user.email,
                subject: `✅ Upload Processing Completed: ${upload.fileName}`,
                message: `Your file has been processed successfully.\n\nFile Name: ${upload.fileName}\nStatus: Completed\nProcessed At: ${upload.processedAt}\nTotal Revenue: ${totalRevenue}\nTotal Items: ${totalItems}\nAverage Order Value: ${averageOrderValue}`,
                html: successHtml
            });
            emailSent = true;
        }

        // 1. WebSocket Notification (Moved after Email to confirm email sent status)
        const io = getIO();
        io.to(upload.userId._id.toString()).emit('uploadStatus', {
            uploadId: upload._id,
            status: 'completed',
            processedAt: upload.processedAt,
            totalRevenue,
            totalItems,
            averageOrderValue,
            emailSent,
            targetEmail: user?.email
        });

    } catch (error: any) {
        console.error('Job processing error:', error);
        if (upload) {
            upload.status = 'failed';
            upload.errorMessage = error.message;
            await upload.save();



            // Email Notification for Failure
            const user = await User.findById(upload.userId);
            let emailSent = false;
            if (user) {
                const failureHtml = `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                    <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; border-top: 4px solid #ef4444; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <div style="background-color: #fee2e2; color: #ef4444; width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; margin: 0 auto;">✕</div>
                        </div>
                        <h2 style="color: #0f172a; text-align: center; margin-bottom: 8px; font-weight: 600; font-size: 24px;">Processing Failed</h2>
                        <p style="color: #64748b; text-align: center; margin-top: 0; margin-bottom: 32px; font-size: 16px;">We encountered an error while processing your file.</p>
                        
                        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #475569; font-size: 15px; border-bottom: 1px solid #e2e8f0;"><strong>File Name</strong></td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 15px; text-align: right; border-bottom: 1px solid #e2e8f0;">${upload.fileName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #475569; font-size: 15px;"><strong>Status</strong></td>
                                    <td style="padding: 8px 0; color: #ef4444; font-size: 15px; font-weight: 600; text-align: right;">Failed</td>
                                </tr>
                            </table>
                        </div>

                        <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px;">
                            <p style="margin: 0 0 8px 0; color: #991b1b; font-size: 13px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Error Details:</p>
                            <p style="margin: 0; color: #b91c1c; font-size: 15px; line-height: 1.5;">${error.message}</p>
                        </div>
                        
                        <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 24px;">
                            Please correct the errors mentioned above and try uploading the file again.
                        </p>
                    </div>
                </div>`;

                await sendEmail({
                    email: user.email,
                    subject: `❌ Upload Processing Failed: ${upload.fileName}`,
                    message: `Your file processing failed.\n\nFile Name: ${upload.fileName}\nStatus: Failed\nReason: ${error.message}`,
                    html: failureHtml
                });
                emailSent = true;
            }

            // WebSocket Notification for Failure (Moved after email to confirm email state)
            const io = getIO();
            io.to(upload.userId._id.toString()).emit('uploadStatus', {
                uploadId: upload._id,
                status: 'failed',
                error: error.message,
                emailSent,
                targetEmail: user?.email
            });
        }
    }
}

// Run worker loop every 5 seconds
let interval: NodeJS.Timeout;
export const startWorker = () => {
    interval = setInterval(processPendingJobs, 5000);
    console.log('Background worker started.');
};

export const stopWorker = () => {
    clearInterval(interval);
};
