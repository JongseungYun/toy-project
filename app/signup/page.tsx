import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/server";
import { AuthCard } from "@/components/account/auth-card";
import { SignupForm } from "@/components/account/signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: `${t.auth.signUpTitle} — ${t.app.name}` };
}

export default async function SignupPage() {
  const { t } = await getMessages();

  return (
    <AuthCard title={t.auth.signUpTitle} description={t.auth.signUpLead}>
      <SignupForm />
    </AuthCard>
  );
}
