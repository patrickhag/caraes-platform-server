export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getAccountCreatedTemplate(user, confirmUrl) {
  const displayName = [user.prefix, user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ");

  const subject = "Your CARAES IMS account has been created";

  const confirmHtml = confirmUrl
    ? `<p><a href="${escapeHtml(confirmUrl)}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Confirm Account</a></p>
       <p>Or copy and paste this link into your browser: <br><a href="${escapeHtml(confirmUrl)}">${escapeHtml(confirmUrl)}</a></p>`
    : "";

  const confirmText = confirmUrl
    ? `\nPlease confirm your account by visiting this link:\n${confirmUrl}\n`
    : "";

  const html = `
    <p>Hello ${escapeHtml(displayName || user.email)},</p>
    <p>Your CARAES IMS account has been created with the role <strong>${escapeHtml(user.role)}</strong>.</p>
    ${confirmHtml}
    <p>Your account must be verified by an administrator before you can log in.</p>
    <p>If you were not expecting this account, please ignore this message or contact support.</p>
  `;

  const text = `Hello ${displayName || user.email},

Your CARAES IMS account has been created with the role ${user.role}.
${confirmText}
Your account must be verified by an administrator before you can log in.

If you were not expecting this account, please ignore this message or contact support.`;

  return { subject, html, text };
}
