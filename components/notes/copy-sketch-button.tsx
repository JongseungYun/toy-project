"use client";

import { useState } from "react";
import { CopyIcon } from "@phosphor-icons/react";
import { useMessages } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import type { CanvasElement } from "@/lib/notes/canvas";
import { exportFileName } from "@/lib/notes/export";
import { sketchPng } from "@/lib/notes/sketch-png";

export function CopySketchButton({ elements, title, disabled }: {
  elements: CanvasElement[];
  title: string;
  disabled: boolean;
}) {
  const t = useMessages().draw;
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ source: CanvasElement[]; status: "copied" | "failed"; png?: Blob }>();
  const current = result?.source === elements ? result : undefined;

  async function copy() {
    setPending(true);
    setResult(undefined);
    const png = sketchPng(elements);
    try {
      // 사용자 클릭 안에서 쓰기를 시작하고 이미지 변환 결과를 전달한다.
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      setResult({ source: elements, status: "copied" });
    } catch {
      setResult({ source: elements, status: "failed", png: await png.catch(() => undefined) });
    } finally {
      setPending(false);
    }
  }

  function download(png: Blob) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(png);
    link.href = url;
    link.download = exportFileName(title, "canvas").replace(/\.svg$/, ".png");
    link.click();
    URL.revokeObjectURL(url);
  }

  return <>
    <Button type="button" variant="outline" size="sm" className="ms-auto" onClick={copy}
      disabled={disabled || pending || elements.length === 0}>
      <CopyIcon />{t.copySketch}
    </Button>
    {current && <span role="status" className="text-xs text-muted-foreground">
      {current.status === "copied" ? t.sketchCopied : t.sketchCopyFailed}
    </span>}
    {current?.png && <Button type="button" size="sm" variant="outline" onClick={() => download(current.png!)}>
      {t.downloadPng}
    </Button>}
  </>;
}
