/**
 * Strip terminal control sequences from user-supplied text before it is echoed
 * back to the xterm.js terminal.
 *
 * The app legitimately emits ANSI everywhere via `term.write`, so this must be
 * applied narrowly — only to text that originates from user input and is
 * reflected verbatim (e.g. `echo`). Without it, a user can inject raw escape
 * sequences (`\x1b[2J` to clear scrollback, `\x1b[31m` to recolor, NUL bytes)
 * and spoof or hide terminal output.
 *
 * Printable Unicode (including emoji and bidirectional text) passes through
 * untouched; only ESC/CSI sequences and C0 control bytes are removed. Newline,
 * carriage return, and tab are preserved so multi-line / tabbed echo still works.
 */
export function stripControlSequences(s: string): string {
  return (
    s
      // CSI / ANSI escape sequences: ESC [ ... final-byte
      // eslint-disable-next-line no-control-regex
      .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "")
      // Any remaining lone ESC bytes (e.g. ESC followed by a non-CSI intro)
      // eslint-disable-next-line no-control-regex
      .replace(/\x1b/g, "")
      // Other C0 control bytes + DEL, EXCEPT \t (0x09) \n (0x0A) \r (0x0D)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
  );
}
