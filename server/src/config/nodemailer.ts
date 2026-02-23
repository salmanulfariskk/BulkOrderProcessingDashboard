import nodemailer from 'nodemailer';

export const sendEmail = async (options: { email: string, subject: string, message: string, html?: string }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 587,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const message: any = {
            from: `${process.env.FROM_NAME || 'Bulk Order Dashboard'} <${process.env.SMTP_USER}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
        };

        if (options.html) {
            message.html = options.html;
        }

        const info = await transporter.sendMail(message);
        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Email sending failed', error);
    }
};
