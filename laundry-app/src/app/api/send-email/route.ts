import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  try {
    const { to, subject, message, shopName, shopPhone, smtpEmail, smtpPassword } = await req.json();

    if (!to || !subject || !message) {
      return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 });
    }

    if (!smtpEmail && !smtpPassword && !resend) {
      console.warn('No SMTP credentials and RESEND_API_KEY not set — email skipped.');
      return NextResponse.json({ success: false, error: 'Email service not configured. Please add SMTP credentials in Settings.' }, { status: 503 });
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                🧺 ${shopName || 'Laundry App'}
              </div>
              <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">
                Order Notification
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="font-size:16px;color:#1f2937;line-height:1.7;margin:0 0 24px;">
                ${message.replace(/\n/g, '<br/>')}
              </p>

              <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:4px;">✅ ORDER READY FOR PICKUP</div>
                <div style="font-size:12px;color:#166534;">Please bring this email or your order slip when collecting.</div>
              </div>

              ${shopPhone ? `
              <div style="text-align:center;margin-top:8px;">
                <a href="tel:${shopPhone}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;">
                  📞 Call Us: ${shopPhone}
                </a>
              </div>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="font-size:11px;color:#9ca3af;margin:0;">
                ${shopName || 'Laundry App'} &bull; ${shopPhone || ''}
              </p>
              <p style="font-size:10px;color:#d1d5db;margin:6px 0 0;">
                You received this because you are a valued customer.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // 1. Try Nodemailer if SMTP credentials are provided
    if (smtpEmail && smtpPassword) {
      const transporter = nodemailer.createTransport({
        service: 'gmail', // Usually assuming Gmail for simple setups. Users can also configure generic host if needed.
        auth: {
          user: smtpEmail,
          pass: smtpPassword,
        },
      });

      try {
        const info = await transporter.sendMail({
          from: `"${shopName || 'Laundry App'}" <${smtpEmail}>`,
          to,
          subject,
          html,
        });
        return NextResponse.json({ success: true, id: info.messageId });
      } catch (smtpErr: any) {
        console.error('SMTP sending error:', smtpErr);
        // If it fails and resend isn't configured, return the error
        if (!resend) {
          return NextResponse.json({ success: false, error: smtpErr.message }, { status: 500 });
        }
        console.warn('Falling back to Resend after SMTP failure');
      }
    }

    // 2. Fallback to Resend
    if (resend) {
      const FROM_EMAIL = 'Laundry App <onboarding@resend.dev>';
      const REPLY_TO  = smtpEmail || 'info.laundryto@gmail.com';
      
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        replyTo: REPLY_TO,
        to: [to],
        subject,
        html,
      });

      if (error) {
        console.error('Resend error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, id: data?.id });
    }

  } catch (err: any) {
    console.error('Send email route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
