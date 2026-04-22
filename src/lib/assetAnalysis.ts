// src/lib/assetAnalysis.ts
import type { AssetAnalysis } from "../data/mockAssets";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function rgbToHsv01(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // same-origin assets in this prototype, but keep it safe
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Offline-safe image analysis via Canvas downscale.
 * Returns 0..1 metrics for Smart Mix scoring/guardrails.
 */
export async function computeAssetAnalysisFromUrl(
  url: string,
  opts?: { size?: number }
): Promise<AssetAnalysis> {
  const size = Math.max(16, Math.min(128, opts?.size ?? 64));

  try {
    const img = await loadImage(url);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    // simple downscale; good enough for coarse metrics
    ctx.drawImage(img, 0, 0, size, size);

    const data = ctx.getImageData(0, 0, size, size).data;

    let sumY = 0;
    let sumY2 = 0;
    let sumS = 0;

    // circular mean for hue
    let sumSin = 0;
    let sumCos = 0;

    const y: number[] = new Array(size * size);

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i]! / 255;
      const g = data[i + 1]! / 255;
      const b = data[i + 2]! / 255;

      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      y[p] = lum;
      sumY += lum;
      sumY2 += lum * lum;

      const hsv = rgbToHsv01(r, g, b);
      sumS += hsv.s;

      const ang = hsv.h * Math.PI * 2;
      sumSin += Math.sin(ang);
      sumCos += Math.cos(ang);
    }

    const n = size * size;
    const meanY = sumY / n;
    const varY = Math.max(0, sumY2 / n - meanY * meanY);
    const stdY = Math.sqrt(varY);

    const hue = ((Math.atan2(sumSin / n, sumCos / n) / (Math.PI * 2)) + 1) % 1;
    const saturation = sumS / n;

    // Busy / edge density: mean local gradient magnitude on luminance
    let gradSum = 0;
    let gradCount = 0;
    for (let yy = 0; yy < size - 1; yy++) {
      for (let xx = 0; xx < size - 1; xx++) {
        const idx = yy * size + xx;
        const a = y[idx]!;
        const dx = Math.abs(y[idx + 1]! - a);
        const dy = Math.abs(y[idx + size]! - a);
        gradSum += dx + dy;
        gradCount += 2;
      }
    }
    const gradMean = gradCount ? gradSum / gradCount : 0;

    // normalize/shape into 0..1 (empirical)
    const brightness = clamp01(meanY);
    const contrast = clamp01(stdY * 3.0);
    const busy = clamp01(gradMean * 10.0);

    return {
      brightness,
      contrast,
      hue: clamp01(hue),
      saturation: clamp01(saturation),
      busy,
    };
  } catch {
    // Safe fallback (keeps demo stable even if asset missing)
    return { brightness: 0.5, contrast: 0.25, hue: 0.0, saturation: 0.25, busy: 0.25 };
  }
}
