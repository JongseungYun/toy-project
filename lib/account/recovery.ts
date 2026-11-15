import { createHash, randomBytes } from "node:crypto";
import { currentUser } from "@/lib/supabase/server";
import { recoveryConfig, recoveryDatabase, type RecoveryConfig } from "./recovery-config";
import { usernameToInternalEmail } from "./validation";

export type RecoveryState = { status: "sent" | "accepted" | "confirmed" | "removed" | "changed" | "invalidEmail" | "invalidUsername" | "wrongPassword" | "passwordRule" | "passwordMismatch" | "expired" | "cooldown" | "unavailable" | "failed" };

export function isLocalAccount(user: { email?: string; app_metadata: { provider?: unknown } }): user is { email: string; app_metadata: { provider: "email" } } {
  return user.app_metadata.provider === "email" && /^[a-z0-9]{4,20}@users\.amunote\.internal$/.test(user.email ?? "");
}

export function validRecoveryAddress(email: string) {
  return email.length <= 254 && /^[^\s@<>(),;:"\[\]\\]+@(?:[a-z0-9-]+\.)+[a-z0-9-]+$/i.test(email) && !email.toLowerCase().endsWith(".internal");
}

export function digestRecoveryToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newRecoveryToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, digest: digestRecoveryToken(token) };
}

export function validRecoveryToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export async function recoverySettings() {
  const user = await currentUser();
  if (!user || !isLocalAccount(user)) return { kind: "provider" as const };
  const config = recoveryConfig();
  if (!config) return { kind: "unavailable" as const };
  const { data, error } = await recoveryDatabase(config).from("account_recovery")
    .select("verified_email, pending_email, verification_expires_at").eq("user_id", user.id).maybeSingle();
  if (error) return { kind: "unavailable" as const };
  const email = data?.verified_email as string | null | undefined;
  const masked = email ? `${email[0]}•••@${email.split("@")[1]}` : null;
  const pending = Boolean(data?.pending_email && Date.parse(data.verification_expires_at) > Date.now());
  return { kind: "local" as const, masked, pending };
}

export async function sendRecoveryMail(config: RecoveryConfig, address: string, token: string, purpose: "confirm" | "reset") {
  const url = new URL(`/auth/recovery/${purpose}`, config.origin);
  // 메일 링크를 열기만 해서는 토큰이 서버에 전달되거나 소비되지 않는다.
  url.hash = new URLSearchParams({ token }).toString();
  const confirm = purpose === "confirm";
  const subject = confirm ? "아무노트 복구 이메일 확인 · Confirm recovery email" : "아무노트 비밀번호 재설정 · Reset your password";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.mailKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.sender,
        to: [address],
        subject,
        text: `${subject}\n\n${url.href}\n\n이 링크는 30분 동안 사용할 수 있습니다. 요청하지 않았다면 이 메일을 무시해 주세요.\nThis link expires in 30 minutes. If you did not request it, you can ignore this email.`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function issuePasswordRecovery(config: RecoveryConfig, username: string) {
  const { token, digest } = newRecoveryToken();
  const { data, error } = await recoveryDatabase(config).rpc("begin_password_recovery", {
    internal_email: usernameToInternalEmail(username), digest,
  });
  if (error) throw new Error("복구 요청을 저장하지 못했습니다.");
  if (typeof data === "string" && !(await sendRecoveryMail(config, data, token, "reset"))) {
    throw new Error("재설정 메일을 보내지 못했습니다.");
  }
}
