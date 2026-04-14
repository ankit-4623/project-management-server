import nodemail from "nodemailer";
import dotenv from 'dotenv'
dotenv.config()
const transporter = nodemail.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendMailToUser = async ({ to, subject, html }) => {
  const response = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
  return response;
};
