export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getPasswordResetTemplate(user, resetUrl) {
  const displayName = [user.prefix, user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ");

  const subject = "Reset your CARAES IMS password";

  const html = `
    <p>Hello ${escapeHtml(displayName || user.email)},</p>
    <p>We received a request to reset the password for your CARAES IMS account.</p>
    <p><a href="${escapeHtml(resetUrl)}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a></p>
    <p>Or copy and paste this link into your browser: <br><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you did not request this password reset, please ignore this email or contact support if you have concerns.</p>
  `;

  const text = `Hello ${displayName || user.email},

We received a request to reset the password for your CARAES IMS account.

Please reset your password by visiting this link:
${resetUrl}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email or contact support if you have concerns.`;

  return { subject, html, text };
}
