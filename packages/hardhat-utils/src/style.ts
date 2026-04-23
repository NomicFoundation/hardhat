import { styleText as nodeStyleText } from "node:util";

// `util.styleText` with array-format (multi-style) arguments was added in
// Node.js 22.7.0. On older versions the export is either `undefined` or
// doesn't accept array formats. We probe once at module load and fall back to
// an identity shim so callers keep working (without colors) regardless of the
// Node version. The CLI still prints a soft warning for unsupported versions.
function probeStyleText(): boolean {
  try {
    nodeStyleText(["red", "bold"], "");
    return true;
  } catch {
    return false;
  }
}

export const styleText: typeof nodeStyleText = probeStyleText()
  ? nodeStyleText
  : (_format, text) => text;

export function colorize(
  format: Parameters<typeof nodeStyleText>[0],
): (text: string) => string {
  return (text) => styleText(format, text);
}
