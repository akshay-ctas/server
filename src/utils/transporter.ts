import nodemailer from 'nodemailer';
import crypto from 'crypto';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

export async function sendOTPEmail(email: string, otp: string) {
  return transporter.sendMail({
    from: `"Kendrascott E-commerce" <${process.env.MAIL_FROM}>`,
    to: email,
    subject: 'Verify your email - OTP',
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    html: `
      <div style="font-family:Arial;padding:20px">
        <h2>Email Verification</h2>
        <p>Your OTP for verification is:</p>
        <h1 style="letter-spacing:5px">${otp}</h1>
        <p>This OTP will expire in <b>5 minutes</b>.</p>
        <br/>
        <small>If you didn't request this, ignore this email.</small>
      </div>
    `,
  });
}
