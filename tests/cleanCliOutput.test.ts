import { describe, it, expect } from 'vitest';
import { cleanCliOutput } from '../src/main/cleanCliOutput';

describe('cleanCliOutput', () => {
  it('returns empty for empty input', () => {
    expect(cleanCliOutput('')).toBe('');
  });

  it('passes plain text through unchanged', () => {
    expect(cleanCliOutput('hello world')).toBe('hello world');
  });

  it('strips ANSI color codes', () => {
    expect(cleanCliOutput('\x1B[31mred\x1B[39m text')).toBe('red text');
  });

  it('strips 256-color escape codes', () => {
    expect(cleanCliOutput('\x1B[38;5;250msoft gray\x1B[0m')).toBe('soft gray');
  });

  it('strips bold and dim', () => {
    expect(cleanCliOutput('\x1B[1mbold\x1B[22m and \x1B[2mdim\x1B[22m')).toBe(
      'bold and dim',
    );
  });

  it('strips cursor visibility codes', () => {
    expect(cleanCliOutput('\x1B[?25lhidden\x1B[?25h')).toBe('hidden');
  });

  it('converts cursor-left + erase-display into a newline', () => {
    expect(cleanCliOutput('◒  Cloning\x1B[999D\x1B[J✓  Done')).toBe(
      '◒  Cloning\n✓  Done',
    );
  });

  it('converts carriage return into newline', () => {
    expect(cleanCliOutput('first\rsecond')).toBe('first\nsecond');
  });

  it('handles CRLF as a single newline', () => {
    expect(cleanCliOutput('first\r\nsecond')).toBe('first\nsecond');
  });

  it('collapses consecutive identical text lines', () => {
    expect(cleanCliOutput('Cloning\nCloning\nCloning\nDone')).toBe(
      'Cloning\nDone',
    );
  });

  it('collapses spinner frame redraws of the same message', () => {
    const input =
      '\x1B[35m◒\x1B[39m  Cloning repository\x1B[999D\x1B[J' +
      '\x1B[35m◐\x1B[39m  Cloning repository\x1B[999D\x1B[J' +
      '\x1B[35m◓\x1B[39m  Cloning repository\x1B[999D\x1B[J' +
      '\x1B[32m◇\x1B[39m  Repository cloned';
    expect(cleanCliOutput(input)).toBe(
      '◒  Cloning repository\n◇  Repository cloned',
    );
  });

  it('preserves blank lines but collapses runs of 3+', () => {
    expect(cleanCliOutput('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('strips erase-in-line without inserting a newline', () => {
    expect(cleanCliOutput('progress\x1B[Kdone')).toBe('progressdone');
  });

  it('strips ESC followed by single char (e.g. ESC 7 = save cursor)', () => {
    expect(cleanCliOutput('\x1B7text\x1B8')).toBe('text');
  });

  it('handles mixed real content alongside spinner spam', () => {
    const input =
      'Tip: use --yes\n' +
      '\x1B[35m◒\x1B[39m  Working\x1B[999D\x1B[J' +
      '\x1B[35m◐\x1B[39m  Working\x1B[999D\x1B[J' +
      '\x1B[32m◇\x1B[39m  Done';
    expect(cleanCliOutput(input)).toBe(
      'Tip: use --yes\n◒  Working\n◇  Done',
    );
  });
});
