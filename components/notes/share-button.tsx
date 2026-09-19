"use client";

import { useState, useTransition } from "react";
import { CheckIcon, CopyIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { shareUrl } from "@/lib/notes/share";
import { startSharing, stopSharing } from "@/lib/notes/share-actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMessages } from "@/components/i18n-provider";

/**
 * 읽기 전용 링크로 공유하기. 링크를 만들고, 복사하고, 다시 끄는 일을 한 창에서 한다.
 *
 * 공유 중인지는 버튼 모양으로 먼저 보인다. 내 노트가 지금 밖에서 열리는 상태인지를
 * 창을 열어야만 알 수 있으면 켜 둔 것을 잊는다.
 */
export function ShareButton({
  noteId,
  shareToken,
}: {
  noteId: string;
  shareToken: string | null;
}) {
  const t = useMessages();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(shareToken);
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 창은 열릴 때 비로소 그려진다. 그래서 여기서 주소를 물어도 된다.
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = token ? shareUrl(origin, token) : "";

  function start() {
    setProblem(null);
    startTransition(async () => {
      try {
        setToken(await startSharing(noteId));
      } catch {
        setProblem(t.share.failed);
      }
    });
  }

  function stop() {
    setProblem(null);
    setCopied(false);
    startTransition(async () => {
      try {
        await stopSharing(noteId);
        setToken(null);
      } catch {
        setProblem(t.share.failed);
      }
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // 클립보드를 막아 둔 브라우저가 있다. 그럴 때는 주소 칸을 골라 둔다.
      setProblem(t.share.copyFailed);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t.share.action}
        title={token ? t.share.on : t.share.action}
        data-testid="share-note"
        data-sharing={token ? true : undefined}
        className={cn(token && "border-ring text-foreground")}
        onClick={() => setOpen(true)}
      >
        <ShareNetworkIcon />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.share.title}</DialogTitle>
            <DialogDescription>{t.share.body}</DialogDescription>
          </DialogHeader>

          {token ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={link}
                  aria-label={t.share.linkLabel}
                  data-testid="share-link"
                  onFocus={(event) => event.currentTarget.select()}
                  className="font-mono text-xs"
                />
                <Button variant="outline" onClick={copy} disabled={pending}>
                  {copied ? (
                    <CheckIcon data-icon="inline-start" />
                  ) : (
                    <CopyIcon data-icon="inline-start" />
                  )}
                  {copied ? t.share.copied : t.share.copy}
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t.share.onHint}
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t.share.offHint}
            </p>
          )}

          {problem && (
            <p role="alert" className="text-xs text-destructive">
              {problem}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t.share.close}
            </Button>
            {token ? (
              <Button variant="destructive" onClick={stop} disabled={pending}>
                {t.share.stop}
              </Button>
            ) : (
              <Button onClick={start} disabled={pending} data-testid="start-sharing">
                {t.share.start}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
