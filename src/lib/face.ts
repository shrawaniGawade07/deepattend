export async function extractFaceTemplate(video: HTMLVideoElement): Promise<number[]> {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const box = await getFaceBox(video);
  ctx.drawImage(video, box.x, box.y, box.w, box.h, 0, 0, 96, 96);
  const pixels = ctx.getImageData(0, 0, 96, 96).data;
  const template: number[] = [];
  const block = 12;
  for (let y = 0; y < 96; y += block) {
    for (let x = 0; x < 96; x += block) {
      let total = 0, count = 0;
      for (let yy = y; yy < y + block; yy++) {
        for (let xx = x; xx < x + block; xx++) {
          const i = (yy * 96 + xx) * 4;
          total += pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
          count++;
        }
      }
      template.push(Number((total / count / 255).toFixed(4)));
    }
  }
  return normalize(template);
}

async function getFaceBox(video: HTMLVideoElement) {
  const w = video.videoWidth  || 640;
  const h = video.videoHeight || 480;
  if ('FaceDetector' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const det = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await det.detect(video);
      if (faces[0]?.boundingBox) {
        const b = faces[0].boundingBox;
        return clamp(b.x, b.y, b.width, b.height, w, h);
      }
    } catch { /* fallthrough */ }
  }
  const size = Math.min(w, h) * 0.68;
  return clamp((w - size) / 2, (h - size) / 2, size, size, w, h);
}

function clamp(x: number, y: number, bw: number, bh: number, maxW: number, maxH: number) {
  const pad = Math.min(bw, bh) * 0.18;
  const nx  = Math.max(0, x - pad);
  const ny  = Math.max(0, y - pad);
  return { x: nx, y: ny, w: Math.min(maxW - nx, bw + pad * 2), h: Math.min(maxH - ny, bh + pad * 2) };
}

function normalize(v: number[]): number[] {
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const c    = v.map(x => x - mean);
  const mag  = Math.sqrt(c.reduce((a, b) => a + b * b, 0)) || 1;
  return c.map(x => Number((x / mag).toFixed(5)));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return !na || !nb ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}
