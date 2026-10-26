// Renders the extension icon (rounded blue square + white check mark) as PNGs
// with no dependencies. Usage: node scripts/gen-icons.ts [public/icons]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const outDir = process.argv[2] ?? join(import.meta.dirname, '..', 'public', 'icons');
const SIZES = [16, 32, 48, 128];
type RGB = readonly [number, number, number];
type Point = readonly [number, number];
const BG: RGB = [10, 100, 214];
const FG: RGB = [255, 255, 255];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

// Distance from point p to segment ab.
const segDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

function render(size: number) {
  const SS = 4; // supersampling for anti-aliasing
  const r = size * 0.22;
  const stroke = size * 0.11;
  const at = (x: number, y: number): Point => [x * size, y * size];
  const [a0, a1, a2] = [at(0.27, 0.53), at(0.43, 0.69), at(0.74, 0.34)]; // check mark
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte
    for (let x = 0; x < size; x++) {
      let bgCov = 0, fgCov = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
        const qx = Math.max(r - px, 0, px - (size - r)), qy = Math.max(r - py, 0, py - (size - r));
        if (Math.hypot(qx, qy) > r) continue;
        bgCov++;
        const d = Math.min(segDist(px, py, ...a0, ...a1), segDist(px, py, ...a1, ...a2));
        if (d <= stroke / 2) fgCov++;
      }
      const n = SS * SS, a = bgCov / n, f = bgCov ? fgCov / bgCov : 0;
      const mix = (i: 0 | 1 | 2) => Math.round(BG[i] * (1 - f) + FG[i] * f);
      row.push(mix(0), mix(1), mix(2), Math.round(a * 255));
    }
    rows.push(Buffer.from(row));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outDir, { recursive: true });
for (const s of SIZES) {
  writeFileSync(join(outDir, `icon-${s}.png`), render(s));
  console.log(`wrote ${join(outDir, `icon-${s}.png`)}`);
}
