import * as nodeUtil from "node:util";

// `util.styleText` with array-format (multi-style) arguments was added in
// Node.js 22.7.0. On older versions the export is either `undefined` or
// doesn't accept array formats. We probe once at module load and fall back to
// an identity shim so callers keep working (without colors) regardless of the
// Node version. The CLI still prints a soft warning for unsupported versions.
// The namespace import is required because a named import of `styleText` would
// fail at module-link time on Node versions that don't export it.

function probeStyleText(): boolean {
  try {
    nodeUtil.styleText?.(["red", "bold"], "");
    return true;
  } catch {
    return false;
  }
}

export const styleText: typeof nodeUtil.styleText = probeStyleText()
  ? nodeUtil.styleText
  : (_format, text) => text;

export function colorize(
  format: Parameters<typeof nodeUtil.styleText>[0],
): (text: string) => string {
  return (text) => styleText(format, text);
}
