import { describe, expect, it } from "vitest";
import { assessQuality, type Pixels } from "../image-quality";

/** Synthetic "page": light paper with dark text-like strokes. */
function page({ paper = 235, ink = 30, blur = 0, glareFrac = 0, w = 200, h = 260 } = {}): Pixels {
  let g = new Float32Array(w * h).fill(paper);
  for (let y = 20; y < h - 20; y += 12) for (let x = 15; x < w - 15; x++) if ((x * 7 + y) % 11 < 6) { g[y * w + x] = ink; g[(y + 1) * w + x] = ink; }
  for (let pass = 0; pass < blur; pass++) {
    const out = new Float32Array(g.length);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let s = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy >= 0 && yy < h && xx >= 0 && xx < w) { s += g[yy * w + xx]; c++; }
        }
        out[y * w + x] = s / c;
      }
    g = out;
  }
  const glareRows = Math.round(h * glareFrac);
  for (let y = 0; y < glareRows; y++) for (let x = 0; x < w; x++) g[y * w + x] = 255;
  const data = new Uint8ClampedArray(w * h * 4);
  g.forEach((v, i) => { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v; data[i * 4 + 3] = 255; });
  return { data, width: w, height: h };
}

describe("assessQuality", () => {
  it("accepts a clear, well-lit page", () => {
    expect(assessQuality(page()).issues).toEqual([]);
  });
  it("does not mistake bright white paper for glare", () => {
    expect(assessQuality(page({ paper: 250 })).issues).toEqual([]);
  });
  it("flags a dark photo", () => {
    expect(assessQuality(page({ paper: 55, ink: 10 })).issues).toContain("dark");
  });
  it("flags a blurry photo", () => {
    const q = assessQuality(page({ blur: 4 }));
    expect(q.issues).toContain("blurry");
    expect(q.sharpness).toBeLessThan(assessQuality(page()).sharpness);
  });
  it("flags glare", () => {
    expect(assessQuality(page({ glareFrac: 0.2 })).issues).toContain("glare");
  });
});
