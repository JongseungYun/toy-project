export const MAX_MARKDOWN_BYTES = 512 * 1024;

export type MarkdownImportProblem =
  | "unsupported"
  | "tooLarge"
  | "encoding"
  | "failed"
  | "loginRequired";

export function rejectMarkdownFile(file: Pick<File, "name" | "size">): MarkdownImportProblem | null {
  if (!/\.md$/i.test(file.name)) return "unsupported";
  if (file.size > MAX_MARKDOWN_BYTES) return "tooLarge";
  return null;
}
