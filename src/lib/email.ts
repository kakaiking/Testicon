import https from "node:https";

type EmailJsConfig = {
  serviceId: string;
  templateId: string;
  publicKey: string;
  privateKey?: string;
};

function getEmailJsConfig(): EmailJsConfig | null {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) return null;

  return {
    serviceId,
    templateId,
    publicKey,
    privateKey: process.env.EMAILJS_PRIVATE_KEY,
  };
}

function postEmailJs(body: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: "api.emailjs.com",
        path: "/api/v1.0/email/send",
        port: 443,
        method: "POST",
        family: 4,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString() });
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function sendViaEmailJs(body: string, attempts = 3): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const result = await postEmailJs(body);
      if (result.status === 200) return;
      throw new Error(`EmailJS HTTP ${result.status}: ${result.text}`);
    } catch (err) {
      lastError = err;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

export async function sendInvitationEmail(opts: {
  to: string;
  appName: string;
  inviteUrl: string;
  inviterEmail: string;
  expiresIn?: string;
}) {
  const config = getEmailJsConfig();

  if (!config) {
    console.log("[Testicon Email Preview — EmailJS not configured]", {
      to: opts.to,
      appName: opts.appName,
      inviteUrl: opts.inviteUrl,
      inviterEmail: opts.inviterEmail,
    });
    return { preview: true };
  }

  const to = opts.to.trim().toLowerCase();
  const inviter = opts.inviterEmail.trim().toLowerCase();
  // Gmail often drops messages when To and Reply-To are the same address (common when
  // an admin invites their own email for testing). Omit reply-to in that case.
  const replyTo = inviter !== to ? opts.inviterEmail : "";

  const payload = JSON.stringify({
    lib_version: "5.0.2",
    user_id: config.publicKey,
    accessToken: config.privateKey,
    service_id: config.serviceId,
    template_id: config.templateId,
    template_params: {
      to_email: opts.to,
      app_name: opts.appName,
      invite_url: opts.inviteUrl,
      inviter_email: opts.inviterEmail,
      reply_to: replyTo,
      subject: `You've been invited to test ${opts.appName}...`,
      expires_in: opts.expiresIn ?? "",
      expires_text: opts.expiresIn ? `This link expires in ${opts.expiresIn}.` : "",
    },
  });

  await sendViaEmailJs(payload);
  return { preview: false };
}
