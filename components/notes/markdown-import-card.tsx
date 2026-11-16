"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { useMessages } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { importMarkdown } from "@/lib/notes/import-actions";
import { rejectMarkdownFile, type MarkdownImportProblem } from "@/lib/notes/markdown-import";

export function MarkdownImportCard() {
  const t = useMessages().markdownImport;
  const router = useRouter();
  const inputId = useId();
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<{ file: File; requestId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<MarkdownImportProblem | null>(null);

  useEffect(() => {
    queueMicrotask(() => setReady(true));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const form = new FormData();
      form.set("file", selected.file);
      form.set("requestId", selected.requestId);
      const result = await importMarkdown(form);
      if ("problem" in result) {
        setProblem(result.problem);
        return;
      }
      router.push(`/notes/${result.id}`);
    } catch {
      setProblem("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit}>
          <FieldGroup className="gap-4">
            <Field data-disabled={busy || !ready} data-invalid={Boolean(problem)}>
              <FieldLabel htmlFor={inputId}>{t.file}</FieldLabel>
              <Input
                id={inputId}
                type="file"
                accept=".md"
                disabled={busy || !ready}
                aria-invalid={Boolean(problem)}
                aria-describedby={`${inputId}-hint`}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  const rejected = file ? rejectMarkdownFile(file) : null;
                  setProblem(rejected);
                  setSelected(file && !rejected ? { file, requestId: crypto.randomUUID() } : null);
                }}
              />
              <FieldDescription id={`${inputId}-hint`}>{t.fileHint}</FieldDescription>
            </Field>
            {problem && <Alert variant="destructive"><AlertDescription>{t.errors[problem]}</AlertDescription></Alert>}
            <Button type="submit" disabled={busy || !selected}>
              {busy ? <Spinner data-icon="inline-start" /> : <UploadSimpleIcon data-icon="inline-start" />}
              {busy ? t.importing : t.action}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
