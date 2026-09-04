import "server-only";

import { resend } from "@/lib/resend";

type SendPendingBusinessEmailInput = {
  to: string | undefined;
  businessName: string;
  listingId: string;
};

type SendLiveBusinessEmailInput = {
  to: string | undefined;
  businessName: string;
  listingId: string;
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendPendingBusinessEmail({
  to,
  businessName,
  listingId,
}: SendPendingBusinessEmailInput) {
  if (!to) {
    console.warn("Pending business email skipped because the owner has no email address.");
    return;
  }

  const safeBusinessName = escapeHtml(businessName);
  const continuePaymentUrl = `${siteUrl}/business/${listingId}`;

  const { data, error } = await resend.emails.send({
    from: "OutbidInd <noreply@outbidind.com>",
    to: [to],
    subject: "Your business is currently pending",
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:32px 16px;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
          <h1 style="margin:0 0 12px;color:#0f172a;font-size:28px;">
            Your business is currently pending
          </h1>
          <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:1.7;">
            Your business <strong>${safeBusinessName}</strong> has passed the security check and is currently pending payment.
          </p>
          <p style="margin:0 0 24px;color:#475569;font-size:16px;line-height:1.7;">
            Complete your payment to make your business <strong>LIVE</strong> on OutbidInd and available for bidding.
          </p>
          <a href="${continuePaymentUrl}" style="display:inline-block;background:#e4572e;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700;">
            Continue Payment →
          </a>
          <p style="margin:28px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
            This is an automated notification from OutbidInd.
          </p>
        </div>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function sendLiveBusinessEmail({
  to,
  businessName,
  listingId,
}: SendLiveBusinessEmailInput) {
  if (!to) {
    console.warn("Live business email skipped because the owner has no email address.");
    return;
  }

  const safeBusinessName = escapeHtml(businessName);
  const businessUrl = `${siteUrl}/business/${listingId}`;

  const { data, error } = await resend.emails.send({
    from: "OutbidInd <noreply@outbidind.com>",
    to: [to],
    subject: "Your business is now LIVE 🚀",
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:32px 16px;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
          <div style="font-size:42px;line-height:1;margin-bottom:18px;">🚀</div>
          <h1 style="margin:0 0 12px;color:#0f172a;font-size:28px;">
            Your business is now LIVE
          </h1>
          <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:1.7;">
            Your business <strong>${safeBusinessName}</strong> is now live on OutbidInd and available for bidding.
          </p>
          <p style="margin:0 0 24px;color:#475569;font-size:16px;line-height:1.7;">
            Your auction is now visible in the OutbidInd live marketplace.
          </p>
          <a href="${businessUrl}" style="display:inline-block;background:#e4572e;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700;">
            View Your Business →
          </a>
          <p style="margin:28px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
            This is an automated notification from OutbidInd.
          </p>
        </div>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
  return data;
}