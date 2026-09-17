"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { signUp, type SignUpState } from "@/lib/account/actions";
import { checkPasswordRules, isValidUsername } from "@/lib/account/validation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup, FieldDescription, FieldError } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMessages } from "@/components/i18n-provider";

type UsernameCheck = "idle" | "checking" | "available" | "taken" | "error";

export function SignupForm() {
  const t = useMessages();
  const [state, action, pending] = useActionState<SignUpState | undefined, FormData>(
    signUp,
    undefined,
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck>("idle");

  const passwordRules = useMemo(() => checkPasswordRules(password), [password]);
  const usernameFormatValid = isValidUsername(username);

  function handleUsernameChange(value: string) {
    setUsername(value);
    setUsernameCheck("idle");
  }

  async function handleCheckUsername() {
    if (!usernameFormatValid) return;
    setUsernameCheck("checking");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("is_username_available", {
      check_username: username,
    });
    if (error) {
      setUsernameCheck("error");
      return;
    }
    setUsernameCheck(data ? "available" : "taken");
  }

  return (
    <form action={action}>
      <FieldGroup>
        {state?.message && (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={Boolean(state?.errors?.username) || undefined}>
          <FieldLabel htmlFor="username">{t.auth.username}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="username"
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => handleUsernameChange(event.target.value)}
              aria-invalid={Boolean(state?.errors?.username)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCheckUsername}
              disabled={!usernameFormatValid || usernameCheck === "checking"}
            >
              {t.auth.checkUsername}
            </Button>
          </div>
          {state?.errors?.username ? (
            <FieldError>{state.errors.username}</FieldError>
          ) : usernameCheck === "available" ? (
            <FieldDescription className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
              <CheckIcon className="size-3" /> {t.auth.usernameFree}
            </FieldDescription>
          ) : usernameCheck === "taken" ? (
            <FieldDescription className="flex items-center gap-1 text-destructive">
              <XIcon className="size-3" /> {t.auth.usernameTaken}
            </FieldDescription>
          ) : (
            <FieldDescription>{t.auth.usernameHint}</FieldDescription>
          )}
        </Field>

        <Field data-invalid={Boolean(state?.errors?.password) || undefined}>
          <FieldLabel htmlFor="password">{t.auth.password}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(state?.errors?.password)}
          />
          <ul className="mt-0.5 flex flex-col gap-1">
            <PasswordRuleItem ok={passwordRules.minLength} label={t.auth.ruleLength} />
            <PasswordRuleItem
              ok={passwordRules.hasUpperAndLower}
              label={t.auth.ruleLetters}
            />
            <PasswordRuleItem ok={passwordRules.hasNumber} label={t.auth.ruleDigit} />
            <PasswordRuleItem ok={passwordRules.hasSymbol} label={t.auth.ruleSymbol} />
          </ul>
          {state?.errors?.password && <FieldError>{state.errors.password}</FieldError>}
        </Field>

        <Field data-invalid={Boolean(state?.errors?.passwordConfirm) || undefined}>
          <FieldLabel htmlFor="passwordConfirm">{t.auth.passwordConfirm}</FieldLabel>
          <Input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(state?.errors?.passwordConfirm)}
          />
          {state?.errors?.passwordConfirm && <FieldError>{state.errors.passwordConfirm}</FieldError>}
        </Field>

        <FieldDescription>
          {t.auth.noRecovery}
        </FieldDescription>

        <Button type="submit" className="w-full" disabled={pending}>
          {t.auth.submitSignUp}
        </Button>
      </FieldGroup>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t.auth.hasAccount}{" "}
        <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
          {t.auth.goSignIn}
        </Link>
      </p>
    </form>
  );
}

function PasswordRuleItem({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CheckIcon : XIcon;
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 text-sm",
        ok ? "text-emerald-600 dark:text-emerald-500" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3" />
      {label}
    </li>
  );
}
