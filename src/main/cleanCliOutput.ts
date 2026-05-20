/**
 * Strips ANSI escape sequences, converts cursor controls into newlines, and
 * collapses spinner-frame spam from CLI output so the renderer can display it
 * as plain text without garbage.
 *
 * Mapping rules (ANSI X3.64 / ECMA-48):
 * - CSI sequences with final byte `D`, `G`, or `J` (cursor moves and erase
 *   display) become a single newline. Adjacent runs collapse to one.
 * - CSI `K` (erase in line) is stripped without inserting a newline.
 * - All other CSI sequences (colors, styles, cursor visibility) are stripped.
 * - Single-character ESC sequences including ESC 7 / ESC 8 (save / restore
 *   cursor) are stripped.
 * - CR and CRLF become LF.
 * - Consecutive lines that differ only by their leading spinner glyph
 *   collapse to the first occurrence.
 *
 * Tested via tests/cleanCliOutput.test.ts.
 */
const NEWLINE_CSI_REGEX = /(\x1B\[\d*[GDJ])+/g;
const INLINE_ERASE_REGEX = /\x1B\[\d*K/g;
const CSI_REGEX = /\x1B\[[0-?]*[ -/]*[@-~]/g;
const SIMPLE_ESC_REGEX = /\x1B[78@-Z\\-_]/g;
const SPINNER_CHARS = /^[◒◐◓◑◴◷◶◵⣾⣽⣻⢿⡿⣟⣯⣷●○\s]+/;

export function cleanCliOutput(text: string): string {
  if (!text) return '';

  const stripped = text
    .replace(NEWLINE_CSI_REGEX, '\n')
    .replace(INLINE_ERASE_REGEX, '')
    .replace(CSI_REGEX, '')
    .replace(SIMPLE_ESC_REGEX, '')
    .replace(/\r\n?/g, '\n');

  return dedupConsecutive(stripped);
}

function dedupConsecutive(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let lastNormalized: string | null = null;

  for (const line of lines) {
    const normalized = line.replace(SPINNER_CHARS, '').trim();
    if (normalized && normalized === lastNormalized) continue;
    if (normalized) lastNormalized = normalized;
    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
