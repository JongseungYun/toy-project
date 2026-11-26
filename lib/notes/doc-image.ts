import { escapeHtml } from "@/lib/utils";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_NOTE_IMAGE_BYTES = 5 * 1024 * 1024;
// 본문과 Server Action 요청의 나머지 필드를 위한 여유를 남긴다.
export const IMAGE_DOCUMENT_BUDGET = 768 * 1024;

export function isNoteImage(src: unknown): src is string {
  return typeof src === "string" && src.length <= IMAGE_DOCUMENT_BUDGET
    && /^data:image\/webp;base64,UklGR[A-Za-z0-9+/]+={0,2}$/.test(src);
}

export function noteImageHtml(src: string, alt: string) {
  return `<img src="${src}" alt="${escapeHtml(alt)}" style="max-width:100%;height:auto">`;
}

export type ImageProblem = "imageType" | "imageSize" | "imageBudget" | "imageRead";

export async function prepareNoteImage(file: File): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("imageType");
  if (file.size > MAX_NOTE_IMAGE_BYTES) throw new Error("imageSize");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const longEdge = Math.max(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("imageRead");
    for (const limit of [1920, 1440, 1024]) {
      const scale = Math.min(1, limit / longEdge);
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const src = canvas.toDataURL("image/webp", 0.85);
      if (src.length > IMAGE_DOCUMENT_BUDGET) continue;
      if (!isNoteImage(src)) throw new Error("imageRead");
      return noteImageHtml(src, file.name);
    }
    throw new Error("imageBudget");
  } finally {
    bitmap.close();
  }
}
