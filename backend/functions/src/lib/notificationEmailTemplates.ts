interface CaseEmailTemplateInput {
  toName: string;
  title: string;
  message: string;
  caseId: string;
  dateStr: string;
  isSubmission: boolean;
  statusLabel?: string;
  actionUrl?: string;
}

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://speakupgc.vercel.app';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildCaseNotificationEmail(input: CaseEmailTemplateInput): {
  subject: string;
  html: string;
} {
  const toName = escapeHtml(input.toName);
  const message = escapeHtml(input.message);
  const caseId = escapeHtml(input.caseId);
  const dateStr = escapeHtml(input.dateStr);
  const statusLabel = escapeHtml(input.statusLabel || input.title);
  const actionHref = input.actionUrl
    ? `${APP_BASE_URL}${input.actionUrl.startsWith('/') ? input.actionUrl : `/${input.actionUrl}`}`
    : `${APP_BASE_URL}/notifications`;

  const headline = input.isSubmission
    ? 'Complaint Submitted Successfully'
    : 'Case Update';

  const intro = input.isSubmission
    ? 'Your complaint has been received and is now under review by the DEIU office.'
    : 'There is a new update on your case.';

  const subject = input.isSubmission
    ? `Complaint Submitted — Case ${input.caseId}`
    : `${input.title} — Case ${input.caseId}`;

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f3f4f6;">
    <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
      <div style="background:linear-gradient(135deg,#16A34A 0%,#15803D 100%);color:#fff;padding:32px 28px;border-radius:16px 16px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:24px;">SpeakUp GC</h1>
        <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">Gordon College DEIU</p>
      </div>
      <div style="background:#fff;padding:32px 28px;border:1px solid #e5e7eb;border-top:none;">
        <h2 style="color:#16A34A;margin:0 0 12px;font-size:20px;">${headline}</h2>
        <p style="margin:0 0 16px;">Hi ${toName},</p>
        <p style="margin:0 0 20px;">${intro}</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 18px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Case ID</p>
          <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111827;font-family:monospace;">${caseId}</p>
          ${input.isSubmission ? '' : `<p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Status</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#15803D;">${statusLabel}</p>`}
          <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Update</p>
          <p style="margin:0;font-size:14px;color:#374151;">${message}</p>
        </div>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Date: ${dateStr}</p>
        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${actionHref}" style="display:inline-block;background:#16A34A;color:#fff !important;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;">View Case Details</a>
        </div>
        <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">This message was sent because you enabled email notifications for your SpeakUp GC account.</p>
      </div>
      <div style="background:#f9fafb;padding:24px 28px;text-align:center;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;">
        <p style="margin:0;font-size:13px;color:#6b7280;"><strong>SpeakUp GC</strong> — Safe Spaces for Everyone</p>
        <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Gordon College Diversity, Equity, and Inclusion Unit</p>
        <p style="margin:12px 0 0;font-size:11px;color:#9ca3af;">Automated message — please do not reply.</p>
      </div>
    </div>
  </body>
</html>`;

  return { subject, html };
}
