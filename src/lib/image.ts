/**
 * Perkecil foto di browser sebelum diunggah (sisi terpanjang 1400 px, JPEG).
 * Foto kamera HP 5–10 MB jadi ±200 KB, aman untuk batas request Vercel.
 */
export async function compressImage(file: File, maxSide = 1400, quality = 0.76): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Gambar tidak bisa dibaca. Coba format JPG atau PNG.");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak bisa memproses gambar.");
  ctx.fillStyle = "#fff"; // PNG transparan → latar putih
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("Gambar gagal diproses.");
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}
