export const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export const ACCEPT_ATTR = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.heif,.pdf";

export function maxFileBytes() {
  const mb = Number(process.env.MAX_UPLOAD_MB_PER_FILE ?? 10);
  return (Number.isFinite(mb) && mb > 0 ? mb : 10) * 1024 * 1024;
}
export function maxFiles() {
  const n = Number(process.env.MAX_UPLOAD_FILES ?? 8);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
}

/** Normalise MIME (some phones send "" or octet-stream for HEIC/PDF). */
export function resolveMime(name: string, type: string): string {
  const t = (type || "").toLowerCase();
  if (t === "image/jpg") return "image/jpeg";
  if (t && t !== "application/octet-stream") return t;
  const ext = name.toLowerCase().split(".").pop();
  return (
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      heic: "image/heic",
      heif: "image/heif",
      pdf: "application/pdf",
    } as Record<string, string>
  )[ext ?? ""] ?? t;
}

/** Check magic bytes so a renamed file can't masquerade as an image/PDF. */
export function sniffMatches(mime: string, bytes: Uint8Array): boolean {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  switch (mime) {
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47);
    case "image/webp":
      return starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45;
    case "application/pdf":
      return starts(0x25, 0x50, 0x44, 0x46);
    case "image/heic":
    case "image/heif":
      return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70; // "ftyp"
    default:
      return false;
  }
}
