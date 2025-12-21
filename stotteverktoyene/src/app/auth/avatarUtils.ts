type ImageEncodeFormat = "image/webp" | "image/jpeg";

function estimateDataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Kunne ikke lese bildefilen."));
      img.src = url;
    });

    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawCoverSquare(ctx: CanvasRenderingContext2D, img: HTMLImageElement, size: number) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(size / iw, size / ih);
  const w = Math.round(iw * scale);
  const h = Math.round(ih * scale);
  const x = Math.floor((size - w) / 2);
  const y = Math.floor((size - h) / 2);

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, x, y, w, h);
}

async function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  format: ImageEncodeFormat,
  quality: number
) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, quality));
  if (!blob) return canvas.toDataURL(format, quality);

  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
    r.onerror = () => reject(new Error("Kunne ikke kode bildet."));
    r.readAsDataURL(blob);
  });
}

export async function compressAvatarToDataUrl(file: File): Promise<string> {
  const img = await fileToImage(file);

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunne ikke starte bildekoding.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  drawCoverSquare(ctx, img, size);

  const TARGET = 70_000; // ca 70 KB
  const HARD = 140_000; // sikkerhetsgrense

  const formats: ImageEncodeFormat[] = ["image/webp", "image/jpeg"];

  for (const fmt of formats) {
    let q = fmt === "image/webp" ? 0.78 : 0.82;

    for (let i = 0; i < 7; i++) {
      const dataUrl = await canvasToDataUrl(canvas, fmt, q);
      const bytes = estimateDataUrlBytes(dataUrl);
      if (bytes <= TARGET) return dataUrl;
      if (bytes <= HARD && q <= 0.6) return dataUrl;
      q = Math.max(0.45, q - 0.07);
    }

    const last = await canvasToDataUrl(canvas, fmt, 0.5);
    if (estimateDataUrlBytes(last) <= HARD) return last;
  }

  return canvas.toDataURL("image/jpeg", 0.5);
}

export function estimateAvatarBytes(dataUrl: string) {
  return estimateDataUrlBytes(dataUrl);
}