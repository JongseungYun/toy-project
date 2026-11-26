export function markdownLink(label: string, href: string) {
  const text = (label || href)
    .replace(/[\\\[\]*_`~<>&|]/g, "\\$&")
    .replace(/\r?\n/g, "&#10;");
  const destination = href.replace(/[()\\]/g, "\\$&").replace(/&(?=#?\w+;)/g, "\\&");
  return `[${text}](${destination})`;
}
