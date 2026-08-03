export const MIN_SCREENSHOT_VARIANCE = 8;

export type CapturedFrame = {
  dataUrl: string;
  variance: number;
  coverage: number;
  source: string;
};

export type ScreenshotCaptureResult = {
  dataUrl: string | null;
  error: string | null;
};

export function isWeakScreenshot(
  dataUrl: string | null,
  variance?: number,
  coverage?: number
): boolean {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return true;
  if (typeof variance === "number" && typeof coverage === "number") {
    return variance < MIN_SCREENSHOT_VARIANCE || coverage < 0.22;
  }
  if (typeof variance === "number") return variance < MIN_SCREENSHOT_VARIANCE;
  return dataUrl.length < 3000;
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/** Sample pixel luminance variance for a canvas region. */
export function canvasRegionVariance(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  x: number,
  y: number,
  w: number,
  h: number
): number {
  const sx = Math.max(0, Math.min(x, canvasW - 1));
  const sy = Math.max(0, Math.min(y, canvasH - 1));
  const sw = Math.max(1, Math.min(w, canvasW - sx));
  const sh = Math.max(1, Math.min(h, canvasH - sy));
  const { data } = ctx.getImageData(sx, sy, sw, sh);
  const pixels = data.length / 4;
  if (pixels === 0) return 0;

  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const mean = sum / pixels;
  let variance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    variance += (lum - mean) ** 2;
  }

  return variance / pixels;
}

export type CanvasContentScore = {
  variance: number;
  coverage: number;
  readable: boolean;
};

/** Grid-sample the canvas — reject captures that only render a thin strip at the top. */
export function scoreCanvasContent(canvas: HTMLCanvasElement): CanvasContentScore {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { variance: 0, coverage: 0, readable: false };

  const cols = 3;
  const rows = 3;
  let filled = 0;
  let maxVariance = 0;
  let centerVariance = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = Math.floor((col / cols) * canvas.width);
      const y = Math.floor((row / rows) * canvas.height);
      const w = Math.max(8, Math.floor(canvas.width / cols));
      const h = Math.max(8, Math.floor(canvas.height / rows));
      const variance = canvasRegionVariance(ctx, canvas.width, canvas.height, x, y, w, h);
      maxVariance = Math.max(maxVariance, variance);
      if (variance >= MIN_SCREENSHOT_VARIANCE) filled++;
      if (row === 1 && col === 1) centerVariance = variance;
    }
  }

  const coverage = filled / (cols * rows);
  const readable =
    centerVariance >= MIN_SCREENSHOT_VARIANCE &&
    coverage >= 0.22 &&
    maxVariance >= MIN_SCREENSHOT_VARIANCE;

  return { variance: maxVariance, coverage, readable };
}

/** @deprecated Prefer scoreCanvasContent — kept for callers that only need top-left variance. */
export function canvasLuminanceVariance(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  return canvasRegionVariance(ctx, canvas.width, canvas.height, 0, 0, Math.min(canvas.width, 64), Math.min(canvas.height, 64));
}

/** Reject empty canvases and solid-color fills (html2canvas gradient failures). */
export function isBlankCanvas(canvas: HTMLCanvasElement): boolean {
  if (canvas.width < 10 || canvas.height < 10) return true;

  try {
    return !scoreCanvasContent(canvas).readable;
  } catch {
    try {
      const probe = canvas.toDataURL("image/jpeg", 0.7);
      return probe.length < 1000;
    } catch {
      return true;
    }
  }
}

export function pickBestScreenshot(...candidates: Array<string | null>): string | null {
  const valid = candidates.filter((c): c is string => !!c && c.startsWith("data:image/"));
  if (valid.length === 0) return null;
  const strong = valid.find((c) => !isWeakScreenshot(c));
  return strong ?? valid[0];
}

export function pickBestCaptureFrame(frames: CapturedFrame[]): CapturedFrame | null {
  const valid = frames.filter((f) => !isWeakScreenshot(f.dataUrl, f.variance, f.coverage));
  if (valid.length === 0) return null;
  return valid.sort((a, b) => b.coverage - a.coverage || b.variance - a.variance)[0];
}

/** Decode a data URL and score content quality (for SDK/postMessage results). */
export function measureDataUrlQuality(dataUrl: string): Promise<CanvasContentScore> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ variance: 0, coverage: 0, readable: false });
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(scoreCanvasContent(canvas));
      } catch {
        resolve({ variance: 0, coverage: 0, readable: false });
      }
    };
    img.onerror = () => resolve({ variance: 0, coverage: 0, readable: false });
    img.src = dataUrl;
  });
}

/** @deprecated Use measureDataUrlQuality */
export function measureDataUrlVariance(dataUrl: string): Promise<number> {
  return measureDataUrlQuality(dataUrl).then((score) => score.variance);
}

export async function validateScreenshot(dataUrl: string | null): Promise<ScreenshotCaptureResult> {
  if (!dataUrl) {
    return { dataUrl: null, error: "Screenshot capture returned no image." };
  }
  if (!dataUrl.startsWith("data:image/")) {
    return { dataUrl: null, error: "Screenshot capture returned invalid image data." };
  }

  const score = await measureDataUrlQuality(dataUrl);
  if (!score.readable) {
    console.warn("[Testicon] Screenshot rejected — unreadable capture", score);
    return {
      dataUrl: null,
      error: "Screenshot came back blank or incomplete. Wait for the app to finish loading, then click Retry.",
    };
  }

  return { dataUrl, error: null };
}
