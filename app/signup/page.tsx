import type { Metadata } from "next";
import { AuthCard } from "@/components/account/auth-card";
import { SignupForm } from "@/components/account/signup-form";

export const metadata: Metadata = {
  title: "회원가입 — 아무노트",
};

export default function SignupPage() {
  return (
    <AuthCard
      title="계정 만들기"
      description="아이디와 비밀번호만 있으면 됩니다. 이메일은 받지 않습니다."
    >
      <SignupForm />
    </AuthCard>
  );
}
