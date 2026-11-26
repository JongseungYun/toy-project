export function markdownLink(kind: "link" | "image", label: string, href: string) {
  const text = (label || (kind === "link" ? href : ""))
    .replace(/[\\\[\]*_`~<>&|]/g, "\\$&")
    .replace(/\r?\n/g, "&#10;");
  const destination = href.replace(/\|/g, "%7C").replace(/[()\\]/g, "\\$&").replace(/&(?=#?\w+;)/g, "\\&");
  const prefix = kind === "image" ? "!" : "";
  return `${prefix}[${text}](${destination})`;
}
