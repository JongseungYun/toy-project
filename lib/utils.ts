export { cn } from "cn"

/**
 * HTML과 SVG에 글자를 끼워 넣을 때 태그로 읽히지 않게 바꾼다.
 * 내보내는 파일이 여러 곳에서 이것을 쓴다.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
