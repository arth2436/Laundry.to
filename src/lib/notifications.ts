import { CompanySettings } from '@/types';

export interface NotificationResult {
  success: boolean;
  message: string;
  gatewayUsed: boolean;
}

/**
 * Clean and format mobile numbers for WhatsApp API.
 * Ensures the country code '91' is prefixed if it's an Indian number.
 */
export function formatWhatsAppMobile(mobile: string): string {
  const clean = mobile.replace(/\D/g, '');
  if (clean.length === 10) {
    return `91${clean}`;
  }
  return clean;
}

/**
 * Sends a WhatsApp message using a direct API Gateway if configured.
 * No token required — just the gateway URL (local or remote).
 */
export async function sendWhatsAppDirect(
  mobile: string,
  message: string,
  settings: CompanySettings,
  pdfBase64?: string,
  pdfName?: string
): Promise<NotificationResult> {
  const to = formatWhatsAppMobile(mobile);
  const { whatsappGatewayUrl } = settings;

  if (whatsappGatewayUrl) {
    try {
      const response = await fetch(whatsappGatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          body: message,
          pdf: pdfBase64,
          pdfName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Gateway returned HTTP ${response.status}`);
      }

      return {
        success: true,
        message: 'Message delivered directly via your WhatsApp gateway!',
        gatewayUsed: true,
      };
    } catch (error: any) {
      console.error('WhatsApp Gateway Error:', error);
      return {
        success: false,
        message: `Failed to send via gateway: ${error.message || 'Unknown error'}`,
        gatewayUsed: true,
      };
    }
  }

  // Fallback to Simulation Mode
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Simulated direct background notification sent!',
        gatewayUsed: false,
      });
    }, 1200);
  });
}

/**
 * Sends a real email via /api/send-email (Resend).
 * Falls back gracefully if the API key is not configured.
 */
export async function sendEmailDirect(
  toEmail: string,
  subject: string,
  message: string,
  settings?: CompanySettings
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: toEmail,
        subject,
        message,
        shopName: settings?.name,
        shopPhone: settings?.phone,
        smtpEmail: settings?.smtpEmail,
        smtpPassword: settings?.smtpPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.error || 'Email sending failed.',
      };
    }

    return {
      success: true,
      message: `Email sent to ${toEmail}!`,
    };
  } catch (error: any) {
    console.error('sendEmailDirect error:', error);
    return {
      success: false,
      message: `Email error: ${error.message}`,
    };
  }
}

