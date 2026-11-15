"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useMessages } from "@/components/i18n-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { changeRecoveryEmail, confirmRecoveryEmail, requestPasswordRecovery, resetRecoveredPassword } from "@/lib/account/recovery-actions";
import type { RecoveryState } from "@/lib/account/recovery";

const successful = ["sent", "accepted", "confirmed", "removed", "changed"];

function RecoveryMessage({ state }: { state: RecoveryState | null }) {
  const t = useMessages();
  if (!state) return null;
  const message = {
    invalidUsername: t.errors.usernameRule,
    passwordRule: t.errors.passwordRule,
    passwordMismatch: t.errors.passwordMismatch,
    ...t.recovery.status,
  }[state.status];
  return (
    <Alert variant={successful.includes(state.status) ? "default" : "destructive"}>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function RecoverySettingsForm({ masked, hasPending }: { masked: string | null; hasPending: boolean }) {
  const t = useMessages();
  const [state, action, pending] = useActionState(changeRecoveryEmail, null);
  return (
    <form action={action}>
      <FieldGroup className="gap-4">
        {masked && <p className="text-sm font-medium" data-testid="verified-recovery-email">{masked}</p>}
        {hasPending && <p className="text-sm text-muted-foreground">{t.recovery.waiting}</p>}
        <Field>
          <FieldLabel htmlFor="recovery-email">{t.recovery.email}</FieldLabel>
          <Input id="recovery-email" name="email" type="email" autoComplete="email" maxLength={254} />
        </Field>
        <Field>
          <FieldLabel htmlFor="recovery-current-password">{t.recovery.currentPassword}</FieldLabel>
          <Input id="recovery-current-password" name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <RecoveryMessage state={state} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" name="operation" value="set" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}{t.recovery.sendVerification}
          </Button>
          {(masked || hasPending) && <Button type="submit" name="operation" value="remove" variant="outline" disabled={pending}>{t.recovery.remove}</Button>}
        </div>
      </FieldGroup>
    </form>
  );
}

export function RecoveryRequestForm({ enabled }: { enabled: boolean }) {
  const t = useMessages();
  const [state, action, pending] = useActionState(requestPasswordRecovery, null);
  return (
    <div className="flex flex-col gap-4">
      {enabled ? (
        <form action={action}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="recovery-username">{t.auth.username}</FieldLabel>
              <Input id="recovery-username" name="username" autoComplete="username" required maxLength={20} />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}{t.recovery.sendReset}
            </Button>
            <RecoveryMessage state={state} />
          </FieldGroup>
        </form>
      ) : <RecoveryMessage state={{ status: "unavailable" }} />}
      <p className="text-sm text-muted-foreground">{t.recovery.provider}</p>
      <Link href="/login" className="text-sm font-medium underline underline-offset-4">{t.auth.goSignIn}</Link>
    </div>
  );
}

export function RecoveryLinkForm({ mode, enabled }: { mode: "confirm" | "reset"; enabled: boolean }) {
  const t = useMessages();
  const [token, setToken] = useState<string | null>(null);
  const [state, action, pending] = useActionState(mode === "confirm" ? confirmRecoveryEmail : resetRecoveredPassword, null);
  const finished = state?.status === "confirmed" || state?.status === "changed";
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    queueMicrotask(() => setToken(value));
  }, []);
  useEffect(() => {
    if (finished) window.history.replaceState(null, "", window.location.pathname);
  }, [finished]);
  const invalid = token !== null && !/^[A-Za-z0-9_-]{43}$/.test(token);
  return (
    <div className="flex flex-col gap-4">
      {!enabled ? <RecoveryMessage state={{ status: "unavailable" }} /> : (
        <>
          <RecoveryMessage state={invalid ? { status: "expired" } : state} />
          {!finished && !invalid && state?.status !== "expired" && (
            <form action={action}>
              <input type="hidden" name="token" value={token ?? ""} />
              <FieldGroup className="gap-4">
                {mode === "reset" && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="recovery-password">{t.recovery.newPassword}</FieldLabel>
                      <Input id="recovery-password" name="password" type="password" autoComplete="new-password" required maxLength={72} />
                      <FieldDescription>{t.errors.passwordRule}</FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="recovery-password-confirm">{t.auth.passwordConfirm}</FieldLabel>
                      <Input id="recovery-password-confirm" name="passwordConfirm" type="password" autoComplete="new-password" required maxLength={72} />
                    </Field>
                  </>
                )}
                <Button type="submit" disabled={pending || !token}>
                  {pending && <Spinner data-icon="inline-start" />}{mode === "confirm" ? t.recovery.confirm : t.recovery.savePassword}
                </Button>
              </FieldGroup>
            </form>
          )}
        </>
      )}
      <Link href={state?.status === "confirmed" ? "/settings" : "/login"} className="text-sm font-medium underline underline-offset-4">
        {state?.status === "confirmed" ? t.settings.title : t.auth.goSignIn}
      </Link>
    </div>
  );
}
