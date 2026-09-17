"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!isValidUsername(username)) {
    return {
      errors: { username: "영문 소문자와 숫자 4-20자로 입력해 주세요." },
    };
  }
  if (!isPasswordValid(password)) {
    return {
      errors: { password: "비밀번호 조건을 모두 만족해야 합니다." },
    };
  }
  if (password !== passwordConfirm) {
    return {
      errors: { passwordConfirm: "비밀번호가 일치하지 않습니다." },
    };
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
      return { errors: { username: "이미 사용 중인 아이디입니다." } };
    }
    return { message: "가입에 실패했습니다. 잠시 후 다시 시도해 주세요." };
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
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToInternalEmail(username),
    password,
  });

  if (error) {
    return { message: "아이디 또는 비밀번호가 맞지 않습니다." };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
