function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildVerificationEmail(input: {
  toName: string;
  verificationLink: string;
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const toName = escapeHtml(input.toName);
  const link = escapeHtml(input.verificationLink);
  const logoUrl = input.logoUrl ? escapeHtml(input.logoUrl) : '';

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" width="56" height="56" alt="SpeakUp GC" style="display:block;margin:0 auto 14px;border:0;border-radius:12px;background:#fff;" />`
    : '';

  return {
    subject: 'Verify your email — SpeakUp GC',
    text: `Hi ${input.toName},

Welcome to SpeakUp GC, Gordon College's DEIU reporting platform.

Verify your email so you can sign in:
${input.verificationLink}

This link expires in 24 hours. If you did not create this account, you can ignore this email.

Thank you,
The SpeakUp GC team
Gordon College — Diversity, Equity, and Inclusion Unit`,
    html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify your email</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Verify your SpeakUp GC account to finish signing up.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <tr>
              <td style="background:#16A34A;background:linear-gradient(135deg,#16A34A 0%,#15803D 100%);padding:36px 32px;text-align:center;border-radius:16px 16px 0 0;">
                ${logoBlock}
                <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.2;font-weight:700;">SpeakUp GC</h1>
                <p style="margin:8px 0 0;color:#dcfce7;font-size:14px;letter-spacing:0.02em;">Gordon College DEIU</p>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;padding:36px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
                <h2 style="margin:0 0 8px;color:#166534;font-size:22px;line-height:1.3;">Verify your email address</h2>
                <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">Hi ${toName},</p>
                <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                  Thank you for creating a SpeakUp GC account. Confirm this email to finish setup and access the DEIU reporting platform.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                  <tr>
                    <td align="center" bgcolor="#16A34A" style="background:#16A34A;border-radius:8px;">
                      <a href="${link}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">
                        Verify Email Address
                      </a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
                  <tr>
                    <td style="background:#fffbeb;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:4px;color:#92400e;font-size:13px;line-height:1.5;">
                      <strong>Security notice:</strong> This link expires in 24 hours. If you did not create this account, you can ignore this email.
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
                  If the button does not work, copy and paste this link into your browser:<br />
                  <a href="${link}" style="color:#16A34A;word-break:break-all;">${link}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;padding:24px 32px;text-align:center;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;">
                <p style="margin:0;color:#4b5563;font-size:13px;"><strong>SpeakUp GC</strong> — Safe Spaces for Everyone</p>
                <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">Gordon College Diversity, Equity, and Inclusion Unit</p>
                <p style="margin:12px 0 0;color:#9ca3af;font-size:11px;">Automated message — please do not reply.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}
