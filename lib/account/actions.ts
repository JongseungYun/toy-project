"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/i18n/server";
import {
  isPasswordValid,
  isValidUsername,
  usernameToInternalEmail,
} from "@/lib/account/validation";

export interface SignUpState {
  errors?: {
    username?: string;
    password?: string;
    passwordConfirm?: string;
  };
  message?: string;
}

export async function signUp(
  _prevState: SignUpState | undefined,
  formData: FormData,
): Promise<SignUpState> {
  const { t } = await getMessages();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!isValidUsername(username)) {
    return { errors: { username: t.errors.usernameRule } };
  }
  if (!isPasswordValid(password)) {
    return { errors: { password: t.errors.passwordRule } };
  }
  if (password !== passwordConfirm) {
    return { errors: { passwordConfirm: t.errors.passwordMismatch } };
  }

  const supabase = await createClient();

  const { data: available, error: availabilityError } = await supabase.rpc(
    "is_username_available",
    { check_username: username },
  );
  if (!availabilityError && available === false) {
    return { errors: { username: "이미 사용 중인 아이디입니다." } };
  }

  const { error } = await supabase.auth.signUp({
    email: usernameToInternalEmail(username),
    password,
    options: {
      data: { username },
    },
  });

  if (error) {
    const DUPLICATE_CODES = new Set([
      "user_already_exists",
      "email_exists",
      "identity_already_exists",
    ]);
    const isDuplicate =
      ("code" in error && DUPLICATE_CODES.has(String(error.code))) ||
      /registered|exists/i.test(error.message);
    if (isDuplicate) {
      return { errors: { username: t.auth.usernameTaken } };
    }
    return { message: t.errors.signUpFailed };
  }

  redirect("/");
}

export interface SignInState {
  message?: string;
}

export async function signIn(
  _prevState: SignInState | undefined,
  formData: FormData,
): Promise<SignInState> {
  const { t } = await getMessages();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToInternalEmail(username),
    password,
  });

  if (error) {
    return { message: t.errors.signInFailed };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
