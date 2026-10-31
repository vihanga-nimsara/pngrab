import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public/icons');
mkdirSync(outDir, { recursive: true });

const lerp = (a, b, t) => a + (b - a) * t;

const gradient = (fy) => [
  lerp(76, 124, fy),
  lerp(110, 58, fy),
  lerp(245, 237, fy)
];

function roundedRect(fx, fy, x0, y0, w, h, r) {
  const cx = Math.abs(fx - (x0 + w / 2)) - (w / 2 - r);
  const cy = Math.abs(fy - (y0 + h / 2)) - (h / 2 - r);
  const ox = Math.max(cx, 0);
  const oy = Math.max(cy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(cx, cy), 0) - r;
}

const circle = (fx, fy, cx, cy, r) => Math.hypot(fx - cx, fy - cy) - r;

function cross(px, py, a, b) {
  return (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]);
}

function pointInTriangle(px, py, a, b, c) {
  const s1 = cross(px, py, a, b);
  const s2 = cross(px, py, b, c);
  const s3 = cross(px, py, c, a);
  const hasNeg = s1 < 0 || s2 < 0 || s3 < 0;
  const hasPos = s1 > 0 || s2 > 0 || s3 > 0;
  return !(hasNeg && hasPos);
}

function shade(fx, fy) {
  const grad = gradient(fy);
  return [...grad, 1];
}

function buildIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const sub = 3;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < sub; sy++) {
        for (let sx = 0; sx < sub; sx++) {
          const fx = (x + (sx + 0.5) / sub) / size;
          const fy = (y + (sy + 0.5) / sub) / size;
          const [cr, cg, cb, ca] = shade(fx, fy);
          r += cr * ca;
          g += cg * ca;
          b += cb * ca;
          a += ca;
        }
      }
      const n = sub * sub;
      const o = (y * size + x) * 4;
      const alpha = Math.round((a / n) * 255);
      if (alpha > 0) {
        px[o] = Math.round(r / n);
        px[o + 1] = Math.round(g / n);
        px[o + 2] = Math.round(b / n);
        px[o + 3] = alpha;
      }
    }
  }
  return px;
}

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

for (const size of [16, 32, 48, 128]) {
  const file = resolve(outDir, `icon${size}.png`);
  if (existsSync(file)) {
    console.log(`Skipped ${file} (already exists)`);
    continue;
  }
  writeFileSync(file, encodePng(size, buildIcon(size)));
  console.log(`Generated ${file}`);
}