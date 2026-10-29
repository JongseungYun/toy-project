"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useMessages } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/** 빈 보관함이나 404 대신 보여 주는 읽기 실패 화면. 현재 주소와 정렬은 유지한다. */
export function ReadFailure() {
  const t = useMessages();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-h-dvh flex-1 bg-muted p-4 sm:p-6">
      <main className="flex flex-1 items-center justify-center rounded-2xl border border-border bg-background p-6">
        <Empty data-testid="read-failure">
          <EmptyHeader role="alert">
            <EmptyMedia variant="icon"><WarningCircleIcon /></EmptyMedia>
            <EmptyTitle>{t.library.readErrorTitle}</EmptyTitle>
            <EmptyDescription>{t.library.readErrorBody}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              disabled={pending}
              onClick={() => startTransition(() => router.refresh())}
            >
              <ArrowClockwiseIcon data-icon="inline-start" />
              {pending ? t.library.readRetrying : t.library.readRetry}
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    </div>
  );
}
