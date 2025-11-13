import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

// Create transporter - configure based on your email service
// For development, you can use Gmail, SendGrid, or other services
const createTransporter = () => {
  // Option 1: Gmail (for development/testing)
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
      },
    });
  }

  // Option 2: SMTP (for production with custom email service)
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // Option 3: Development - use Ethereal Email (creates fake inbox)
  // This is useful for development when you don't have email configured
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: process.env.ETHEREAL_USER || 'ethereal.user@ethereal.email',
      pass: process.env.ETHEREAL_PASSWORD || 'ethereal.password',
    },
  });
};

export const sendVerificationEmail = async (
  email: string,
  verificationCode: string
): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@collegeomegle.com',
      to: email,
      subject: 'Verify Your College Email - College Omegle',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to College Omegle!</h2>
          <p>Thank you for signing up. Please verify your college email address to continue.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #4CAF50;">
              ${verificationCode}
            </p>
          </div>
          <p>Enter this code in the app to verify your email address.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This code will expire in 10 minutes. If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
      text: `
        Welcome to College Omegle!
        
        Your verification code is: ${verificationCode}
        
        Enter this code in the app to verify your email address.
        
        This code will expire in 10 minutes.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${email}: ${info.messageId}`);
    
    // In development with Ethereal, log the preview URL
    if (process.env.NODE_ENV === 'development' && info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`Preview URL: ${previewUrl}`);
      }
    }
    
    return true;
  } catch (error) {
    logger.error(`Error sending verification email to ${email}:`, error);
    return false;
  }
};

