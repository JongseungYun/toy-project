import { AuthCard } from "@/components/account/auth-card";
import { RecoveryRequestForm } from "@/components/account/recovery-forms";
import { recoveryConfig } from "@/lib/account/recovery-config";
import { getMessages } from "@/lib/i18n/server";

export default async function RequestRecoveryPage() {
  const { t } = await getMessages();
  return (
    <AuthCard title={t.recovery.requestTitle} description={t.recovery.requestBody}>
      <RecoveryRequestForm enabled={Boolean(recoveryConfig())} />
    </AuthCard>
  );
}
