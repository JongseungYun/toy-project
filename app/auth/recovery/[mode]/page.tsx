import { notFound } from "next/navigation";
import { AuthCard } from "@/components/account/auth-card";
import { RecoveryLinkForm } from "@/components/account/recovery-forms";
import { recoveryConfig } from "@/lib/account/recovery-config";
import { getMessages } from "@/lib/i18n/server";

export default async function RecoveryLinkPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (mode !== "confirm" && mode !== "reset") notFound();
  const { t } = await getMessages();
  return (
    <AuthCard title={mode === "confirm" ? t.recovery.confirm : t.recovery.requestTitle} description={t.recovery.linkBody}>
      <RecoveryLinkForm mode={mode} enabled={Boolean(recoveryConfig())} />
    </AuthCard>
  );
}
