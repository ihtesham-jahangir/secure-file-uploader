// pages/api/subscribe.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

type Data = {
  message: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  // Check for required environment variables
  const { EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS || !ADMIN_EMAIL) {
    console.error('Missing environment variables for email configuration');
    return res.status(500).json({ message: 'Email configuration error' });
  }

  // Create a transporter using SMTP
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  // Email options
  const mailOptions = {
    from: EMAIL_USER,
    to: ADMIN_EMAIL,
    subject: 'New Subscription Request',
    text: `A new user has requested access with the following email: ${email}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'Subscription request sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ message: 'Failed to send subscription request' });
  }
}
