import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

let transporterConfig = {};
if (process.env.EMAIL_PROVIDER === 'outlook') {
  transporterConfig = {
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    tls: {
      ciphers: 'SSLv3'
    },
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  };
} else {
  transporterConfig = {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  };
}

const transporter = nodemailer.createTransport(transporterConfig);

app.get('/api/verify', async (req, res) => {
  try {
    await transporter.verify();
    res.status(200).json({ success: true, message: 'Kết nối SMTP thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/send-email', async (req, res) => {
  const { to, bcc, subject, html, attachments: clientAttachments } = req.body;

  if ((!to && !bcc) || !subject || !html) {
    return res.status(400).json({ error: 'Thiếu thông tin gửi email (to/bcc, subject, html).' });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_USER === 'your_email@gmail.com') {
    return res.status(500).json({ error: 'Chưa cấu hình tài khoản gửi Email trong file .env!' });
  }

  try {
    const attachments = [];
    let processedHtml = html;
    
    const logoPath = path.join(__dirname, '../public/logo.png');
    if (html.includes('logo.png') && fs.existsSync(logoPath)) {
      processedHtml = html.replace(/src=["'](?:https?:\/\/[^"'>\s]+)?\/logo\.png["']/g, 'src="cid:chibologo"');
      attachments.push({
        filename: 'logo.png',
        path: logoPath,
        cid: 'chibologo'
      });
    }

    if (clientAttachments && Array.isArray(clientAttachments)) {
      clientAttachments.forEach(att => {
        if (att.url && att.filename) {
          attachments.push({
            filename: att.filename,
            path: att.url
          });
        }
      });
    }

    const mailOptions = {
      from: `"Chi bộ Sinh viên" <${process.env.EMAIL_USER}>`,
      subject,
      html: processedHtml,
      attachments
    };
    if (to) mailOptions.to = to;
    if (bcc) mailOptions.bcc = bcc;

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    res.status(200).json({ success: true, message: 'Gửi email thành công!' });
  } catch (error) {
    console.error('Lỗi gửi email:', error);
    res.status(500).json({ error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server gửi Email đang chạy tại http://localhost:${port}`);
  });
}

export default app;
