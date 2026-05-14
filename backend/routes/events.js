import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configure the nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

router.post('/invite-judge', async (req, res) => {
  const { eventId, email, link } = req.body;
  
  if (!email || !link) {
    return res.status(400).json({ error: 'Email and link are required' });
  }

  try {
    const mailOptions = {
      from: `"NexusHack Organizer" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'You have been invited to judge an event on NexusHack!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #0070f3;">NexusHack Judging Invitation</h2>
          <p>Hello,</p>
          <p>You have been officially invited to be a judge for a hackathon event on NexusHack!</p>
          <p>Please click the button below to accept the invitation and join the judging panel:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accept Invitation & Join Panel</a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${link}</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Sent judge invite to ${email} (Message ID: ${info.messageId})`);
    
    return res.status(200).json({ message: 'Invite sent successfully' });
  } catch (error) {
    console.error('Error sending invite email:', error);
    return res.status(500).json({ error: 'Failed to send invite email. Please check SMTP configuration.' });
  }
});

export default router;
