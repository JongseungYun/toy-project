"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** 키보드가 덮은 영역을 제외한 실제 표시 높이에 보관함과 편집기를 맞춘다. */
export function LibraryViewport({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    function resize() {
      // 손가락으로 확대할 때는 문서 배치를 다시 줄이지 않는다.
      if (viewport && viewport.scale !== 1) return;
      ref.current?.style.setProperty("--library-height", `${viewport?.height ?? window.innerHeight}px`);
    }
    resize();
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div ref={ref} data-testid="library-viewport" className="flex h-[var(--library-height,100dvh)] flex-col bg-muted p-4 sm:p-6">
      {children}
    </div>
  );
}
