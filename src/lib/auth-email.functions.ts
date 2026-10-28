import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SENDER = { name: "Slotly", email: "info@coachingclass.xyz" };
const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";

function safeOrigin(origin: string) {
  const u = new URL(origin);
  return u.origin;
}

async function sendBrevo(to: string, subject: string, title: string, body: string, cta: string, link: string) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const brevoKey = process.env["BREVO_API_KEY"];
  if (!lovableKey || !brevoKey) throw new Error("Email service is not configured");
  const html = `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#111111">
<div style="max-width:480px;margin:0 auto;padding:32px 24px">
<h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
<p style="font-size:15px;line-height:1.5;color:#444">${body}</p>
<p style="margin:28px 0"><a href="${link}" style="background:#0F766E;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${cta}</a></p>
<p style="font-size:12px;color:#888">If you didn't request this, you can ignore this email.</p>
</div></body></html>`;
  const res = await fetch(`${GATEWAY_URL}/smtp/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": brevoKey,
    },
    body: JSON.stringify({ sender: SENDER, to: [{ email: to }], subject, htmlContent: html }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`Brevo send failed [${res.status}]: ${t}`);
    throw new Error("We couldn't send the email. Please try again.");
  }
}

export const signUpWithBrevo = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      full_name: z.string().trim().min(2).max(80),
      email: z.string().trim().email().max(255),
      password: z.string().min(8).max(72),
      origin: z.string().url(),
      redirect: z.string().max(500).optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const origin = safeOrigin(data.origin);
    const back = `${origin}/auth${data.redirect?.startsWith("/") ? `?redirect=${encodeURIComponent(data.redirect)}` : ""}`;
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name }, redirectTo: back },
    });
    if (error) throw new Error(error.message);
    await sendBrevo(
      data.email,
      "Confirm your Slotly account",
      `Welcome, ${data.full_name.replace(/[<>&"]/g, "")}!`,
      "Confirm your email address to start using Slotly.",
      "Confirm email",
      link.properties.action_link,
    );
    return { ok: true };
  });

export const resetPasswordWithBrevo = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ email: z.string().trim().email().max(255), origin: z.string().url() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const origin = safeOrigin(data.origin);
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: { redirectTo: `${origin}/reset-password` },
    });
    // Don't reveal whether the account exists.
    if (error || !link?.properties?.action_link) return { ok: true };
    await sendBrevo(
      data.email,
      "Reset your Slotly password",
      "Reset your password",
      "Tap the button below to choose a new password for your Slotly account.",
      "Set new password",
      link.properties.action_link,
    );
    return { ok: true };
  });
