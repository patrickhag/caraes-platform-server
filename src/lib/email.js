import { transporter } from "../emails/index.js";
import { getAccountCreatedTemplate } from "../emails/accountCreated.js";
import { getPasswordResetTemplate } from "../emails/passwordReset.js";

export async function sendAccountCreatedEmail(user, confirmUrl = "") {
  const { subject, html, text } = getAccountCreatedTemplate(user, confirmUrl);

  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || "CARAES IMS <noreply@caraes.com>";

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: user.email,
      subject,
      html,
      text,
    });
    return info;
  } catch (error) {
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(user, resetUrl) {
  const { subject, html, text } = getPasswordResetTemplate(user, resetUrl);

  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || "CARAES IMS <noreply@caraes.com>";

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: user.email,
      subject,
      html,
      text,
    });
    return info;
  } catch (error) {
    throw new Error(`Email sending failed: ${error.message}`);
  }
}
