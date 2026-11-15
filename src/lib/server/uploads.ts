import "server-only";
import { ACCEPTED_MIME, maxFileBytes, maxFiles, resolveMime, sniffMatches } from "../files";
import { AIError, type InputFile, type ProviderName } from "../ai/provider";

/**
 * Validate uploaded files (type, size, count, magic bytes) and convert to
 * base64 in memory. Nothing is written to disk and nothing is retained after
 * the request completes.
 */
export async function readUploads(form: FormData, provider: ProviderName | null): Promise<InputFile[]> {
  const files = form.getAll("files").filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f);
  if (files.length === 0) throw new AIError("unsupported_file", "No files were uploaded.", 400);
  if (files.length > maxFiles()) {
    throw new AIError("unsupported_file", `Please upload at most ${maxFiles()} pages at once.`, 400);
  }
  const limit = maxFileBytes();
  const out: InputFile[] = [];
  for (const f of files) {
    const mime = resolveMime(f.name, f.type);
    if (!(ACCEPTED_MIME as readonly string[]).includes(mime)) {
      throw new AIError("unsupported_file", `"${f.name}" is not a supported file. Use JPG, PNG, WEBP, HEIC or PDF.`, 415);
    }
    if (f.size > limit) {
      throw new AIError("unsupported_file", `"${f.name}" is larger than ${Math.round(limit / 1048576)} MB.`, 413);
    }
    if (f.size === 0) throw new AIError("unsupported_file", `"${f.name}" is empty.`, 400);
    const buf = new Uint8Array(await f.arrayBuffer());
    if (!sniffMatches(mime, buf)) {
      throw new AIError("unsupported_file", `"${f.name}" does not look like a valid ${mime.split("/")[1].toUpperCase()} file.`, 415);
    }
    if (provider === "openai" && (mime === "image/heic" || mime === "image/heif")) {
      throw new AIError(
        "unsupported_file",
        "HEIC photos are not supported by the configured AI model. Use the in-app camera, or export the photo as JPG.",
        415,
      );
    }
    // A neutral name: file names often contain the patient's name.
    out.push({ name: `page-${out.length + 1}`, mimeType: mime, base64: Buffer.from(buf).toString("base64") });
  }
  return out;
}

export function errorResponse(e: unknown) {
  if (e instanceof AIError) {
    return Response.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
  console.error(e);
  return Response.json({ error: { code: "server_error", message: "Something went wrong. Please try again." } }, { status: 500 });
}
