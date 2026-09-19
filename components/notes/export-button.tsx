"use client";

import { useState } from "react";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { displayTitle } from "@/lib/notes/display";
import { buildExport } from "@/lib/notes/export";
import type { NoteContent, NoteFormat } from "@/lib/notes/types";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/components/i18n-provider";

/**
 * 노트를 파일로 내려받는 버튼. 형식마다 담기는 파일이 다르다.
 * 일반 문서는 .html, Markdown은 .md, 그림판은 .svg다.
 *
 * 저장된 내용이 아니라 지금 화면에 있는 초안을 내보낸다. 서버에 다녀오지 않으므로
 * 저장이 밀려 있어도, 연결이 끊겨 있어도 파일은 나온다.
 */
export function ExportButton({
  format,
  title,
  read,
}: {
  format: NoteFormat;
  title: string;
  /** 편집기가 지금 들고 있는 초안. 자동 저장이 쓰는 것과 같은 것이다. */
  read: () => { content: NoteContent; preview: string };
}) {
  const t = useMessages();
  const [failed, setFailed] = useState(false);

  function download() {
    setFailed(false);
    const draft = read();
    const name = displayTitle({ title, preview: draft.preview, format }, t);

    try {
      const file = buildExport(format, name, draft.content);
      const url = URL.createObjectURL(new Blob([file.body], { type: file.mime }));

      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();

      URL.revokeObjectURL(url);
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={download}
        aria-label={t.export.action}
        title={failed ? t.export.failed : t.export.action}
        data-testid="export-note"
        className={failed ? "text-destructive" : undefined}
      >
        <DownloadSimpleIcon />
      </Button>
      {failed && (
        <span role="alert" className="sr-only">
          {t.export.failed}
        </span>
      )}
    </>
  );
}
