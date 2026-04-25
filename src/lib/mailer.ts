import nodemailer from "nodemailer";

type SendMailArgs = {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
};

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    throw new Error(
      "Email service is not configured. Set EMAIL_USER and EMAIL_PASS in environment."
    );
  }

  transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  return transporter;
};

export const sendMail = async ({ to, subject, text, html, from }: SendMailArgs) => {
  const emailUser = process.env.EMAIL_USER;

  await getTransporter().sendMail({
    from: from || `MediNexus <${emailUser}>`,
    to,
    subject,
    text,
    html,
  });
};
