// Copies the on-device privacy tools (text recognition + PDF reader) into
// public/vendor so the browser loads them from MedLens itself, never from a
// third-party CDN. Runs after `npm install` and before `npm run build`.
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = join(root, "node_modules");
const out = join(root, "public", "vendor");

const files = [
  ["tesseract.js/dist/worker.min.js", "tesseract/worker.min.js"],
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract/core/tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract/core/tesseract-core-simd-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "tesseract/core/tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "tesseract/lang/eng.traineddata.gz"],
  ["pdfjs-dist/build/pdf.worker.min.mjs", "pdfjs/pdf.worker.min.mjs"],
];

let copied = 0;
for (const [from, to] of files) {
  const src = join(nm, from);
  if (!existsSync(src)) {
    console.warn(`[copy-vendor] missing ${from} (run npm install)`);
    continue;
  }
  const dest = join(out, to);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
  copied++;
}
console.log(`[copy-vendor] ${copied}/${files.length} files -> public/vendor`);
