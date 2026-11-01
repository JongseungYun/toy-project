"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useLocale, useMessages } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { format } from "@/lib/i18n/messages";
import {
  MAX_BACKUP_BYTES,
  type BackupProblem,
  type BackupRestored,
  type BackupSummary,
} from "@/lib/notes/backup-types";

export function BackupCard() {
  const t = useMessages().backup;
  const locale = useLocale();
  const fieldId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<
    "idle" | "exporting" | "checking" | "restoring"
  >("idle");
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [problem, setProblem] = useState<BackupProblem | null>(null);
  const [result, setResult] = useState<BackupRestored | null>(null);
  const [open, setOpen] = useState(false);
  const [restoreRequest, setRestoreRequest] = useState({ id: "", name: "" });
  const busy = !ready || step !== "idle";
  useEffect(() => {
    queueMicrotask(() => setReady(true));
  }, []);

  async function responseProblem(response: Response, fallback: BackupProblem) {
    try {
      const body = await response.json();
      return Object.hasOwn(t.errors, body.code)
        ? (body.code as BackupProblem)
        : fallback;
    } catch {
      return fallback;
    }
  }

  async function download() {
    setStep("exporting");
    setProblem(null);
    try {
      const response = await fetch("/api/backup", { cache: "no-store" });
      if (!response.ok) {
        setProblem(await responseProblem(response, "exportFailed"));
        return;
      }
      const href = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download =
        response.headers
          .get("content-disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "amu-note-backup.zip";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1_000);
    } catch {
      setProblem("exportFailed");
    } finally {
      setStep("idle");
    }
  }

  async function inspect(selected: File) {
    setProblem(null);
    setSummary(null);
    setResult(null);
    if (selected.size > MAX_BACKUP_BYTES) {
      setProblem("tooLarge");
      return;
    }
    setStep("checking");
    try {
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: selected,
      });
      if (!response.ok) {
        setProblem(await responseProblem(response, "inspectFailed"));
        return;
      }
      setSummary(await response.json());
      setOpen(true);
    } catch {
      setProblem("inspectFailed");
    } finally {
      setStep("idle");
    }
  }

  async function restore() {
    if (!file || !summary) return;
    setStep("restoring");
    setProblem(null);
    try {
      const params = new URLSearchParams({
        requestId: restoreRequest.id,
        name: restoreRequest.name,
      });
      const response = await fetch(`/api/backup/restore?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: file,
      });
      if (!response.ok) {
        setProblem(await responseProblem(response, "restoreFailed"));
        return;
      }
      setResult(await response.json());
      setOpen(false);
      setFile(null);
      setSummary(null);
      if (input.current) input.current.value = "";
    } catch {
      setProblem("restoreFailed");
    } finally {
      setStep("idle");
    }
  }

  const failure = problem && (
    <Alert variant="destructive">
      <AlertDescription>{t.errors[problem]}</AlertDescription>
    </Alert>
  );
  return (
    <Card data-testid="backup-card">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.scope}</CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">
        <p className="text-sm text-muted-foreground">{t.savedOnly}</p>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void download()}
        >
          {step === "exporting" ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <DownloadSimpleIcon data-icon="inline-start" />
          )}
          {step === "exporting" ? t.downloading : t.download}
        </Button>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={fieldId}>{t.file}</FieldLabel>
            <Input
              ref={input}
              id={fieldId}
              type="file"
              accept=".zip,application/zip"
              disabled={busy}
              onChange={(event) => {
                const selected = event.currentTarget.files?.[0] ?? null;
                setFile(selected);
                setSummary(null);
                setProblem(null);
                setResult(null);
                setRestoreRequest({
                  id: crypto.randomUUID(),
                  name: `${t.folderPrefix} ${new Date().toLocaleString(locale)}`,
                });
                if (selected) void inspect(selected);
              }}
            />
            <FieldDescription>{t.fileLimit}</FieldDescription>
          </Field>
        </FieldGroup>
        {step === "checking" && <p role="status">{t.checking}</p>}
        {file && step === "idle" && (
          <Button
            variant="outline"
            onClick={() => (summary ? setOpen(true) : void inspect(file))}
          >
            {summary ? t.preview : t.retry}
          </Button>
        )}
        {!open && failure}
        {result && (
          <Alert data-testid="backup-success">
            <AlertTitle>{t.success}</AlertTitle>
            <AlertDescription>
              <p className="break-words">{result.name}</p>
              <Button
                variant="link"
                render={<Link href={`/?folder=${result.root_id}`} />}
                nativeButton={false}
              >
                {t.openFolder}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <p className="text-xs text-muted-foreground">{t.excluded}</p>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            if (step !== "restoring") setOpen(value);
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="max-h-[90dvh] min-w-0 overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle>{t.confirmTitle}</DialogTitle>
              <DialogDescription className="break-words">
                {file?.name}
              </DialogDescription>
            </DialogHeader>
            {summary && (
              <dl
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm"
                data-testid="backup-summary"
              >
                <dt className="text-muted-foreground">{t.date}</dt>
                <dd className="break-words">
                  {new Date(summary.createdAt).toLocaleString(locale)}
                </dd>
                {(
                  ["folders", "notes", "trash", "revisions", "images"] as const
                ).map((key) => (
                  <div key={key} className="contents">
                    <dt className="text-muted-foreground">{t[key]}</dt>
                    <dd>{summary[key]}</dd>
                  </div>
                ))}
              </dl>
            )}
            <Alert>
              <AlertDescription>
                {format(t.confirmBody, { name: restoreRequest.name })}
              </AlertDescription>
            </Alert>
            {failure}
            <DialogFooter>
              <Button
                variant="outline"
                disabled={step === "restoring"}
                onClick={() => setOpen(false)}
              >
                {t.cancel}
              </Button>
              <Button
                disabled={step === "restoring" || !summary}
                onClick={() => void restore()}
              >
                {step === "restoring" && <Spinner data-icon="inline-start" />}
                {step === "restoring" ? t.restoring : t.restore}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
