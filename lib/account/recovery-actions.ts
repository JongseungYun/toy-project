"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { isPasswordValid, isValidUsername } from "./validation";
import { passwordCheckClient, recoveryConfig, recoveryDatabase } from "./recovery-config";
import { digestRecoveryToken, isLocalAccount, issuePasswordRecovery, newRecoveryToken, sendRecoveryMail, validRecoveryAddress, validRecoveryToken, type RecoveryState } from "./recovery";

async function checkedAccount(password: string) {
  const user = await currentUser();
  if (!user || !isLocalAccount(user) || !password) return null;
  const verifier = passwordCheckClient();
  const { data, error } = await verifier.auth.signInWithPassword({ email: user.email, password });
  if (error || data.user?.id !== user.id) return null;
  await verifier.auth.signOut({ scope: "local" });
  return { id: user.id, email: user.email };
}

export async function changeRecoveryEmail(_state: RecoveryState | null, form: FormData): Promise<RecoveryState> {
  const config = recoveryConfig();
  if (!config) return { status: "unavailable" };
  const operation = form.get("operation");
  const email = String(form.get("email") ?? "").trim();
  if (operation !== "set" && operation !== "remove") return { status: "failed" };
  if (operation === "set" && !validRecoveryAddress(email)) return { status: "invalidEmail" };
  try {
    const account = await checkedAccount(String(form.get("currentPassword") ?? ""));
    if (!account) return { status: "wrongPassword" };
    const db = recoveryDatabase(config);
    if (operation === "remove") {
      const { error } = await db.from("account_recovery").update({
        verified_email: null, pending_email: null, verification_digest: null,
        verification_expires_at: null, reset_digest: null, reset_expires_at: null,
      }).eq("user_id", account.id);
      if (error) return { status: "failed" };
      revalidatePath("/settings");
      return { status: "removed" };
    }
    const { token, digest } = newRecoveryToken();
    const { data, error } = await db.rpc("begin_recovery_email", {
      account_id: account.id, internal_email: account.email, address: email, digest,
    });
    if (error) return { status: "failed" };
    if (!data) return { status: "cooldown" };
    if (!(await sendRecoveryMail(config, email, token, "confirm"))) {
      await db.from("account_recovery").update({ pending_email: null, verification_digest: null, verification_expires_at: null })
        .eq("user_id", account.id).eq("verification_digest", digest);
      return { status: "failed" };
    }
    revalidatePath("/settings");
    return { status: "sent" };
  } catch {
    return { status: "failed" };
  }
}

export async function requestPasswordRecovery(_state: RecoveryState | null, form: FormData): Promise<RecoveryState> {
  const config = recoveryConfig();
  if (!config) return { status: "unavailable" };
  const username = String(form.get("username") ?? "").trim();
  if (!isValidUsername(username)) return { status: "invalidUsername" };
  after(async () => {
    try {
      await issuePasswordRecovery(config, username);
    } catch {
      console.error("비밀번호 복구 메일 요청을 처리하지 못했습니다.");
    }
  });
  return { status: "accepted" };
}

export async function confirmRecoveryEmail(_state: RecoveryState | null, form: FormData): Promise<RecoveryState> {
  const config = recoveryConfig();
  if (!config) return { status: "unavailable" };
  const token = String(form.get("token") ?? "");
  if (!validRecoveryToken(token)) return { status: "expired" };
  try {
    const { data, error } = await recoveryDatabase(config).rpc("confirm_recovery_email", { digest: digestRecoveryToken(token) });
    if (error) return { status: "failed" };
    if (!data) return { status: "expired" };
    revalidatePath("/settings");
    return { status: "confirmed" };
  } catch {
    return { status: "failed" };
  }
}

export async function resetRecoveredPassword(_state: RecoveryState | null, form: FormData): Promise<RecoveryState> {
  const config = recoveryConfig();
  if (!config) return { status: "unavailable" };
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (!validRecoveryToken(token)) return { status: "expired" };
  if (!isPasswordValid(password) || new TextEncoder().encode(password).length > 72) return { status: "passwordRule" };
  if (password !== form.get("passwordConfirm")) return { status: "passwordMismatch" };
  try {
    const db = recoveryDatabase(config);
    const { data: id, error: claimError } = await db.rpc("consume_password_recovery", { digest: digestRecoveryToken(token) });
    if (claimError) return { status: "failed" };
    if (typeof id !== "string") return { status: "expired" };
    const { error } = await db.auth.admin.updateUserById(id, { password });
    return { status: error ? "failed" : "changed" };
  } catch {
    return { status: "failed" };
  }
}
