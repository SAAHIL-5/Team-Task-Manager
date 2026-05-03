import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: false, 
  },
});

const sendEmail = async ({to, subject, body}) => {
    const response = await transporter.sendMail({
        from: process.env.SENDER_EMAIL, 
        to,
        subject, 
        html: body, 
    });
    return response
}

export default sendEmail