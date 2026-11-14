/**
 * Quick photo-quality checks for document scans, run in the browser on a
 * small copy of the frame (a few hundred pixels wide). Pure functions so
 * they can be unit-tested without a camera.
 */
export type Pixels = { data: Uint8ClampedArray; width: number; height: number };
export type QualityIssue = "dark" | "blurry" | "glare";
export type Quality = { brightness: number; sharpness: number; glare: number; issues: QualityIssue[] };

export const THRESHOLDS = { dark: 70, blurry: 45, glare: 0.1 };

function grayscale({ data, width, height }: Pixels): Float32Array {
  const g = new Float32Array(width * height);
  for (let i = 0, p = 0; p < g.length; i += 4, p++) g[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  return g;
}

export function assessQuality(px: Pixels): Quality {
  const { width: w, height: h } = px;
  const g = grayscale(px);
  let sum = 0;
  let bright = 0;
  for (const v of g) {
    sum += v;
    if (v >= 254) bright++;
  }
  const brightness = sum / g.length;
  const glare = bright / g.length;

  // Variance of the Laplacian: low when edges (text strokes) are soft.
  let lsum = 0;
  let lsq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = g[i - w] + g[i + w] + g[i - 1] + g[i + 1] - 4 * g[i];
      lsum += lap;
      lsq += lap * lap;
      n++;
    }
  }
  const mean = n ? lsum / n : 0;
  const sharpness = n ? lsq / n - mean * mean : 0;

  const issues: QualityIssue[] = [];
  if (brightness < THRESHOLDS.dark) issues.push("dark");
  if (sharpness < THRESHOLDS.blurry) issues.push("blurry");
  if (glare > THRESHOLDS.glare) issues.push("glare");
  return { brightness, sharpness, glare, issues };
}

export const ISSUE_TEXT: Record<QualityIssue, { live: string; after: string }> = {
  dark: { live: "Too dark — move to better light or turn on the flash", after: "This photo looks dark." },
  blurry: { live: "Hold steady so the text is sharp", after: "This photo looks blurry." },
  glare: { live: "Glare — tilt the page away from the light", after: "There is glare on part of the page." },
};

/** Draw a source onto a small canvas and read its pixels. */
export function samplePixels(src: CanvasImageSource, srcW: number, srcH: number, maxDim = 480): Pixels | null {
  if (!srcW || !srcH) return null;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(srcW * scale));
  c.height = Math.max(1, Math.round(srcH * scale));
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  return { data, width, height };
}
