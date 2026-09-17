"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type SignInState } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup, FieldSeparator } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleSignInButton } from "@/components/account/google-sign-in-button";
import { useMessages } from "@/components/i18n-provider";

export function LoginForm() {
  const t = useMessages();
  const [state, action, pending] = useActionState<SignInState | undefined, FormData>(
    signIn,
    undefined,
  );

  return (
    <form action={action}>
      <FieldGroup>
        {state?.message && (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="username">{t.auth.username}</FieldLabel>
          <Input id="username" name="username" autoComplete="username" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">{t.auth.password}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {t.auth.submitSignIn}
        </Button>
        <FieldSeparator>{t.auth.or}</FieldSeparator>
        <GoogleSignInButton />
      </FieldGroup>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t.auth.noAccount}{" "}
        <Link href="/signup" className="font-semibold text-foreground underline underline-offset-4">
          {t.auth.goSignUp}
        </Link>
      </p>
    </form>
  );
}
