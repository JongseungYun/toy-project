"use client";

import { useState, useTransition } from "react";
import { PushPinIcon } from "@phosphor-icons/react";
import { useMessages } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { setNotePinned } from "@/lib/notes/pin-actions";

export function PinButton({
  noteId,
  pinned,
}: {
  noteId: string;
  pinned: boolean;
}) {
  const t = useMessages();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const label = pinned ? t.library.unpin : t.library.pin;
  return (
    <div className="flex max-w-28 flex-col items-end gap-1">
      <Button
        type="button"
        variant={pinned ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label={label}
        title={label}
        aria-pressed={pinned}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setFailed(false);
            const result = await setNotePinned(noteId, !pinned);
            setFailed(!result.ok);
          })
        }
      >
        {pending ? (
          <Spinner />
        ) : (
          <PushPinIcon weight={pinned ? "fill" : "regular"} />
        )}
      </Button>
      {failed && (
        <span role="alert" className="text-xs text-destructive">
          {t.library.pinFailed}
        </span>
      )}
    </div>
  );
}
