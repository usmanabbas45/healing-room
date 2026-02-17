/**
 * Internal staff notification emails
 * Used to alert staff about critical system events (e.g. Hikeup token expiry)
 */

import nodemailer from 'nodemailer';
import prisma from '@/libs/prisma';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'mail.privateemail.com',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an urgent email to all staff when the Hikeup API token expires
 * and manual reconnection is required.
 */
export async function sendHikeupTokenExpiryEmail() {
  try {
    const staffMembers = await prisma.user.findMany({
      where: { role: 'staff' },
      select: { email: true, name: true },
    });

    if (staffMembers.length === 0) {
      console.warn('⚠️ [NOTIFY] No staff members found to notify about Hikeup token expiry');
      return;
    }

    const staffEmails = staffMembers.map((s) => s.email);
    const adminUrl = `${process.env.NEXTAUTH_URL || 'https://healingroomsixnations.ca'}/admin`;

    const subject = '🔴 Action Required: Hikeup Connection Expired';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #c0392b; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; color: #fff;">⚠️ Hikeup API Token Expired</h2>
        </div>

        <div style="background: #f8f9fa; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="font-size: 16px; margin-top: 0;">
            The Hikeup POS connection for <strong>Healing Room Six Nations</strong> has expired
            and could not be automatically renewed.
          </p>

          <div style="background: #fff3cd; border-left: 4px solid #e67e22; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #c0392b;">What this means:</p>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
              <li>Product inventory will <strong>not sync</strong> from Hikeup until reconnected</li>
              <li>Stock levels shown on the website may become out of date</li>
            </ul>
          </div>

          <p style="font-size: 15px;"><strong>What to do:</strong></p>
          <ol style="font-size: 15px; padding-left: 20px;">
            <li>Go to the <a href="${adminUrl}" style="color: #e67e22;">Admin Dashboard</a></li>
            <li>Navigate to <strong>Settings → Hikeup Integration</strong></li>
            <li>Click <strong>Reconnect Hikeup</strong> and follow the OAuth flow</li>
          </ol>

          <div style="margin-top: 24px; text-align: center;">
            <a href="${adminUrl}"
               style="display: inline-block; background: #e67e22; color: #fff; padding: 12px 28px;
                      border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold;">
              Go to Admin Dashboard →
            </a>
          </div>

          <p style="margin-top: 28px; font-size: 12px; color: #999; text-align: center;">
            This is an automated alert from healingroomsixnations.ca
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: staffEmails,
      subject,
      html,
    });

    console.log(`📧 [NOTIFY] Hikeup token expiry alert sent to ${staffMembers.length} staff member(s): ${staffEmails.join(', ')}`);
  } catch (err) {
    // Never let notification failures crash the caller
    console.error('❌ [NOTIFY] Failed to send Hikeup token expiry email:', err);
  }
}
