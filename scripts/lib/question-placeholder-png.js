'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

/** Solid RGB8 truecolor PNG (filter type 0 per scanline). */
function solidPngBuffer(width, height, r, g, b) {
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y += 1) {
    const off = y * rowSize;
    raw[off] = 0;
    for (let x = 0; x < width; x += 1) {
      const i = off + 1 + x * 3;
      raw[i] = r & 255;
      raw[i + 1] = g & 255;
      raw[i + 2] = b & 255;
    }
  }
  const idat = zlib.deflateSync(raw);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const DEFAULT_COLOR = { r: 255, g: 214, b: 102, w: 640, h: 240 };

/**
 * Writes public/question-images/<id>.png under projectRoot (amber placeholder).
 * @param {string} projectRoot
 * @param {number[]} ids
 * @param {{ silent?: boolean }} [opts]
 * @returns {string[]} relative paths written
 */
function writeQuestionPlaceholderPngs(projectRoot, ids, opts = {}) {
  const outDir = path.join(projectRoot, 'public', 'question-images');
  fs.mkdirSync(outDir, { recursive: true });
  const { r, g, b, w, h } = DEFAULT_COLOR;
  const buf = solidPngBuffer(w, h, r, g, b);
  const written = [];
  const uniq = [...new Set(ids.map((n) => Math.floor(Number(n))).filter((n) => Number.isFinite(n) && n > 0))].sort(
    (a, b) => a - b
  );
  for (const id of uniq) {
    const dest = path.join(outDir, `${id}.png`);
    fs.writeFileSync(dest, buf);
    const rel = path.relative(projectRoot, dest);
    written.push(rel);
    if (!opts.silent) console.log('wrote', rel);
  }
  return written;
}

module.exports = {
  solidPngBuffer,
  writeQuestionPlaceholderPngs,
  DEFAULT_COLOR,
};
