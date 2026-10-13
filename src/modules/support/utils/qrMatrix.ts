import { toQR } from "toqr";

/** A horizontal stretch of dark modules in one row: where it starts, how long. */
export type QrRun = readonly [start: number, length: number];

export interface QrMatrix {
  /** Modules along one side. */
  size: number;
  /** For each row, top to bottom, its dark stretches from left to right. */
  rows: readonly (readonly QrRun[])[];
}

/**
 * The QR code for a piece of text, as rows of dark stretches.
 *
 * A code is a square of dark and light modules. Drawing one view per dark
 * module would mean several hundred views for a short link; neighbouring dark
 * modules in a row are merged here, which cuts that to roughly a third.
 *
 * Returns null for empty text: there is nothing to encode, and an empty code
 * would still look scannable.
 */
export function buildQrMatrix(content: string): QrMatrix | null {
  const text = content.trim();
  if (!text) return null;

  const modules = toQR(text);
  const size = Math.round(Math.sqrt(modules.length));
  if (size < 21 || size * size !== modules.length) return null;

  const rows: QrRun[][] = [];
  for (let y = 0; y < size; y += 1) {
    const runs: QrRun[] = [];
    let start = -1;
    for (let x = 0; x <= size; x += 1) {
      const dark = x < size && modules[y * size + x] === 1;
      if (dark && start < 0) start = x;
      if (!dark && start >= 0) {
        runs.push([start, x - start]);
        start = -1;
      }
    }
    rows.push(runs);
  }
  return { size, rows };
}
