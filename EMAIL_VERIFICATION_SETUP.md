# Email Verification Setup Guide

## Overview
The application now requires college email verification before users can join video chats. Only students with college email addresses (.edu, .ac.uk, .ac.in, etc.) can register.

## Supported College Email Domains

The system automatically accepts emails from:
- **.edu** - US colleges and universities
- **.edu.in** - Indian universities
- **.ac.uk** - UK universities
- **.ac.in** - Indian universities
- **.edu.au** - Australian universities
- **.edu.cn** - Chinese universities

You can add more domains in `backend/src/utils/emailValidator.ts`

## Email Service Configuration

### Option 1: Gmail (Recommended for Development)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Add to `.env`:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=noreply@collegeomegle.com
```

### Option 2: SMTP (Recommended for Production)

Use a professional email service like SendGrid, Mailgun, or AWS SES:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

**SendGrid Setup:**
1. Create account at [SendGrid](https://sendgrid.com)
2. Create API key
3. Verify sender email
4. Use API key as SMTP_PASSWORD

**Mailgun Setup:**
1. Create account at [Mailgun](https://www.mailgun.com)
2. Get SMTP credentials from dashboard
3. Verify domain

### Option 3: Ethereal Email (For Testing)

Ethereal creates fake email inboxes for testing. No real emails are sent.

1. Visit [Ethereal Email](https://ethereal.email)
2. Create a test account
3. Add to `.env`:
```env
ETHEREAL_USER=your-ethereal-email
ETHEREAL_PASSWORD=your-ethereal-password
```

## How It Works

1. **User enters college email** → System validates domain
2. **System sends 6-digit code** → Code expires in 10 minutes
3. **User enters code** → System verifies and creates user
4. **User can join chats** → Only verified users can connect

## API Endpoints

### POST `/api/auth/send-verification`
Send verification code to email.

**Request:**
```json
{
  "email": "student@university.edu"
}
```

**Response:**
```json
{
  "message": "Verification code sent to your email",
  "expiresIn": 600
}
```

### POST `/api/auth/verify-email`
Verify email with code.

**Request:**
```json
{
  "email": "student@university.edu",
  "code": "123456",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "Email verified successfully",
  "user": {
    "email": "student@university.edu",
    "name": "John Doe",
    "college": "University",
    "isVerified": true
  }
}
```

### POST `/api/auth/check-email`
Check if email is already verified.

**Request:**
```json
{
  "email": "student@university.edu"
}
```

**Response:**
```json
{
  "verified": true,
  "name": "John Doe",
  "college": "University"
}
```

## Database Models

### EmailVerification
Stores verification codes:
- `email`: User's email
- `code`: 6-digit verification code
- `expiresAt`: Expiration timestamp (10 minutes)
- `verified`: Verification status

### User
Updated to require email:
- `email`: Required, unique, lowercase
- `isVerified`: Required, default false
- `college`: Extracted from email domain

## Frontend Flow

1. **Email Input** → User enters college email
2. **Send Code** → System sends verification code
3. **Enter Code** → User enters 6-digit code
4. **Verify** → System verifies and creates user
5. **Enter Name** → User enters display name
6. **Start Chatting** → User can join video chats

## Security Features

- ✅ Email domain validation (only college domains)
- ✅ Verification code expiration (10 minutes)
- ✅ One-time use codes
- ✅ Rate limiting on API endpoints
- ✅ Email uniqueness check
- ✅ Automatic code cleanup

## Troubleshooting

### Emails not sending
1. Check email service configuration in `.env`
2. Verify SMTP credentials
3. Check firewall/network restrictions
4. Review logs in `backend/logs/`

### Verification codes not working
1. Check code expiration (10 minutes)
2. Verify code format (6 digits)
3. Check database for verification records
4. Review error logs

### Domain not accepted
1. Add domain to `emailValidator.ts`
2. Check domain format (must end with supported suffix)
3. Verify email format is correct

## Production Checklist

- [ ] Configure production email service (SendGrid/Mailgun)
- [ ] Set up email domain verification
- [ ] Configure SPF/DKIM records
- [ ] Test email delivery
- [ ] Set up email monitoring
- [ ] Configure rate limiting
- [ ] Set up email templates (optional)

## Next Steps

- Add email templates for better UX
- Implement email resend functionality
- Add "Remember me" functionality
- Implement password reset (if needed)
- Add email change functionality

