/**
 * steganography.js
 * 
 * Encodes / decodes a short UTF-8 string into the Least-Significant Bit (LSB)
 * of the RED channel of a canvas ImageData, starting from a fixed pixel offset
 * deep in the image so casual inspection won't reveal it.
 *
 * Encoding scheme
 * ───────────────
 * 1. Prepend a 4-byte (32-bit big-endian) length header.
 * 2. Convert the message to UTF-8 bytes.
 * 3. Each bit is stored in the LSB of the red channel of successive pixels,
 *    starting at pixel row = Math.floor(height * 0.7), col = 0.
 *
 * The payload stored in a certificate image is a 64-char hex SHA-256 hash
 * (256 bits + 32-bit header = 288 bits → 288 pixels touched, imperceptible).
 */

const PIXEL_OFFSET_FACTOR = 0.7; // start at 70% down the image height

// ─── Helpers ─────────────────────────────────────────────────────────────────

function strToBytes(str) {
  return new TextEncoder().encode(str);
}

function bytesToStr(bytes) {
  return new TextDecoder().decode(bytes);
}

function num32ToBytes(n) {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

function bytes4ToNum(arr, offset = 0) {
  return ((arr[offset] << 24) | (arr[offset + 1] << 16) | (arr[offset + 2] << 8) | arr[offset + 3]) >>> 0;
}

// ─── Embed ────────────────────────────────────────────────────────────────────

/**
 * Embed `message` into a canvas element's pixel data.
 * Returns the modified canvas (same reference).
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string}            message  – typically a 64-char hex hash
 * @returns {HTMLCanvasElement}
 */
export function embedInCanvas(canvas, message) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data; // RGBA flat array

  const msgBytes = strToBytes(message);
  const lenBytes = num32ToBytes(msgBytes.length);
  const payload = [...lenBytes, ...msgBytes]; // 4 + N bytes

  const startPixel = Math.floor(height * PIXEL_OFFSET_FACTOR) * width;
  const totalBits = payload.length * 8;

  // Safety: ensure the image is large enough
  const availablePixels = data.length / 4 - startPixel;
  if (totalBits > availablePixels) {
    console.warn('[Steg] Image too small to embed hash – skipping');
    return canvas;
  }

  let bitIdx = 0;
  for (let b = 0; b < payload.length; b++) {
    for (let bit = 7; bit >= 0; bit--) {
      const pixelIdx = (startPixel + bitIdx) * 4; // R channel
      const bitVal = (payload[b] >> bit) & 1;
      data[pixelIdx] = (data[pixelIdx] & 0xfe) | bitVal; // set LSB of R
      bitIdx++;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ─── Extract ──────────────────────────────────────────────────────────────────

/**
 * Extract a previously embedded message from a canvas element.
 * Returns the message string, or null if extraction fails.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {string|null}
 */
export function extractFromCanvas(canvas) {
  try {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const startPixel = Math.floor(height * PIXEL_OFFSET_FACTOR) * width;

    // Read 32 bits to get the length header
    const lenBytes = new Uint8Array(4);
    for (let byteIdx = 0; byteIdx < 4; byteIdx++) {
      let byte = 0;
      for (let bit = 7; bit >= 0; bit--) {
        const pixelIdx = (startPixel + byteIdx * 8 + (7 - bit)) * 4;
        byte |= (data[pixelIdx] & 1) << bit;
      }
      lenBytes[byteIdx] = byte;
    }

    const msgLen = bytes4ToNum(lenBytes);

    // Sanity check (a SHA-256 hex string is exactly 64 bytes)
    if (msgLen === 0 || msgLen > 512) return null;

    // Read the message bytes
    const msgBytes = new Uint8Array(msgLen);
    for (let byteIdx = 0; byteIdx < msgLen; byteIdx++) {
      let byte = 0;
      const bitBase = (4 + byteIdx) * 8;
      for (let bit = 7; bit >= 0; bit--) {
        const pixelIdx = (startPixel + bitBase + (7 - bit)) * 4;
        byte |= (data[pixelIdx] & 1) << bit;
      }
      msgBytes[byteIdx] = byte;
    }

    const msg = bytesToStr(msgBytes);
    // Validate it looks like a hex hash
    if (/^[0-9a-f]{64}$/i.test(msg)) return msg;
    return null;
  } catch (err) {
    console.error('[Steg] Extraction error:', err);
    return null;
  }
}

// ─── Convenience: load an image URL / File into a canvas ─────────────────────

/**
 * Load any image source (URL string or File/Blob) into a canvas and return it.
 * Useful for the validator UI.
 */
export function loadImageToCanvas(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas);
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      // File / Blob
      const url = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.src = url;
    }
  });
}
