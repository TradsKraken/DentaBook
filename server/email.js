const recentEmails = [];

function getClientUrl() {
  return (process.env.CLIENT_URL || "http://10.10.1.113:3013").replace(/\/$/, "");
}

function getSender() {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (process.env.RESEND_API_KEY) return "DentaBook <onboarding@resend.dev>";
  return "DentaBook <no-reply@dentabook.forgroup.space>";
}

async function deliverEmail({ to, subject, text, html, meta = {} }) {
  const emailRecord = {
    to,
    from: getSender(),
    subject,
    text,
    html,
    token: meta.token,
    code: meta.code,
    meta,
    sentAt: new Date().toISOString(),
  };

  // Check for external transactional providers if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: getSender(),
          to: [to],
          subject,
          text,
          html,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Email:Resend] Delivery failed:", response.status, errorText);
      } else {
        const resData = await response.json();
        console.log(`[Email:Resend] Delivered successfully to <${to}> (id: ${resData.id})`);
      }
    } catch (err) {
      console.error("[Email:Resend] Network error:", err.message);
    }
  } else if (process.env.SENDGRID_API_KEY) {
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: getSender().replace(/^.*<|>$/g, "") },
          subject,
          content: [
            { type: "text/plain", value: text },
            { type: "text/html", value: html },
          ],
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Email:SendGrid] Delivery failed:", response.status, errorText);
      }
    } catch (err) {
      console.error("[Email:SendGrid] Network error:", err.message);
    }
  } else {
    // Development / test fallback: log clearly and record for tests
    console.log(`[Email Service] Delivered to <${to}>: ${subject}`);
  }

  recentEmails.push(emailRecord);
  if (recentEmails.length > 100) recentEmails.shift();
  return emailRecord;
}

async function sendVerificationEmail({ email, name, token, code }) {
  const clientUrl = getClientUrl();
  const verifyUrl = `${clientUrl}/patient/verify-email?token=${token}`;
  const subject = "Verify your DentaBook email address";
  const text = `Hello ${name || "there"},

Thank you for registering with DentaBook. Please verify your email address to book dental appointments.

Click the link below to verify your email:
${verifyUrl}

Or enter this 6-digit verification code on the website:
${code}

This code and link will expire in 24 hours.

If you did not create an account on DentaBook, you can safely ignore this email.
`;
  const html = `<!doctype html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #17374b; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="border-top: 4px solid #126f9c; padding-top: 16px;">
    <h2 style="color: #126f9c; margin-top: 0;">Verify your DentaBook email</h2>
    <p>Hello ${name ? name : "there"},</p>
    <p>Thank you for registering with DentaBook. Please verify your email address so you can request and book dental appointments.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${verifyUrl}" style="background-color: #126f9c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
    </div>
    <div style="background-color: #eaf2f7; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #526e80;">Or enter this 6-digit verification code:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #126f9c;">${code}</div>
    </div>
    <p style="font-size: 13px; color: #526e80;">This verification link and code will expire in 24 hours.</p>
    <hr style="border: 0; border-top: 1px solid #d9e7ef; margin: 24px 0;" />
    <p style="font-size: 12px; color: #8fa6b5;">If you did not sign up for a DentaBook account, you can safely ignore this message.</p>
  </div>
</body>
</html>`;

  return deliverEmail({ to: email, subject, text, html, meta: { purpose: "verify_email", token, code } });
}

async function sendPasswordResetEmail({ email, name, token, code }) {
  const clientUrl = getClientUrl();
  const resetUrl = `${clientUrl}/patient/reset-password?token=${token}`;
  const subject = "Reset your DentaBook password";
  const text = `Hello ${name || "there"},

We received a request to reset your DentaBook password.

Click the link below to set a new password:
${resetUrl}

Or enter this 6-digit code on the reset page:
${code}

This link and code will expire in 15 minutes.

If you did not request a password reset, you can safely ignore this email. Your account password remains unchanged.
`;
  const html = `<!doctype html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #17374b; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="border-top: 4px solid #126f9c; padding-top: 16px;">
    <h2 style="color: #126f9c; margin-top: 0;">Reset your DentaBook password</h2>
    <p>Hello ${name ? name : "there"},</p>
    <p>We received a request to reset the password for your DentaBook account.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" style="background-color: #126f9c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
    </div>
    <div style="background-color: #eaf2f7; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #526e80;">Or enter this 6-digit reset code:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #126f9c;">${code}</div>
    </div>
    <p style="font-size: 13px; color: #526e80;">This password reset link and code will expire in 15 minutes.</p>
    <hr style="border: 0; border-top: 1px solid #d9e7ef; margin: 24px 0;" />
    <p style="font-size: 12px; color: #8fa6b5;">If you did not request this change, you can safely ignore this email. Your account remains secure.</p>
  </div>
</body>
</html>`;

  return deliverEmail({ to: email, subject, text, html, meta: { purpose: "reset_password", token, code } });
}

function getSentEmails() {
  return [...recentEmails];
}

function getLastSentEmail() {
  return recentEmails.length ? recentEmails[recentEmails.length - 1] : null;
}

function clearSentEmails() {
  recentEmails.length = 0;
}

module.exports = {
  deliverEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  getSentEmails,
  getLastSentEmail,
  clearSentEmails,
};
