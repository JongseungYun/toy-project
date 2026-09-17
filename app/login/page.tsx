import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/server";
import { AuthCard } from "@/components/account/auth-card";
import { LoginForm } from "@/components/account/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: `${t.auth.submitSignIn} — ${t.app.name}` };
}

export default async function LoginPage() {
  const { t } = await getMessages();

  return (
    <AuthCard title={t.auth.signInTitle} description={t.auth.signInLead}>
      <LoginForm />
    </AuthCard>
  );
}
