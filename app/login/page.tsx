import type { Metadata } from "next";
import { AuthCard } from "@/components/account/auth-card";
import { LoginForm } from "@/components/account/login-form";

export const metadata: Metadata = {
  title: "로그인 — 아무노트",
};

export default function LoginPage() {
  return (
    <AuthCard
      title="아무노트에 로그인"
      description="아이디와 비밀번호로 들어오거나, Google 계정으로 이어서 씁니다."
    >
      <LoginForm />
    </AuthCard>
  );
}
