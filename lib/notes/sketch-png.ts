import { canvasSize, type CanvasElement } from "./canvas";
import { elementsToSvg } from "./canvas-shape";
import { canvasDocument } from "./export";
import { MAX_NOTE_IMAGE_BYTES } from "./doc-image";

/** 그림판의 현재 요소를 일반 문서에서 붙여넣을 수 있는 PNG로 만든다. */
export async function sketchPng(elements: CanvasElement[]): Promise<Blob> {
  const size = canvasSize(elements);
  const scale = Math.min(1, 1920 / Math.max(size.width, size.height));
  const output = {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
  const svg = canvasDocument(elementsToSvg(elements), size, output);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PNG");
    for (const factor of [1, 0.5]) {
      canvas.width = Math.max(1, Math.round(output.width * factor));
      canvas.height = Math.max(1, Math.round(output.height * factor));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (png && png.size <= MAX_NOTE_IMAGE_BYTES) return png;
    }
    throw new Error("PNG");
  } finally {
    URL.revokeObjectURL(url);
  }
}
