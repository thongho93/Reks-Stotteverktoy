/** Maks antall bilder per innspill, og lengste side etter komprimering. */
export const FEEDBACK_MAX_IMAGES = 3;
export const FEEDBACK_IMAGE_MAX_SIDE = 1600;
/** Grense på originalfilen før komprimering (selve opplastingen blir langt mindre). */
export const FEEDBACK_IMAGE_MAX_BYTES = 15 * 1024 * 1024;

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Skalerer ned og komprimerer et bilde til JPEG i nettleseren, slik at skjermdumper
 * blir små nok til å laste opp raskt. Kaster hvis filen ikke kan leses som bilde.
 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, FEEDBACK_IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas ikke tilgjengelig");
    // Hvit bunn, slik at gjennomsiktige PNG-er ikke blir svarte som JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Kunne ikke komprimere bildet"))),
        "image/jpeg",
        0.82
      );
    });
  } finally {
    bitmap.close();
  }
}
